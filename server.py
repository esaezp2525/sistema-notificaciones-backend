import os
import sys
import json
import time
import re
import random
import threading
import subprocess
from datetime import datetime, date, timedelta
import calendar
import pandas as pd
import base64
from flask import Flask, jsonify, request, render_template, session
from flask_cors import CORS
from playwright.sync_api import sync_playwright

import database

app = Flask(__name__)
app.secret_key = "sistema_notificaciones_secret_key_2026_antigravity_token"
CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=True)

IS_HEADLESS = os.environ.get("HEADLESS", "false").lower() in ("true", "1", "yes") or sys.platform != "win32"
PORT = int(os.environ.get("PORT", 5829))

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SESSION_DIR = os.path.join(BASE_DIR, "whatsapp_session")
CONFIG_FILE = os.path.join(BASE_DIR, "config_sistema.json")
EXCEL_FILE = os.path.join(BASE_DIR, "destinatarios.xlsx")

# Inicializar Base de Datos SQLite
database.init_db()

# ==================== ESTADO GLOBAL DE AUTOMATIZACIÓN ====================
automation_state = {
    "is_running": False,
    "current_client": "",
    "procesados": 0,
    "total": 0,
    "enviados": 0,
    "fallidos": 0,
    "stop_requested": False,
    "tarea_actual": "",
}

terminal_logs = []
logs_lock = threading.Lock()
whatsapp_autenticado = False

def add_log(level, msg):
    with logs_lock:
        timestamp = datetime.now().strftime("%H:%M:%S")
        entry = {"time": timestamp, "level": level, "msg": msg}
        terminal_logs.append(entry)
        if len(terminal_logs) > 500:
            terminal_logs.pop(0)
    print(f"[{timestamp}] [{level.upper()}] {msg}")

# ==================== FERIADOS Y DÍAS HÁBILES ====================
def es_dia_habil(f):
    """Verifica si una fecha es día hábil (lunes a viernes y no feriado común)."""
    if f.weekday() >= 5:  # 5=Sábado, 6=Domingo
        return False
    feriados = {
        (1, 1),   # Año Nuevo
        (1, 5),   # Día del Trabajo
        (21, 5),  # Glorias Navales
        (16, 7),  # Virgen del Carmen
        (15, 8),  # Asunción de la Virgen
        (18, 9),  # Fiestas Patrias
        (19, 9),  # Día del Ejército
        (12, 10), # Encuentro de Dos Mundos
        (31, 10), # Iglesias Evangélicas
        (1, 11),  # Día de Todos los Santos
        (8, 12),  # Inmaculada Concepción
        (25, 12), # Navidad
    }
    return (f.day, f.month) not in feriados

def calcular_dia_efectivo(dia_base, modalidad_dia, ano, mes):
    """Calcula el día efectivo de envío para un mes y año dados.
    Si modalidad_dia == 'habil', traslada al siguiente día hábil si cae fin de semana o festivo."""
    _, ultimo_dia = calendar.monthrange(ano, mes)
    dia_clamped = min(max(1, int(dia_base)), ultimo_dia)
    fecha = date(ano, mes, dia_clamped)

    if modalidad_dia == "habil":
        while not es_dia_habil(fecha):
            fecha += timedelta(days=1)
    return fecha

def calcular_proximo_envio(auto):
    """Calcula la próxima fecha y hora de disparo para una automatización."""
    if not auto.get("activo", False):
        return "Automatización Desactivada"

    dia_mes = int(auto.get("dia_mes", 1))
    modalidad = auto.get("modalidad_dia", "calendario")
    hora_str = auto.get("hora", "09:00")
    try:
        hh, mm = map(int, hora_str.split(":"))
    except Exception:
        hh, mm = 9, 0

    ahora = datetime.now()
    fecha_este_mes = calcular_dia_efectivo(dia_mes, modalidad, ahora.year, ahora.month)
    objetivo_este_mes = datetime(fecha_este_mes.year, fecha_este_mes.month, fecha_este_mes.day, hh, mm)

    if objetivo_este_mes > ahora:
        objetivo = objetivo_este_mes
    else:
        # Calcular para el próximo mes
        if ahora.month == 12:
            prox_ano, prox_mes = ahora.year + 1, 1
        else:
            prox_ano, prox_mes = ahora.year, ahora.month + 1
        fecha_prox_mes = calcular_dia_efectivo(dia_mes, modalidad, prox_ano, prox_mes)
        objetivo = datetime(fecha_prox_mes.year, fecha_prox_mes.month, fecha_prox_mes.day, hh, mm)

    nombres_dias = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]
    nombres_meses = ["", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
                     "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"]

    nombre_dia = nombres_dias[objetivo.weekday()]
    nombre_mes = nombres_meses[objetivo.month]
    etiqueta_mod = "Día Hábil" if modalidad == "habil" else "Día Calendario"

    return f"{nombre_dia} {objetivo.day} de {nombre_mes} de {objetivo.year} a las {objetivo.strftime('%H:%M')} hrs ({etiqueta_mod}){' (Mensual)' if auto.get('repetir_mensual', True) else ''}"

