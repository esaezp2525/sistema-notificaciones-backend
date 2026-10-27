# 📖 Manual de Usuario — Sistema de Notificaciones WhatsApp

---

## 1. Introducción
El **Sistema de Notificaciones** es una aplicación de escritorio diseñada para automatizar el envío periódico y personalizado de mensajes a través de WhatsApp, tanto a grupos como a personas individuales.

### Características Principales:
- 👥 **Destinatarios Ilimitados:** Gestiona cualquier cantidad de grupos o contactos con su identificador real de WhatsApp.
- 💬 **N Mensajes de Notificación:** Crea y edita múltiples plantillas de mensaje independientes con soporte de variables dinámicas (`{nombre}`, `{fecha}`, `{hora}`, `{dia}`).
- ⏰ **N Automatizaciones con Días Hábiles:** Asocia múltiples reglas de horario a cada mensaje. Soporta **Día Hábil** (traslada automáticamente el envío al siguiente día hábil si cae en fin de semana o feriado) o **Día Normal** (calendario exacto).
- ☑️ **Checklist de Asignación por Destinatario:** Asigna con un solo clic qué automatizaciones recibe cada persona o grupo directamente desde la tabla de destinatarios.
- 🔕 **Ejecución 100% Silenciosa:** Los envíos y escaneos ocurren en segundo plano sin interrumpir tu trabajo en el equipo.
- 📊 **Sincronización Excel:** Datos respaldados en tiempo real en `destinatarios.xlsx`.

---

## 2. Instalación y Primer Uso

### ¿Cómo abrir la aplicación?
1. Haz doble clic en el acceso directo **"Sistema de Notificaciones"** en tu Escritorio (o ejecuta `Iniciar_App_Escritorio.bat`).
2. Se abrirá la ventana con el panel web del sistema.

### ¿Cómo llevar el sistema a otro computador?
1. Copia el archivo **`Sistema_de_Notificaciones.zip`** (en tu Escritorio) a la otra computadora.
2. Descomprímelo en una carpeta.
3. Ejecuta **`Instalar_en_otra_PC.bat`**:
   - Instalará automáticamente Python si falta.
   - Descargará los componentes y creará el acceso directo en el Escritorio.

---

## 3. Conexión de WhatsApp (Una Sola Vez)
1. En la esquina superior derecha, haz clic en **"📲 Conectar"**.
2. Se abrirá la ventana de WhatsApp Web con el código QR.
3. Abre WhatsApp en tu teléfono > **Dispositivos vinculados** > **Vincular un dispositivo** y escanea el QR.
4. El indicador cambiará a **`🟢 WhatsApp: Conectado`**. No necesitarás escanearlo de nuevo.

---

## 4. Gestión de Destinatarios y Checklist

### A. Escanear e Importar de WhatsApp
1. Haz clic en **"📥 Escanear WhatsApp"**.
2. Presiona **"🔄 Iniciar Escaneo"** para detectar silenciosamente tus chats y grupos.
3. Marca los que deseas agregar y presiona **"📥 Importar Seleccionados"**.

### B. Agregar Destinatario Manualmente
1. Haz clic en **"+ Nuevo Destinatario"**.
2. Escribe el nombre exacto tal como figura en WhatsApp.
3. Selecciona si es Grupo o Contacto y marca qué automatizaciones deseas asignarle inicialmente.

### C. Sistema de Checklist Interactivo
- En la columna **"Automatizaciones Asignadas (Checklist)"** de la tabla, cada destinatario muestra botones interactivos con el nombre de cada automatización disponible.
- Haz clic en cualquier casilla para activar o desactivar una automatización para ese destinatario específico. El cambio se guarda al instante.
- Puedes deshabilitar temporalmente a un destinatario desactivando la casilla **"Habilitado"**.

---

## 5. Plantillas de Mensajes
1. Ve a la pestaña **"💬 Mensajes de Notificación"**.
2. Haz clic en **"+ Nueva Notificación"**.
3. Escribe un título (ej: *Recordatorio Vencimiento*, *Aviso de Pago*, *Información General*).
4. Redacta el mensaje e inserta variables dinámicas como `{nombre}` o `{fecha}`.

---

## 6. Automatizaciones y Regla de Días Hábiles
1. Ve a la pestaña **"⏰ Automatizaciones"**.
2. Haz clic en **"+ Nueva Automatización"**.
3. Selecciona el mensaje a enviar, la hora (ej: `09:00`) y el día base del mes (ej: `4`).
4. **Modalidad de Envío:**
   - **💼 Día Hábil:** Si el día configurado cae en sábado, domingo o festivo, el sistema se traslada automáticamente al **primer día hábil siguiente** (ejemplo: si el día 4 cae domingo, se envía el lunes 5).
   - **📅 Día Normal:** Se envía exactamente en el día del mes especificado.
5. El sistema calcula y muestra en vivo la próxima fecha exacta de envío.

---

## 7. Ejecución de Envíos
- **Automático:** Si la automatización está activa, el programador en segundo plano verificará la hora y día hábil/normal y despachará los mensajes únicamente a los destinatarios que tengan marcada esa tarea en su checklist.
- **Manual Inmediato:** Puedes hacer clic en **"🚀 Enviar Ahora"** arriba o en **"🚀 Enviar Ahora"** dentro de la tarjeta de la automatización.
- **Seguimiento en Vivo:** En la pestaña **"📡 Consola de Transmisión"** puedes monitorear el progreso porcentaje a porcentaje y el registro detallado en tiempo real.
- **Reporte Automático:** Al finalizar cada tanda, el sistema envía un resumen consolidado a tu propio chat de WhatsApp.

---

## 8. Seguridad, Login y Base de Datos

### A. Acceso al Sistema
- La aplicación cuenta con una pantalla de inicio de sesión protegida.
- **Credenciales iniciales de Administrador:**
  - **Usuario:** `admin`
  - **Contraseña:** `admin123`

### B. Cambiar tu Contraseña
- En la barra superior derecha, junto a tu nombre de usuario, haz clic en el icono de la llave (**🔑**).
- Introduce tu contraseña actual y la nueva contraseña para actualizarla.

### C. Menú de Gestión de Usuarios (Solo Administrador)
- Los administradores tienen acceso a la pestaña **"🔐 Gestión de Usuarios"**.
- En esta sección puedes:
  1. Ver todos los usuarios del sistema.
  2. Crear nuevos usuarios con rol de **Administrador** (acceso total) u **Operador** (gestión y envíos).
  3. Cambiar la contraseña de cualquier usuario.
  4. Eliminar usuarios cuando ya no requieran acceso.

### D. Base de Datos SQLite (100% Gratis)
- Toda la información de usuarios, destinatarios, plantillas, automatizaciones e historial se almacena en `sistema_notificaciones.db`.
- No requiere configuración externa, no genera costos mensuales y mantiene una sincronización automática con el archivo `destinatarios.xlsx` para compatibilidad con Excel.