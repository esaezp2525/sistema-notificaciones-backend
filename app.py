import os
import sys
import time
import random
import threading
import queue
import urllib.parse
from datetime import datetime
import pandas as pd
import customtkinter as ctk
from tkinter import filedialog, messagebox, ttk
import tkinter as tk
from playwright.sync_api import sync_playwright

# Configurar UTF-8 de forma segura (evita crash en pythonw donde sys.stdout es None)
if sys.stdout is not None and getattr(sys.stdout, 'encoding', None):
    if sys.stdout.encoding and sys.stdout.encoding.lower() != 'utf-8':
        try:
            sys.stdout.reconfigure(encoding='utf-8')
        except Exception:
            pass

# Configuración visual de CustomTkinter
ctk.set_appearance_mode("Dark")
ctk.set_default_color_theme("blue")

EXCEL_DEFAULT = "clientes_f29.xlsx"
MENSAJE_DEFAULT = "mensaje_plantilla.txt"
SESSION_DIR = os.path.abspath("whatsapp_session")

def limpiar_telefono(numero):
    if pd.isna(numero):
        return None
    num_str = str(numero).strip().split('.')[0]
    solo_digitos = "".join([c for c in num_str if c.isdigit()])
    if not solo_digitos:
        return None
    if len(solo_digitos) == 9 and solo_digitos.startswith("9"):
        return "56" + solo_digitos
    elif len(solo_digitos) == 8:
        return "569" + solo_digitos
    elif len(solo_digitos) >= 11 and solo_digitos.startswith("56"):
        return solo_digitos
    return solo_digitos