# ==================== CONTROL DE PLAYWRIGHT ====================
def forzar_cierre_playwright():
    """Cierra instancias huérfanas de Chrome asociadas al perfil de WhatsApp."""
    try:
        if sys.platform == "win32":
            subprocess.run(
                ["powershell", "-NoProfile", "-Command",
                 "Get-Process chrome,msedge,chromium -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like '*whatsapp_session*' } | Stop-Process -Force"],
                capture_output=True, timeout=8
            )
        else:
            subprocess.run(["pkill", "-9", "-f", "chromium"], capture_output=True)
    except Exception:
        pass

def abrir_contexto_whatsapp(p, headless=None):
    """Abre el navegador persistente para WhatsApp Web evitando bloqueos de perfil."""
    if headless is None:
        headless = IS_HEADLESS
    os.makedirs(SESSION_DIR, exist_ok=True)
    ultimo_error = None
    for intento in range(3):
        try:
            return p.chromium.launch_persistent_context(
                user_data_dir=SESSION_DIR,
                headless=headless,
                args=[
                    "--no-sandbox",
                    "--disable-setuid-sandbox",
                    "--disable-dev-shm-usage",
                    "--disable-blink-features=AutomationControlled",
                    "--disable-infobars",
                    "--window-size=1280,800"
                ],
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
                viewport={"width": 1280, "height": 800}
            )
        except Exception as e:
            ultimo_error = e
            add_log("warning", f"Intento {intento+1}: Carpeta bloqueada. Liberando procesos...")
            forzar_cierre_playwright()
            time.sleep(1.5)
    raise ultimo_error

