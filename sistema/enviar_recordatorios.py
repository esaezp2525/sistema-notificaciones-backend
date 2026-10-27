import os
import sys
import time
import random
from datetime import datetime
import pandas as pd
from playwright.sync_api import sync_playwright

# Configurar UTF-8 para consola de Windows
if sys.stdout is not None and getattr(sys.stdout, 'encoding', None):
    if sys.stdout.encoding and sys.stdout.encoding.lower() != 'utf-8':
        try:
            sys.stdout.reconfigure(encoding='utf-8')
        except Exception:
            pass

EXCEL_FILE = "clientes_f29.xlsx"
MENSAJE_FILE = "mensaje_plantilla.txt"
SESSION_DIR = os.path.abspath("whatsapp_session")

def cargar_mensaje():
    if not os.path.exists(MENSAJE_FILE):
        return (
            "⏰ ¡Recordatorio importante!🛑\n\n"
            "Hoy vence el plazo para pagar tu Formulario 29 en www.sii.cl. Tienes hasta las 23:45 hrs ⌛\n"
            "Recuerda que pagar fuera de plazo genera multas e intereses\n"
            "📩 Este es un mensaje automático. Si ya pagaste o declaraste sin movimiento, no te preocupes y omite este aviso.\n\n"
            "¡Gracias! 😊\n"
            "Contidep"
        )
    with open(MENSAJE_FILE, "r", encoding="utf-8") as f:
        return f.read().strip()

