# ⏰ Sistema de Notificaciones F29 a Grupos de WhatsApp — Multi-Razón Social

Aplicación de escritorio diseñada para gestionar y notificar automáticamente los vencimientos de Formulario 29 (SII) **separando la nómina de clientes y los mensajes por razón social o empresa** (Contidep, Medcapital y las que agregues a futuro).

---

## 🖥️ Cómo Iniciar la Aplicación

Haz doble clic en:
👉 **`Iniciar_App_Escritorio.bat`**

La ventana de la aplicación se abrirá en modo nativo de escritorio.

---

## 🏢 Soporte Multi-Empresa / Multi-Razón Social

En la barra superior encontrarás el selector **"Razón Social Activa"**:

1. **`Contidep` (`contidep.cl`)**:
   - Nómina de grupos: [clientes_contidep.xlsx](file:///c:/desarrollo/Sole/clientes_contidep.xlsx)
   - Mensaje y firma institucional: [mensaje_contidep.txt](file:///c:/desarrollo/Sole/mensaje_contidep.txt)

2. **`Medcapital` (`medcapital.cl`)**:
   - Nómina de grupos: [clientes_medcapital.xlsx](file:///c:/desarrollo/Sole/clientes_medcapital.xlsx)
   - Mensaje y firma institucional: [mensaje_medcapital.txt](file:///c:/desarrollo/Sole/mensaje_medcapital.txt)

3. **`+ Nueva Razón Social`**:
   - Puedes agregar cualquier otra empresa o razón social nueva con un clic.
   - El sistema le generará automáticamente su propio archivo Excel y su plantilla de mensaje independiente.

---

## 👥 Funcionamiento de Entrega en Grupos

- Al presionar **"Iniciar Envíos"**, el sistema utiliza los grupos y el mensaje de la **razón social que tengas seleccionada en ese momento**.
- Busca cada grupo en WhatsApp Web por su nombre exacto o distintivo, publica el aviso con la firma de esa empresa, y actualiza su respectiva planilla Excel.
- Incorpora pausas aleatorias de seguridad (8 a 14 segundos) entre cada grupo.