# ==================== TRABAJADOR DE ENVÍOS (WORKER) ====================
def automation_worker(auto_id=None, dest_ids=None, nombre_tarea="Envío"):
    global whatsapp_autenticado
    automation_state["is_running"] = True
    automation_state["stop_requested"] = False
    automation_state["procesados"] = 0
    automation_state["enviados"] = 0
    automation_state["fallidos"] = 0
    automation_state["tarea_actual"] = nombre_tarea

    add_log("info", f"Iniciando proceso: '{nombre_tarea}'...")

    try:
        destinatarios_db = database.db_obtener_destinatarios()
        notificaciones = database.db_obtener_notificaciones()
        automatizaciones = database.db_obtener_automatizaciones()

        # 1. Determinar plantilla de mensaje
        plantilla_cuerpo = "Hola {nombre}, este es un aviso importante."
        auto_target = None
        if auto_id:
            for a in automatizaciones:
                if a["id"] == auto_id:
                    auto_target = a
                    break

        if auto_target:
            msg_id = auto_target.get("mensaje_id")
            for m in notificaciones:
                if m["id"] == msg_id:
                    plantilla_cuerpo = m.get("cuerpo", plantilla_cuerpo)
                    break
        elif notificaciones:
            plantilla_cuerpo = notificaciones[0].get("cuerpo", plantilla_cuerpo)

        # 2. Filtrar destinatarios pendientes
        pendientes = []
        for d in destinatarios_db:
            if not d["activo"]:
                continue
            if d["estado"].lower() == "enviado":
                continue
            
            if dest_ids is not None:
                if d["id"] in dest_ids:
                    pendientes.append(d)
            elif auto_id:
                if auto_id in d["automatizaciones"]:
                    pendientes.append(d)
            else:
                pendientes.append(d)

        total = len(pendientes)
        automation_state["total"] = total

        if total == 0:
            add_log("info", "No hay destinatarios pendientes para esta tarea.")
            automation_state["is_running"] = False
            return

        session_activa = os.path.exists(SESSION_DIR) and len(os.listdir(SESSION_DIR)) > 0
        if not session_activa:
            add_log("error", "No has vinculado tu WhatsApp. Haz clic en 'Conectar' para escanear el QR.")
            automation_state["is_running"] = False
            return

        add_log("info", f"Enviando a {total} destinatario(s)...")
        with sync_playwright() as p:
            context = abrir_contexto_whatsapp(p, headless=True)
            page = context.pages[0] if context.pages else context.new_page()
            page.goto("https://web.whatsapp.com")

            try:
                page.wait_for_selector("#pane-side, [data-testid='chat-list']", timeout=35000)
                whatsapp_autenticado = True
                add_log("success", "Sesión de WhatsApp verificada. Procesando cola de envíos...")
            except Exception:
                qr_el = page.query_selector("canvas[aria-label*='QR'], div[data-ref], [data-testid='qrcode']")
                context.close()
                forzar_cierre_playwright()
                automation_state["is_running"] = False
                if qr_el:
                    whatsapp_autenticado = False
                    add_log("error", "La sesión de WhatsApp expiró o requiere escanear el QR.")
                else:
                    add_log("error", "Tiempo agotado esperando conexión a WhatsApp Web.")
                return

            time.sleep(2)

            for d in pendientes:
                if automation_state["stop_requested"]:
                    add_log("warning", "Envío detenido por el usuario.")
                    break

                automation_state["procesados"] += 1
                nombre_dest = str(d["nombre"]).strip()
                tipo_dest = str(d["tipo"]).strip()
                dest_id = d["id"]
                automation_state["current_client"] = nombre_dest

                if not nombre_dest:
                    add_log("warning", f"Destinatario ID #{dest_id} sin nombre. Omitiendo.")
                    database.db_actualizar_estado_destinatario(dest_id, "Nombre Vacio")
                    automation_state["fallidos"] += 1
                    continue

                add_log("info", f"[{automation_state['procesados']}/{total}] Buscando {tipo_dest.lower()}: '{nombre_dest}'...")

                try:
                    # 1. Localizar caja de búsqueda
                    search_box = page.locator("input[data-tab='3'], input[role='textbox'], #side input, div[contenteditable='true'][data-tab='3']").first
                    search_box.click(timeout=8000)
                    time.sleep(0.3)
                    search_box.fill("")
                    time.sleep(0.2)
                    search_box.fill(nombre_dest)
                    time.sleep(1.8)

                    # 2. Localizar chat en la lista de resultados
                    keyword = re.sub(r'[^\w\s]', '', nombre_dest).strip()
                    selectores = [
                        f"#pane-side div[data-testid='cell-frame-container']:has-text('{nombre_dest}')",
                        f"#pane-side span[title*='{nombre_dest}']",
                    ]
                    if keyword and keyword != nombre_dest:
                        selectores.append(f"#pane-side div[data-testid='cell-frame-container']:has-text('{keyword}')")
                        selectores.append(f"#pane-side span[title*='{keyword}']")
                    selectores.append("#pane-side div[data-testid='cell-frame-container']")

                    chat_encontrado = None
                    for sel in selectores:
                        loc = page.locator(sel)
                        if loc.count() > 0 and loc.first.is_visible():
                            chat_encontrado = loc.first
                            break

                    if not chat_encontrado:
                        add_log("error", f"❌ '{nombre_dest}' no fue encontrado en WhatsApp.")
                        database.db_actualizar_estado_destinatario(dest_id, "No Encontrado")
                        automation_state["fallidos"] += 1
                        page.keyboard.press("Escape")
                        time.sleep(1)
                        continue

                    chat_encontrado.click(timeout=8000)
                    time.sleep(1.5)

                    # 3. Preparar mensaje con variables
                    ahora_dt = datetime.now()
                    msg_final = plantilla_cuerpo
                    msg_final = msg_final.replace("{nombre}", nombre_dest)
                    msg_final = msg_final.replace("{cliente}", nombre_dest)
                    msg_final = msg_final.replace("{grupo}", nombre_dest)
                    msg_final = msg_final.replace("{fecha}", ahora_dt.strftime("%d/%m/%Y"))
                    msg_final = msg_final.replace("{hora}", ahora_dt.strftime("%H:%M"))
                    msg_final = msg_final.replace("{dia}", str(ahora_dt.day))

                    # 4. Enviar mensaje
                    caja_msg = page.locator("footer div[data-testid='conversation-compose-box-input'], footer div[contenteditable='true'], footer div[role='textbox'], footer div[data-tab='10']").first
                    caja_msg.click(timeout=8000)
                    time.sleep(0.4)
                    page.keyboard.insert_text(msg_final)
                    time.sleep(1.0)

                    btn_send = page.locator("button[aria-label='Enviar'], button[data-tab='11'], span[data-icon='wds-ic-send-filled'], button:has([data-icon*='send']), button[data-testid='send']").first
                    if btn_send.is_visible():
                        btn_send.click(timeout=3000)
                    else:
                        caja_msg.press("Enter")

                    time.sleep(2.0)
                    page.keyboard.press("Escape")

                    ahora_str = ahora_dt.strftime("%Y-%m-%d %H:%M:%S")
                    database.db_actualizar_estado_destinatario(dest_id, "Enviado", ahora_str)
                    automation_state["enviados"] += 1
                    add_log("success", f"✅ Mensaje enviado exitosamente a: '{nombre_dest}'")

                    if automation_state["procesados"] < total and not automation_state["stop_requested"]:
                        pausa = random.randint(8, 14)
                        add_log("pause", f"Pausa anti-spam: esperando {pausa}s...")
                        time.sleep(pausa)

                except Exception as e:
                    add_log("error", f"Error con '{nombre_dest}': {str(e)[:45]}")
                    database.db_actualizar_estado_destinatario(dest_id, "Error")
                    automation_state["fallidos"] += 1
                    page.keyboard.press("Escape")

            # Sincronizar cambios a Excel para compatibilidad
            database.db_sincronizar_a_excel()

            # ==================== NOTIFICACIÓN DE FIN DE TANDA AL ADMIN ====================
            try:
                add_log("info", "Preparando reporte de finalización...")
                reporte_msg = (
                    f"📊 *[Sistema de Notificaciones - Reporte de Tanda]*\n\n"
                    f"• *Tarea:* {nombre_tarea}\n"
                    f"• *✅ Entregados con éxito:* {automation_state['enviados']}\n"
                    f"• *❌ Incidencias / Fallidos:* {automation_state['fallidos']}\n"
                    f"• *Total procesados:* {automation_state['procesados']}\n"
                    f"• *Fecha y Hora:* {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}"
                )
                
                # Buscar chat personal (Tú)
                search_box = page.locator("input[data-tab='3'], input[role='textbox'], #side input").first
                search_box.click(timeout=5000)
                search_box.fill("")
                search_box.fill("Tú")
                time.sleep(1.5)
                
                admin_chat = page.locator("#pane-side div[data-testid='cell-frame-container']:has-text('Tú'), #pane-side span[title*='Tú']").first
                if admin_chat.is_visible():
                    admin_chat.click(timeout=5000)
                    time.sleep(1.0)
                    caja_msg = page.locator("footer div[contenteditable='true'], footer div[role='textbox']").first
                    caja_msg.click(timeout=5000)
                    page.keyboard.insert_text(reporte_msg)
                    time.sleep(0.5)
                    caja_msg.press("Enter")
                    time.sleep(1.5)
                    add_log("success", "🔔 Resumen de fin de tanda enviado con éxito a tu chat de WhatsApp ('Tú').")
            except Exception as ex_admin:
                print(f"[Admin Report] No se pudo enviar reporte al chat 'Tú': {ex_admin}")

            context.close()
            forzar_cierre_playwright()

        add_log("success", f"Proceso concluido. Entregados: {automation_state['enviados']}, Incidencias: {automation_state['fallidos']}")
    except Exception as e:
        add_log("error", f"Error general: {e}")

    automation_state["is_running"] = False
    automation_state["current_client"] = ""

