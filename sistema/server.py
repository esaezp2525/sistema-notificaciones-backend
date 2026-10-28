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
import base64
from flask import Flask, jsonify, request, render_template, session
from flask_cors import CORS
from playwright.sync_api import sync_playwright

import database

app = Flask(__name__, static_url_path="", static_folder="static")
app.secret_key = "sistema_notificaciones_secret_key_2026_antigravity_token"
CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=True)

@app.after_request
def add_pna_headers(response):
    response.headers["Access-Control-Allow-Origin"] = request.headers.get("Origin", "*")
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    response.headers["Access-Control-Allow-Private-Network"] = "true"
    return response

IS_HEADLESS = os.environ.get("HEADLESS", "false").lower() in ("true", "1", "yes") or sys.platform != "win32"
PORT = int(os.environ.get("PORT", 5829))

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SESSION_BASE_DIR = os.path.join(BASE_DIR, "whatsapp_session")

def get_session_dir(empresa_id="contidep"):
    safe_id = "medcapital" if str(empresa_id).lower() == "medcapital" else "contidep"
    path = os.path.join(SESSION_BASE_DIR, safe_id)
    os.makedirs(path, exist_ok=True)
    return path

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
    "empresa_actual": "contidep"
}

terminal_logs = []
logs_lock = threading.Lock()
whatsapp_autenticado = {
    "contidep": os.path.exists(os.path.join(SESSION_BASE_DIR, "contidep", "authenticated.flag")),
    "medcapital": os.path.exists(os.path.join(SESSION_BASE_DIR, "medcapital", "authenticated.flag"))
}

def set_empresa_autenticada(empresa_id, is_auth):
    safe_id = "medcapital" if str(empresa_id).lower() == "medcapital" else "contidep"
    whatsapp_autenticado[safe_id] = bool(is_auth)
    flag_file = os.path.join(get_session_dir(safe_id), "authenticated.flag")
    try:
        if is_auth:
            with open(flag_file, "w", encoding="utf-8") as f:
                f.write(datetime.now().isoformat())
        elif os.path.exists(flag_file):
            os.remove(flag_file)
    except Exception:
        pass

def add_log(level, msg):
    with logs_lock:
        timestamp = datetime.now().strftime("%H:%M:%S")
        entry = {"time": timestamp, "level": level, "msg": msg}
        terminal_logs.append(entry)
        if len(terminal_logs) > 500:
            terminal_logs.pop(0)
    try:
        print(f"[{timestamp}] [{level.upper()}] {msg}")
    except Exception:
        pass

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
playwright_browser_lock = threading.Lock()

def limpiar_locks_perfil(sess_dir):
    """Elimina archivos de bloqueo huérfanos de Chromium en el directorio de sesión."""
    for lock_name in ("SingletonLock", "SingletonCookie", "SingletonSocket"):
        lock_path = os.path.join(sess_dir, lock_name)
        try:
            if os.path.exists(lock_path) or os.path.islink(lock_path):
                os.remove(lock_path)
        except Exception:
            pass

def forzar_cierre_playwright():
    """Cierra instancias huérfanas de Chrome asociadas al perfil de WhatsApp."""
    try:
        if sys.platform == "win32":
            subprocess.run(
                ["powershell", "-NoProfile", "-Command",
                 "Get-Process chrome,msedge,chromium -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like '*whatsapp_session*' } | Stop-Process -Force"],
                capture_output=True, timeout=6
            )
        else:
            subprocess.run(["pkill", "-9", "-f", "chromium"], capture_output=True, timeout=5)
    except Exception:
        pass
    for emp in ("contidep", "medcapital"):
        limpiar_locks_perfil(get_session_dir(emp))

