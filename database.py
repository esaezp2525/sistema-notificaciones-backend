import os
import sqlite3
import hashlib
import secrets
from datetime import datetime
import json
import pandas as pd

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "sistema_notificaciones.db")
CONFIG_JSON_PATH = os.path.join(BASE_DIR, "config_sistema.json")
EXCEL_PATH = os.path.join(BASE_DIR, "destinatarios.xlsx")

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

# ==================== SEGURIDAD DE CONTRASEÑAS ====================
def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), bytes.fromhex(salt), 100000)
    return f"{salt}${key.hex()}"

def verify_password(password: str, hashed: str) -> bool:
    try:
        if not hashed or "$" not in hashed:
            return False
        salt, key_hex = hashed.split("$")
        computed = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), bytes.fromhex(salt), 100000)
        return secrets.compare_digest(computed.hex(), key_hex)
    except Exception:
        return False

# ==================== INICIALIZACIÓN Y MIGRACIÓN ====================
def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()

    # 1. Tabla de Usuarios
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        nombre TEXT NOT NULL,
        rol TEXT NOT NULL DEFAULT 'operador',
        creado_en TEXT NOT NULL
    )
    """)

    # 2. Tabla de Destinatarios
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS destinatarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        tipo TEXT DEFAULT 'Grupo',
        activo INTEGER DEFAULT 1,
        automatizaciones TEXT DEFAULT '',
        estado_envio TEXT DEFAULT 'Pendiente',
        fecha_envio TEXT DEFAULT ''
    )
    """)

    # 3. Tabla de Plantillas de Notificación
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS notificaciones (
        id TEXT PRIMARY KEY,
        titulo TEXT NOT NULL,
        cuerpo TEXT NOT NULL,
        fecha_creacion TEXT NOT NULL
    )
    """)

    # 4. Tabla de Automatizaciones Programadas
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS automatizaciones (
        id TEXT PRIMARY KEY,
        nombre TEXT NOT NULL,
        mensaje_id TEXT NOT NULL,
        dia_mes INTEGER DEFAULT 1,
        modalidad_dia TEXT DEFAULT 'calendario',
        hora TEXT DEFAULT '09:00',
        activo INTEGER DEFAULT 1,
        repetir_mensual INTEGER DEFAULT 1,
        ultimo_envio_periodo TEXT DEFAULT ''
    )
    """)

    # 5. Tabla de Configuración Global
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS configuracion (
        clave TEXT PRIMARY KEY,
        valor TEXT NOT NULL
    )
    """)

    # 6. Tabla de Historial de Envíos
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS historial_envios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        destinatario TEXT NOT NULL,
        mensaje_id TEXT,
        automatizacion_id TEXT,
        estado TEXT NOT NULL,
        fecha_hora TEXT NOT NULL,
        detalle TEXT,
        empresa_id TEXT DEFAULT 'contidep'
    )
    """)

    # 7. Tabla de Empresas
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS empresas (
        id TEXT PRIMARY KEY,
        nombre TEXT NOT NULL,
        color TEXT DEFAULT '#2563eb'
    )
    """)
    cursor.execute("INSERT OR IGNORE INTO empresas (id, nombre, color) VALUES ('contidep', 'Contidep', '#2563eb')")
    cursor.execute("INSERT OR IGNORE INTO empresas (id, nombre, color) VALUES ('medcapital', 'Medcapital', '#10b981')")

    # MIGRACIÓN: Asegurar columna empresa_id en todas las tablas
    for tabla in ["destinatarios", "notificaciones", "automatizaciones", "historial_envios"]:
        cursor.execute(f"PRAGMA table_info({tabla})")
        cols = [col["name"] for col in cursor.fetchall()]
        if "empresa_id" not in cols:
            cursor.execute(f"ALTER TABLE {tabla} ADD COLUMN empresa_id TEXT DEFAULT 'contidep'")

    # Sembrar datos para Medcapital si no existen
    cursor.execute("SELECT COUNT(*) as count FROM notificaciones WHERE empresa_id = 'medcapital'")
    if cursor.fetchone()["count"] == 0:
        now_str = datetime.now().strftime("%Y-%m-%d")
        cursor.execute(
            "INSERT INTO notificaciones (id, titulo, cuerpo, fecha_creacion, empresa_id) VALUES (?, ?, ?, ?, ?)",
            ("notif_med_1", "Recordatorio de Pago Medcapital", "Estimado/a {nombre}: Le recordamos gestionar su pago mensual con Medcapital.", now_str, "medcapital")
        )
        cursor.execute(
            "INSERT INTO automatizaciones (id, nombre, mensaje_id, dia_mes, modalidad_dia, hora, activo, repetir_mensual, ultimo_envio_periodo, empresa_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            ("auto_med_1", "Aviso Mensual Medcapital (Día 20)", "notif_med_1", 20, "calendario", "09:30", 1, 1, "", "medcapital")
        )

    cursor.execute("SELECT COUNT(*) as count FROM destinatarios WHERE empresa_id = 'medcapital'")
    if cursor.fetchone()["count"] == 0:
        cursor.execute(
            "INSERT INTO destinatarios (nombre, tipo, activo, automatizaciones, estado_envio, fecha_envio, empresa_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
            ("Grupo Avisos Medcapital", "Grupo", 1, "auto_med_1", "Pendiente", "", "medcapital")
        )

    conn.commit()

    # Usuario admin por defecto
    cursor.execute("SELECT id FROM usuarios WHERE username = 'admin'")
    if not cursor.fetchone():
        admin_hash = hash_password("admin123")
        cursor.execute(
            "INSERT INTO usuarios (username, password_hash, nombre, rol, creado_en) VALUES (?, ?, ?, ?, ?)",
            ("admin", admin_hash, "Administrador Principal", "admin", datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
        )
        conn.commit()

    # Configuración por defecto
    cursor.execute("SELECT valor FROM configuracion WHERE clave = 'nombre_sistema'")
    if not cursor.fetchone():
        cursor.execute("INSERT OR REPLACE INTO configuracion (clave, valor) VALUES (?, ?)", 
                       ("nombre_sistema", "Sistema de Notificaciones"))
        cursor.execute("INSERT OR REPLACE INTO configuracion (clave, valor) VALUES (?, ?)", 
                       ("notificar_fin_tanda", "si"))
        cursor.execute("INSERT OR REPLACE INTO configuracion (clave, valor) VALUES (?, ?)", 
                       ("admin_whatsapp", "Tú"))
        conn.commit()

    # Migrar desde config_sistema.json si las tablas están vacías
    cursor.execute("SELECT COUNT(*) as count FROM notificaciones")
    if cursor.fetchone()["count"] == 0 and os.path.exists(CONFIG_JSON_PATH):
        try:
            with open(CONFIG_JSON_PATH, "r", encoding="utf-8") as f:
                cdata = json.load(f)
            for n in cdata.get("notificaciones", []):
                cursor.execute(
                    "INSERT OR REPLACE INTO notificaciones (id, titulo, cuerpo, fecha_creacion) VALUES (?, ?, ?, ?)",
                    (n["id"], n["titulo"], n["cuerpo"], n.get("fecha_creacion", datetime.now().strftime("%Y-%m-%d")))
                )
            for a in cdata.get("automatizaciones", []):
                cursor.execute(
                    "INSERT OR REPLACE INTO automatizaciones (id, nombre, mensaje_id, dia_mes, modalidad_dia, hora, activo, repetir_mensual, ultimo_envio_periodo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    (a["id"], a["nombre"], a["mensaje_id"], int(a.get("dia_mes", 1)), a.get("modalidad_dia", "calendario"), a.get("hora", "09:00"), 1 if a.get("activo", True) else 0, 1 if a.get("repetir_mensual", True) else 0, a.get("ultimo_envio_periodo", ""))
                )
            conn.commit()
        except Exception as e:
            print(f"[DB] Error migrando JSON: {e}")

    # Migrar desde destinatarios.xlsx si la tabla está vacía
    cursor.execute("SELECT COUNT(*) as count FROM destinatarios")
    if cursor.fetchone()["count"] == 0 and os.path.exists(EXCEL_PATH):
        try:
            df = pd.read_excel(EXCEL_PATH)
            df = df.astype(object).fillna("")
            for _, r in df.iterrows():
                nom = str(r.get("Nombre", "")).strip()
                if nom:
                    t = str(r.get("Tipo", "Grupo")).strip() or "Grupo"
                    act = 1 if str(r.get("Activo", "SI")).strip().upper() == "SI" else 0
                    aut = str(r.get("Automatizaciones", "")).strip()
                    est = str(r.get("Estado_Envio", "Pendiente")).strip() or "Pendiente"
                    fec = str(r.get("Fecha_Envio", "")).strip()
                    cursor.execute(
                        "INSERT INTO destinatarios (nombre, tipo, activo, automatizaciones, estado_envio, fecha_envio) VALUES (?, ?, ?, ?, ?, ?)",
                        (nom, t, act, aut, est, fec)
                    )
            conn.commit()
        except Exception as e:
            print(f"[DB] Error migrando Excel: {e}")

    conn.close()

# ==================== MÉTODOS DE USUARIOS ====================
def autenticar_usuario(username, password):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM usuarios WHERE username = ?", (username.strip().lower(),))
    user = cursor.fetchone()
    conn.close()
    if user and verify_password(password, user["password_hash"]):
        return {
            "id": user["id"],
            "username": user["username"],
            "nombre": user["nombre"],
            "rol": user["rol"]
        }
    return None

def obtener_usuario(user_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, username, nombre, rol, creado_en FROM usuarios WHERE id = ?", (user_id,))
    user = cursor.fetchone()
    conn.close()
    if user:
        return dict(user)
    return None

def obtener_todos_usuarios():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, username, nombre, rol, creado_en FROM usuarios ORDER BY id ASC")
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def crear_usuario(username, password, nombre, rol="operador"):
    username = username.strip().lower()
    if not username or not password:
        return False, "Usuario y contraseña requeridos"
    if len(password) < 4:
        return False, "La contraseña debe tener al menos 4 caracteres"
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM usuarios WHERE username = ?", (username,))
    if cursor.fetchone():
        conn.close()
        return False, f"El nombre de usuario '{username}' ya existe"
    
    phash = hash_password(password)
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    cursor.execute(
        "INSERT INTO usuarios (username, password_hash, nombre, rol, creado_en) VALUES (?, ?, ?, ?, ?)",
        (username, phash, nombre.strip() or username, rol, now_str)
    )
    conn.commit()
    conn.close()
    return True, "Usuario creado exitosamente"

def cambiar_clave_usuario(user_id, nueva_clave):
    if len(nueva_clave) < 4:
        return False, "La nueva contraseña debe tener al menos 4 caracteres"
    phash = hash_password(nueva_clave)
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE usuarios SET password_hash = ? WHERE id = ?", (phash, user_id))
    conn.commit()
    conn.close()
    return True, "Contraseña actualizada exitosamente"

def eliminar_usuario(user_id, req_user_id):
    if int(user_id) == int(req_user_id):
        return False, "No puedes eliminar tu propia cuenta de usuario"
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM usuarios WHERE id = ?", (user_id,))
    conn.commit()
    conn.close()
    return True, "Usuario eliminado"

def db_obtener_empresas():
    return [
        {"id": "contidep", "nombre": "Contidep", "color": "#2563eb"},
        {"id": "medcapital", "nombre": "Medcapital", "color": "#10b981"}
    ]

# ==================== MÉTODOS DE DESTINATARIOS ====================
def db_obtener_destinatarios(empresa_id=None):
    conn = get_db_connection()
    cursor = conn.cursor()
    if empresa_id:
        cursor.execute("SELECT * FROM destinatarios WHERE empresa_id = ? ORDER BY id ASC", (empresa_id,))
    else:
        cursor.execute("SELECT * FROM destinatarios ORDER BY id ASC")
    rows = cursor.fetchall()
    conn.close()
    resultado = []
    for r in rows:
        aut_str = r["automatizaciones"] or ""
        aut_list = [x.strip() for x in aut_str.split(",") if x.strip()]
        emp_id = r["empresa_id"] if "empresa_id" in r.keys() else "contidep"
        resultado.append({
            "id": r["id"],
            "nombre": r["nombre"],
            "tipo": r["tipo"],
            "activo": bool(r["activo"]),
            "automatizaciones": aut_list,
            "estado": r["estado_envio"] or "Pendiente",
            "fecha": r["fecha_envio"] or "",
            "empresa_id": emp_id
        })
    return resultado

def db_guardar_destinatario(nombre, tipo="Grupo", activo=True, auto_ids=None, empresa_id="contidep"):
    if auto_ids is None:
        auto_ids = []
    auto_str = ",".join(auto_ids)
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO destinatarios (nombre, tipo, activo, automatizaciones, estado_envio, fecha_envio, empresa_id) VALUES (?, ?, ?, ?, 'Pendiente', '', ?)",
        (nombre.strip(), tipo, 1 if activo else 0, auto_str, empresa_id)
    )
    conn.commit()
    conn.close()

def db_actualizar_destinatario(dest_id, nombre, tipo="Grupo", activo=True, empresa_id=None):
    conn = get_db_connection()
    cursor = conn.cursor()
    if empresa_id:
        cursor.execute(
            "UPDATE destinatarios SET nombre = ?, tipo = ?, activo = ?, empresa_id = ? WHERE id = ?",
            (nombre.strip(), tipo, 1 if activo else 0, empresa_id, dest_id)
        )
    else:
        cursor.execute(
            "UPDATE destinatarios SET nombre = ?, tipo = ?, activo = ? WHERE id = ?",
            (nombre.strip(), tipo, 1 if activo else 0, dest_id)
        )
    conn.commit()
    conn.close()

def db_eliminar_destinatario(dest_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM destinatarios WHERE id = ?", (dest_id,))
    conn.commit()
    conn.close()

def db_toggle_auto_destinatario(dest_id, auto_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT automatizaciones FROM destinatarios WHERE id = ?", (dest_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        return False, "Destinatario no encontrado", []
    
    cur_str = row["automatizaciones"] or ""
    lista = [x.strip() for x in cur_str.split(",") if x.strip()]
    if auto_id in lista:
        lista.remove(auto_id)
    else:
        lista.append(auto_id)
    
    nuevo_str = ",".join(lista)
    cursor.execute("UPDATE destinatarios SET automatizaciones = ? WHERE id = ?", (nuevo_str, dest_id))
    conn.commit()
    conn.close()
    return True, "Actualizado", lista

def db_actualizar_estado_destinatario(dest_id, estado, fecha=""):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE destinatarios SET estado_envio = ?, fecha_envio = ? WHERE id = ?", (estado, fecha, dest_id))
    conn.commit()
    conn.close()

def db_sincronizar_a_excel():
    """Genera/actualiza destinatarios.xlsx para compatibilidad con usuarios que abren Excel."""
    try:
        conn = get_db_connection()
        df = pd.read_sql_query("SELECT nombre as Nombre, tipo as Tipo, CASE WHEN activo=1 THEN 'SI' ELSE 'NO' END as Activo, automatizaciones as Automatizaciones, estado_envio as Estado_Envio, fecha_envio as Fecha_Envio FROM destinatarios", conn)
        conn.close()
        df.to_excel(EXCEL_PATH, index=False)
    except Exception as e:
        print(f"[DB] Error sincronizando a Excel: {e}")

# ==================== MÉTODOS DE PLANTILLAS Y AUTOMATIZACIONES ====================
def db_obtener_notificaciones(empresa_id=None):
    conn = get_db_connection()
    cursor = conn.cursor()
    if empresa_id:
        cursor.execute("SELECT * FROM notificaciones WHERE empresa_id = ? ORDER BY id ASC", (empresa_id,))
    else:
        cursor.execute("SELECT * FROM notificaciones ORDER BY id ASC")
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def db_guardar_notificacion(nid, titulo, cuerpo, empresa_id="contidep"):
    conn = get_db_connection()
    cursor = conn.cursor()
    if not nid:
        # Generar ID
        cursor.execute("SELECT id FROM notificaciones")
        existentes = [r["id"] for r in cursor.fetchall()]
        num = 1
        while f"notif_{num}" in existentes:
            num += 1
        nid = f"notif_{num}"
    
    now_str = datetime.now().strftime("%Y-%m-%d")
    cursor.execute(
        "INSERT OR REPLACE INTO notificaciones (id, titulo, cuerpo, fecha_creacion, empresa_id) VALUES (?, ?, ?, ?, ?)",
        (nid, titulo.strip(), cuerpo.strip(), now_str, empresa_id)
    )
    conn.commit()
    conn.close()
    return nid

def db_eliminar_notificacion(nid):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM notificaciones WHERE id = ?", (nid,))
    cursor.execute("DELETE FROM automatizaciones WHERE mensaje_id = ?", (nid,))
    conn.commit()
    conn.close()

def db_obtener_automatizaciones(empresa_id=None):
    conn = get_db_connection()
    cursor = conn.cursor()
    if empresa_id:
        cursor.execute("SELECT * FROM automatizaciones WHERE empresa_id = ? ORDER BY id ASC", (empresa_id,))
    else:
        cursor.execute("SELECT * FROM automatizaciones ORDER BY id ASC")
    rows = cursor.fetchall()
    conn.close()
    res = []
    for r in rows:
        d = dict(r)
        d["activo"] = bool(d["activo"])
        d["repetir_mensual"] = bool(d["repetir_mensual"])
        res.append(d)
    return res

def db_guardar_automatizacion(aid, nombre, mensaje_id, dia_mes, modalidad_dia, hora, activo, repetir_mensual, empresa_id="contidep"):
    conn = get_db_connection()
    cursor = conn.cursor()
    if not aid:
        cursor.execute("SELECT id FROM automatizaciones")
        existentes = [r["id"] for r in cursor.fetchall()]
        num = 1
        while f"auto_{num}" in existentes:
            num += 1
        aid = f"auto_{num}"

    cursor.execute(
        """INSERT OR REPLACE INTO automatizaciones 
        (id, nombre, mensaje_id, dia_mes, modalidad_dia, hora, activo, repetir_mensual, ultimo_envio_periodo, empresa_id) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, COALESCE((SELECT ultimo_envio_periodo FROM automatizaciones WHERE id = ?), ''), ?)""",
        (aid, nombre.strip(), mensaje_id, int(dia_mes), modalidad_dia, hora.strip(), 1 if activo else 0, 1 if repetir_mensual else 0, aid, empresa_id)
    )
    conn.commit()
    conn.close()
    return aid

def db_eliminar_automatizacion(aid):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM automatizaciones WHERE id = ?", (aid,))
    # Limpiar referencias en destinatarios
    cursor.execute("SELECT id, automatizaciones FROM destinatarios WHERE automatizaciones LIKE ?", (f"%{aid}%",))
    rows = cursor.fetchall()
    for r in rows:
        lista = [x.strip() for x in (r["automatizaciones"] or "").split(",") if x.strip() and x.strip() != aid]
        cursor.execute("UPDATE destinatarios SET automatizaciones = ? WHERE id = ?", (",".join(lista), r["id"]))
    conn.commit()
    conn.close()

def db_actualizar_periodo_auto(aid, periodo):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE automatizaciones SET ultimo_envio_periodo = ? WHERE id = ?", (periodo, aid))
    conn.commit()
    conn.close()