# ==================== PROGRAMADOR AUTOMÁTICO EN SEGUNDO PLANO ====================
def background_scheduler():
    while True:
        try:
            now = datetime.now()
            current_day = now.day
            current_hm = now.strftime("%H:%M")
            current_period = now.strftime("%Y-%m")

            automatizaciones = database.db_obtener_automatizaciones()

            for auto in automatizaciones:
                if auto.get("activo", False):
                    dia_base = int(auto.get("dia_mes", 1))
                    modalidad = auto.get("modalidad_dia", "calendario")
                    target_hm = str(auto.get("hora", "09:00")).strip()
                    last_run = str(auto.get("ultimo_envio_periodo", ""))

                    dia_efectivo = calcular_dia_efectivo(dia_base, modalidad, now.year, now.month)

                    if current_day == dia_efectivo.day and current_hm == target_hm and last_run != current_period:
                        if not automation_state["is_running"]:
                            auto_nombre = auto.get("nombre", f"Auto #{auto['id']}")
                            add_log("info", f"⏰ [PROGRAMADOR] Activada tarea '{auto_nombre}'. Iniciando envíos...")
                            database.db_actualizar_periodo_auto(auto["id"], current_period)

                            t = threading.Thread(
                                target=automation_worker,
                                kwargs={
                                    "auto_id": auto["id"],
                                    "nombre_tarea": f"Automática ({auto_nombre})"
                                },
                                daemon=True
                            )
                            t.start()
                            break
        except Exception:
            pass
        time.sleep(10)

# ==================== RUTAS DE AUTENTICACIÓN ====================
@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/auth/me", methods=["GET"])
def auth_me():
    uid = session.get("user_id")
    if not uid:
        return jsonify({"authenticated": False})
    user = database.obtener_usuario(uid)
    if not user:
        session.clear()
        return jsonify({"authenticated": False})
    return jsonify({
        "authenticated": True,
        "user": user
    })

@app.route("/api/auth/login", methods=["POST"])
def auth_login():
    data = request.get_json(silent=True) or {}
    username = str(data.get("username", "")).strip()
    password = str(data.get("password", ""))

    if not username or not password:
        return jsonify({"success": False, "error": "Ingresa usuario y contraseña"}), 400

    user = database.autenticar_usuario(username, password)
    if not user:
        return jsonify({"success": False, "error": "Usuario o contraseña incorrectos"}), 401

    session["user_id"] = user["id"]
    session["username"] = user["username"]
    session["nombre"] = user["nombre"]
    session["rol"] = user["rol"]

    add_log("info", f"Sesión iniciada: {user['username']} ({user['rol']})")
    return jsonify({"success": True, "user": user})