def enviar_mensajes():
    print("=" * 65)
    print("      CONTIDEP — ENVÍO DE RECORDATORIOS F29 A GRUPOS WHATSAPP     ")
    print("=" * 65)

    if not os.path.exists(EXCEL_FILE):
        print(f"❌ Error: No se encontró el archivo '{EXCEL_FILE}'.")
        return

    plantilla = cargar_mensaje()
    df = pd.read_excel(EXCEL_FILE)

    col_name = "Nombre_Grupo" if "Nombre_Grupo" in df.columns else "Nombre_Cliente"

    if "Estado_Envio" not in df.columns:
        df["Estado_Envio"] = "Pendiente"
    if "Fecha_Envio" not in df.columns:
        df["Fecha_Envio"] = ""
    if "Enviar" not in df.columns:
        df["Enviar"] = "SI"

    pendientes = df[(df["Enviar"].astype(str).str.upper() == "SI") & 
                    (df["Estado_Envio"].astype(str).str.upper() != "ENVIADO")]

    total = len(pendientes)
    if total == 0:
        print("\n✅ No hay grupos pendientes por notificar.")
        return

    print(f"\n📋 Se encontraron {total} grupos listos para envío.")
    confirmacion = input("\n¿Deseas iniciar el envío a los grupos en WhatsApp? (s/n): ").strip().lower()
    if confirmacion not in ["s", "si", "y", "yes"]:
        print("Operación cancelada.")
        return

    print("\n🚀 Abriendo WhatsApp Web con sesión guardada...")

    with sync_playwright() as p:
        context = p.chromium.launch_persistent_context(
            user_data_dir=SESSION_DIR,
            headless=False,
            viewport={"width": 1280, "height": 800},
            args=["--start-maximized"]
        )
        page = context.pages[0] if context.pages else context.new_page()
        page.goto("https://web.whatsapp.com")

        print("⌛ Esperando conexión a WhatsApp Web...")
        try:
            page.wait_for_selector("#pane-side, [data-testid='chat-list']", timeout=120000)
            print("✅ Conectado a WhatsApp Web.")
        except Exception:
            print("⚠️ Tiempo agotado para conectar a WhatsApp.")
            context.close()
            return

        time.sleep(2)
        enviados = 0
        fallidos = 0

        for idx, row in pendientes.iterrows():
            grupo = str(row.get(col_name, f"Grupo #{idx+1}")).strip()

            if not grupo:
                df.at[idx, "Estado_Envio"] = "Nombre Vacio"
                df.to_excel(EXCEL_FILE, index=False)
                fallidos += 1
                continue

            print(f"\n📨 [{enviados + fallidos + 1}/{total}] Buscando grupo: '{grupo}'...")

            try:
                # 1. Limpiar y enfocar barra de búsqueda
                search_box = page.locator("div[contenteditable='true'][data-tab='3'], [data-testid='chat-list-search'], #side div[role='textbox']").first
                search_box.click()
                time.sleep(0.5)

                page.keyboard.press("Control+A")
                page.keyboard.press("Backspace")
                time.sleep(0.3)

                cancel_btn = page.locator("button[aria-label='Cancelar búsqueda'], button[aria-label='Cancel search'], span[data-icon='x-alt']").first
                if cancel_btn.is_visible():
                    cancel_btn.click()
                    time.sleep(0.3)
                    search_box.click()

                # 2. Escribir nombre del grupo
                page.keyboard.type(grupo, delay=40)
                time.sleep(2)

                # 3. Localizar coincidencia en la lista
                keyword = grupo.split("©")[0].strip()
                selectores = [
                    f"#pane-side span[title*='{keyword}']",
                    f"#pane-side div[role='listitem']:has-text('{keyword}')",
                    f"#pane-side div[data-testid='cell-frame-container']:has-text('{keyword}')"
                ]

                chat = None
                for sel in selectores:
                    loc = page.locator(sel)
                    if loc.count() > 0 and loc.first.is_visible():
                        chat = loc.first
                        break

                if not chat:
                    print(f"❌ Grupo '{grupo}' no encontrado en WhatsApp.")
                    df.at[idx, "Estado_Envio"] = "Grupo No Encontrado"
                    df.to_excel(EXCEL_FILE, index=False)
                    fallidos += 1
                    page.keyboard.press("Escape")
                    time.sleep(1)
                    continue

                # 4. Abrir chat grupal
                chat.click()
                time.sleep(1.5)

                # 5. Escribir y enviar mensaje
                caja_msg = page.locator("footer div[contenteditable='true'], div[data-tab='10']").first
                caja_msg.click()
                time.sleep(0.5)

                msg_custom = str(row.get("Mensaje", "")).strip() if ("Mensaje" in row and pd.notna(row.get("Mensaje"))) else ""
                texto_base = msg_custom if msg_custom else plantilla
                msg_final = texto_base.replace("{cliente}", grupo).replace("{grupo}", grupo)
                page.keyboard.insert_text(msg_final)
                time.sleep(1)

                btn_send = page.locator("button[data-testid='send'], button:has([data-icon='send']), span[data-icon='send']").first
                if btn_send.is_visible():
                    btn_send.click()
                else:
                    page.keyboard.press("Enter")

                time.sleep(2.5)
                page.keyboard.press("Escape")

                ahora = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                df.at[idx, "Estado_Envio"] = "Enviado"
                df.at[idx, "Fecha_Envio"] = ahora
                df.to_excel(EXCEL_FILE, index=False)
                enviados += 1
                print(f"✅ ¡Mensaje entregado en el grupo '{grupo}'!")

                if enviados + fallidos < total:
                    pausa = random.randint(8, 14)
                    print(f"⏳ Pausa de seguridad: {pausa}s...")
                    time.sleep(pausa)

            except Exception as e:
                print(f"❌ Error con '{grupo}': {e}")
                df.at[idx, "Estado_Envio"] = "Error"
                df.to_excel(EXCEL_FILE, index=False)
                fallidos += 1
                page.keyboard.press("Escape")
                time.sleep(2)

        print("\n" + "=" * 65)
        print("                  RESUMEN DE NOTIFICACIONES                  ")
        print("=" * 65)
        print(f"✅ Entregados con éxito en grupos: {enviados}")
        print(f"❌ No encontrados / Errores: {fallidos}")
        print(f"📁 Planilla actualizada en: {EXCEL_FILE}")
        print("=" * 65)
        time.sleep(3)
        context.close()

if __name__ == "__main__":
    enviar_mensajes()