class AppRecordatoriosF29(ctk.CTk):
    def __init__(self):
        super().__init__()

        self.title("Contidep - Recordatorios F29 WhatsApp")
        self.geometry("1050x720")
        self.minsize(950, 650)

        self.excel_path = os.path.abspath(EXCEL_DEFAULT)
        self.log_queue = queue.Queue()
        self.running_thread = None
        self.stop_requested = False

        self.crear_archivos_si_no_existen()
        self.construir_interfaz()
        self.cargar_datos_excel()
        self.verificar_cola_logs()

        # Asegurar que la ventana se muestre al frente al abrir
        self.lift()
        self.attributes('-topmost', True)
        self.after(400, lambda: self.attributes('-topmost', False))
        self.focus_force()

    def crear_archivos_si_no_existen(self):
        if not os.path.exists(MENSAJE_DEFAULT):
            msg = (
                "⏰ ¡Recordatorio importante!🛑\n\n"
                "Hoy vence el plazo para pagar tu Formulario 29 en www.sii.cl. Tienes hasta las 23:45 hrs ⌛\n"
                "Recuerda que pagar fuera de plazo genera multas e intereses\n"
                "📩 Este es un mensaje automático. Si ya pagaste o declaraste sin movimiento, no te preocupes y omite este aviso.\n\n"
                "¡Gracias! 😊\n"
                "Contidep"
            )
            with open(MENSAJE_DEFAULT, "w", encoding="utf-8") as f:
                f.write(msg)

        if not os.path.exists(EXCEL_DEFAULT):
            datos = [
                {"Nombre_Cliente": "El Pache SPA", "Telefono": "+56912345678", "Enviar": "SI", "Estado_Envio": "Pendiente", "Fecha_Envio": ""},
                {"Nombre_Cliente": "Contabilidad del Barrio", "Telefono": "+56987654321", "Enviar": "SI", "Estado_Envio": "Pendiente", "Fecha_Envio": ""},
                {"Nombre_Cliente": "Stecnico CL", "Telefono": "+56911223344", "Enviar": "SI", "Estado_Envio": "Pendiente", "Fecha_Envio": ""}
            ]
            pd.DataFrame(datos).to_excel(EXCEL_DEFAULT, index=False)

    def construir_interfaz(self):
        # Header superior
        self.header_frame = ctk.CTkFrame(self, height=70, corner_radius=0, fg_color=("#1f2937", "#111827"))
        self.header_frame.pack(side="top", fill="x")

        self.lbl_title = ctk.CTkLabel(
            self.header_frame, 
            text="⏰ Automatización F29 - WhatsApp Contidep", 
            font=ctk.CTkFont(size=20, weight="bold"),
            text_color="#10b981"
        )
        self.lbl_title.pack(side="left", padx=25, pady=15)

        self.theme_btn = ctk.CTkOptionMenu(
            self.header_frame, 
            values=["Dark", "Light"],
            command=ctk.set_appearance_mode,
            width=90,
            height=30
        )
        self.theme_btn.pack(side="right", padx=20, pady=15)

        # Tabview principal
        self.tabview = ctk.CTkTabview(self, corner_radius=12)
        self.tabview.pack(fill="both", expand=True, padx=20, pady=15)

        self.tab_envio = self.tabview.add(" 🚀 Enviar Recordatorios ")
        self.tab_clientes = self.tabview.add(" 👥 Gestionar Clientes ")
        self.tab_ajustes = self.tabview.add(" ⚙️ WhatsApp & Ajustes ")

        self.construir_tab_envio()
        self.construir_tab_clientes()
        self.construir_tab_ajustes()

    def construir_tab_envio(self):
        # Panel superior: Métricas
        self.stats_frame = ctk.CTkFrame(self.tab_envio, corner_radius=10)
        self.stats_frame.pack(fill="x", padx=10, pady=(10, 15))

        self.lbl_stat_total = ctk.CTkLabel(self.stats_frame, text="Total Clientes: 0", font=ctk.CTkFont(size=13, weight="bold"))
        self.lbl_stat_total.pack(side="left", padx=20, pady=12)

        self.lbl_stat_pendientes = ctk.CTkLabel(self.stats_frame, text="Pendientes: 0", font=ctk.CTkFont(size=13, weight="bold"), text_color="#f59e0b")
        self.lbl_stat_pendientes.pack(side="left", padx=20, pady=12)

        self.lbl_stat_enviados = ctk.CTkLabel(self.stats_frame, text="Enviados: 0", font=ctk.CTkFont(size=13, weight="bold"), text_color="#10b981")
        self.lbl_stat_enviados.pack(side="left", padx=20, pady=12)

        self.lbl_stat_errores = ctk.CTkLabel(self.stats_frame, text="Errores: 0", font=ctk.CTkFont(size=13, weight="bold"), text_color="#ef4444")
        self.lbl_stat_errores.pack(side="left", padx=20, pady=12)

        # Contenedor central dividido en 2 columnas
        self.content_frame = ctk.CTkFrame(self.tab_envio, fg_color="transparent")
        self.content_frame.pack(fill="both", expand=True, padx=5, pady=0)

        # Columna Izquierda: Plantilla y controles
        self.left_frame = ctk.CTkFrame(self.content_frame, corner_radius=10)
        self.left_frame.pack(side="left", fill="both", expand=True, padx=(5, 10), pady=5)

        ctk.CTkLabel(self.left_frame, text="📝 Mensaje a Enviar:", font=ctk.CTkFont(size=14, weight="bold")).pack(anchor="w", padx=15, pady=(12, 5))
        
        self.txt_mensaje = ctk.CTkTextbox(self.left_frame, height=200, font=ctk.CTkFont(size=12))
        self.txt_mensaje.pack(fill="both", expand=True, padx=15, pady=5)
        self.cargar_plantilla_mensaje()

        btn_plantilla_box = ctk.CTkFrame(self.left_frame, fg_color="transparent")
        btn_plantilla_box.pack(fill="x", padx=15, pady=6)

        self.btn_guardar_msg = ctk.CTkButton(btn_plantilla_box, text="💾 Guardar Plantilla", command=self.guardar_plantilla_mensaje, width=130)
        self.btn_guardar_msg.pack(side="left")

        self.btn_restaurar_msg = ctk.CTkButton(btn_plantilla_box, text="🔄 Recargar", command=self.cargar_plantilla_mensaje, width=100, fg_color="#4b5563")
        self.btn_restaurar_msg.pack(side="left", padx=10)

        # Botones de Acción
        self.action_box = ctk.CTkFrame(self.left_frame, fg_color="transparent")
        self.action_box.pack(fill="x", padx=15, pady=(10, 15))

        self.btn_iniciar = ctk.CTkButton(
            self.action_box, 
            text="🚀 INICIAR ENVÍO AUTOMÁTICO", 
            font=ctk.CTkFont(size=14, weight="bold"),
            fg_color="#10b981", 
            hover_color="#059669",
            height=45,
            command=self.iniciar_envio
        )
        self.btn_iniciar.pack(fill="x", pady=(0, 8))

        self.btn_detener = ctk.CTkButton(
            self.action_box, 
            text="⏹️ Detener Envío", 
            font=ctk.CTkFont(size=13, weight="bold"),
            fg_color="#dc2626", 
            hover_color="#b91c1c",
            height=32,
            state="disabled",
            command=self.detener_envio
        )
        self.btn_detener.pack(fill="x")

        # Columna Derecha: Consola en vivo y progreso
        self.right_frame = ctk.CTkFrame(self.content_frame, corner_radius=10)
        self.right_frame.pack(side="right", fill="both", expand=True, padx=(5, 5), pady=5)

        ctk.CTkLabel(self.right_frame, text="💻 Consola de Progreso en Vivo:", font=ctk.CTkFont(size=14, weight="bold")).pack(anchor="w", padx=15, pady=(12, 5))

        self.progress_bar = ctk.CTkProgressBar(self.right_frame)
        self.progress_bar.pack(fill="x", padx=15, pady=(0, 10))
        self.progress_bar.set(0)

        self.txt_logs = ctk.CTkTextbox(self.right_frame, font=ctk.CTkFont(family="Consolas", size=11))
        self.txt_logs.pack(fill="both", expand=True, padx=15, pady=(0, 15))

    def construir_tab_clientes(self):
        # Barra de herramientas superior
        top_bar = ctk.CTkFrame(self.tab_clientes, fg_color="transparent")
        top_bar.pack(fill="x", padx=10, pady=10)

        ctk.CTkButton(top_bar, text="🔄 Recargar Tabla", command=self.cargar_datos_excel, width=120).pack(side="left", padx=5)
        ctk.CTkButton(top_bar, text="📂 Abrir en Microsoft Excel", fg_color="#16a34a", hover_color="#15803d", command=self.abrir_en_excel, width=170).pack(side="left", padx=5)
        ctk.CTkButton(top_bar, text="➕ Agregar Nuevo Cliente", command=self.popup_agregar_cliente, width=160).pack(side="left", padx=5)
        ctk.CTkButton(top_bar, text="🔁 Resetear Todos a 'Pendiente'", fg_color="#ca8a04", hover_color="#a16207", command=self.resetear_estados, width=200).pack(side="right", padx=5)

        # Frame para la tabla con Treeview
        table_frame = ctk.CTkFrame(self.tab_clientes, corner_radius=10)
        table_frame.pack(fill="both", expand=True, padx=10, pady=(0, 10))

        # Estilo para Treeview
        style = ttk.Style()
        style.theme_use("clam")
        style.configure("Treeview", 
                        background="#1e293b", 
                        foreground="#f8fafc", 
                        rowheight=28, 
                        fieldbackground="#1e293b",
                        font=('Arial', 10))
        style.configure("Treeview.Heading", 
                        background="#0f172a", 
                        foreground="#38bdf8", 
                        font=('Arial', 10, 'bold'))
        style.map("Treeview", background=[('selected', '#2563eb')])

        columns = ("Nombre", "Telefono", "Enviar", "Estado", "Fecha")
        self.tree = ttk.Treeview(table_frame, columns=columns, show="headings")
        
        self.tree.heading("Nombre", text="Nombre Cliente")
        self.tree.heading("Telefono", text="Teléfono")
        self.tree.heading("Enviar", text="Enviar (SI/NO)")
        self.tree.heading("Estado", text="Estado Envío")
        self.tree.heading("Fecha", text="Fecha Envío")

        self.tree.column("Nombre", width=220, anchor="w")
        self.tree.column("Telefono", width=140, anchor="center")
        self.tree.column("Enviar", width=100, anchor="center")
        self.tree.column("Estado", width=160, anchor="center")
        self.tree.column("Fecha", width=160, anchor="center")

        scrollbar = ttk.Scrollbar(table_frame, orient="vertical", command=self.tree.yview)
        self.tree.configure(yscrollcommand=scrollbar.set)
        
        scrollbar.pack(side="right", fill="y")
        self.tree.pack(fill="both", expand=True)

    def construir_tab_ajustes(self):
        frame = ctk.CTkFrame(self.tab_ajustes, corner_radius=12)
        frame.pack(fill="both", expand=True, padx=15, pady=15)

        ctk.CTkLabel(frame, text="⚙️ Configuración y Estado de Sesión WhatsApp", font=ctk.CTkFont(size=16, weight="bold")).pack(anchor="w", padx=20, pady=(20, 10))

        ctk.CTkLabel(
            frame, 
            text="• La sesión de WhatsApp Web queda memorizada en tu equipo en la carpeta local 'whatsapp_session'.\n"
                 "• Solo necesitas escanear el código QR una vez.\n"
                 "• Si necesitas cambiar de número de teléfono o desconectar la sesión, puedes borrar los datos abajo.",
            justify="left",
            font=ctk.CTkFont(size=13)
        ).pack(anchor="w", padx=20, pady=10)

        btn_box = ctk.CTkFrame(frame, fg_color="transparent")
        btn_box.pack(anchor="w", padx=20, pady=15)

        ctk.CTkButton(
            btn_box, 
            text="📱 Probar Conexión WhatsApp (Abrir navegador)", 
            command=self.probar_conexion_whatsapp,
            width=260,
            height=36
        ).pack(side="left", padx=(0, 15))

        ctk.CTkButton(
            btn_box, 
            text="🗑️ Desconectar / Borrar Sesión Guardada", 
            fg_color="#dc2626", 
            hover_color="#b91c1c",
            command=self.borrar_sesion_whatsapp,
            width=250,
            height=36
        ).pack(side="left")

        ctk.CTkLabel(frame, text="🛡️ Pausa Anti-Spam entre Mensajes:", font=ctk.CTkFont(size=14, weight="bold")).pack(anchor="w", padx=20, pady=(25, 5))
        ctk.CTkLabel(
            frame, 
            text="Para proteger tu número y evitar que WhatsApp te clasifique como spam, se aplica una pausa automática aleatoria de 8 a 14 segundos entre cada envío.",
            text_color="#94a3b8"
        ).pack(anchor="w", padx=20, pady=5)

    def log(self, mensaje):
        timestamp = datetime.now().strftime("%H:%M:%S")
        self.log_queue.put(f"[{timestamp}] {mensaje}")

    def verificar_cola_logs(self):
        try:
            while True:
                msg = self.log_queue.get_nowait()
                self.txt_logs.insert("end", msg + "\n")
                self.txt_logs.see("end")
        except queue.Empty:
            pass
        self.after(200, self.verificar_cola_logs)

    def cargar_plantilla_mensaje(self):
        if os.path.exists(MENSAJE_DEFAULT):
            with open(MENSAJE_DEFAULT, "r", encoding="utf-8") as f:
                contenido = f.read()
            self.txt_mensaje.delete("0.0", "end")
            self.txt_mensaje.insert("0.0", contenido)

    def guardar_plantilla_mensaje(self):
        contenido = self.txt_mensaje.get("0.0", "end").strip()
        with open(MENSAJE_DEFAULT, "w", encoding="utf-8") as f:
            f.write(contenido)
        messagebox.showinfo("Plantilla Guardada", "¡La plantilla del mensaje se ha guardado correctamente!")

    def cargar_datos_excel(self):
        if not os.path.exists(self.excel_path):
            return

        try:
            df = pd.read_excel(self.excel_path)
            for col in ["Nombre_Cliente", "Telefono", "Enviar", "Estado_Envio", "Fecha_Envio"]:
                if col not in df.columns:
                    df[col] = ""

            # Limpiar tabla
            for row in self.tree.get_children():
                self.tree.delete(row)

            total = len(df)
            pendientes = 0
            enviados = 0
            errores = 0

            for _, row in df.iterrows():
                estado = str(row.get("Estado_Envio", "")).strip()
                enviar = str(row.get("Enviar", "")).strip().upper()
                
                if estado.lower() == "enviado":
                    enviados += 1
                elif "error" in estado.lower() or "invalido" in estado.lower() or "no registrado" in estado.lower():
                    errores += 1
                elif enviar == "SI":
                    pendientes += 1

                self.tree.insert("", "end", values=(
                    row.get("Nombre_Cliente", ""),
                    row.get("Telefono", ""),
                    row.get("Enviar", "SI"),
                    estado,
                    row.get("Fecha_Envio", "")
                ))

            self.lbl_stat_total.configure(text=f"Total Clientes: {total}")
            self.lbl_stat_pendientes.configure(text=f"Pendientes: {pendientes}")
            self.lbl_stat_enviados.configure(text=f"Enviados: {enviados}")
            self.lbl_stat_errores.configure(text=f"Errores: {errores}")

        except Exception as e:
            self.log(f"❌ Error al cargar Excel: {e}")

    def abrir_en_excel(self):
        if os.path.exists(self.excel_path):
            os.startfile(self.excel_path)
        else:
            messagebox.showwarning("Aviso", "El archivo Excel no existe.")

    def popup_agregar_cliente(self):
        popup = ctk.CTkToplevel(self)
        popup.title("Agregar Cliente")
        popup.geometry("380x300")
        popup.grab_set()

        ctk.CTkLabel(popup, text="Nombre del Cliente:", font=ctk.CTkFont(weight="bold")).pack(anchor="w", padx=20, pady=(15, 2))
        ent_nombre = ctk.CTkEntry(popup, placeholder_text="Ej: Panadería Central SPA")
        ent_nombre.pack(fill="x", padx=20, pady=5)

        ctk.CTkLabel(popup, text="Teléfono (+569...):", font=ctk.CTkFont(weight="bold")).pack(anchor="w", padx=20, pady=(10, 2))
        ent_telefono = ctk.CTkEntry(popup, placeholder_text="Ej: +56912345678")
        ent_telefono.pack(fill="x", padx=20, pady=5)

        def guardar():
            nom = ent_nombre.get().strip()
            tel = ent_telefono.get().strip()
            if not nom or not tel:
                messagebox.showwarning("Campos Requeridos", "Por favor ingresa nombre y teléfono.")
                return

            try:
                df = pd.read_excel(self.excel_path)
                nuevo = {
                    "Nombre_Cliente": nom,
                    "Telefono": tel,
                    "Enviar": "SI",
                    "Estado_Envio": "Pendiente",
                    "Fecha_Envio": ""
                }
                df = pd.concat([df, pd.DataFrame([nuevo])], ignore_index=True)
                df.to_excel(self.excel_path, index=False)
                self.cargar_datos_excel()
                popup.destroy()
                messagebox.showinfo("Éxito", "Cliente agregado correctamente.")
            except Exception as e:
                messagebox.showerror("Error", f"No se pudo guardar: {e}")

        ctk.CTkButton(popup, text="💾 Guardar Cliente", fg_color="#10b981", hover_color="#059669", command=guardar).pack(fill="x", padx=20, pady=20)

    def resetear_estados(self):
        if messagebox.askyesno("Confirmar", "¿Deseas volver a marcar todos los clientes como 'Pendiente' para un nuevo envío?"):
            try:
                df = pd.read_excel(self.excel_path)
                df["Estado_Envio"] = "Pendiente"
                df["Fecha_Envio"] = ""
                df["Enviar"] = "SI"
                df.to_excel(self.excel_path, index=False)
                self.cargar_datos_excel()
                self.log("🔁 Estados reseteados a 'Pendiente'.")
                messagebox.showinfo("Listo", "Todos los clientes han sido reseteados a 'Pendiente'.")
            except Exception as e:
                messagebox.showerror("Error", f"Error al resetear: {e}")

    def probar_conexion_whatsapp(self):
        def _probar():
            self.log("📱 Abriendo WhatsApp Web para verificar sesión...")
            with sync_playwright() as p:
                context = p.chromium.launch_persistent_context(
                    user_data_dir=SESSION_DIR,
                    headless=False,
                    args=["--start-maximized"]
                )
                page = context.pages[0] if context.pages else context.new_page()
                page.goto("https://web.whatsapp.com")
                self.log("📌 Navegador abierto. Cierra la ventana cuando hayas terminado.")
                # Esperar hasta que el usuario cierre el navegador
                try:
                    while len(context.pages) > 0:
                        time.sleep(1)
                except Exception:
                    pass
                self.log("✅ Prueba de WhatsApp finalizada.")

        threading.Thread(target=_probar, daemon=True).start()

    def borrar_sesion_whatsapp(self):
        if messagebox.askyesno("Confirmar", "¿Seguro que deseas eliminar los datos de sesión de WhatsApp guardados en este equipo?"):
            try:
                import shutil
                if os.path.exists(SESSION_DIR):
                    shutil.rmtree(SESSION_DIR)
                messagebox.showinfo("Sesión Eliminada", "La sesión se eliminó. La próxima vez se solicitará escanear el código QR.")
                self.log("🗑️ Sesión de WhatsApp eliminada.")
            except Exception as e:
                messagebox.showerror("Error", f"No se pudo borrar: {e}. Asegúrate de que no haya navegadores abiertos.")

    def iniciar_envio(self):
        if not os.path.exists(self.excel_path):
            messagebox.showerror("Error", "No se encontró el archivo Excel.")
            return

        df = pd.read_excel(self.excel_path)
        pendientes = df[(df["Enviar"].astype(str).str.upper() == "SI") & 
                        (df["Estado_Envio"].astype(str).str.upper() != "ENVIADO")]

        if len(pendientes) == 0:
            messagebox.showinfo("Aviso", "No hay clientes pendientes con 'Enviar = SI'.")
            return

        if not messagebox.askyesno("Iniciar Envíos", f"Se enviará el recordatorio a {len(pendientes)} clientes pendientes.\n\n¿Deseas comenzar ahora?"):
            return

        self.btn_iniciar.configure(state="disabled")
        self.btn_detener.configure(state="normal")
        self.progress_bar.set(0)
        self.stop_requested = False

        plantilla = self.txt_mensaje.get("0.0", "end").strip()
        self.running_thread = threading.Thread(target=self._hilo_proceso_envio, args=(plantilla,), daemon=True)
        self.running_thread.start()

    def detener_envio(self):
        if messagebox.askyesno("Detener", "¿Deseas detener el proceso de envío?"):
            self.stop_requested = True
            self.log("⚠️ Solicitud de detención recibida. Finalizando contacto actual...")

    def _hilo_proceso_envio(self, plantilla):
        self.log("=" * 45)
        self.log("🚀 Iniciando motor de automatización...")
        
        try:
            df = pd.read_excel(self.excel_path)
            pendientes = df[(df["Enviar"].astype(str).str.upper() == "SI") & 
                            (df["Estado_Envio"].astype(str).str.upper() != "ENVIADO")]
            total = len(pendientes)
            
            with sync_playwright() as p:
                self.log("🌐 Abriendo navegador con sesión guardada...")
                context = p.chromium.launch_persistent_context(
                    user_data_dir=SESSION_DIR,
                    headless=False,
                    args=["--start-maximized"]
                )
                page = context.pages[0] if context.pages else context.new_page()

                self.log("⌛ Conectando con WhatsApp Web...")
                page.goto("https://web.whatsapp.com")

                try:
                    page.wait_for_selector("#pane-side, [data-testid='chat-list']", timeout=120000)
                    self.log("✅ Sesión de WhatsApp activa.")
                except Exception:
                    self.log("⚠️ No se pudo iniciar sesión en WhatsApp a tiempo.")
                    context.close()
                    self._finalizar_hilo()
                    return

                time.sleep(2)
                enviados = 0
                procesados = 0

                for idx, row in pendientes.iterrows():
                    if self.stop_requested:
                        self.log("⏹️ Proceso detenido por el usuario.")
                        break

                    procesados += 1
                    progreso = procesados / total
                    self.after(0, lambda val=progreso: self.progress_bar.set(val))

                    cliente = str(row.get("Nombre_Cliente", f"Cliente #{idx+1}"))
                    telefono = limpiar_telefono(row.get("Telefono", ""))

                    if not telefono:
                        self.log(f"⚠️ [{cliente}] Número inválido. Saltando...")
                        df.at[idx, "Estado_Envio"] = "Telefono Invalido"
                        df.to_excel(self.excel_path, index=False)
                        self.after(0, self.cargar_datos_excel)
                        continue

                    msg = plantilla.replace("{cliente}", cliente)
                    url = f"https://web.whatsapp.com/send?phone={telefono}&text={urllib.parse.quote(msg)}"

                    self.log(f"📨 [{procesados}/{total}] Preparando envío para: {cliente} ({telefono})...")

                    try:
                        page.goto(url)
                        
                        chat_abierto = False
                        for _ in range(25):
                            if self.stop_requested:
                                break
                            popup_error = page.locator("text='El número de teléfono compartido a través de la dirección URL no es válido'")
                            popup_error_en = page.locator("text='Phone number shared via url is invalid'")
                            if popup_error.count() > 0 or popup_error_en.count() > 0:
                                self.log(f"❌ [{cliente}] El número no está registrado en WhatsApp.")
                                df.at[idx, "Estado_Envio"] = "No Registrado"
                                ok_btn = page.locator("button:has-text('OK'), div[role='button']:has-text('OK')")
                                if ok_btn.count() > 0:
                                    ok_btn.first.click()
                                break

                            caja_mensaje = page.locator("div[contenteditable='true'][data-tab='10'], footer div[role='textbox']")
                            if caja_mensaje.count() > 0:
                                chat_abierto = True
                                break
                            time.sleep(1)

                        if not chat_abierto:
                            if df.at[idx, "Estado_Envio"] != "No Registrado":
                                df.at[idx, "Estado_Envio"] = "Error de Carga"
                                self.log(f"❌ [{cliente}] Error al cargar chat.")
                            df.to_excel(self.excel_path, index=False)
                            self.after(0, self.cargar_datos_excel)
                            continue

                        time.sleep(1.5)

                        boton_enviar = page.locator("button[data-testid='send'], button:has([data-icon='send']), span[data-icon='send']")
                        if boton_enviar.count() > 0:
                            boton_enviar.first.click()
                        else:
                            caja = page.locator("div[contenteditable='true'][data-tab='10'], footer div[role='textbox']").first
                            caja.focus()
                            page.keyboard.press("Enter")

                        time.sleep(2.5)

                        ahora = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                        df.at[idx, "Estado_Envio"] = "Enviado"
                        df.at[idx, "Fecha_Envio"] = ahora
                        df.to_excel(self.excel_path, index=False)
                        enviados += 1
                        self.log(f"✅ [{cliente}] Mensaje enviado con éxito.")
                        self.after(0, self.cargar_datos_excel)

                        if procesados < total and not self.stop_requested:
                            pausa = random.randint(8, 14)
                            self.log(f"⏳ Pausa de seguridad: {pausa}s...")
                            time.sleep(pausa)

                    except Exception as e:
                        self.log(f"❌ [{cliente}] Error: {e}")
                        df.at[idx, "Estado_Envio"] = "Error"
                        df.to_excel(self.excel_path, index=False)
                        self.after(0, self.cargar_datos_excel)
                        time.sleep(2)

                self.log("=" * 45)
                self.log(f"🏁 Proceso completado. Mensajes enviados: {enviados}")
                time.sleep(3)
                context.close()

        except Exception as e:
            self.log(f"❌ Error en el proceso general: {e}")

        self._finalizar_hilo()

    def _finalizar_hilo(self):
        self.after(0, lambda: self.btn_iniciar.configure(state="normal"))
        self.after(0, lambda: self.btn_detener.configure(state="disabled"))
        self.after(0, self.cargar_datos_excel)


if __name__ == "__main__":
    app = AppRecordatoriosF29()
    app.mainloop()