@app.route("/api/auth/logout", methods=["POST"])
def auth_logout():
    username = session.get("username", "usuario")
    session.clear()
    add_log("info", f"Sesión cerrada: {username}")
    return jsonify({"success": True})

@app.route("/api/auth/cambiar-clave", methods=["POST"])
def auth_cambiar_clave():
    uid = session.get("user_id")
    if not uid:
        return jsonify({"success": False, "error": "No autorizado"}), 401

    data = request.get_json(silent=True) or {}
    clave_actual = str(data.get("clave_actual", ""))
    nueva_clave = str(data.get("nueva_clave", ""))

    user = database.obtener_usuario(uid)
    if not user:
        return jsonify({"success": False, "error": "Usuario no encontrado"}), 404

    # Verificar clave actual
    auth = database.autenticar_usuario(user["username"], clave_actual)
    if not auth:
        return jsonify({"success": False, "error": "La contraseña actual es incorrecta"}), 400

    ok, msg = database.cambiar_clave_usuario(uid, nueva_clave)
    if ok:
        add_log("info", f"Contraseña actualizada para {user['username']}.")
        return jsonify({"success": True, "message": msg})
    return jsonify({"success": False, "error": msg}), 400

# ==================== RUTAS DE ADMINISTRACIÓN DE USUARIOS ====================
@app.route("/api/usuarios", methods=["GET"])
def listar_usuarios():
    if session.get("rol") != "admin":
        return jsonify({"success": False, "error": "Acceso restringido a Administradores"}), 403
    usuarios = database.obtener_todos_usuarios()
    return jsonify({"success": True, "usuarios": usuarios})

@app.route("/api/usuarios/crear", methods=["POST"])
def crear_usuario():
    if session.get("rol") != "admin":
        return jsonify({"success": False, "error": "Acceso restringido a Administradores"}), 403
    data = request.get_json(silent=True) or {}
    username = data.get("username", "")
    password = data.get("password", "")
    nombre = data.get("nombre", "")
    rol = data.get("rol", "operador")

    ok, msg = database.crear_usuario(username, password, nombre, rol)
    if ok:
        add_log("info", f"[Admin] Usuario '{username}' creado exitosamente.")
        return jsonify({"success": True, "message": msg})
    return jsonify({"success": False, "error": msg}), 400

@app.route("/api/usuarios/eliminar", methods=["POST"])
def eliminar_usuario():
    if session.get("rol") != "admin":
        return jsonify({"success": False, "error": "Acceso restringido a Administradores"}), 403
    data = request.get_json(silent=True) or {}
    user_id = data.get("id")
    req_user_id = session.get("user_id")

    ok, msg = database.eliminar_usuario(user_id, req_user_id)
    if ok:
        add_log("info", f"[Admin] Usuario ID #{user_id} eliminado.")
        return jsonify({"success": True, "message": msg})
    return jsonify({"success": False, "error": msg}), 400

@app.route("/api/usuarios/cambiar-clave-admin", methods=["POST"])
def cambiar_clave_admin():
    if session.get("rol") != "admin":
        return jsonify({"success": False, "error": "Acceso restringido a Administradores"}), 403
    data = request.get_json(silent=True) or {}
    user_id = data.get("id")
    nueva_clave = data.get("nueva_clave", "")

    ok, msg = database.cambiar_clave_usuario(user_id, nueva_clave)
    if ok:
        add_log("info", f"[Admin] Contraseña actualizada para usuario ID #{user_id}.")
        return jsonify({"success": True, "message": msg})
    return jsonify({"success": False, "error": msg}), 400