def abrir_contexto_whatsapp(p, empresa_id="contidep", headless=None, lightweight_qr=False):
    """Abre el navegador persistente para WhatsApp Web optimizado en memoria y CPU."""
    if headless is None:
        headless = IS_HEADLESS
    sess_dir = get_session_dir(empresa_id)
    limpiar_locks_perfil(sess_dir)
    ultimo_error = None
    vw, vh = (860, 640) if lightweight_qr else (1280, 800)
    for intento in range(3):
        try:
            ctx = p.chromium.launch_persistent_context(
                user_data_dir=sess_dir,
                headless=headless,
                ignore_default_args=["--enable-automation"],
                args=[
                    "--no-sandbox",
                    "--disable-setuid-sandbox",
                    "--disable-dev-shm-usage",
                    "--disable-blink-features=AutomationControlled",
                    "--disable-infobars",
                    "--disable-gpu",
                    "--disable-software-rasterizer",
                    "--disable-extensions",
                    "--disable-background-networking",
                    "--disable-background-timer-throttling",
                    "--disable-backgrounding-occluded-windows",
                    "--disable-breakpad",
                    "--disable-component-extensions-with-background-pages",
                    "--disable-default-apps",
                    "--disable-features=TranslateUI,BlinkGenPropertyTrees,IsolateOrigins,site-per-process",
                    "--disable-ipc-flooding-protection",
                    "--disable-renderer-backgrounding",
                    "--disable-sync",
                    "--metrics-recording-only",
                    "--mute-audio",
                    "--no-first-run",
                    "--no-default-browser-check",
                    "--renderer-process-limit=1",
                    "--blink-settings=imagesEnabled=false",
                    "--disk-cache-size=1",
                    "--media-cache-size=1",
                    "--aggressive-cache-discard",
                    "--disable-application-cache",
                    "--disable-notifications",
                    "--js-flags=--max-old-space-size=160 --optimize-for-size",
                    f"--window-size={vw},{vh}"
                ],
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
                viewport={"width": vw, "height": vh}
            )
            ctx.add_init_script("Object.defineProperty(navigator, 'webdriver', { get: () => undefined });")
            return ctx
        except Exception as e:
            ultimo_error = e
            add_log("warning", f"[{empresa_id.title()}] Intento {intento+1}: Carpeta bloqueada. Liberando procesos...")
            forzar_cierre_playwright()
            time.sleep(1.0)
    raise ultimo_error