# ==================== RUTAS DE DATOS PRINCIPALES ====================
@app.route("/api/data", methods=["GET"])
def get_data():
    try:
        destinatarios = database.db_obtener_destinatarios()
        notificaciones = database.db_obtener_notificaciones()
        automatizaciones = database.db_obtener_automatizaciones()

        totales = {"total": len(destinatarios), "pendientes": 0, "enviados": 0, "errores": 0, "activos": 0}

        for d in destinatarios:
            estado = d["estado"].lower()
            if estado == "enviado":
                totales["enviados"] += 1
            elif any(err in estado for err in ["error", "invalido", "no encontrado", "nombre vacio"]):
                totales["errores"] += 1
            elif d["activo"]:
                totales["pendientes"] += 1

            if d["activo"]:
                totales["activos"] += 1

        for a in automatizaciones:
            a["proximo_texto"] = calcular_proximo_envio(a)

        session_activa = os.path.exists(SESSION_DIR) and len(os.listdir(SESSION_DIR)) > 0 and (whatsapp_autenticado is not False)

        return jsonify({
            "success": True,
            "sistema_nombre": "Sistema de Notificaciones",
            "notificaciones": notificaciones,
            "automatizaciones": automatizaciones,
            "destinatarios": destinatarios,
            "totales": totales,
            "session_activa": session_activa,
            "is_running": automation_state["is_running"]
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/api/logs", methods=["GET"])
def get_logs():
    with logs_lock:
        logs_copy = list(terminal_logs)
    return jsonify({
        "logs": logs_copy,
        "is_running": automation_state["is_running"],
        "current_client": automation_state["current_client"],
        "procesados": automation_state["procesados"],
        "total": automation_state["total"],
        "enviados": automation_state["enviados"],
        "fallidos": automation_state["fallidos"],
        "tarea_actual": automation_state.get("tarea_actual", "")
    })

@app.route("/api/logs/limpiar", methods=["POST"])
def limpiar_logs():
    with logs_lock:
        terminal_logs.clear()
    return jsonify({"success": True})

# ---------- GESTIÓN DE NOTIFICACIONES (MENSAJES) ----------
@app.route("/api/notificaciones/guardar", methods=["POST"])
def guardar_notificacion():
    try:
        data = request.get_json(silent=True) or {}
        nid = data.get("id")
        titulo = data.get("titulo", "").strip()
        cuerpo = data.get("cuerpo", "").strip()

        if not titulo:
            return jsonify({"success": False, "error": "El título del mensaje es requerido"}), 400

        guardado_id = database.db_guardar_notificacion(nid, titulo, cuerpo)
        add_log("info", f"Plantilla guardada: '{titulo}' ({guardado_id}).")
        return jsonify({"success": True, "id": guardado_id})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/api/notificaciones/eliminar", methods=["POST"])
def eliminar_notificacion():
    try:
        data = request.get_json(silent=True) or {}
        nid = data.get("id")
        database.db_eliminar_notificacion(nid)
        add_log("info", f"Plantilla '{nid}' eliminada.")
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# ---------- GESTIÓN DE AUTOMATIZACIONES ----------
@app.route("/api/automatizaciones/guardar", methods=["POST"])
def guardar_automatizacion():
    try:
        data = request.get_json(silent=True) or {}
        aid = data.get("id")
        nombre = data.get("nombre", "").strip()
        mensaje_id = data.get("mensaje_id", "")
        dia_mes = int(data.get("dia_mes", 1))
        modalidad = data.get("modalidad_dia", "calendario")
        hora = str(data.get("hora", "09:00")).strip()
        activo = bool(data.get("activo", True))
        repetir = bool(data.get("repetir_mensual", True))

        if not nombre:
            return jsonify({"success": False, "error": "El nombre de la automatización es requerido"}), 400
        if not mensaje_id:
            return jsonify({"success": False, "error": "Debes asociar un mensaje a la automatización"}), 400

        guardado_id = database.db_guardar_automatizacion(aid, nombre, mensaje_id, dia_mes, modalidad, hora, activo, repetir)
        add_log("info", f"Automatización guardada: '{nombre}' ({guardado_id}).")
        return jsonify({"success": True, "id": guardado_id})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/api/automatizaciones/eliminar", methods=["POST"])
def eliminar_automatizacion():
    try:
        data = request.get_json(silent=True) or {}
        aid = data.get("id")
        database.db_eliminar_automatizacion(aid)
        add_log("info", f"Automatización '{aid}' eliminada.")
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# ---------- GESTIÓN DE DESTINATARIOS ----------
@app.route("/api/destinatarios/guardar", methods=["POST"])
def guardar_destinatario():
    try:
        data = request.get_json(silent=True) or {}
        dest_id = data.get("id")
        nombre = str(data.get("nombre", "")).strip()
        tipo = str(data.get("tipo", "Grupo")).strip()
        activo = bool(data.get("activo", True))

        if not nombre:
            return jsonify({"success": False, "error": "El nombre del destinatario es requerido"}), 400

        if dest_id is not None and dest_id != "":
            database.db_actualizar_destinatario(int(dest_id), nombre, tipo, activo)
            add_log("info", f"Destinatario actualizado: '{nombre}'")
        else:
            database.db_guardar_destinatario(nombre, tipo, activo)
            add_log("info", f"Nuevo destinatario agregado: '{nombre}'")

        database.db_sincronizar_a_excel()
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/api/destinatarios/eliminar", methods=["POST"])
def eliminar_destinatario():
    try:
        data = request.get_json(silent=True) or {}
        dest_id = data.get("id")
        database.db_eliminar_destinatario(int(dest_id))
        database.db_sincronizar_a_excel()
        add_log("info", f"Destinatario ID #{dest_id} eliminado.")
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/api/destinatarios/toggle-auto", methods=["POST"])
def toggle_auto_destinatario():
    try:
        data = request.get_json(silent=True) or {}
        dest_id = int(data.get("destinatario_id"))
        auto_id = str(data.get("auto_id")).strip()

        ok, msg, lista = database.db_toggle_auto_destinatario(dest_id, auto_id)
        if ok:
            database.db_sincronizar_a_excel()
            return jsonify({"success": True, "automatizaciones": lista})
        return jsonify({"success": False, "error": msg}), 400
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/api/destinatarios/reiniciar-estados", methods=["POST"])
def reiniciar_estados():
    try:
        conn = database.get_db_connection()
        conn.execute("UPDATE destinatarios SET estado_envio = 'Pendiente', fecha_envio = ''")
        conn.commit()
        conn.close()
        database.db_sincronizar_a_excel()
        add_log("info", "Estados de envío reiniciados a 'Pendiente'.")
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/api/destinatarios/limpiar", methods=["POST"])
def limpiar_destinatarios():
    try:
        conn = database.get_db_connection()
        conn.execute("DELETE FROM destinatarios")
        conn.commit()
        conn.close()
        database.db_sincronizar_a_excel()
        add_log("warning", "Lista de destinatarios vaciada.")
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# ---------- DISPARAR ENVÍOS ----------
@app.route("/api/enviar/iniciar", methods=["POST"])
def iniciar_envio_manual():
    if automation_state["is_running"]:
        return jsonify({"success": False, "error": "Ya hay un proceso en ejecución"}), 400

    data = request.get_json(silent=True) or {}
    auto_id = data.get("auto_id")
    dest_ids = data.get("dest_ids")
    nombre_tarea = data.get("nombre_tarea", "Envío Manual Inmediato")

    t = threading.Thread(
        target=automation_worker,
        kwargs={"auto_id": auto_id, "dest_ids": dest_ids, "nombre_tarea": nombre_tarea},
        daemon=True
    )
    t.start()
    return jsonify({"success": True, "message": "Proceso de envío iniciado"})

@app.route("/api/enviar/detener", methods=["POST"])
def detener_envio():
    if not automation_state["is_running"]:
        return jsonify({"success": False, "error": "No hay procesos en ejecución"}), 400
    automation_state["stop_requested"] = True
    add_log("warning", "Solicitud de detención recibida. Finalizando envío actual...")
    return jsonify({"success": True, "message": "Deteniendo..."})

# ---------- ESCANEAR WHATSAPP WEB ----------
@app.route("/api/whatsapp/escanear", methods=["POST"])
def escanear_whatsapp():
    if automation_state["is_running"]:
        return jsonify({"success": False, "error": "Hay un envío en curso"}), 400

    def scan_thread():
        global whatsapp_autenticado
        automation_state["is_running"] = True
        add_log("info", "Abriendo WhatsApp Web para escanear contactos y grupos...")
        try:
            with sync_playwright() as p:
                context = abrir_contexto_whatsapp(p, headless=False)
                page = context.pages[0] if context.pages else context.new_page()
                page.goto("https://web.whatsapp.com")

                try:
                    page.wait_for_selector("#pane-side, [data-testid='chat-list']", timeout=40000)
                    whatsapp_autenticado = True
                    add_log("success", "WhatsApp autenticado. Extrayendo chats...")
                except Exception:
                    qr_el = page.query_selector("canvas[aria-label*='QR'], div[data-ref], [data-testid='qrcode']")
                    if qr_el:
                        add_log("warning", "Escanea el código QR que se abrió en tu pantalla...")
                        page.wait_for_selector("#pane-side, [data-testid='chat-list']", timeout=60000)
                        whatsapp_autenticado = True
                        add_log("success", "¡QR escaneado con éxito!")
                    else:
                        raise Exception("Tiempo agotado esperando WhatsApp Web.")

                time.sleep(2)
                # Extraer títulos de chats visibles
                chat_elements = page.query_selector_all("#pane-side span[title]")
                detectados = []
                for el in chat_elements:
                    t = el.get_attribute("title")
                    if t and t.strip() and t.strip() not in detectados:
                        detectados.append(t.strip())

                # Importar a destinatarios si no existen
                existentes = [d["nombre"].lower() for d in database.db_obtener_destinatarios()]
                nuevos_agregados = 0
                for d in detectados:
                    if d.lower() not in existentes:
                        tipo = "Grupo" if any(pal in d.lower() for pal in ["grupo", "equipo", "comunidad", "taller", "familia", "aviso"]) else "Contacto"
                        database.db_guardar_destinatario(d, tipo, activo=True)
                        existentes.append(d.lower())
                        nuevos_agregados += 1

                database.db_sincronizar_a_excel()
                add_log("success", f"Escaneo finalizado. Detectados {len(detectados)} chats ({nuevos_agregados} nuevos añadidos).")
                context.close()
                forzar_cierre_playwright()
        except Exception as e:
            add_log("error", f"Error en escaneo de WhatsApp: {e}")
        finally:
            automation_state["is_running"] = False

    t = threading.Thread(target=scan_thread, daemon=True)
    t.start()
    return jsonify({"success": True, "message": "Escaneo iniciado"})

# ==================== TRANSMISIÓN DE CÓDIGO QR EN VIVO ====================
qr_state = {
    "is_active": False,
    "authenticated": False,
    "qr_base64": None,
    "last_check": 0,
    "status_text": "Iniciando conexión con WhatsApp...",
    "error": None
}
qr_lock = threading.Lock()

def qr_worker():
    global whatsapp_autenticado
    with qr_lock:
        qr_state["is_active"] = True
        qr_state["qr_base64"] = None
        qr_state["status_text"] = "Iniciando navegador seguro..."
        qr_state["error"] = None

    try:
        with sync_playwright() as p:
            context = abrir_contexto_whatsapp(p, headless=True)
            page = context.pages[0] if context.pages else context.new_page()
            page.goto("https://web.whatsapp.com", wait_until="domcontentloaded", timeout=50000)

            add_log("info", "Buscando sesión existente o código QR de WhatsApp...")
            start_time = time.time()

            while time.time() - start_time < 180:
                try:
                    chat_list = page.query_selector("#pane-side, [data-testid='chat-list']")
                    if chat_list:
                        with qr_lock:
                            qr_state["authenticated"] = True
                            qr_state["status_text"] = "¡WhatsApp Conectado con Éxito!"
                            qr_state["qr_base64"] = None
                            qr_state["is_active"] = False
                        whatsapp_autenticado = True
                        add_log("success", "✅ WhatsApp Web autenticado exitosamente.")
                        break
                except Exception:
                    pass

                try:
                    qr_el = page.query_selector("canvas[aria-label*='QR'], div[data-ref], [data-testid='qrcode']")
                    if qr_el:
                        qr_bytes = qr_el.screenshot()
                        b64_img = f"data:image/png;base64,{base64.b64encode(qr_bytes).decode('utf-8')}"
                        with qr_lock:
                            qr_state["qr_base64"] = b64_img
                            qr_state["status_text"] = "Escanea el código QR con tu WhatsApp"
                            qr_state["last_check"] = time.time()
                except Exception:
                    pass

                time.sleep(1.5)

            try:
                context.close()
            except Exception:
                pass
            forzar_cierre_playwright()
    except Exception as e:
        with qr_lock:
            qr_state["error"] = str(e)
            qr_state["status_text"] = f"Error: {e}"
        add_log("error", f"Error en generador de QR: {e}")
    finally:
        with qr_lock:
            qr_state["is_active"] = False

@app.route("/api/whatsapp/status", methods=["GET"])
def api_whatsapp_status():
    global whatsapp_autenticado
    return jsonify({
        "success": True,
        "authenticated": bool(whatsapp_autenticado),
        "is_scanning": bool(qr_state["is_active"]),
        "status_text": qr_state["status_text"]
    })

@app.route("/api/whatsapp/qr", methods=["GET"])
def api_whatsapp_qr():
    global whatsapp_autenticado
    if not qr_state["is_active"] and not whatsapp_autenticado:
        t = threading.Thread(target=qr_worker, daemon=True)
        t.start()

    with qr_lock:
        return jsonify({
            "success": True,
            "authenticated": bool(whatsapp_autenticado),
            "is_active": bool(qr_state["is_active"]),
            "qr": qr_state["qr_base64"],
            "status_text": qr_state["status_text"],
            "error": qr_state["error"]
        })

@app.route("/api/whatsapp/desconectar", methods=["POST"])
def api_whatsapp_desconectar():
    global whatsapp_autenticado
    whatsapp_autenticado = False
    try:
        forzar_cierre_playwright()
        import shutil
        if os.path.exists(SESSION_DIR):
            shutil.rmtree(SESSION_DIR, ignore_errors=True)
        add_log("info", "Sesión de WhatsApp cerrada y limpiada.")
        return jsonify({"success": True, "message": "Sesión desconectada"})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# ---------- ABRIR EXCEL LOCAL ----------
@app.route("/api/abrir-excel", methods=["POST"])
def abrir_excel():
    try:
        database.db_sincronizar_a_excel()
        if sys.platform == "win32":
            os.startfile(EXCEL_FILE)
            add_log("info", "Abriendo destinatarios.xlsx en Microsoft Excel...")
            return jsonify({"success": True})
        return jsonify({"success": False, "error": "Solo disponible en Windows"})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# ==================== INICIAR PLANIFICADOR ====================
def iniciar_planificador():
    t = threading.Thread(target=background_scheduler, daemon=True)
    t.start()

if __name__ == "__main__":
    iniciar_planificador()
    print("\n=======================================================")
    print("       SISTEMA DE NOTIFICACIONES — SERVIDOR ACTIVO     ")
    print(f"       Panel Web: http://0.0.0.0:{PORT}                ")
    print(f"       Modo Headless: {IS_HEADLESS}                    ")
    print("=======================================================\n")
    app.run(host="0.0.0.0", port=PORT, debug=False, use_reloader=False)