# ==================== TRABAJADOR DE ENVÍOS (WORKER) ====================
def automation_worker(auto_id=None, dest_ids=None, nombre_tarea="Envío", empresa_id="contidep"):
    global whatsapp_autenticado
    safe_empresa = "medcapital" if str(empresa_id).lower() == "medcapital" else "contidep"
    automation_state["is_running"] = True
    automation_state["stop_requested"] = False
    automation_state["procesados"] = 0
    automation_state["enviados"] = 0
    automation_state["fallidos"] = 0
    automation_state["tarea_actual"] = f"[{safe_empresa.title()}] {nombre_tarea}"
    automation_state["empresa_actual"] = safe_empresa

    add_log("info", f"[{safe_empresa.title()}] Iniciando proceso: '{nombre_tarea}'...")

    try:
        destinatarios_db = database.db_obtener_destinatarios(empresa_id=safe_empresa)
        notificaciones = database.db_obtener_notificaciones(empresa_id=safe_empresa)
        automatizaciones = database.db_obtener_automatizaciones(empresa_id=safe_empresa)

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
            add_log("info", f"[{safe_empresa.title()}] No hay destinatarios pendientes para esta tarea.")
            automation_state["is_running"] = False
            return

        sess_dir = get_session_dir(safe_empresa)
        session_activa = os.path.exists(sess_dir) and len(os.listdir(sess_dir)) > 0
        if not session_activa:
            add_log("error", f"[{safe_empresa.title()}] No has vinculado tu WhatsApp. Haz clic en 'Conectar' para escanear el QR.")
            automation_state["is_running"] = False
            return

        add_log("info", f"[{safe_empresa.title()}] Enviando a {total} destinatario(s)...")
        with sync_playwright() as p:
            context = abrir_contexto_whatsapp(p, empresa_id=safe_empresa, headless=True)
            page = context.pages[0] if context.pages else context.new_page()
            page.goto("https://web.whatsapp.com")

            try:
                page.wait_for_selector("#pane-side, [data-testid='chat-list']", timeout=35000)
                whatsapp_autenticado[safe_empresa] = True
                add_log("success", f"[{safe_empresa.title()}] Sesión de WhatsApp verificada. Procesando cola de envíos...")
            except Exception:
                qr_el = page.query_selector("canvas[aria-label*='QR'], div[data-ref], [data-testid='qrcode']")
                context.close()
                forzar_cierre_playwright()
                automation_state["is_running"] = False
                if qr_el:
                    whatsapp_autenticado[safe_empresa] = False
                    add_log("error", f"[{safe_empresa.title()}] La sesión de WhatsApp expiró o requiere escanear el QR.")
                else:
                    add_log("error", f"[{safe_empresa.title()}] Tiempo agotado esperando conexión a WhatsApp Web.")
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
                            empresa_id = auto.get("empresa_id", "contidep")
                            add_log("info", f"⏰ [PROGRAMADOR] Activada tarea '{auto_nombre}' para {empresa_id.title()}. Iniciando envíos...")
                            database.db_actualizar_periodo_auto(auto["id"], current_period)

                            t = threading.Thread(
                                target=automation_worker,
                                kwargs={
                                    "auto_id": auto["id"],
                                    "nombre_tarea": f"Automática ({auto_nombre})",
                                    "empresa_id": empresa_id
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
    data = request.get_json(silent=True) or {}
    uid = session.get("user_id") or data.get("user_id")
    username = str(data.get("username") or session.get("username") or "").strip()
    clave_actual = str(data.get("clave_actual", ""))
    nueva_clave = str(data.get("nueva_clave", ""))

    if not uid and not username:
        return jsonify({"success": False, "error": "No autorizado"}), 401

    target_username = username
    if not target_username and uid:
        u_obj = database.obtener_usuario(uid)
        if u_obj:
            target_username = u_obj["username"]

    if not target_username:
        return jsonify({"success": False, "error": "Usuario no encontrado"}), 404

    auth = database.autenticar_usuario(target_username, clave_actual)
    if not auth:
        return jsonify({"success": False, "error": "La contraseña actual es incorrecta"}), 400

    ok, msg = database.cambiar_clave_usuario(auth["id"], nueva_clave, username=target_username)
    if ok:
        add_log("info", f"Contraseña actualizada para {target_username}.")
        return jsonify({"success": True, "message": msg})
    return jsonify({"success": False, "error": msg}), 400

# ==================== RUTAS DE ADMINISTRACIÓN DE USUARIOS ====================
@app.route("/api/usuarios", methods=["GET"])
def listar_usuarios():
    usuarios = database.obtener_todos_usuarios(incluir_password=True)
    return jsonify({"success": True, "usuarios": usuarios})

@app.route("/api/usuarios/sync", methods=["POST"])
def sync_usuarios():
    data = request.get_json(silent=True) or {}
    lista = data.get("usuarios", [])
    usuarios = database.sincronizar_usuarios(lista)
    return jsonify({"success": True, "usuarios": usuarios})

@app.route("/api/usuarios/crear", methods=["POST"])
def crear_usuario():
    data = request.get_json(silent=True) or {}
    username = data.get("username", "")
    password = data.get("password", "")
    nombre = data.get("nombre", "")
    rol = data.get("rol", "operador")

    ok, msg = database.crear_usuario(username, password, nombre, rol)
    if ok:
        add_log("info", f"[Admin] Usuario '{username}' guardado exitosamente.")
        usuarios = database.obtener_todos_usuarios(incluir_password=True)
        return jsonify({"success": True, "message": msg, "usuarios": usuarios})
    return jsonify({"success": False, "error": msg}), 400

@app.route("/api/usuarios/eliminar", methods=["POST"])
def eliminar_usuario():
    data = request.get_json(silent=True) or {}
    user_id = data.get("id")
    username = data.get("username")
    req_user_id = session.get("user_id") or data.get("req_user_id")

    ok, msg = database.eliminar_usuario(user_id, req_user_id, username=username)
    if ok:
        add_log("info", f"[Admin] Usuario eliminado ({username or user_id}).")
        usuarios = database.obtener_todos_usuarios(incluir_password=True)
        return jsonify({"success": True, "message": msg, "usuarios": usuarios})
    return jsonify({"success": False, "error": msg}), 400

@app.route("/api/usuarios/cambiar-clave-admin", methods=["POST"])
def cambiar_clave_admin():
    data = request.get_json(silent=True) or {}
    user_id = data.get("id")
    username = data.get("username")
    nueva_clave = data.get("nueva_clave", "")

    ok, msg = database.cambiar_clave_usuario(user_id, nueva_clave, username=username)
    if ok:
        add_log("info", f"[Admin] Contraseña actualizada para usuario ({username or user_id}).")
        usuarios = database.obtener_todos_usuarios(incluir_password=True)
        return jsonify({"success": True, "message": msg, "usuarios": usuarios})
    return jsonify({"success": False, "error": msg}), 400

# ==================== RUTAS DE DATOS PRINCIPALES ====================
@app.route("/api/data", methods=["GET"])
def get_data():
    try:
        empresa = request.args.get("empresa", "contidep").strip().lower()
        if empresa not in ("contidep", "medcapital"):
            empresa = "contidep"

        destinatarios = database.db_obtener_destinatarios(empresa_id=empresa)
        notificaciones = database.db_obtener_notificaciones(empresa_id=empresa)
        automatizaciones = database.db_obtener_automatizaciones(empresa_id=empresa)
        plantillas = database.db_obtener_plantillas(empresa_id=empresa)
        empresas = database.db_obtener_empresas()
        usuarios = database.obtener_todos_usuarios(incluir_password=True)

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

        sess_dir = get_session_dir(empresa)
        session_activa = os.path.exists(sess_dir) and len(os.listdir(sess_dir)) > 0 and (whatsapp_autenticado.get(empresa) is not False)

        return jsonify({
            "success": True,
            "sistema_nombre": "Sistema de Notificaciones",
            "empresa_actual": empresa,
            "empresas": empresas,
            "usuarios": usuarios,
            "notificaciones": notificaciones,
            "automatizaciones": automatizaciones,
            "plantillas": plantillas,
            "destinatarios": destinatarios,
            "totales": totales,
            "session_activa": session_activa,
            "whatsapp_autenticado": bool(whatsapp_autenticado.get(empresa, False)),
            "is_running": automation_state["is_running"]
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# ==================== RUTAS DE PLANTILLAS REUTILIZABLES DE TEXTO ====================
@app.route("/api/plantillas", methods=["GET"])
def get_plantillas():
    try:
        empresa = request.args.get("empresa", "contidep").strip().lower()
        plantillas = database.db_obtener_plantillas(empresa_id=empresa)
        return jsonify({"success": True, "plantillas": plantillas})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/api/plantillas/guardar", methods=["POST"])
def guardar_plantilla():
    try:
        data = request.get_json(silent=True) or {}
        pid = data.get("id")
        titulo = data.get("titulo", "").strip()
        categoria = data.get("categoria", "Contabilidad").strip()
        cuerpo = data.get("cuerpo", "").strip()
        empresa = str(data.get("empresa_id") or data.get("empresa") or "contidep").strip().lower()

        if not titulo or not cuerpo:
            return jsonify({"success": False, "error": "El título y el cuerpo de la plantilla son obligatorios"}), 400

        guardado_id = database.db_guardar_plantilla(pid, titulo, categoria, cuerpo, empresa_id=empresa)
        add_log("info", f"[{empresa.title()}] Plantilla '{titulo}' guardada exitosamente ({guardado_id}).")
        return jsonify({"success": True, "id": guardado_id, "message": "Plantilla guardada"})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/api/plantillas/eliminar", methods=["POST"])
def eliminar_plantilla():
    try:
        data = request.get_json(silent=True) or {}
        pid = data.get("id")
        if not pid:
            return jsonify({"success": False, "error": "ID de plantilla requerido"}), 400
        database.db_eliminar_plantilla(pid)
        add_log("info", f"Plantilla ID '{pid}' eliminada.")
        return jsonify({"success": True, "message": "Plantilla eliminada"})
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
        "tarea_actual": automation_state.get("tarea_actual", ""),
        "empresa_actual": automation_state.get("empresa_actual", "contidep"),
        "whatsapp_autenticado": {
            "contidep": bool(whatsapp_autenticado.get("contidep", False)),
            "medcapital": bool(whatsapp_autenticado.get("medcapital", False))
        }
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
        empresa_id = str(data.get("empresa_id") or data.get("empresa") or "contidep").strip().lower()

        if not titulo:
            return jsonify({"success": False, "error": "El título del mensaje es requerido"}), 400

        guardado_id = database.db_guardar_notificacion(nid, titulo, cuerpo, empresa_id=empresa_id)
        add_log("info", f"[{empresa_id.title()}] Plantilla guardada: '{titulo}' ({guardado_id}).")
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
        empresa_id = str(data.get("empresa_id") or data.get("empresa") or "contidep").strip().lower()

        if not nombre:
            return jsonify({"success": False, "error": "El nombre de la automatización es requerido"}), 400
        if not mensaje_id:
            return jsonify({"success": False, "error": "Debes asociar un mensaje a la automatización"}), 400

        guardado_id = database.db_guardar_automatizacion(aid, nombre, mensaje_id, dia_mes, modalidad, hora, activo, repetir, empresa_id=empresa_id)
        add_log("info", f"[{empresa_id.title()}] Automatización guardada: '{nombre}' ({guardado_id}).")
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
        empresa_id = str(data.get("empresa_id") or data.get("empresa") or "contidep").strip().lower()

        if not nombre:
            return jsonify({"success": False, "error": "El nombre del destinatario es requerido"}), 400

        if dest_id is not None and dest_id != "":
            database.db_actualizar_destinatario(int(dest_id), nombre, tipo, activo, empresa_id=empresa_id)
            add_log("info", f"[{empresa_id.title()}] Destinatario actualizado: '{nombre}'")
        else:
            database.db_guardar_destinatario(nombre, tipo, activo, empresa_id=empresa_id)
            add_log("info", f"[{empresa_id.title()}] Nuevo destinatario agregado: '{nombre}'")

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
        data = request.get_json(silent=True) or {}
        empresa_id = request.args.get("empresa") or data.get("empresa_id") or data.get("empresa")
        conn = database.get_db_connection()
        if empresa_id:
            conn.execute("UPDATE destinatarios SET estado_envio = 'Pendiente', fecha_envio = '' WHERE empresa_id = ?", (empresa_id.strip().lower(),))
        else:
            conn.execute("UPDATE destinatarios SET estado_envio = 'Pendiente', fecha_envio = ''")
        conn.commit()
        conn.close()
        database.db_sincronizar_a_excel()
        add_log("info", f"Estados de envío reiniciados a 'Pendiente' ({empresa_id or 'todas'}).")
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/api/destinatarios/limpiar", methods=["POST"])
def limpiar_destinatarios():
    try:
        data = request.get_json(silent=True) or {}
        empresa_id = request.args.get("empresa") or data.get("empresa_id") or data.get("empresa")
        conn = database.get_db_connection()
        if empresa_id:
            conn.execute("DELETE FROM destinatarios WHERE empresa_id = ?", (empresa_id.strip().lower(),))
        else:
            conn.execute("DELETE FROM destinatarios")
        conn.commit()
        conn.close()
        database.db_sincronizar_a_excel()
        add_log("warning", f"Lista de destinatarios vaciada ({empresa_id or 'todas'}).")
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
    empresa_id = str(data.get("empresa_id") or data.get("empresa") or "contidep").strip().lower()

    t = threading.Thread(
        target=automation_worker,
        kwargs={"auto_id": auto_id, "dest_ids": dest_ids, "nombre_tarea": nombre_tarea, "empresa_id": empresa_id},
        daemon=True
    )
    t.start()
    return jsonify({"success": True, "message": f"Proceso de envío iniciado para {empresa_id.title()}"})

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

    data = request.get_json(silent=True) or {}
    empresa = request.args.get("empresa") or data.get("empresa", "contidep")
    safe_empresa = "medcapital" if str(empresa).lower() == "medcapital" else "contidep"

    def scan_thread():
        global whatsapp_autenticado
        automation_state["is_running"] = True
        add_log("info", f"[{safe_empresa.title()}] Abriendo WhatsApp Web para escanear contactos y grupos...")
        try:
            with sync_playwright() as p:
                context = abrir_contexto_whatsapp(p, empresa_id=safe_empresa, headless=False)
                page = context.pages[0] if context.pages else context.new_page()
                page.goto("https://web.whatsapp.com")

                try:
                    page.wait_for_selector("#pane-side, [data-testid='chat-list']", timeout=40000)
                    whatsapp_autenticado[safe_empresa] = True
                    add_log("success", f"[{safe_empresa.title()}] WhatsApp autenticado. Extrayendo chats...")
                except Exception:
                    qr_el = page.query_selector("canvas[aria-label*='QR'], div[data-ref], [data-testid='qrcode']")
                    if qr_el:
                        add_log("warning", f"[{safe_empresa.title()}] Escanea el código QR que se abrió en tu pantalla...")
                        page.wait_for_selector("#pane-side, [data-testid='chat-list']", timeout=60000)
                        whatsapp_autenticado[safe_empresa] = True
                        add_log("success", f"[{safe_empresa.title()}] ¡QR escaneado con éxito!")
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
                existentes = [d["nombre"].lower() for d in database.db_obtener_destinatarios(empresa_id=safe_empresa)]
                nuevos_agregados = 0
                for d in detectados:
                    if d.lower() not in existentes:
                        tipo = "Grupo" if any(pal in d.lower() for pal in ["grupo", "equipo", "comunidad", "taller", "familia", "aviso"]) else "Contacto"
                        database.db_guardar_destinatario(d, tipo, activo=True, empresa_id=safe_empresa)
                        existentes.append(d.lower())
                        nuevos_agregados += 1

                database.db_sincronizar_a_excel()
                add_log("success", f"[{safe_empresa.title()}] Escaneo finalizado. Detectados {len(detectados)} chats ({nuevos_agregados} nuevos añadidos).")
                context.close()
                forzar_cierre_playwright()
        except Exception as e:
            add_log("error", f"[{safe_empresa.title()}] Error en escaneo de WhatsApp: {e}")
        finally:
            automation_state["is_running"] = False

    t = threading.Thread(target=scan_thread, daemon=True)
    t.start()
    return jsonify({"success": True, "message": f"Escaneo iniciado para {safe_empresa.title()}"})

# ==================== TRANSMISIÓN DE CÓDIGO QR EN VIVO (MULTI-EMPRESA) ====================
qr_state = {
    "contidep": {
        "is_active": False,
        "authenticated": False,
        "qr_base64": None,
        "last_check": 0,
        "status_text": "Iniciando conexión con WhatsApp...",
        "error": None,
        "run_id": 0
    },
    "medcapital": {
        "is_active": False,
        "authenticated": False,
        "qr_base64": None,
        "last_check": 0,
        "status_text": "Iniciando conexión con WhatsApp...",
        "error": None,
        "run_id": 0
    }
}
qr_lock = threading.Lock()
qr_global_run_id = 0

def qr_worker(empresa_id="contidep", run_id=0):
    safe_empresa = "medcapital" if str(empresa_id).lower() == "medcapital" else "contidep"
    global whatsapp_autenticado

    with qr_lock:
        if qr_global_run_id != run_id:
            return
        qr_state[safe_empresa]["is_active"] = True
        if not qr_state[safe_empresa]["qr_base64"]:
            qr_state[safe_empresa]["status_text"] = f"Iniciando navegador seguro ({safe_empresa.title()})..."
        qr_state[safe_empresa]["error"] = None

    had_qr = False
    with playwright_browser_lock:
        with qr_lock:
            if qr_global_run_id != run_id or not qr_state[safe_empresa]["is_active"]:
                return

        try:
            with sync_playwright() as p:
                context = abrir_contexto_whatsapp(p, empresa_id=safe_empresa, headless=True, lightweight_qr=True)
                page = context.pages[0] if context.pages else context.new_page()

                # Bloquear fuentes, audio/video e imágenes externas pesadas para acelerar carga y ahorrar RAM en la nube
                def intercept_route(route):
                    try:
                        rtype = route.request.resource_type
                        if rtype in ("media", "font", "image"):
                            route.abort()
                        else:
                            route.continue_()
                    except Exception:
                        pass

                try:
                    page.route("**/*", intercept_route)
                except Exception:
                    pass

                with qr_lock:
                    if qr_global_run_id == run_id and not qr_state[safe_empresa]["qr_base64"]:
                        qr_state[safe_empresa]["status_text"] = f"Conectando con WhatsApp Web ({safe_empresa.title()})..."

                page.goto("https://web.whatsapp.com", wait_until="domcontentloaded", timeout=60000)

                add_log("info", f"[{safe_empresa.title()}] Buscando sesión existente o código QR de WhatsApp...")
                start_time = time.time()
                consecutive_errors = 0
                sync_started_at = None
                closed_cleanly = False

                while time.time() - start_time < 600:
                    with qr_lock:
                        if not qr_state[safe_empresa]["is_active"] or qr_global_run_id != run_id:
                            break

                    try:
                        res = page.evaluate("""() => {
                            // 1. Verificar si ya entró a la interfaz principal de WhatsApp
                            const chatSelectors = [
                                "#pane-side",
                                "#side",
                                "[data-testid='chat-list']",
                                "header[data-testid='chatlist-header']",
                                "div[aria-label*='Lista de chats']",
                                "div[aria-label*='Chat list']",
                                "div[contenteditable='true'][data-tab='3']",
                                "button[aria-label*='Chats']",
                                "span[data-icon='chats-filled']",
                                "span[data-icon='new-chat-outline']"
                            ];
                            for (const sel of chatSelectors) {
                                if (document.querySelector(sel)) {
                                    return { state: 'authenticated' };
                                }
                            }

                            // Cerrar posibles modales post-vinculación ("Continuar", "Aceptar", "OK")
                            const allBtns = document.querySelectorAll("button, div[role='button']");
                            for (const b of allBtns) {
                                const txt = (b.innerText || "").trim().toLowerCase();
                                if (txt === "continuar" || txt === "continue" || txt === "aceptar" || txt === "ok" || txt === "entendido") {
                                    try { b.click(); } catch (e) {}
                                }
                            }

                            // 2. Verificar si hay botón de recargar QR por expiración
                            const reloadIcon = document.querySelector("[data-testid='refresh-qr'], span[data-icon='refresh'], span[data-icon='reload'], span[data-icon='refresh-large']");
                            if (reloadIcon) {
                                const btn = reloadIcon.closest("button, div[role='button']") || reloadIcon;
                                btn.click();
                                return { state: 'reloading' };
                            }
                            for (const b of allBtns) {
                                const txt = (b.innerText || "").toLowerCase();
                                if (txt.includes("recargar") || txt.includes("reload") || txt.includes("reintentar")) {
                                    b.click();
                                    return { state: 'reloading' };
                                }
                            }

                            // 3. Extraer QR desde el canvas con margen blanco
                            const c = document.querySelector("canvas[aria-label*='QR'], div[data-ref] canvas, [data-testid='qrcode'] canvas, canvas");
                            if (c && c.width >= 80 && c.height >= 80) {
                                try {
                                    const pad = 16;
                                    const out = document.createElement('canvas');
                                    out.width = c.width + pad * 2;
                                    out.height = c.height + pad * 2;
                                    const ctx = out.getContext('2d');
                                    ctx.fillStyle = '#ffffff';
                                    ctx.fillRect(0, 0, out.width, out.height);
                                    ctx.drawImage(c, pad, pad);
                                    return { state: 'qr', data: out.toDataURL('image/png') };
                                } catch (e) {
                                    return { state: 'qr', data: c.toDataURL('image/png') };
                                }
                            }

                            // 4. Verificar si ya tiene credenciales vinculadas en localStorage o está sincronizando chats
                            let hasAuthTokens = false;
                            try {
                                hasAuthTokens = Boolean(
                                    localStorage.getItem('last-wid-md') ||
                                    localStorage.getItem('last-wid') ||
                                    localStorage.getItem('WASecretBundle') ||
                                    localStorage.getItem('WAToken1')
                                );
                            } catch (e) {}

                            const bodyTxt = document.body ? (document.body.innerText || "") : "";
                            const hasProgress = Boolean(
                                document.querySelector("progress, [role='progressbar'], [data-testid='intro-title']") ||
                                bodyTxt.includes("Cargando tus chats") ||
                                bodyTxt.includes("Loading your chats") ||
                                bodyTxt.includes("Sincronizando") ||
                                bodyTxt.includes("Iniciando") ||
                                bodyTxt.includes("mensajes")
                            );

                            if (hasAuthTokens || hasProgress) {
                                return { state: 'syncing', hasTokens: hasAuthTokens };
                            }

                            return { state: 'loading' };
                        }""")
                        consecutive_errors = 0
                    except Exception as eval_err:
                        consecutive_errors += 1
                        err_str = str(eval_err).lower()
                        if consecutive_errors >= 4 or "closed" in err_str or "crashed" in err_str or "target" in err_str:
                            raise eval_err
                        time.sleep(1.0)
                        continue

                    state = res.get("state") if isinstance(res, dict) else "loading"
                    has_tokens = bool(res.get("hasTokens")) if isinstance(res, dict) else False

                    # Si el QR ya fue escaneado y WhatsApp guardó los tokens o lleva >4s sincronizando, confirmar vinculación de inmediato
                    if state == "syncing" and (had_qr or has_tokens):
                        if sync_started_at is None:
                            sync_started_at = time.time()
                            add_log("info", f"[{safe_empresa.title()}] QR escaneado. Sincronizando sesión de WhatsApp...")
                        with qr_lock:
                            if qr_global_run_id == run_id and not qr_state[safe_empresa]["authenticated"]:
                                qr_state[safe_empresa]["status_text"] = f"¡QR escaneado! Vinculando sesión de {safe_empresa.title()}..."
                                qr_state[safe_empresa]["qr_base64"] = None

                        if (has_tokens and time.time() - sync_started_at >= 3.5) or (time.time() - sync_started_at >= 6.0):
                            state = "authenticated"

                    if state == "authenticated":
                        set_empresa_autenticada(safe_empresa, True)
                        with qr_lock:
                            if qr_global_run_id == run_id:
                                qr_state[safe_empresa]["authenticated"] = True
                                qr_state[safe_empresa]["status_text"] = f"¡WhatsApp {safe_empresa.title()} Conectado con Éxito!"
                                qr_state[safe_empresa]["qr_base64"] = None
                                qr_state[safe_empresa]["is_active"] = False
                        add_log("success", f"✅ WhatsApp Web [{safe_empresa.title()}] vinculado y conectado exitosamente.")
                        # Dar unos segundos adicionales para que IndexedDB termine de guardar las llaves en disco
                        time.sleep(5.0)
                        break

                    elif state == "qr":
                        sync_started_at = None
                        b64_canvas = res.get("data")
                        if b64_canvas and b64_canvas.startswith("data:image/png;base64,"):
                            if not had_qr:
                                add_log("info", f"[{safe_empresa.title()}] Código QR generado y listo para escanear.")
                            had_qr = True
                            set_empresa_autenticada(safe_empresa, False)
                            with qr_lock:
                                if qr_global_run_id == run_id:
                                    qr_state[safe_empresa]["authenticated"] = False
                                    qr_state[safe_empresa]["qr_base64"] = b64_canvas
                                    qr_state[safe_empresa]["status_text"] = f"Escanea el código QR con el WhatsApp de {safe_empresa.title()}"
                                    qr_state[safe_empresa]["last_check"] = time.time()

                    elif not had_qr and state != "syncing":
                        elapsed = int(time.time() - start_time)
                        with qr_lock:
                            if qr_global_run_id == run_id and not qr_state[safe_empresa]["qr_base64"]:
                                qr_state[safe_empresa]["status_text"] = f"Generando código QR de WhatsApp ({safe_empresa.title()})... ({elapsed}s)"

                    time.sleep(1.5 if had_qr else 0.9)

                try:
                    context.close()
                    closed_cleanly = True
                except Exception:
                    pass
        except Exception as e:
            with qr_lock:
                if qr_global_run_id == run_id:
                    qr_state[safe_empresa]["error"] = str(e)
                    qr_state[safe_empresa]["status_text"] = f"Reintentando conexión ({safe_empresa.title()})..."
            add_log("error", f"[{safe_empresa.title()}] Error en generador de QR: {e}")
        finally:
            with qr_lock:
                is_current = (qr_global_run_id == run_id)
                if is_current:
                    qr_state[safe_empresa]["is_active"] = False
                    qr_state[safe_empresa]["qr_base64"] = None
            if is_current and not closed_cleanly:
                forzar_cierre_playwright()

@app.route("/api/whatsapp/status", methods=["GET"])
def api_whatsapp_status():
    global qr_global_run_id
    empresa = request.args.get("empresa", "contidep").strip().lower()
    if empresa not in qr_state:
        empresa = "contidep"

    # Pre-calentar QR en segundo plano si no hay ningún navegador activo ni QR en caché
    prewarm = False
    new_run_id = 0
    with qr_lock:
        any_active = qr_state["contidep"]["is_active"] or qr_state["medcapital"]["is_active"]
        if (
            not any_active
            and not automation_state["is_running"]
            and not whatsapp_autenticado.get(empresa, False)
            and not qr_state[empresa]["qr_base64"]
        ):
            qr_global_run_id += 1
            new_run_id = qr_global_run_id
            qr_state[empresa]["run_id"] = new_run_id
            qr_state[empresa]["is_active"] = True
            qr_state[empresa]["error"] = None
            prewarm = True
        q = dict(qr_state[empresa])

    if prewarm:
        t = threading.Thread(target=qr_worker, kwargs={"empresa_id": empresa, "run_id": new_run_id}, daemon=True)
        t.start()

    return jsonify({
        "success": True,
        "empresa": empresa,
        "authenticated": bool(whatsapp_autenticado.get(empresa, False)),
        "is_scanning": bool(q["is_active"]),
        "has_qr": bool(q["qr_base64"]),
        "qr": q["qr_base64"],
        "status_text": q["status_text"],
        "empresas_status": {
            "contidep": bool(whatsapp_autenticado.get("contidep", False)),
            "medcapital": bool(whatsapp_autenticado.get("medcapital", False))
        }
    })

@app.route("/api/whatsapp/qr", methods=["GET"])
def api_whatsapp_qr():
    global qr_global_run_id
    empresa = request.args.get("empresa", "contidep").strip().lower()
    reset = request.args.get("reset", "0") == "1"
    if empresa not in qr_state:
        empresa = "contidep"
    otra_empresa = "medcapital" if empresa == "contidep" else "contidep"

    if reset:
        with qr_lock:
            qr_global_run_id += 1
            qr_state[empresa]["is_active"] = False
            qr_state[otra_empresa]["is_active"] = False
            qr_state[empresa]["qr_base64"] = None
            qr_state[empresa]["error"] = None
            qr_state[empresa]["status_text"] = f"Reiniciando generador QR ({empresa.title()})..."
        forzar_cierre_playwright()

    # Si la otra empresa tenía un worker QR abierto pero aún no tenía QR para esta empresa, liberar navegador
    stop_other = False
    with qr_lock:
        if qr_state[otra_empresa]["is_active"] and not qr_state[empresa]["is_active"] and not qr_state[empresa]["qr_base64"]:
            qr_global_run_id += 1
            qr_state[otra_empresa]["is_active"] = False
            stop_other = True

    if stop_other:
        forzar_cierre_playwright()

    start_new = False
    new_run_id = 0
    with qr_lock:
        if not qr_state[empresa]["is_active"] and not whatsapp_autenticado.get(empresa, False):
            qr_global_run_id += 1
            new_run_id = qr_global_run_id
            qr_state[empresa]["run_id"] = new_run_id
            qr_state[empresa]["is_active"] = True
            qr_state[empresa]["error"] = None
            start_new = True

    if start_new:
        t = threading.Thread(target=qr_worker, kwargs={"empresa_id": empresa, "run_id": new_run_id}, daemon=True)
        t.start()

    with qr_lock:
        q = dict(qr_state[empresa])
        return jsonify({
            "success": True,
            "empresa": empresa,
            "authenticated": bool(whatsapp_autenticado.get(empresa, False)),
            "is_active": bool(q["is_active"]),
            "qr": q["qr_base64"],
            "status_text": q["status_text"],
            "error": q["error"]
        })

@app.route("/api/whatsapp/desconectar", methods=["POST"])
def api_whatsapp_desconectar():
    global qr_global_run_id
    data = request.get_json(silent=True) or {}
    empresa = request.args.get("empresa") or data.get("empresa", "contidep")
    safe_empresa = "medcapital" if str(empresa).lower() == "medcapital" else "contidep"
    set_empresa_autenticada(safe_empresa, False)
    with qr_lock:
        qr_global_run_id += 1
        qr_state[safe_empresa]["authenticated"] = False
        qr_state[safe_empresa]["qr_base64"] = None
        qr_state[safe_empresa]["is_active"] = False
        qr_state[safe_empresa]["status_text"] = f"Sesión de {safe_empresa.title()} desconectada."
        qr_state[safe_empresa]["error"] = None
    try:
        forzar_cierre_playwright()
        import shutil
        sdir = get_session_dir(safe_empresa)
        if os.path.exists(sdir):
            shutil.rmtree(sdir, ignore_errors=True)
        add_log("info", f"[{safe_empresa.title()}] Sesión de WhatsApp cerrada y limpiada.")
        return jsonify({"success": True, "message": f"Sesión de {safe_empresa.title()} desvinculada exitosamente."})
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
