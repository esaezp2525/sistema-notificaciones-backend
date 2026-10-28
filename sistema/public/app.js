// ========================================================
// SISTEMA DE NOTIFICACIONES — WEB APP (FIREBASE HOSTING)
// MULTI-EMPRESA: CONTIDEP & MEDCAPITAL
// ========================================================

const STORAGE_KEY_AUTH = 'notif_web_auth';
const STORAGE_KEY_DEST = 'notif_web_destinatarios';
const STORAGE_KEY_MSGS = 'notif_web_mensajes';
const STORAGE_KEY_AUTOS = 'notif_web_autos';
const STORAGE_KEY_USERS = 'notif_web_users';
const STORAGE_KEY_API = 'notif_web_api_url';
const STORAGE_KEY_EMPRESA = 'notif_empresa_activa';
const STORAGE_KEY_PLANTILLAS = 'notif_web_plantillas';

const DEFAULT_CLOUD_API = 'https://sistema-notificaciones-backend.onrender.com';

const EMPRESAS_CONFIG = {
  contidep: { id: 'contidep', nombre: 'Contidep', icon: '🏢', color: '#2563eb' },
  medcapital: { id: 'medcapital', nombre: 'Medcapital', icon: '🏥', color: '#10b981' }
};

const DEFAULT_PLANTILLAS_CHILENAS = [
  {
    id: 'plan_f29',
    titulo: 'Recordatorio F29 - Declaración IVA Mensual (SII)',
    categoria: 'Tributario / SII',
    cuerpo: 'Estimados señores *{nombre}*,\n\nLes recordamos que se aproxima la fecha límite para la presentación y pago del *Formulario 29 (F29)* correspondiente al período tributario.\n\n📌 *Detalles del Proceso:*\n• Plazo límite de declaración y pago: *Día 20 del mes en curso* (vía SII con factura electrónica).\n• Estado actual: En proceso de conciliación contable de compras y ventas.\n\n⚠️ *Importante:* Si tienen facturas de compras o ventas pendientes de emisión o registro, favor remitirlas a la brevedad para calcular el monto exacto del IVA o remanente.\n\nQuedamos atentos ante cualquier duda.\n*Equipo de Asesoría Contable & Tributaria*'
  },
  {
    id: 'plan_cierre_facturas',
    titulo: 'Solicitud de Facturas y Documentos - Cierre Mensual',
    categoria: 'Cierre Contable',
    cuerpo: 'Estimados clientes de *{nombre}*,\n\nEsperando que tengan un excelente día, solicitamos enviar la documentación necesaria para efectuar el *Cierre Contable Mensual*:\n\n📋 *Documentación requerida:*\n1️⃣ Facturas de compras o gastos no reflejados en el Registro de Compras y Ventas (RCV).\n2️⃣ Boletas y comprobantes de gastos menores o rendiciones de caja chica.\n3️⃣ Cartolas bancarias del mes en formato Excel o PDF.\n4️⃣ Novedades de remuneraciones (días trabajados, licencias, horas extras).\n\n🗓️ *Plazo límite de entrega:* *Día 5 de este mes*.\n\n¡Agradecemos su colaboración para mantener su contabilidad al día y sin multas!'
  },
  {
    id: 'plan_previred',
    titulo: 'Aviso de Pago - Cotizaciones Previsionales (Previred)',
    categoria: 'Laboral / Previred',
    cuerpo: 'Aviso de Pago - Leyes Sociales y Cotizaciones Previsionales 🏢💼\n\nEstimado/a *{nombre}*,\n\nLes informamos que ya se encuentran calculadas las cotizaciones previsionales de los trabajadores correspondientes al mes anterior.\n\n⏰ *Plazo de Pago Previred:*\n• Pago electrónico: *Hasta el día 13 a las 13:45 hrs*.\n• Instituciones incluidas: AFP, Fonasa / Isapre, AFC, Mutual de Seguridad e IPS.\n\n🔔 *Recordatorio:* El no pago dentro del plazo genera multas e intereses por parte de la Dirección del Trabajo y las instituciones de previsión.\n\nFavor confirmar el pago remitiendo el comprobante una vez efectuado.'
  },
  {
    id: 'plan_renta_f22',
    titulo: 'Operación Renta - Declaraciones Juradas y Formulario 22',
    categoria: 'Tributario / SII',
    cuerpo: 'Operación Renta - Servicio de Impuestos Internos (SII) 📊🇨🇱\n\nEstimados *{nombre}*,\n\nLes informamos que se encuentra en curso el proceso anual de *Operación Renta*.\n\n📝 *Etapas y Fechas Clave:*\n• Declaraciones Juradas (Sueldos, Honorarios, Retiros y Rentas).\n• Presentación y validación del *Formulario 22 (F22)*.\n\nSolicitamos revisar los balances preliminares y certificados de retención adjuntos para proceder con la declaración formal ante el SII.\n\nSaludos cordiales,\n*Departamento Tributario*'
  },
  {
    id: 'plan_patente',
    titulo: 'Aviso de Vencimiento: Patente Municipal y Comercial',
    categoria: 'Tributario / SII',
    cuerpo: 'Aviso de Vencimiento: Patente Municipal y Comercial 🏛️\n\nEstimado cliente *{nombre}*,\n\nLes recordamos que corresponde el pago de la cuota de la *Patente Comercial* ante la Municipalidad respectiva.\n\n📍 *Puntos a considerar:*\n• Plazo de pago: *Antes del último día hábil de este mes*.\n• Modalidad: Pago en línea en el portal municipal o tesorería municipal.\n\nSi requieren el certificado de capital propio tributario o el cálculo emitido ante el SII, por favor contáctennos de inmediato.'
  },
  {
    id: 'plan_honorarios',
    titulo: 'Aviso de Cobro de Honorarios Mensuales Contables',
    categoria: 'Cobranzas y Honorarios',
    cuerpo: 'Estimados señores *{nombre}*,\n\nEsperando se encuentren muy bien, les remitimos el aviso de cobro por los servicios de *Asesoría Contable & Tributaria* del período actual.\n\n💼 *Detalle del Servicio:*\n• Período: Mes en curso\n• Servicios: Contabilidad general, declaraciones mensuales F29 y asesoría laboral.\n\n💳 *Datos de Transferencia:*\n• Banco: Banco Estado / Banco de Chile\n• Cuenta Corriente N°: [COLOCAR NÚMERO]\n• RUT: [COLOCAR RUT]\n• Email comprobantes: contabilidad@asesores.cl\n\nRogamos enviar el comprobante de transferencia para emitir la factura o boleta correspondiente. ¡Muchas gracias!'
  },
  {
    id: 'plan_decorativos_emojis',
    titulo: 'Plantilla Marco Decorativo Elegante con Emojis',
    categoria: 'Solo Emojis y Decorativos',
    cuerpo: '🌟━━━━━━━━━━━━━━━━━━━🌟\n       *AVISO IMPORTANTE*\n🌟━━━━━━━━━━━━━━━━━━━🌟\n\nHola *{nombre}*,\n\n📌 *ASUNTO:* [Escribe aquí el título de tu comunicado]\n\n━━━━━━━━━━━━━━━━━━━━━\n💬 *DETALLE:*\n• Punto 1: [Detalle del primer punto]\n• Punto 2: [Detalle del segundo punto]\n• Punto 3: [Detalle del tercer punto]\n\n⚠️ *FECHA LÍMITE:* [DD/MM/AAAA]\n━━━━━━━━━━━━━━━━━━━━━\n\nCualquier consulta quedamos atentos a tu disposición.\n\nAtentamente,\n*Asesoría Contable & Tributaria* 🤝'
  },
  {
    id: 'plan_vineta_ejecutiva',
    titulo: 'Plantilla Viñetas Ejecutivas y Separadores Limpios',
    categoria: 'Solo Emojis y Decorativos',
    cuerpo: '━━━ *NOTIFICACIÓN OFICIAL* ━━━\n\nEstimado/a *{nombre}*,\n\n🔹 *Concepto:* [Concepto o aviso contable]\n🔹 *Detalle:* [Descripción resumida]\n🔹 *Monto:* $ [Monto si aplica]\n🔹 *Estado:* Pendiente de confirmación\n\n⏳ *Fecha límite:* [Día y Hora]\n📎 *Enlace / Portal:* [Enlace opcional]\n\n━━━━━━━━━━━━━━━━━━━━━━\n_Por favor no responder a este mensaje automático._'
  }
];

const LOCAL_MOTOR_API = 'http://127.0.0.1:5829';
let currentEmpresa = localStorage.getItem(STORAGE_KEY_EMPRESA) || 'contidep';
let currentUser = null;
let savedApi = localStorage.getItem(STORAGE_KEY_API);
if (window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost') {
  savedApi = window.location.origin;
} else if (!savedApi || savedApi.includes('127.0.0.1') || savedApi.includes('localhost')) {
  savedApi = DEFAULT_CLOUD_API;
  localStorage.setItem(STORAGE_KEY_API, DEFAULT_CLOUD_API);
}
let apiUrl = savedApi;
let localMotorAvailable = (window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost');

async function detectarMotorLocal() {
  if (localMotorAvailable) return true;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1400);
    const res = await fetch(`${LOCAL_MOTOR_API}/api/logs`, { signal: controller.signal });
    clearTimeout(timer);
    if (res.ok) {
      localMotorAvailable = true;
      apiUrl = LOCAL_MOTOR_API;
      console.info('[Motor] Motor local rápido detectado en 127.0.0.1:5829');
      return true;
    }
  } catch (e) {
    // Motor local no activo o bloqueado por navegador; usar motor en la nube (Render)
  }
  return false;
}

let destinatariosData = [];
let notificacionesData = [];
let automatizacionesData = [];
let plantillasData = [];
let usuariosData = [];
let searchQuery = '';
let plantillaFiltroCategoria = 'todas';
let plantillaSearchQuery = '';
let pollInterval = null;
let confirmActionCallback = null;
let qrPollInterval = null;
let logsPollInterval = null;

// ==================== SELECTOR DE EMPRESA ====================
function actualizarSelectorEmpresa() {
  const select = document.getElementById('select-empresa-activa');
  const icon = document.getElementById('empresa-active-icon');
  const box = document.getElementById('empresa-selector-box');
  const qrName = document.getElementById('modal-qr-empresa-nombre');

  if (select) select.value = currentEmpresa;
  const cfg = EMPRESAS_CONFIG[currentEmpresa] || EMPRESAS_CONFIG.contidep;
  if (icon) icon.textContent = cfg.icon;
  if (box) {
    if (currentEmpresa === 'medcapital') box.classList.add('medcapital');
    else box.classList.remove('medcapital');
  }
  if (qrName) {
    qrName.textContent = cfg.nombre;
    qrName.style.color = cfg.color;
  }
}

// ==================== DATOS INICIALES ====================
function initDefaultStorage() {
  if (!localStorage.getItem(STORAGE_KEY_USERS)) {
    const initialUsers = [
      { id: 1, username: 'admin', password: 'admin123', nombre: 'Administrador Principal', rol: 'admin', creado_en: '2026-10-26 10:00:00' },
      { id: 2, username: 'operador1', password: 'password456', nombre: 'Operador Uno', rol: 'operador', creado_en: '2026-10-26 10:08:40' }
    ];
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(initialUsers));
  }

  // Contidep
  if (!localStorage.getItem(`${STORAGE_KEY_MSGS}_contidep`)) {
    const initialMsgs = [
      { id: 'notif_1', titulo: 'Recordatorio General Contidep', cuerpo: 'Hola {nombre}, te recordamos que tienes una notificación pendiente de Contidep. Por favor confírmanos tu recepción. ¡Muchas gracias!', fecha_creacion: '2026-10-26' },
      { id: 'notif_2', titulo: 'Aviso de Pago Contidep', cuerpo: 'Estimado/a {nombre}: Le recordamos que hoy vence el plazo de pago mensual con Contidep.', fecha_creacion: '2026-10-26' }
    ];
    localStorage.setItem(`${STORAGE_KEY_MSGS}_contidep`, JSON.stringify(initialMsgs));
  }
  if (!localStorage.getItem(`${STORAGE_KEY_AUTOS}_contidep`)) {
    const initialAutos = [
      { id: 'auto_1', nombre: 'Recordatorio Mensual (Día 4 Hábil)', mensaje_id: 'notif_1', dia_mes: 4, hora: '09:00', modalidad_dia: 'habil', activo: true, repetir_mensual: true, ultimo_envio_periodo: '' },
      { id: 'auto_2', nombre: 'Aviso de Pago (Día 20 Calendario)', mensaje_id: 'notif_2', dia_mes: 20, hora: '12:00', modalidad_dia: 'calendario', activo: true, repetir_mensual: true, ultimo_envio_periodo: '' }
    ];
    localStorage.setItem(`${STORAGE_KEY_AUTOS}_contidep`, JSON.stringify(initialAutos));
  }
  if (!localStorage.getItem(`${STORAGE_KEY_DEST}_contidep`)) {
    const initialDest = [
      { id: 1, nombre: 'Grupo Contabilidad y Pagos', tipo: 'Grupo', activo: true, automatizaciones: ['auto_1', 'auto_2'], estado: 'Pendiente', fecha: '' },
      { id: 2, nombre: 'Avisos Administrativos Contidep', tipo: 'Grupo', activo: true, automatizaciones: ['auto_1'], estado: 'Pendiente', fecha: '' }
    ];
    localStorage.setItem(`${STORAGE_KEY_DEST}_contidep`, JSON.stringify(initialDest));
  }

  // Medcapital
  if (!localStorage.getItem(`${STORAGE_KEY_MSGS}_medcapital`)) {
    const initialMedMsgs = [
      { id: 'notif_med_1', titulo: 'Recordatorio de Pago Medcapital', cuerpo: 'Estimado/a {nombre}: Le recordamos gestionar su pago mensual con Medcapital.', fecha_creacion: '2026-10-26' }
    ];
    localStorage.setItem(`${STORAGE_KEY_MSGS}_medcapital`, JSON.stringify(initialMedMsgs));
  }
  if (!localStorage.getItem(`${STORAGE_KEY_AUTOS}_medcapital`)) {
    const initialMedAutos = [
      { id: 'auto_med_1', nombre: 'Aviso Mensual Medcapital (Día 20)', mensaje_id: 'notif_med_1', dia_mes: 20, hora: '09:30', modalidad_dia: 'calendario', activo: true, repetir_mensual: true, ultimo_envio_periodo: '' }
    ];
    localStorage.setItem(`${STORAGE_KEY_AUTOS}_medcapital`, JSON.stringify(initialMedAutos));
  }
  if (!localStorage.getItem(`${STORAGE_KEY_DEST}_medcapital`)) {
    const initialMedDest = [
      { id: 101, nombre: 'Grupo Avisos Medcapital', tipo: 'Grupo', activo: true, automatizaciones: ['auto_med_1'], estado: 'Pendiente', fecha: '' }
    ];
    localStorage.setItem(`${STORAGE_KEY_DEST}_medcapital`, JSON.stringify(initialMedDest));
  }

  // Plantillas por defecto
  if (!localStorage.getItem(`${STORAGE_KEY_PLANTILLAS}_contidep`)) {
    localStorage.setItem(`${STORAGE_KEY_PLANTILLAS}_contidep`, JSON.stringify(DEFAULT_PLANTILLAS_CHILENAS));
  }
  if (!localStorage.getItem(`${STORAGE_KEY_PLANTILLAS}_medcapital`)) {
    localStorage.setItem(`${STORAGE_KEY_PLANTILLAS}_medcapital`, JSON.stringify(DEFAULT_PLANTILLAS_CHILENAS));
  }
}

// ==================== INICIALIZACIÓN ====================
document.addEventListener('DOMContentLoaded', async () => {
  initDefaultStorage();
  setupTabs();
  setupEventListeners();
  initEmojiPickers();
  await detectarMotorLocal();
  sincronizarUsuariosConServidor();
  verificarSesion();
  iniciarPollingLogs();
  initAsistenteChat();
});

// ==================== SINCRONIZACIÓN DE USUARIOS CON SERVIDOR ====================
async function sincronizarUsuariosConServidor() {
  const localUsers = JSON.parse(localStorage.getItem(STORAGE_KEY_USERS) || '[]');
  try {
    const res = await fetch(getApiEndpoint('/api/usuarios/sync'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuarios: localUsers })
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.usuarios) && data.usuarios.length > 0) {
        // Combinar usuarios locales y del servidor preservando contraseñas
        const mergedMap = new Map();
        localUsers.forEach(u => {
          if (u && u.username) mergedMap.set(u.username.trim().toLowerCase(), { ...u });
        });
        data.usuarios.forEach(su => {
          if (!su || !su.username) return;
          const key = su.username.trim().toLowerCase();
          const prev = mergedMap.get(key);
          mergedMap.set(key, {
            id: su.id || (prev ? prev.id : Date.now()),
            username: su.username.trim().toLowerCase(),
            password: su.password || (prev ? prev.password : ''),
            nombre: su.nombre || (prev ? prev.nombre : su.username),
            rol: su.rol || (prev ? prev.rol : 'operador'),
            creado_en: su.creado_en || (prev ? prev.creado_en : '')
          });
        });
        usuariosData = Array.from(mergedMap.values());
        localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(usuariosData));
        const badgeU = document.getElementById('badge-total-usuarios');
        if (badgeU) badgeU.textContent = usuariosData.length;
        renderUsuarios();
        return usuariosData;
      }
    }
  } catch (e) {
    // Fallback silencioso a localStorage si el motor está despertando
  }
  usuariosData = localUsers;
  return localUsers;
}

// ==================== AUTENTICACIÓN ====================
function verificarSesion() {
  const saved = localStorage.getItem(STORAGE_KEY_AUTH);
  if (saved) {
    try {
      currentUser = JSON.parse(saved);
      document.getElementById('login-overlay').style.display = 'none';
      document.getElementById('app-layout').style.display = 'flex';

      document.getElementById('user-current-name').textContent = currentUser.nombre || currentUser.username;
      document.getElementById('user-current-role').textContent = currentUser.rol === 'admin' ? 'Administrador' : 'Operador';

      const tabUsuarios = document.getElementById('nav-tab-usuarios');
      if (currentUser.rol === 'admin') {
        tabUsuarios.style.display = 'inline-flex';
        cargarUsuarios();
      } else {
        tabUsuarios.style.display = 'none';
      }

      actualizarSelectorEmpresa();
      const searchInput = document.getElementById('filtro-destinatarios');
      if (searchInput) searchInput.value = '';
      searchQuery = '';
      cargarDatos();
      verificarEstadoWhatsApp();
      return;
    } catch (e) {
      localStorage.removeItem(STORAGE_KEY_AUTH);
    }
  }

  currentUser = null;
  document.getElementById('login-overlay').style.display = 'flex';
  document.getElementById('app-layout').style.display = 'none';
}

function setupTabs() {
  const tabs = document.querySelectorAll('.nav-tab');
  const panes = document.querySelectorAll('.tab-pane');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetId = tab.getAttribute('data-tab');
      tabs.forEach(t => t.classList.remove('active'));
      panes.forEach(p => p.classList.remove('active'));

      tab.classList.add('active');
      const targetPane = document.getElementById(targetId);
      if (targetPane) targetPane.classList.add('active');
    });
  });
}

// ==================== EVENT LISTENERS ====================
function setupEventListeners() {
  // Selector de empresa activa
  document.getElementById('select-empresa-activa')?.addEventListener('change', (e) => {
    currentEmpresa = e.target.value;
    localStorage.setItem(STORAGE_KEY_EMPRESA, currentEmpresa);
    actualizarSelectorEmpresa();
    const cfg = EMPRESAS_CONFIG[currentEmpresa] || EMPRESAS_CONFIG.contidep;
    showToast(`Empresa activa: ${cfg.nombre}`, 'info');
    cargarDatos();
    verificarEstadoWhatsApp();
  });

  // Login (con validación local + sincronización de servidor y soporte de nombre/usuario flexible)
  document.getElementById('form-login')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const usernameInput = document.getElementById('login-username').value.trim().toLowerCase();
    const passwordInput = document.getElementById('login-password').value;
    const passwordTrim = passwordInput.trim();
    const errorBox = document.getElementById('login-error-msg');
    const submitBtn = document.getElementById('btn-login-submit');
    if (errorBox) errorBox.style.display = 'none';

    const buscarEnLocal = () => {
      const users = JSON.parse(localStorage.getItem(STORAGE_KEY_USERS) || '[]');
      return users.find(u => {
        const uName = (u.username || '').trim().toLowerCase();
        const uFull = (u.nombre || '').trim().toLowerCase();
        const uPass = String(u.password || '');
        const matchUser = (uName === usernameInput || (uFull && uFull === usernameInput));
        const matchPass = (uPass === passwordInput || uPass.trim() === passwordTrim);
        return matchUser && matchPass;
      });
    };

    let found = buscarEnLocal();

    // Si no está en este navegador/dispositivo, consultar al servidor y sincronizar
    if (!found) {
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Verificando acceso...';
      }
      try {
        await sincronizarUsuariosConServidor();
        found = buscarEnLocal();

        if (!found) {
          const res = await fetch(getApiEndpoint('/api/auth/login'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: usernameInput, password: passwordTrim })
          });
          if (res.ok) {
            const data = await res.json();
            if (data.success && data.user) {
              found = {
                id: data.user.id,
                username: data.user.username,
                nombre: data.user.nombre,
                rol: data.user.rol,
                password: passwordTrim
              };
            }
          }
        }
      } catch (err) {
        console.warn("Servidor no disponible durante login:", err);
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Iniciar Sesión';
        }
      }
    }

    if (found) {
      const userSession = { id: found.id, username: found.username, nombre: found.nombre, rol: found.rol };
      localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(userSession));
      showToast(`¡Bienvenido, ${found.nombre || found.username}!`, 'success');
      verificarSesion();
    } else {
      errorBox.textContent = 'Usuario o contraseña incorrectos.';
      errorBox.style.display = 'block';
    }
  });

  // Logout
  document.getElementById('btn-cerrar-sesion')?.addEventListener('click', () => {
    solicitarConfirmacion(
      '¿Cerrar sesión?',
      '¿Deseas cerrar tu sesión del panel de control?',
      () => {
        localStorage.removeItem(STORAGE_KEY_AUTH);
        showToast('Sesión cerrada.', 'info');
        verificarSesion();
      }
    );
  });

  // Filtro
  document.getElementById('filtro-destinatarios')?.addEventListener('input', (e) => {
    searchQuery = e.target.value.toLowerCase().trim();
    renderDestinatarios();
  });

  // Modales
  document.getElementById('btn-nuevo-destinatario')?.addEventListener('click', () => abrirModalDestinatario());
  document.getElementById('btn-cerrar-modal-dest')?.addEventListener('click', () => cerrarModal('modal-destinatario'));
  document.getElementById('btn-cancelar-modal-dest')?.addEventListener('click', () => cerrarModal('modal-destinatario'));
  document.getElementById('btn-guardar-destinatario')?.addEventListener('click', guardarDestinatario);

  document.getElementById('btn-nueva-notificacion')?.addEventListener('click', () => abrirModalNotificacion());
  document.getElementById('btn-cerrar-modal-notif')?.addEventListener('click', () => cerrarModal('modal-notificacion'));
  document.getElementById('btn-cancelar-modal-notif')?.addEventListener('click', () => cerrarModal('modal-notificacion'));
  document.getElementById('btn-guardar-notificacion')?.addEventListener('click', guardarNotificacion);

  // Plantillas de Texto
  document.getElementById('btn-nueva-plantilla')?.addEventListener('click', () => abrirModalPlantilla());
  document.getElementById('btn-cerrar-modal-plantilla')?.addEventListener('click', () => cerrarModal('modal-plantilla'));
  document.getElementById('btn-cancelar-modal-plantilla')?.addEventListener('click', () => cerrarModal('modal-plantilla'));
  document.getElementById('btn-guardar-plantilla-modal')?.addEventListener('click', guardarPlantillaModal);

  // Filtro de búsqueda y categorías de plantillas
  document.getElementById('filtro-plantillas')?.addEventListener('input', (e) => {
    plantillaSearchQuery = e.target.value.toLowerCase().trim();
    renderPlantillas();
  });

  const catPills = document.querySelectorAll('#plantillas-category-filter .filter-pill');
  catPills.forEach(pill => {
    pill.addEventListener('click', () => {
      catPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      plantillaFiltroCategoria = pill.getAttribute('data-cat') || 'todas';
      renderPlantillas();
    });
  });

  // Selector de plantilla base en modal de mensajes
  document.getElementById('notif-select-plantilla-base')?.addEventListener('change', (e) => {
    const pId = e.target.value;
    if (!pId) return;
    const p = plantillasData.find(x => String(x.id) === String(pId));
    if (p) {
      document.getElementById('notif-input-titulo').value = p.titulo;
      document.getElementById('notif-input-cuerpo').value = p.cuerpo;
      showToast(`Plantilla "${p.titulo}" cargada.`, 'info');
    }
  });

  // Asistente IA Chat
  document.getElementById('btn-asistente-enviar')?.addEventListener('click', () => enviarMensajeAsistente());
  document.getElementById('asistente-chat-input')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      enviarMensajeAsistente();
    }
  });

  document.querySelectorAll('.asistente-quick-chips .chip-prompt').forEach(chip => {
    chip.addEventListener('click', () => {
      const promptType = chip.getAttribute('data-prompt');
      enviarMensajeAsistente(promptType);
    });
  });

  // Alternar vista móvil (Catálogo vs Chat Asistente)
  const btnSubnavCat = document.getElementById('btn-subnav-catalogo');
  const btnSubnavChat = document.getElementById('btn-subnav-chat');
  const splitContainer = document.getElementById('plantillas-split-container');

  btnSubnavCat?.addEventListener('click', () => {
    btnSubnavCat.classList.add('active');
    btnSubnavChat?.classList.remove('active');
    splitContainer?.classList.remove('show-chat');
  });

  btnSubnavChat?.addEventListener('click', () => {
    btnSubnavChat.classList.add('active');
    btnSubnavCat?.classList.remove('active');
    splitContainer?.classList.add('show-chat');
  });

  document.getElementById('btn-nueva-automatizacion')?.addEventListener('click', () => abrirModalAutomatizacion());
  document.getElementById('btn-cerrar-modal-auto')?.addEventListener('click', () => cerrarModal('modal-automatizacion'));
  document.getElementById('btn-cancelar-modal-auto')?.addEventListener('click', () => cerrarModal('modal-automatizacion'));
  document.getElementById('btn-guardar-automatizacion')?.addEventListener('click', guardarAutomatizacion);

  document.getElementById('btn-abrir-modal-enviar-ahora')?.addEventListener('click', () => abrirModalEnviarAhora());
  document.getElementById('btn-cerrar-modal-envio')?.addEventListener('click', () => cerrarModal('modal-enviar-ahora'));
  document.getElementById('btn-cancelar-modal-envio')?.addEventListener('click', () => cerrarModal('modal-enviar-ahora'));
  document.getElementById('btn-confirmar-disparo')?.addEventListener('click', confirmarDisparoEnvio);

  // Detener envío
  document.getElementById('btn-detener-envio')?.addEventListener('click', async () => {
    try {
      const res = await fetch(getApiEndpoint('/api/enviar/detener'), { method: 'POST' });
      const data = await res.json();
      showToast(data.message || 'Deteniendo proceso...', 'warning');
    } catch (e) {
      showToast('No se pudo enviar orden de detención', 'error');
    }
  });

  document.getElementById('btn-modal-mi-clave')?.addEventListener('click', () => {
    document.getElementById('clave-actual').value = '';
    document.getElementById('clave-nueva').value = '';
    document.getElementById('clave-confirmar').value = '';
    abrirModal('modal-mi-clave');
  });
  document.getElementById('btn-cerrar-modal-mi-clave')?.addEventListener('click', () => cerrarModal('modal-mi-clave'));
  document.getElementById('btn-cancelar-modal-mi-clave')?.addEventListener('click', () => cerrarModal('modal-mi-clave'));
  document.getElementById('btn-confirmar-cambio-clave')?.addEventListener('click', cambiarMiClave);

  document.getElementById('btn-abrir-modal-crear-usuario')?.addEventListener('click', () => {
    document.getElementById('new-user-username').value = '';
    document.getElementById('new-user-nombre').value = '';
    document.getElementById('new-user-password').value = '';
    document.getElementById('new-user-rol').value = 'operador';
    abrirModal('modal-crear-usuario');
  });
  document.getElementById('btn-cerrar-modal-user')?.addEventListener('click', () => cerrarModal('modal-crear-usuario'));
  document.getElementById('btn-cancelar-modal-user')?.addEventListener('click', () => cerrarModal('modal-crear-usuario'));
  document.getElementById('btn-confirmar-crear-usuario')?.addEventListener('click', crearNuevoUsuario);

  document.getElementById('btn-cerrar-modal-admin-clave')?.addEventListener('click', () => cerrarModal('modal-admin-clave-user'));
  document.getElementById('btn-cancelar-modal-admin-clave')?.addEventListener('click', () => cerrarModal('modal-admin-clave-user'));
  document.getElementById('btn-confirmar-admin-clave')?.addEventListener('click', confirmarClaveAdmin);

  // Configuración de servidor remoto
  document.getElementById('btn-config-servidor')?.addEventListener('click', () => {
    document.getElementById('input-api-url').value = apiUrl;
    abrirModal('modal-config-servidor');
  });
  document.getElementById('btn-cerrar-modal-servidor')?.addEventListener('click', () => cerrarModal('modal-config-servidor'));
  document.getElementById('btn-cancelar-modal-servidor')?.addEventListener('click', () => cerrarModal('modal-config-servidor'));
  document.getElementById('btn-guardar-api-url')?.addEventListener('click', () => {
    apiUrl = document.getElementById('input-api-url').value.trim();
    localStorage.setItem(STORAGE_KEY_API, apiUrl);
    showToast('Configuración de servidor guardada.', 'success');
    cerrarModal('modal-config-servidor');
    cargarDatos();
    verificarEstadoWhatsApp();
  });

  // Reiniciar estados
  document.getElementById('btn-reiniciar-estados')?.addEventListener('click', () => {
    const cfg = EMPRESAS_CONFIG[currentEmpresa] || EMPRESAS_CONFIG.contidep;
    solicitarConfirmacion(
      '¿Reiniciar estados?',
      `¿Restablecer el estado de los destinatarios de ${cfg.nombre} a "Pendiente"?`,
      async () => {
        try {
          await fetch(getApiEndpoint(`/api/destinatarios/reiniciar-estados?empresa=${currentEmpresa}`), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ empresa: currentEmpresa })
          });
        } catch (err) {
          console.warn("Backend no disponible al reiniciar estados:", err);
        }
        destinatariosData.forEach(d => { d.estado = 'Pendiente'; d.fecha = ''; });
        localStorage.setItem(`${STORAGE_KEY_DEST}_${currentEmpresa}`, JSON.stringify(destinatariosData));
        showToast(`Estados de ${cfg.nombre} reiniciados a Pendiente.`, 'success');
        cargarDatos();
      }
    );
  });

  // Confirmación Modal
  document.getElementById('btn-cancelar-confirmacion')?.addEventListener('click', () => {
    confirmActionCallback = null;
    cerrarModal('modal-confirmar-eliminar');
  });

  document.getElementById('btn-aceptar-confirmacion')?.addEventListener('click', () => {
    if (confirmActionCallback) {
      const cb = confirmActionCallback;
      confirmActionCallback = null;
      cb();
    }
    cerrarModal('modal-confirmar-eliminar');
  });

  // Delegación de eventos para acciones en tabla de destinatarios
  document.getElementById('tbody-destinatarios')?.addEventListener('click', (e) => {
    const btnDel = e.target.closest('.btn-delete-dest');
    if (btnDel) {
      e.preventDefault();
      const id = btnDel.getAttribute('data-id');
      window.eliminarDestinatario(id);
      return;
    }
    const btnEd = e.target.closest('.btn-edit-dest');
    if (btnEd) {
      e.preventDefault();
      const id = btnEd.getAttribute('data-id');
      window.editarDestinatario(id);
      return;
    }
  });

  // Función unificada para desvincular WhatsApp de la empresa activa
  window.desconectarWhatsAppEmpresa = function() {
    const cfg = EMPRESAS_CONFIG[currentEmpresa] || EMPRESAS_CONFIG.contidep;
    solicitarConfirmacion(
      `¿Desvincular WhatsApp de ${cfg.nombre}?`,
      `Esta acción cerrará y borrará la sesión de WhatsApp para ${cfg.nombre}. Podrás vincular un número nuevo en cualquier momento.`,
      async () => {
        try {
          const res = await fetch(getApiEndpoint('/api/whatsapp/desconectar'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ empresa: currentEmpresa })
          });
          const data = await res.json();
          showToast(data.message || `WhatsApp de ${cfg.nombre} desvinculado`, 'info');
          cerrarModalQR();
          verificarEstadoWhatsApp();
        } catch (err) {
          showToast('Error al desvincular sesión', 'error');
        }
      }
    );
  };

  // Botón dinámico de WhatsApp en Cabecera (Conectar si está offline, Desvincular si está online)
  document.getElementById('btn-probar-wa')?.addEventListener('click', () => {
    const dot = document.getElementById('wa-status-dot');
    if (dot && dot.classList.contains('online')) {
      window.desconectarWhatsAppEmpresa();
    } else {
      abrirModalQR();
    }
  });

  document.getElementById('btn-abrir-modal-scan')?.addEventListener('click', () => abrirModalQR(false));
  document.getElementById('btn-cerrar-modal-qr')?.addEventListener('click', cerrarModalQR);
  document.getElementById('btn-cancelar-modal-qr')?.addEventListener('click', cerrarModalQR);
  document.getElementById('btn-regenerar-qr')?.addEventListener('click', () => abrirModalQR(true));
  document.getElementById('btn-desconectar-wa-empresa')?.addEventListener('click', window.desconectarWhatsAppEmpresa);
  document.getElementById('btn-desconectar-wa-empresa-modal')?.addEventListener('click', window.desconectarWhatsAppEmpresa);

  // Limpiar consola
  document.getElementById('btn-limpiar-consola')?.addEventListener('click', () => {
    document.getElementById('terminal-body').innerHTML = '';
    fetch(getApiEndpoint('/api/logs/limpiar'), { method: 'POST' }).catch(() => {});
    showToast('Consola limpiada.', 'info');
  });
}

// ==================== GESTIÓN DE WHATSAPP EN VIVO ====================
let cachedQrByEmpresa = { contidep: null, medcapital: null };

function getApiEndpoint(path) {
  let base = apiUrl || DEFAULT_CLOUD_API;
  if (!localMotorAvailable && window.location.protocol === 'https:' && (base.startsWith('http:') || base.includes('127.0.0.1') || base.includes('localhost'))) {
    base = DEFAULT_CLOUD_API;
  }
  return `${base.replace(/\/+$/, '')}${path}`;
}

async function verificarEstadoWhatsApp() {
  const dot = document.getElementById('wa-status-dot');
  const text = document.getElementById('wa-status-text');
  const btnWA = document.getElementById('btn-probar-wa');
  const btnDisconnect = document.getElementById('btn-desconectar-wa-empresa');
  const cfg = EMPRESAS_CONFIG[currentEmpresa] || EMPRESAS_CONFIG.contidep;
  try {
    const res = await fetch(getApiEndpoint(`/api/whatsapp/status?empresa=${currentEmpresa}`));
    const data = await res.json();
    if (data.qr && data.is_scanning) {
      cachedQrByEmpresa[currentEmpresa] = data.qr;
    } else if (!data.is_scanning) {
      cachedQrByEmpresa[currentEmpresa] = null;
    }
    if (data.authenticated) {
      cachedQrByEmpresa[currentEmpresa] = null;
      if (dot) dot.className = 'status-dot online';
      if (text) text.textContent = `WA ${cfg.nombre}: Conectado`;
      if (btnWA) {
        btnWA.textContent = '🔌 Desvincular';
        btnWA.style.color = '#ef4444';
        btnWA.title = `Desvincular WhatsApp de ${cfg.nombre}`;
      }
      if (btnDisconnect) btnDisconnect.style.display = 'inline-block';
    } else {
      if (dot) dot.className = 'status-dot offline';
      if (text) text.textContent = `WA ${cfg.nombre}: Desconectado`;
      if (btnWA) {
        btnWA.textContent = '📲 Conectar';
        btnWA.style.color = '';
        btnWA.title = `Vincular WhatsApp de ${cfg.nombre}`;
      }
      if (btnDisconnect) btnDisconnect.style.display = 'none';
      // Pre-solicitar generación de QR en segundo plano para que aparezca rápido al abrir el modal
      if (!cachedQrByEmpresa[currentEmpresa]) {
        fetch(getApiEndpoint(`/api/whatsapp/qr?empresa=${currentEmpresa}`))
          .then(r => r.json())
          .then(d => { if (d && d.qr) cachedQrByEmpresa[currentEmpresa] = d.qr; })
          .catch(() => {});
      }
    }
  } catch (e) {
    if (dot) dot.className = 'status-dot offline';
    if (text) text.textContent = `WA ${cfg.nombre}: Sin Motor`;
    if (btnWA) {
      btnWA.textContent = '📲 Conectar';
      btnWA.style.color = '';
    }
    if (btnDisconnect) btnDisconnect.style.display = 'none';
  }
}

function abrirModalQR(forceReset = false) {
  actualizarSelectorEmpresa();
  const loadingState = document.getElementById('qr-loading-state');
  const displayContainer = document.getElementById('qr-display-container');
  const successState = document.getElementById('qr-success-state');
  const qrImg = document.getElementById('qr-image-display');
  const statusText = document.getElementById('qr-status-text');
  const btnDisconnect = document.getElementById('btn-desconectar-wa-empresa');
  const cfg = EMPRESAS_CONFIG[currentEmpresa] || EMPRESAS_CONFIG.contidep;

  // Si ya está autenticado y no pide reset, mostrar estado conectado con opción de desvincular
  const isOnline = document.getElementById('wa-status-dot')?.classList.contains('online');
  if (isOnline && !forceReset) {
    if (loadingState) loadingState.style.display = 'none';
    if (displayContainer) displayContainer.style.display = 'none';
    if (successState) successState.style.display = 'block';
    if (btnDisconnect) btnDisconnect.style.display = 'inline-block';
    abrirModal('modal-qr-whatsapp');
    return;
  }

  if (forceReset) {
    cachedQrByEmpresa[currentEmpresa] = null;
  }

  // Si ya tenemos un QR pre-cargado en caché, mostrarlo de inmediato mientras se actualiza
  if (cachedQrByEmpresa[currentEmpresa] && !forceReset) {
    if (qrImg) qrImg.src = cachedQrByEmpresa[currentEmpresa];
    if (loadingState) loadingState.style.display = 'none';
    if (displayContainer) displayContainer.style.display = 'block';
    if (successState) successState.style.display = 'none';
  } else {
    if (loadingState) loadingState.style.display = 'block';
    if (displayContainer) displayContainer.style.display = 'none';
    if (successState) successState.style.display = 'none';
    if (btnDisconnect) btnDisconnect.style.display = 'none';
    if (statusText) {
      statusText.textContent = forceReset
        ? `Generando un nuevo código QR para ${cfg.nombre}...`
        : `Iniciando conexión con WhatsApp para ${cfg.nombre}...`;
    }
  }

  abrirModal('modal-qr-whatsapp');

  if (qrPollInterval) clearInterval(qrPollInterval);
  let firstCall = true;
  let elapsedPolls = 0;
  let pollInFlight = false;

  async function pollQR() {
    if (pollInFlight) return;
    pollInFlight = true;
    elapsedPolls++;
    try {
      const resetParam = (forceReset && firstCall) ? '&reset=1' : '';
      firstCall = false;
      const res = await fetch(getApiEndpoint(`/api/whatsapp/qr?empresa=${currentEmpresa}${resetParam}`));
      const data = await res.json();

      if (data.qr) {
        cachedQrByEmpresa[currentEmpresa] = data.qr;
        if (qrImg) qrImg.src = data.qr;
        if (loadingState) loadingState.style.display = 'none';
        if (displayContainer) displayContainer.style.display = 'block';
        if (successState) successState.style.display = 'none';
      } else if (data.authenticated) {
        cachedQrByEmpresa[currentEmpresa] = null;
        if (loadingState) loadingState.style.display = 'none';
        if (displayContainer) displayContainer.style.display = 'none';
        if (successState) successState.style.display = 'block';
        if (btnDisconnect) btnDisconnect.style.display = 'inline-block';
        clearInterval(qrPollInterval);
        qrPollInterval = null;
        verificarEstadoWhatsApp();
        showToast(`¡WhatsApp de ${cfg.nombre} vinculado exitosamente!`, 'success');
        return;
      } else if (data.status_text && statusText) {
        if ((data.status_text.includes('QR escaneado') || data.status_text.includes('Vinculando')) && cachedQrByEmpresa[currentEmpresa]) {
          cachedQrByEmpresa[currentEmpresa] = null;
          if (displayContainer) displayContainer.style.display = 'none';
          if (loadingState) loadingState.style.display = 'block';
          statusText.textContent = data.status_text;
        } else if (data.status_text.includes('QR escaneado') && !cachedQrByEmpresa[currentEmpresa]) {
          statusText.textContent = `Cargando código QR de WhatsApp para ${cfg.nombre} (${elapsedPolls * 2}s)...`;
        } else {
          statusText.textContent = data.status_text;
        }
      }
    } catch (e) {
      if (localMotorAvailable && apiUrl === LOCAL_MOTOR_API) {
        localMotorAvailable = false;
        apiUrl = DEFAULT_CLOUD_API;
      }
      if (statusText && !cachedQrByEmpresa[currentEmpresa]) {
        statusText.innerHTML = `Despertando motor de WhatsApp en la nube (${elapsedPolls * 2}s)...<br><span style="font-size:11.5px; color:#64748b;">Por favor espera unos segundos mientras inicia el navegador seguro.</span>`;
      }
    } finally {
      pollInFlight = false;
    }
  }

  pollQR();
  qrPollInterval = setInterval(pollQR, 1800);
}

function cerrarModalQR() {
  if (qrPollInterval) {
    clearInterval(qrPollInterval);
    qrPollInterval = null;
  }
  cerrarModal('modal-qr-whatsapp');
}

// ==================== CARGAR DATOS ====================
async function cargarDatos() {
  actualizarSelectorEmpresa();
  try {
    const res = await fetch(getApiEndpoint(`/api/data?empresa=${currentEmpresa}`));
    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        destinatariosData = data.destinatarios || [];
        notificacionesData = data.notificaciones || [];
        automatizacionesData = data.automatizaciones || [];
        plantillasData = data.plantillas || [];
        if (plantillasData.length === 0) {
          plantillasData = [...DEFAULT_PLANTILLAS_CHILENAS];
        }
        if (Array.isArray(data.usuarios) && data.usuarios.length > 0) {
          const localUsers = JSON.parse(localStorage.getItem(STORAGE_KEY_USERS) || '[]');
          data.usuarios.forEach(su => {
            const idx = localUsers.findIndex(lu => String(lu.username).toLowerCase() === String(su.username).toLowerCase());
            if (idx >= 0) {
              localUsers[idx] = {
                ...localUsers[idx],
                id: su.id || localUsers[idx].id,
                nombre: su.nombre || localUsers[idx].nombre,
                rol: su.rol || localUsers[idx].rol,
                password: su.password || localUsers[idx].password
              };
            } else {
              localUsers.push({
                id: su.id || (localUsers.length + 1),
                username: su.username,
                password: su.password || '',
                nombre: su.nombre || su.username,
                rol: su.rol || 'operador',
                creado_en: su.creado_en || ''
              });
            }
          });
          localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(localUsers));
          usuariosData = localUsers;
        }
        localStorage.setItem(`${STORAGE_KEY_DEST}_${currentEmpresa}`, JSON.stringify(destinatariosData));
        localStorage.setItem(`${STORAGE_KEY_MSGS}_${currentEmpresa}`, JSON.stringify(notificacionesData));
        localStorage.setItem(`${STORAGE_KEY_AUTOS}_${currentEmpresa}`, JSON.stringify(automatizacionesData));
        localStorage.setItem(`${STORAGE_KEY_PLANTILLAS}_${currentEmpresa}`, JSON.stringify(plantillasData));
        actualizarUI();
        return;
      }
    }
  } catch (e) {
    console.warn("Backend no disponible al cargar datos, usando caché local:", e);
  }

  destinatariosData = JSON.parse(localStorage.getItem(`${STORAGE_KEY_DEST}_${currentEmpresa}`) || localStorage.getItem(STORAGE_KEY_DEST) || '[]');
  notificacionesData = JSON.parse(localStorage.getItem(`${STORAGE_KEY_MSGS}_${currentEmpresa}`) || localStorage.getItem(STORAGE_KEY_MSGS) || '[]');
  automatizacionesData = JSON.parse(localStorage.getItem(`${STORAGE_KEY_AUTOS}_${currentEmpresa}`) || localStorage.getItem(STORAGE_KEY_AUTOS) || '[]');
  plantillasData = JSON.parse(localStorage.getItem(`${STORAGE_KEY_PLANTILLAS}_${currentEmpresa}`) || localStorage.getItem(STORAGE_KEY_PLANTILLAS) || '[]');
  if (plantillasData.length === 0) {
    plantillasData = [...DEFAULT_PLANTILLAS_CHILENAS];
    localStorage.setItem(`${STORAGE_KEY_PLANTILLAS}_${currentEmpresa}`, JSON.stringify(plantillasData));
  }
  actualizarUI();
}

function actualizarUI() {
  document.getElementById('badge-total-destinatarios').textContent = destinatariosData.length;
  document.getElementById('badge-total-mensajes').textContent = notificacionesData.length;
  document.getElementById('badge-total-autos').textContent = automatizacionesData.length;
  const badgePlantillas = document.getElementById('badge-total-plantillas');
  if (badgePlantillas) badgePlantillas.textContent = plantillasData.length;
  const mobBadge = document.getElementById('mobile-badge-plantillas');
  if (mobBadge) mobBadge.textContent = plantillasData.length;

  let pendientes = 0, enviados = 0, errores = 0, activos = 0;
  destinatariosData.forEach(d => {
    if (d.activo) activos++;
    if (String(d.estado).toLowerCase() === 'enviado') enviados++;
    else if (String(d.estado).toLowerCase().includes('error')) errores++;
    else if (d.activo) pendientes++;
  });

  document.getElementById('kpi-total').textContent = destinatariosData.length;
  document.getElementById('kpi-activos').textContent = activos;
  document.getElementById('kpi-pendientes').textContent = pendientes;
  document.getElementById('kpi-enviados').textContent = enviados;
  document.getElementById('kpi-errores').textContent = errores;

  renderDestinatarios();
  renderNotificaciones();
  renderPlantillas();
  renderAutomatizaciones();
  actualizarSelectorPlantillasEnModalNotif();
}

// ==================== POLLING DE LOGS EN TIEMPO REAL ====================
function iniciarPollingLogs() {
  if (logsPollInterval) clearInterval(logsPollInterval);
  logsPollInterval = setInterval(async () => {
    try {
      const res = await fetch(getApiEndpoint('/api/logs'));
      if (!res.ok) return;
      const data = await res.json();
      const terminal = document.getElementById('terminal-body');
      const btnDetener = document.getElementById('btn-detener-envio');
      const miniStatus = document.getElementById('mini-progress-status');
      const taskBadge = document.getElementById('console-current-task');

      if (btnDetener) btnDetener.disabled = !data.is_running;
      if (miniStatus) miniStatus.textContent = data.is_running ? 'Transmitiendo...' : 'Listo';
      if (taskBadge) {
        if (data.is_running && data.tarea_actual) {
          taskBadge.style.display = 'inline-block';
          taskBadge.textContent = data.tarea_actual;
        } else {
          taskBadge.style.display = 'none';
        }
      }

      if (data.whatsapp_autenticado && typeof data.whatsapp_autenticado[currentEmpresa] === 'boolean') {
        const isAuth = data.whatsapp_autenticado[currentEmpresa];
        const dot = document.getElementById('wa-status-dot');
        const text = document.getElementById('wa-status-text');
        const btnWA = document.getElementById('btn-probar-wa');
        const btnDisconnect = document.getElementById('btn-desconectar-wa-empresa');
        const cfg = EMPRESAS_CONFIG[currentEmpresa] || EMPRESAS_CONFIG.contidep;
        if (isAuth) {
          cachedQrByEmpresa[currentEmpresa] = null;
          if (dot) dot.className = 'status-dot online';
          if (text) text.textContent = `WA ${cfg.nombre}: Conectado`;
          if (btnWA) {
            btnWA.textContent = '🔌 Desvincular';
            btnWA.style.color = '#ef4444';
            btnWA.title = `Desvincular WhatsApp de ${cfg.nombre}`;
          }
          if (btnDisconnect) btnDisconnect.style.display = 'inline-block';
        } else {
          if (dot) dot.className = 'status-dot offline';
          if (text) text.textContent = `WA ${cfg.nombre}: Desconectado`;
          if (btnWA) {
            btnWA.textContent = '📲 Conectar';
            btnWA.style.color = '';
            btnWA.title = `Vincular WhatsApp de ${cfg.nombre}`;
          }
          if (btnDisconnect) btnDisconnect.style.display = 'none';
        }
      }

      if (Array.isArray(data.logs) && data.logs.length > 0 && terminal) {
        terminal.innerHTML = data.logs.map(log => `
          <div class="log-entry log-${log.level}">
            <span class="log-time">[${escapeHtml(log.time)}]</span>
            <span class="log-msg">${escapeHtml(log.msg)}</span>
          </div>
        `).join('');
        terminal.scrollTop = terminal.scrollHeight;
      }
    } catch (e) {}
  }, 3500);
}

// ==================== RENDERIZAR TABLA & CHECKLIST ====================
function renderDestinatarios() {
  const tbody = document.getElementById('tbody-destinatarios');
  const mobileContainer = document.getElementById('dest-mobile-cards');
  if (!tbody && !mobileContainer) return;

  const searchInput = document.getElementById('filtro-destinatarios');
  if (searchInput && (searchInput.value.toLowerCase() === 'admin')) {
    searchInput.value = '';
    searchQuery = '';
  }

  let filtrados = destinatariosData.filter(d => {
    if (!searchQuery) return true;
    return (d.nombre || '').toLowerCase().includes(searchQuery);
  });

  if (filtrados.length === 0) {
    if (tbody) tbody.innerHTML = `<tr><td colspan="8" class="empty-state-cell">No se encontraron destinatarios para esta empresa.</td></tr>`;
    if (mobileContainer) {
      mobileContainer.innerHTML = `
        <div style="padding: 32px 16px; text-align: center; color: #94a3b8; background: #ffffff; border-radius: 12px; border: 1px dashed #cbd5e1;">
          <div style="font-size: 32px; margin-bottom: 6px;">👥</div>
          <p style="font-size: 13.5px; font-weight: 500; color: #64748b; margin: 0;">No se encontraron destinatarios.</p>
        </div>
      `;
    }
    return;
  }

  let tableHtml = '';
  let mobileHtml = '';

  filtrados.forEach((d, idx) => {
    let checklistHtml = '';
    if (automatizacionesData.length === 0) {
      checklistHtml = '<span style="color: #94a3b8; font-size: 11.5px; font-style: italic;">Sin reglas configuradas</span>';
    } else {
      checklistHtml = '<div class="auto-checklist-chips">';
      automatizacionesData.forEach(auto => {
        const activa = Array.isArray(d.automatizaciones) && d.automatizaciones.includes(auto.id);
        checklistHtml += `
          <button type="button" 
                  class="auto-check-chip ${activa ? 'active' : ''}" 
                  onclick="toggleAutoCheck(${d.id}, '${auto.id}')"
                  title="${activa ? 'Regla activa (Toca para desactivar)' : 'Inactiva (Toca para activar)'}">
            <span class="chip-dot"></span>
            ${escapeHtml(auto.nombre)}
          </button>
        `;
      });
      checklistHtml += '</div>';
    }

    let badgeClass = 'badge-pending';
    const st = (d.estado || '').toLowerCase();
    if (st === 'enviado') badgeClass = 'badge-success';
    else if (st.includes('error')) badgeClass = 'badge-error';

    // 1. Fila para Desktop Table
    tableHtml += `
      <tr>
        <td style="text-align: center; color: #94a3b8; font-weight: 600; font-size: 11.5px;">${idx + 1}</td>
        <td>
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="width: 32px; height: 32px; border-radius: 8px; background: ${d.tipo === 'Grupo' ? '#e0f2fe' : '#f3e8ff'}; color: ${d.tipo === 'Grupo' ? '#0284c7' : '#7e22ce'}; display: flex; align-items: center; justify-content: center; font-size: 15px; flex-shrink: 0;">
              ${d.tipo === 'Grupo' ? '🏢' : '👤'}
            </div>
            <div>
              <div style="font-weight: 700; color: #1e293b; font-size: 13.5px;">${escapeHtml(d.nombre)}</div>
              <div style="font-size: 11px; color: #94a3b8;">WhatsApp Notificaciones</div>
            </div>
          </div>
        </td>
        <td><span class="type-pill ${d.tipo === 'Grupo' ? 'type-group' : 'type-contact'}">${d.tipo}</span></td>
        <td style="text-align: center;">
          <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
            <button type="button" class="btn-toggle-switch ${d.activo ? 'on' : 'off'}" onclick="toggleDestActivo(${d.id})" title="Clic para alternar">
              ${d.activo ? '● Activo' : '○ Pausa'}
            </button>
            <span class="status-badge ${badgeClass}" style="font-size: 10px; padding: 1px 6px;">${escapeHtml(d.estado)}</span>
          </div>
        </td>
        <td>${checklistHtml}</td>
        <td style="font-size: 12px; color: #64748b;">${d.fecha ? '📅 ' + d.fecha : '<span style="color:#cbd5e1;">Sin envíos</span>'}</td>
        <td style="text-align: center;">
          <div style="display: flex; gap: 6px; justify-content: center;">
            <button type="button" class="btn-cell-action btn-edit-dest" onclick="editarDestinatario('${d.id}')" data-id="${d.id}" title="Editar">✏️</button>
            <button type="button" class="btn-cell-action danger btn-delete-dest" onclick="eliminarDestinatario('${d.id}')" data-id="${d.id}" title="Eliminar">🗑️</button>
          </div>
        </td>
      </tr>
    `;

    // 2. Tarjeta Interactiva para Móviles (Mobile-First)
    mobileHtml += `
      <div class="dest-mobile-card ${d.activo ? '' : 'dest-card-paused'}">
        <div class="dest-card-header">
          <div class="dest-card-title-box">
            <span class="dest-index-badge">#${idx + 1}</span>
            <div style="min-width: 0; flex: 1;">
              <h4 class="dest-card-name">${escapeHtml(d.nombre)}</h4>
              <div class="dest-card-tags-row">
                <span class="type-pill ${d.tipo === 'Grupo' ? 'type-group' : 'type-contact'}">${d.tipo}</span>
                <span class="status-badge ${badgeClass}">${escapeHtml(d.estado)}</span>
              </div>
            </div>
          </div>
          <button type="button" class="btn-mobile-active-toggle ${d.activo ? 'active' : 'paused'}" onclick="toggleDestActivo(${d.id})" title="Toca para cambiar estado">
            ${d.activo ? '✅ Activo' : '⚪ Pausa'}
          </button>
        </div>

        <div class="dest-card-body">
          <div class="dest-autos-section">
            <div class="dest-autos-header">
              <span class="dest-autos-title">⚡ Automatizaciones Asignadas:</span>
              <span class="dest-autos-subhint">Toca para activar/desactivar</span>
            </div>
            ${checklistHtml}
          </div>
        </div>

        <div class="dest-card-footer">
          <div class="dest-card-date-info">
            <span>📅 ${d.fecha ? 'Último envío: ' + d.fecha : 'Sin envíos registrados'}</span>
          </div>
          <div class="dest-card-btn-actions">
            <button type="button" class="btn-card-action" onclick="editarDestinatario('${d.id}')">✏️ Editar</button>
            <button type="button" class="btn-card-action danger" onclick="eliminarDestinatario('${d.id}')">🗑️</button>
          </div>
        </div>
      </div>
    `;
  });

  if (tbody) tbody.innerHTML = tableHtml;
  if (mobileContainer) mobileContainer.innerHTML = mobileHtml;
}

window.toggleDestActivo = async function(destId) {
  const d = destinatariosData.find(x => x.id === destId);
  if (!d) return;
  d.activo = !d.activo;

  try {
    await fetch(getApiEndpoint('/api/destinatarios/guardar'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: d.id,
        nombre: d.nombre,
        tipo: d.tipo,
        activo: d.activo,
        empresa_id: currentEmpresa
      })
    });
  } catch (err) {
    console.warn("Backend no disponible al toggle activo:", err);
  }

  localStorage.setItem(`${STORAGE_KEY_DEST}_${currentEmpresa}`, JSON.stringify(destinatariosData));
  showToast(`${d.nombre}: ${d.activo ? 'Activado' : 'Pausado'}`, 'info');
  actualizarUI();
};

window.toggleAutoCheck = async function(destId, autoId) {
  const dest = destinatariosData.find(x => x.id === destId);
  if (!dest) return;
  if (!Array.isArray(dest.automatizaciones)) dest.automatizaciones = [];
  const idx = dest.automatizaciones.indexOf(autoId);
  if (idx >= 0) dest.automatizaciones.splice(idx, 1);
  else dest.automatizaciones.push(autoId);

  try {
    await fetch(getApiEndpoint('/api/destinatarios/toggle-auto'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ destinatario_id: destId, auto_id: autoId })
    });
  } catch (err) {
    console.warn("Backend no disponible al toggle auto:", err);
  }

  localStorage.setItem(`${STORAGE_KEY_DEST}_${currentEmpresa}`, JSON.stringify(destinatariosData));
  renderDestinatarios();
};

// ==================== NOTIFICACIONES ====================
function renderNotificaciones() {
  const grid = document.getElementById('grid-notificaciones');
  if (!grid) return;
  if (notificacionesData.length === 0) {
    grid.innerHTML = `<div style="grid-column: 1 / -1; padding: 40px; text-align: center; color: #94a3b8;"><p>No tienes plantillas creadas para esta empresa.</p></div>`;
    return;
  }

  let html = '';
  notificacionesData.forEach(n => {
    const uso = automatizacionesData.filter(a => a.mensaje_id === n.id).length;
    html += `
      <div class="notif-card">
        <div class="card-top-row">
          <h3 class="card-title">${escapeHtml(n.titulo)}</h3>
          <span class="card-id-badge">${n.id}</span>
        </div>
        <div class="card-preview-body">${escapeHtml(n.cuerpo)}</div>
        <div class="card-meta-line">
          <span>📅 Creado: ${n.fecha_creacion || '2026'}</span>
          <span>⏰ En uso por: <strong>${uso}</strong> regla(s)</span>
        </div>
        <div class="card-actions-line">
          <button type="button" class="btn-card-action" onclick="editarNotificacion('${n.id}')">✏️ Editar</button>
          <button type="button" class="btn-card-action danger" onclick="eliminarNotificacion('${n.id}')">🗑️ Eliminar</button>
        </div>
      </div>
    `;
  });
  grid.innerHTML = html;
}

// ==================== AUTOMATIZACIONES ====================
function calcularTextoProximo(auto) {
  if (!auto.activo) return 'Automatización Desactivada';
  const mod = auto.modalidad_dia === 'habil' ? 'Día Hábil' : 'Día Calendario';
  return `Día ${auto.dia_mes} de cada mes a las ${auto.hora} hrs (${mod})`;
}

function renderAutomatizaciones() {
  const grid = document.getElementById('grid-automatizaciones');
  if (!grid) return;
  if (automatizacionesData.length === 0) {
    grid.innerHTML = `<div style="grid-column: 1 / -1; padding: 40px; text-align: center; color: #94a3b8;"><p>No tienes automatizaciones configuradas para esta empresa.</p></div>`;
    return;
  }

  let html = '';
  automatizacionesData.forEach(a => {
    const msg = notificacionesData.find(m => m.id === a.mensaje_id);
    const msgTit = msg ? msg.titulo : '(Mensaje no asignado)';
    const badge = a.modalidad_dia === 'habil' 
      ? '<span class="card-badge-habil">💼 Día Hábil</span>' 
      : '<span class="card-badge-cal">📅 Día Calendario</span>';

    html += `
      <div class="auto-card ${a.activo ? '' : 'auto-card-inactive'}">
        <div class="card-top-row">
          <h3 class="card-title">${escapeHtml(a.nombre)}</h3>
          <span class="status-badge ${a.activo ? 'badge-success' : 'badge-disabled'}">${a.activo ? 'Activa' : 'Inactiva'}</span>
        </div>
        <div class="auto-detail-box">
          <div><strong>Mensaje:</strong> ${escapeHtml(msgTit)}</div>
          <div style="display: flex; align-items: center; gap: 8px; margin-top: 4px;">
            <span><strong>Día programado:</strong> Día ${a.dia_mes} a las ${a.hora} hrs</span>
            ${badge}
          </div>
          <div style="margin-top: 4px;"><strong>Próximo envío:</strong> <span style="color: #2563eb; font-weight: 600;">${calcularTextoProximo(a)}</span></div>
        </div>
        <div class="card-actions-line">
          <button type="button" class="btn-card-action" onclick="editarAutomatizacion('${a.id}')">✏️ Editar</button>
          <button type="button" class="btn-card-action danger" onclick="eliminarAutomatizacion('${a.id}')">🗑️ Eliminar</button>
        </div>
      </div>
    `;
  });
  grid.innerHTML = html;
}

// ==================== GESTIÓN DE USUARIOS ====================
async function cargarUsuarios() {
  usuariosData = JSON.parse(localStorage.getItem(STORAGE_KEY_USERS) || '[]');
  const badgeEl = document.getElementById('badge-total-usuarios');
  if (badgeEl) badgeEl.textContent = usuariosData.length;
  renderUsuarios();

  try {
    const res = await fetch(getApiEndpoint('/api/usuarios'));
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.usuarios)) {
        const localUsers = JSON.parse(localStorage.getItem(STORAGE_KEY_USERS) || '[]');
        data.usuarios.forEach(su => {
          const idx = localUsers.findIndex(lu => String(lu.username).toLowerCase() === String(su.username).toLowerCase());
          if (idx >= 0) {
            localUsers[idx] = {
              ...localUsers[idx],
              id: su.id || localUsers[idx].id,
              nombre: su.nombre || localUsers[idx].nombre,
              rol: su.rol || localUsers[idx].rol,
              creado_en: su.creado_en || localUsers[idx].creado_en,
              password: su.password || localUsers[idx].password
            };
          } else {
            localUsers.push({
              id: su.id || (localUsers.length + 1),
              username: su.username,
              password: su.password || '',
              nombre: su.nombre || su.username,
              rol: su.rol || 'operador',
              creado_en: su.creado_en || ''
            });
          }
        });
        usuariosData = localUsers;
        localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(usuariosData));
        if (badgeEl) badgeEl.textContent = usuariosData.length;
        renderUsuarios();
      }
    }
  } catch (e) {
    // Mantiene la lista local si el servidor aún está despertando
  }
}

function renderUsuarios() {
  const tbody = document.getElementById('tbody-usuarios');
  if (!tbody) return;
  let html = '';
  usuariosData.forEach(u => {
    const esYo = currentUser && (String(currentUser.id) === String(u.id) || String(currentUser.username).toLowerCase() === String(u.username).toLowerCase());
    html += `
      <tr>
        <td style="color: #94a3b8; font-size: 11.5px;">${u.id}</td>
        <td><strong>${escapeHtml(u.username)}</strong> ${esYo ? '<span style="font-size: 11px; color: #2563eb;">(Tú)</span>' : ''}</td>
        <td>${escapeHtml(u.nombre)}</td>
        <td><span class="status-badge ${u.rol === 'admin' ? 'badge-success' : 'badge-pending'}">${u.rol === 'admin' ? 'Administrador' : 'Operador'}</span></td>
        <td style="font-size: 12px; color: #64748b;">${u.creado_en || '—'}</td>
        <td style="text-align: center;">
          <div style="display: flex; gap: 6px; justify-content: center;">
            <button type="button" class="btn-card-action" onclick="abrirModalAdminClave(${u.id}, '${escapeHtml(u.username)}')">🔑 Clave</button>
            ${!esYo ? `<button type="button" class="btn-card-action danger" onclick="eliminarUsuario(${u.id}, '${escapeHtml(u.username)}')">🗑️</button>` : ''}
          </div>
        </td>
      </tr>
    `;
  });
  tbody.innerHTML = html;
}

async function crearNuevoUsuario() {
  const rawUsername = document.getElementById('new-user-username').value.trim();
  const username = rawUsername.toLowerCase();
  const nombre = document.getElementById('new-user-nombre').value.trim();
  const password = document.getElementById('new-user-password').value.trim();
  const rol = document.getElementById('new-user-rol').value;

  if (!username || !password) {
    showToast('Ingresa usuario y contraseña.', 'error');
    return;
  }
  if (password.length < 3) {
    showToast('La contraseña debe tener al menos 3 caracteres.', 'error');
    return;
  }

  const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
  const existingIdx = usuariosData.findIndex(u => String(u.username).trim().toLowerCase() === username);

  if (existingIdx >= 0) {
    usuariosData[existingIdx].password = password;
    usuariosData[existingIdx].nombre = nombre || usuariosData[existingIdx].nombre || rawUsername;
    usuariosData[existingIdx].rol = rol || usuariosData[existingIdx].rol;
  } else {
    const nextId = usuariosData.length > 0 ? Math.max(...usuariosData.map(u => Number(u.id) || 0)) + 1 : 1;
    usuariosData.push({ id: nextId, username, password, nombre: nombre || rawUsername, rol, creado_en: nowStr });
  }

  localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(usuariosData));

  try {
    const res = await fetch(getApiEndpoint('/api/usuarios/crear'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, nombre: nombre || rawUsername, rol })
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.usuarios)) {
        data.usuarios.forEach(su => {
          const idx = usuariosData.findIndex(lu => String(lu.username).toLowerCase() === String(su.username).toLowerCase());
          if (idx >= 0) {
            usuariosData[idx].id = su.id || usuariosData[idx].id;
          }
        });
        localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(usuariosData));
      }
    }
  } catch (e) {
    console.warn('Error sincronizando nuevo usuario con backend:', e);
  }

  showToast(`Usuario '${username}' guardado y habilitado para iniciar sesión.`, 'success');
  cerrarModal('modal-crear-usuario');
  cargarUsuarios();
}

async function cambiarMiClave() {
  const actual = document.getElementById('clave-actual').value.trim();
  const nueva = document.getElementById('clave-nueva').value.trim();
  const confirmar = document.getElementById('clave-confirmar').value.trim();

  if (!actual || !nueva) {
    showToast('Completa los campos.', 'error');
    return;
  }
  if (nueva !== confirmar) {
    showToast('La nueva contraseña y su confirmación no coinciden.', 'error');
    return;
  }

  const user = usuariosData.find(u =>
    (currentUser && String(u.id) === String(currentUser.id)) ||
    (currentUser && String(u.username).toLowerCase() === String(currentUser.username).toLowerCase())
  );
  if (user && user.password && String(user.password).trim() !== actual) {
    showToast('La contraseña actual es incorrecta.', 'error');
    return;
  }

  if (user) {
    user.password = nueva;
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(usuariosData));
  }

  try {
    await fetch(getApiEndpoint('/api/auth/cambiar-clave'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: currentUser ? currentUser.id : (user ? user.id : null),
        username: currentUser ? currentUser.username : (user ? user.username : null),
        clave_actual: actual,
        clave_nueva: nueva
      })
    });
  } catch (e) {
    console.warn('Error sincronizando cambio de clave:', e);
  }

  showToast('Contraseña actualizada con éxito.', 'success');
  cerrarModal('modal-mi-clave');
}

window.abrirModalAdminClave = function(userId, username) {
  document.getElementById('admin-target-user-id').value = userId;
  document.getElementById('admin-target-username').textContent = username;
  document.getElementById('admin-nueva-clave').value = '';
  abrirModal('modal-admin-clave-user');
};

async function confirmarClaveAdmin() {
  const userId = parseInt(document.getElementById('admin-target-user-id').value);
  const targetUsername = (document.getElementById('admin-target-username')?.textContent || '').trim();
  const nueva = document.getElementById('admin-nueva-clave').value.trim();
  if (!nueva) {
    showToast('Ingresa la nueva contraseña.', 'error');
    return;
  }

  const user = usuariosData.find(u => Number(u.id) === userId || String(u.username).toLowerCase() === targetUsername.toLowerCase());
  if (user) {
    user.password = nueva;
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(usuariosData));
  }

  try {
    await fetch(getApiEndpoint('/api/usuarios/cambiar-clave-admin'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: user ? user.id : userId,
        username: user ? user.username : targetUsername,
        nueva_clave: nueva
      })
    });
  } catch (e) {
    console.warn('Error sincronizando cambio de clave admin con backend:', e);
  }

  showToast('Contraseña actualizada.', 'success');
  cerrarModal('modal-admin-clave-user');
}

function solicitarConfirmacion(titulo, mensaje, onConfirm) {
  const titleEl = document.getElementById('modal-confirm-title');
  const descEl = document.getElementById('modal-confirm-desc');
  if (titleEl) titleEl.textContent = titulo || '¿Confirmar eliminación?';
  if (descEl) descEl.textContent = mensaje || 'Esta acción no se puede deshacer.';
  confirmActionCallback = onConfirm;
  abrirModal('modal-confirmar-eliminar');
}

window.eliminarUsuario = function(userId, username) {
  solicitarConfirmacion(
    '¿Eliminar usuario?',
    `¿Estás seguro de que deseas eliminar al usuario "${username}"?`,
    async () => {
      usuariosData = usuariosData.filter(u => String(u.id) !== String(userId) && String(u.username).toLowerCase() !== String(username).toLowerCase());
      localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(usuariosData));
      try {
        await fetch(getApiEndpoint('/api/usuarios/eliminar'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: userId, username })
        });
      } catch (e) {
        console.warn('Error eliminando usuario en backend:', e);
      }
      showToast(`Usuario '${username}' eliminado.`, 'info');
      cargarUsuarios();
    }
  );
};

// ==================== CRUD OPERACIONES ====================
window.abrirModalDestinatario = function(d = null) {
  document.getElementById('dest-id').value = d ? d.id : '';
  document.getElementById('dest-nombre').value = d ? d.nombre : '';
  document.getElementById('dest-tipo').value = d ? d.tipo : 'Grupo';
  document.getElementById('dest-activo').checked = d ? d.activo : true;
  document.getElementById('modal-destinatario-titulo').textContent = d ? 'Editar Destinatario' : 'Agregar Destinatario';
  abrirModal('modal-destinatario');
};

window.editarDestinatario = function(id) {
  const d = destinatariosData.find(x => String(x.id) === String(id));
  if (d) abrirModalDestinatario(d);
};

window.eliminarDestinatario = function(id) {
  const d = destinatariosData.find(x => String(x.id) === String(id));
  const nombre = d ? d.nombre : 'este destinatario';
  solicitarConfirmacion(
    '¿Eliminar destinatario?',
    `¿Estás seguro de que deseas eliminar a "${nombre}" de la lista?`,
    async () => {
      try {
        await fetch(getApiEndpoint('/api/destinatarios/eliminar'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: parseInt(id) })
        });
      } catch (err) {
        console.warn("Backend no disponible al eliminar:", err);
      }
      destinatariosData = destinatariosData.filter(x => String(x.id) !== String(id));
      localStorage.setItem(`${STORAGE_KEY_DEST}_${currentEmpresa}`, JSON.stringify(destinatariosData));
      showToast(`Destinatario "${nombre}" eliminado con éxito.`, 'info');
      cargarDatos();
    }
  );
};

async function guardarDestinatario() {
  const idStr = document.getElementById('dest-id').value;
  const nombre = document.getElementById('dest-nombre').value.trim();
  const tipo = document.getElementById('dest-tipo').value;
  const activo = document.getElementById('dest-activo').checked;

  if (!nombre) {
    showToast('El nombre es requerido.', 'error');
    return;
  }

  try {
    await fetch(getApiEndpoint('/api/destinatarios/guardar'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: idStr ? parseInt(idStr) : undefined,
        nombre,
        tipo,
        activo,
        empresa_id: currentEmpresa
      })
    });
  } catch (err) {
    console.warn("Backend no disponible al guardar destinatario:", err);
  }

  if (idStr) {
    const id = parseInt(idStr);
    const d = destinatariosData.find(x => x.id === id);
    if (d) { d.nombre = nombre; d.tipo = tipo; d.activo = activo; }
  } else {
    const nextId = destinatariosData.length > 0 ? Math.max(...destinatariosData.map(x => x.id)) + 1 : 1;
    destinatariosData.push({ id: nextId, nombre, tipo, activo, automatizaciones: [], estado: 'Pendiente', fecha: '', empresa_id: currentEmpresa });
  }

  localStorage.setItem(`${STORAGE_KEY_DEST}_${currentEmpresa}`, JSON.stringify(destinatariosData));
  showToast('Destinatario guardado.', 'success');
  cerrarModal('modal-destinatario');
  cargarDatos();
}

window.abrirModalNotificacion = function(n = null) {
  document.getElementById('notif-id').value = n ? n.id : '';
  document.getElementById('notif-input-titulo').value = n ? n.titulo : '';
  document.getElementById('notif-input-cuerpo').value = n ? n.cuerpo : 'Hola {nombre}, este es un aviso importante.';
  document.getElementById('modal-notif-titulo').textContent = n ? 'Editar Plantilla' : 'Nueva Plantilla';
  abrirModal('modal-notificacion');
};

window.editarNotificacion = function(id) {
  const n = notificacionesData.find(x => x.id === id);
  if (n) abrirModalNotificacion(n);
};

window.eliminarNotificacion = function(id) {
  const n = notificacionesData.find(x => String(x.id) === String(id));
  const titulo = n ? n.titulo : 'esta plantilla';
  solicitarConfirmacion(
    '¿Eliminar plantilla?',
    `¿Estás seguro de que deseas eliminar la plantilla "${titulo}"?`,
    async () => {
      try {
        await fetch(getApiEndpoint('/api/notificaciones/eliminar'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id })
        });
      } catch (err) {
        console.warn("Backend no disponible al eliminar plantilla:", err);
      }
      notificacionesData = notificacionesData.filter(x => String(x.id) !== String(id));
      localStorage.setItem(`${STORAGE_KEY_MSGS}_${currentEmpresa}`, JSON.stringify(notificacionesData));
      showToast(`Plantilla "${titulo}" eliminada.`, 'info');
      cargarDatos();
    }
  );
};

async function guardarNotificacion() {
  const id = document.getElementById('notif-id').value;
  const titulo = document.getElementById('notif-input-titulo').value.trim();
  const cuerpo = document.getElementById('notif-input-cuerpo').value.trim();

  if (!titulo) {
    showToast('El título es requerido.', 'error');
    return;
  }

  try {
    await fetch(getApiEndpoint('/api/notificaciones/guardar'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: id || undefined, titulo, cuerpo, empresa_id: currentEmpresa })
    });
  } catch (err) {
    console.warn("Backend no disponible al guardar plantilla:", err);
  }

  if (id) {
    const n = notificacionesData.find(x => x.id === id);
    if (n) { n.titulo = titulo; n.cuerpo = cuerpo; }
  } else {
    const newId = `notif_${Date.now()}`;
    const fecha = new Date().toISOString().substring(0, 10);
    notificacionesData.push({ id: newId, titulo, cuerpo, fecha_creacion: fecha, empresa_id: currentEmpresa });
  }

  localStorage.setItem(`${STORAGE_KEY_MSGS}_${currentEmpresa}`, JSON.stringify(notificacionesData));
  showToast('Plantilla guardada.', 'success');
  cerrarModal('modal-notificacion');
  cargarDatos();
}

window.insertarVariable = function(tag) {
  const txt = document.getElementById('notif-input-cuerpo');
  if (!txt) return;
  const s = txt.selectionStart;
  const e = txt.selectionEnd;
  txt.value = txt.value.substring(0, s) + tag + txt.value.substring(e);
  txt.focus();
  txt.selectionStart = txt.selectionEnd = s + tag.length;
};

window.abrirModalAutomatizacion = function(a = null) {
  const select = document.getElementById('auto-select-mensaje');
  select.innerHTML = '';
  notificacionesData.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m.id;
    opt.textContent = m.titulo;
    select.appendChild(opt);
  });

  document.getElementById('auto-id').value = a ? a.id : '';
  document.getElementById('auto-input-nombre').value = a ? a.nombre : '';
  if (a && a.mensaje_id) select.value = a.mensaje_id;
  document.getElementById('auto-input-dia').value = a ? a.dia_mes : 4;
  document.getElementById('auto-input-hora').value = a ? a.hora : '09:00';
  document.getElementById('auto-select-modalidad').value = a ? a.modalidad_dia : 'habil';
  document.getElementById('auto-check-repetir').checked = a ? a.repetir_mensual : true;
  document.getElementById('auto-check-activo').checked = a ? a.activo : true;
  document.getElementById('modal-auto-titulo').textContent = a ? 'Editar Automatización' : 'Configurar Automatización';
  abrirModal('modal-automatizacion');
};

window.editarAutomatizacion = function(id) {
  const a = automatizacionesData.find(x => x.id === id);
  if (a) abrirModalAutomatizacion(a);
};

window.eliminarAutomatizacion = function(id) {
  const a = automatizacionesData.find(x => String(x.id) === String(id));
  const nombre = a ? a.nombre : 'esta automatización';
  solicitarConfirmacion(
    '¿Eliminar automatización?',
    `¿Estás seguro de eliminar la regla "${nombre}"? Se desmarcará del checklist de los destinatarios.`,
    async () => {
      try {
        await fetch(getApiEndpoint('/api/automatizaciones/eliminar'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id })
        });
      } catch (err) {
        console.warn("Backend no disponible al eliminar auto:", err);
      }
      automatizacionesData = automatizacionesData.filter(x => String(x.id) !== String(id));
      destinatariosData.forEach(dest => {
        if (Array.isArray(dest.automatizaciones)) {
          dest.automatizaciones = dest.automatizaciones.filter(x => String(x) !== String(id));
        }
      });
      localStorage.setItem(`${STORAGE_KEY_AUTOS}_${currentEmpresa}`, JSON.stringify(automatizacionesData));
      localStorage.setItem(`${STORAGE_KEY_DEST}_${currentEmpresa}`, JSON.stringify(destinatariosData));
      showToast(`Automatización "${nombre}" eliminada.`, 'info');
      cargarDatos();
    }
  );
};

async function guardarAutomatizacion() {
  const id = document.getElementById('auto-id').value;
  const nombre = document.getElementById('auto-input-nombre').value.trim();
  const mensaje_id = document.getElementById('auto-select-mensaje').value;
  const dia_mes = parseInt(document.getElementById('auto-input-dia').value);
  const hora = document.getElementById('auto-input-hora').value;
  const modalidad_dia = document.getElementById('auto-select-modalidad').value;
  const repetir_mensual = document.getElementById('auto-check-repetir').checked;
  const activo = document.getElementById('auto-check-activo').checked;

  if (!nombre) {
    showToast('El nombre es requerido.', 'error');
    return;
  }

  try {
    await fetch(getApiEndpoint('/api/automatizaciones/guardar'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: id || undefined,
        nombre,
        mensaje_id,
        dia_mes,
        modalidad_dia,
        hora,
        activo,
        repetir_mensual,
        empresa_id: currentEmpresa
      })
    });
  } catch (err) {
    console.warn("Backend no disponible al guardar auto:", err);
  }

  if (id) {
    const a = automatizacionesData.find(x => x.id === id);
    if (a) {
      a.nombre = nombre;
      a.mensaje_id = mensaje_id;
      a.dia_mes = dia_mes;
      a.hora = hora;
      a.modalidad_dia = modalidad_dia;
      a.repetir_mensual = repetir_mensual;
      a.activo = activo;
    }
  } else {
    const newId = `auto_${Date.now()}`;
    automatizacionesData.push({ id: newId, nombre, mensaje_id, dia_mes, hora, modalidad_dia, repetir_mensual, activo, ultimo_envio_periodo: '', empresa_id: currentEmpresa });
  }

  localStorage.setItem(`${STORAGE_KEY_AUTOS}_${currentEmpresa}`, JSON.stringify(automatizacionesData));
  showToast('Automatización guardada con éxito.', 'success');
  cerrarModal('modal-automatizacion');
  cargarDatos();
}

function abrirModalEnviarAhora() {
  const select = document.getElementById('select-enviar-auto');
  select.innerHTML = '';
  automatizacionesData.forEach(a => {
    const opt = document.createElement('option');
    opt.value = a.id;
    opt.textContent = `${a.nombre} (Día ${a.dia_mes} ${a.modalidad_dia === 'habil' ? 'Hábil' : 'Normal'})`;
    select.appendChild(opt);
  });
  abrirModal('modal-enviar-ahora');
}

async function confirmarDisparoEnvio() {
  const autoId = document.getElementById('select-enviar-auto').value;
  const auto = automatizacionesData.find(a => a.id === autoId);
  const nombreTarea = auto ? auto.nombre : 'Envío Manual';
  const cfg = EMPRESAS_CONFIG[currentEmpresa] || EMPRESAS_CONFIG.contidep;

  const terminal = document.getElementById('terminal-body');
  const nowTime = new Date().toLocaleTimeString();
  terminal.innerHTML += `
    <div class="log-entry log-info"><span class="log-time">[${nowTime}]</span> <span class="log-msg">[${cfg.nombre}] Disparando tarea: '${nombreTarea}'...</span></div>
  `;

  try {
    const res = await fetch(getApiEndpoint('/api/enviar/iniciar'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ auto_id: autoId, nombre_tarea: nombreTarea, empresa: currentEmpresa })
    });
    const data = await res.json();
    if (data.success) {
      showToast(`¡Envío iniciado para ${cfg.nombre}!`, 'success');
    } else {
      showToast(data.error || 'Error al iniciar envío', 'error');
    }
  } catch (err) {
    showToast('No se pudo comunicar con el motor de envíos', 'error');
  }

  cerrarModal('modal-enviar-ahora');
  document.querySelector('[data-tab="tab-consola"]')?.click();
}

function abrirModal(id) {
  document.getElementById(id)?.classList.add('active');
}

function cerrarModal(id) {
  document.getElementById(id)?.classList.remove('active');
}

function showToast(msg, type = 'info') {
  const hub = document.getElementById('toast-container');
  if (!hub) return;
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = msg;
  hub.appendChild(t);
  setTimeout(() => t.remove(), 4000);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatWhatsAppPreview(text) {
  if (!text) return '';
  let safe = escapeHtml(text);
  // Negrita: *texto*
  safe = safe.replace(/\*([^\*]+)\*/g, '<strong>$1</strong>');
  // Cursiva: _texto_
  safe = safe.replace(/_([^_]+)_/g, '<em>$1</em>');
  // Tachado: ~texto~
  safe = safe.replace(/~([^~]+)~/g, '<del>$1</del>');
  // Saltos de línea
  safe = safe.replace(/\n/g, '<br>');
  return safe;
}

// ==================== GESTIÓN DE PLANTILLAS ====================
function renderPlantillas() {
  const grid = document.getElementById('grid-plantillas');
  if (!grid) return;

  let filtradas = plantillasData;

  if (plantillaFiltroCategoria && plantillaFiltroCategoria !== 'todas') {
    filtradas = filtradas.filter(p => (p.categoria || '').toLowerCase() === plantillaFiltroCategoria.toLowerCase());
  }

  if (plantillaSearchQuery) {
    filtradas = filtradas.filter(p => {
      const tit = (p.titulo || '').toLowerCase();
      const cue = (p.cuerpo || '').toLowerCase();
      const cat = (p.categoria || '').toLowerCase();
      return tit.includes(plantillaSearchQuery) || cue.includes(plantillaSearchQuery) || cat.includes(plantillaSearchQuery);
    });
  }

  if (filtradas.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; padding: 40px 20px; text-align: center; color: #94a3b8;">
        <div style="font-size: 38px; margin-bottom: 8px;">📋</div>
        <p style="font-size: 14px; font-weight: 500; color: #64748b;">No se encontraron plantillas con este criterio.</p>
        <button type="button" class="btn-action primary" style="margin-top: 10px;" onclick="abrirModalPlantilla()">➕ Crear Nueva Plantilla</button>
      </div>
    `;
    return;
  }

  let html = '';
  filtradas.forEach(p => {
    let catClass = 'cat-general';
    const cat = p.categoria || 'General';
    if (cat.includes('Tributario')) catClass = 'cat-tributario';
    else if (cat.includes('Laboral') || cat.includes('Previred')) catClass = 'cat-laboral';
    else if (cat.includes('Cierre')) catClass = 'cat-cierre';
    else if (cat.includes('Emojis') || cat.includes('Decorativos')) catClass = 'cat-decorativos';

    html += `
      <div class="notif-card" style="border-left: 4px solid var(--primary, #2563eb);">
        <div class="card-top-row">
          <h3 class="card-title">${escapeHtml(p.titulo)}</h3>
          <span class="card-id-badge ${catClass}">${escapeHtml(cat)}</span>
        </div>
        <div class="card-preview-body" style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 12px; font-family: system-ui, -apple-system, sans-serif; font-size: 12.5px; line-height: 1.5; color: #1e293b;">
          ${formatWhatsAppPreview(p.cuerpo)}
        </div>
        <div class="card-actions-line" style="margin-top: 12px; display: flex; flex-wrap: wrap; gap: 6px;">
          <button type="button" class="btn-card-action" style="background: #eff6ff; color: #2563eb; font-weight: 600;" onclick="usarPlantillaComoMensaje('${p.id}')" title="Usar esta plantilla para redactar un mensaje">
            ✉️ Usar en Mensaje
          </button>
          <button type="button" class="btn-card-action" onclick="copiarTextoPlantilla('${p.id}')" title="Copiar al portapapeles">
            📋 Copiar
          </button>
          <button type="button" class="btn-card-action" onclick="editarPlantilla('${p.id}')">
            ✏️ Editar
          </button>
          <button type="button" class="btn-card-action danger" onclick="eliminarPlantilla('${p.id}')">
            🗑️
          </button>
        </div>
      </div>
    `;
  });

  grid.innerHTML = html;
}

window.abrirModalPlantilla = function(p = null) {
  document.getElementById('plantilla-id').value = p ? p.id : '';
  document.getElementById('plantilla-input-titulo').value = p ? p.titulo : '';
  document.getElementById('plantilla-select-categoria').value = p ? p.categoria : 'Tributario / SII';
  document.getElementById('plantilla-input-cuerpo').value = p ? p.cuerpo : '';
  document.getElementById('modal-plantilla-titulo').textContent = p ? 'Editar Plantilla de Texto' : 'Nueva Plantilla de Texto';
  abrirModal('modal-plantilla');
};

window.editarPlantilla = function(id) {
  const p = plantillasData.find(x => String(x.id) === String(id));
  if (p) abrirModalPlantilla(p);
};

window.eliminarPlantilla = function(id) {
  const p = plantillasData.find(x => String(x.id) === String(id));
  const titulo = p ? p.titulo : 'esta plantilla';
  solicitarConfirmacion(
    '¿Eliminar plantilla?',
    `¿Estás seguro de que deseas eliminar la plantilla "${titulo}"?`,
    async () => {
      try {
        await fetch(getApiEndpoint('/api/plantillas/eliminar'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id })
        });
      } catch (err) {
        console.warn("Backend no disponible al eliminar plantilla:", err);
      }
      plantillasData = plantillasData.filter(x => String(x.id) !== String(id));
      localStorage.setItem(`${STORAGE_KEY_PLANTILLAS}_${currentEmpresa}`, JSON.stringify(plantillasData));
      showToast(`Plantilla "${titulo}" eliminada.`, 'info');
      actualizarUI();
    }
  );
};

async function guardarPlantillaModal() {
  const id = document.getElementById('plantilla-id').value;
  const titulo = document.getElementById('plantilla-input-titulo').value.trim();
  const categoria = document.getElementById('plantilla-select-categoria').value;
  const cuerpo = document.getElementById('plantilla-input-cuerpo').value.trim();

  if (!titulo) {
    showToast('El título de la plantilla es requerido.', 'error');
    return;
  }
  if (!cuerpo) {
    showToast('El cuerpo de la plantilla no puede estar vacío.', 'error');
    return;
  }

  try {
    await fetch(getApiEndpoint('/api/plantillas/guardar'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: id || undefined,
        titulo,
        categoria,
        cuerpo,
        empresa_id: currentEmpresa
      })
    });
  } catch (err) {
    console.warn("Backend no disponible al guardar plantilla:", err);
  }

  if (id) {
    const p = plantillasData.find(x => String(x.id) === String(id));
    if (p) {
      p.titulo = titulo;
      p.categoria = categoria;
      p.cuerpo = cuerpo;
    }
  } else {
    const newId = `plan_${Date.now()}`;
    plantillasData.unshift({
      id: newId,
      titulo,
      categoria,
      cuerpo,
      empresa_id: currentEmpresa
    });
  }

  localStorage.setItem(`${STORAGE_KEY_PLANTILLAS}_${currentEmpresa}`, JSON.stringify(plantillasData));
  showToast('Plantilla guardada con éxito.', 'success');
  cerrarModal('modal-plantilla');
  actualizarUI();
}

window.insertarVariablePlantilla = function(tag) {
  const txt = document.getElementById('plantilla-input-cuerpo');
  if (!txt) return;
  const s = txt.selectionStart;
  const e = txt.selectionEnd;
  txt.value = txt.value.substring(0, s) + tag + txt.value.substring(e);
  txt.focus();
  txt.selectionStart = txt.selectionEnd = s + tag.length;
};

window.copiarTextoAlPortapapeles = function(texto) {
  if (!texto) return;
  navigator.clipboard.writeText(texto).then(() => {
    showToast('Texto copiado al portapapeles 📋', 'success');
  }).catch(() => {
    // Fallback si no tiene permisos de clipboard
    const el = document.createElement('textarea');
    el.value = texto;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    showToast('Texto copiado al portapapeles 📋', 'success');
  });
};

window.copiarTextoPlantilla = function(id) {
  const p = plantillasData.find(x => String(x.id) === String(id));
  if (p) window.copiarTextoAlPortapapeles(p.cuerpo);
};

window.usarPlantillaComoMensaje = function(id) {
  const p = plantillasData.find(x => String(x.id) === String(id));
  if (!p) return;
  abrirModalNotificacion({
    id: '',
    titulo: p.titulo,
    cuerpo: p.cuerpo
  });
  showToast(`Plantilla "${p.titulo}" cargada para crear mensaje.`, 'info');
};

function actualizarSelectorPlantillasEnModalNotif() {
  const sel = document.getElementById('notif-select-plantilla-base');
  if (!sel) return;

  const currentVal = sel.value;
  sel.innerHTML = '<option value="">-- Elige una plantilla contable o personalizada --</option>';

  const grupos = {};
  plantillasData.forEach(p => {
    const cat = p.categoria || 'General';
    if (!grupos[cat]) grupos[cat] = [];
    grupos[cat].push(p);
  });

  Object.keys(grupos).forEach(cat => {
    const optgroup = document.createElement('optgroup');
    optgroup.label = cat;
    grupos[cat].forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = p.titulo;
      optgroup.appendChild(opt);
    });
    sel.appendChild(optgroup);
  });

  if (currentVal) sel.value = currentVal;
}

// ==================== ASISTENTE DE REDACCIÓN IA & CHAT ====================
function initAsistenteChat() {
  const stream = document.getElementById('asistente-messages-stream');
  if (!stream) return;

  if (stream.children.length === 0) {
    const welcomeBubble = document.createElement('div');
    welcomeBubble.className = 'chat-bubble assistant';
    welcomeBubble.innerHTML = `
      <div style="font-weight: 700; color: #f8fafc; margin-bottom: 4px; display: flex; align-items: center; gap: 6px;">
        <span>🤖 Asistente Tributario & WhatsApp</span>
      </div>
      <p style="margin: 0; line-height: 1.45; color: #e2e8f0;">
        ¡Hola! 👋 Te ayudo a redactar plantillas contables para tus clientes en Chile (como <strong>F29 IVA</strong>, <strong>Previred</strong>, <strong>Cierre de facturas</strong>, <strong>Cobro de honorarios</strong>) o bien generar estructuras decorativas limpias con emoticones.
      </p>
      <p style="margin: 6px 0 0 0; font-size: 11.5px; color: #94a3b8;">
        👉 Elige un tema en los botones de arriba, inserta emoticones o escribe tu instrucción abajo. Puedes alternar entre <em>Mensaje Completo</em> o <em>Solo Decorativos</em>.
      </p>
    `;
    stream.appendChild(welcomeBubble);
  }
}

function agregarBurbujaUsuario(texto) {
  const stream = document.getElementById('asistente-messages-stream');
  if (!stream) return;
  const bubble = document.createElement('div');
  bubble.className = 'chat-bubble user';
  bubble.textContent = texto;
  stream.appendChild(bubble);
  stream.scrollTop = stream.scrollHeight;
}

function generarPlantillaConIA(promptText, modo) {
  const p = promptText.toLowerCase();

  // MODO: SOLO DECORATIVOS Y EMOJIS
  if (modo === 'decorativos' || p.includes('solo decorativo') || p.includes('decorativo') || p.includes('solo emotes') || p.includes('emojis')) {
    if (p.includes('alerta') || p.includes('urgente') || p.includes('importante')) {
      return {
        titulo: 'Marco de Alerta Importante con Emojis',
        categoria: 'Solo Emojis y Decorativos',
        cuerpo: '🚨━━━━━━━━━━━━━━━━━━━🚨\n       *COMUNICADO URGENTE*\n🚨━━━━━━━━━━━━━━━━━━━🚨\n\nHola *{nombre}*,\n\n⚠️ *ATENCIÓN:* [ESCRIBE AQUÍ EL MOTIVO DE LA ALERTA]\n\n━━━━━━━━━━━━━━━━━━━━━\n📌 *Puntos Clave:*\n• ❗ [Punto 1]: \n• ❗ [Punto 2]: \n\n⏳ *VENCE:* [DÍA / HORA]\n━━━━━━━━━━━━━━━━━━━━━\n\n_Por favor confirmar recepción de este aviso._',
        explicacion: 'Plantilla de alto impacto visual con bordes de alerta y viñetas de exclamación.'
      };
    }

    if (p.includes('cuadro') || p.includes('marco') || p.includes('borde')) {
      return {
        titulo: 'Marco Decorativo Clásico con Separadores',
        categoria: 'Solo Emojis y Decorativos',
        cuerpo: '┏━━━━━━━━━━━━━━━━━━━━┓\n  ✨ *AVISO OFICIAL* ✨\n┗━━━━━━━━━━━━━━━━━━━━┛\n\nEstimado/a *{nombre}*,\n\n🔹 *TEMA:* [ASUNTO DEL MENSAJE]\n\n━━━━━━━━━━━━━━━━━━━━━\n📋 *INFORMACIÓN:*\n👉 [Línea 1]\n👉 [Línea 2]\n👉 [Línea 3]\n\n📅 *FECHA COMPROMISO:* [FECHA]\n━━━━━━━━━━━━━━━━━━━━━\n\nSaludos atentos,\n*Asesoría Contable* 🤝',
        explicacion: 'Estructura elegante tipo caja con esquinas Unicode y viñetas de mano señaladora.'
      };
    }

    return {
      titulo: 'Estructura Limpia con Viñetas y Separadores',
      categoria: 'Solo Emojis y Decorativos',
      cuerpo: '🌟━━━━━━━━━━━━━━━━━━━🌟\n        *AVISO IMPORTANTE*\n🌟━━━━━━━━━━━━━━━━━━━🌟\n\nHola *{nombre}*,\n\n📌 *ASUNTO:* [Escribe el título de tu mensaje]\n\n━━━━━━━━━━━━━━━━━━━━━\n💬 *DETALLE:*\n• 1️⃣ [Detalle número uno]\n• 2️⃣ [Detalle número dos]\n• 3️⃣ [Detalle número tres]\n\n⚠️ *FECHA LÍMITE:* [Día y Hora]\n━━━━━━━━━━━━━━━━━━━━━\n\nQuedamos atentos a cualquier duda o consulta.\n\n*Atentamente,* ✨',
      explicacion: 'Diseño decorativo versátil con estrellas, viñetas numéricas y separadores simétricos.'
    };
  }

  // MODO: MENSAJE COMPLETO
  if (p.includes('f29') || p.includes('iva') || p.includes('sii')) {
    return {
      titulo: 'Recordatorio Declaración F29 IVA - SII Chile',
      categoria: 'Tributario / SII',
      cuerpo: 'Estimados señores *{nombre}*,\n\nLes recordamos que se aproxima la fecha límite para declarar y pagar el *Formulario 29 (F29)* del SII.\n\n📌 *Detalles Tributarios:*\n• Período: Mes en curso\n• Plazo máximo: *Día 20 a las 23:59 hrs* (con factura electrónica)\n• Estado: En revisión de compras, ventas y boletas de honorarios.\n\n⚠️ *Acción requerida:* Si tienen facturas de compras o ventas pendientes de emisión, favor emitirlas o enviarlas hoy mismo para que queden incluidas en la propuesta.\n\nAtentamente,\n*Equipo Contable & Tributario*',
      explicacion: 'Plantilla formal de F29 IVA adaptada a la normativa del Servicio de Impuestos Internos (SII).'
    };
  }

  if (p.includes('previred') || p.includes('cotizacion') || p.includes('sueldo') || p.includes('leyes sociales')) {
    return {
      titulo: 'Aviso de Pago Previred y Leyes Sociales',
      categoria: 'Laboral / Previred',
      cuerpo: 'Aviso Importante: Pago de Cotizaciones Previsionales 🏢💼\n\nEstimado/a *{nombre}*,\n\nLes informamos que la nómina de cotizaciones previsionales del mes anterior ya está cargada en *Previred*.\n\n⏰ *Plazo Vencimiento:*\n• Vence el *Día 13 a las 13:45 hrs* (pago electrónico).\n• Cobertura: AFP, Fonasa/Isapre, AFC, Mutual e IPS.\n\n🔔 *Recuerden:* Eviten multas e intereses por parte de la Dirección del Trabajo realizando el pago dentro del plazo legal.\n\nFavor enviar el comprobante de pago una vez realizado.\n*Departamento de Recursos Humanos & Contabilidad*',
      explicacion: 'Recordatorio laboral para el pago de Previred con plazos legales exactos para Chile.'
    };
  }

  if (p.includes('cierre') || p.includes('factura') || p.includes('documento') || p.includes('cartola')) {
    return {
      titulo: 'Solicitud de Facturas y Cartolas - Cierre Mensual',
      categoria: 'Cierre Contable',
      cuerpo: 'Estimados clientes de *{nombre}*,\n\nEsperando que tengan un excelente día, les solicitamos la documentación para realizar el *Cierre Contable del Mes*:\n\n📋 *Favor enviar antes del día 5:*\n1️⃣ Facturas de compras o gastos fuera del portal SII.\n2️⃣ Boletas y comprobantes menores o rendiciones de caja.\n3️⃣ Cartola bancaria del mes en formato Excel o PDF.\n4️⃣ Novedades de sueldos (licencias, horas extras o retiros).\n\nCon esta información garantizamos balances al día y cálculos de impuestos exactos.\n\n¡Muchas gracias por su puntualidad!\n*Asesoría Contable*',
      explicacion: 'Solicitud mensual de documentos comerciales, bancarios y laborales para cierre de mes.'
    };
  }

  if (p.includes('honorarios') || p.includes('cobro') || p.includes('pago mensual') || p.includes('factura asesor')) {
    return {
      titulo: 'Aviso de Cobro de Honorarios de Asesoría Contable',
      categoria: 'Cobranzas y Honorarios',
      cuerpo: 'Estimados señores *{nombre}*,\n\nEsperando se encuentren muy bien, les enviamos el aviso de cobro por los servicios de *Asesoría Contable & Tributaria* de este mes.\n\n💼 *Detalle del Servicio:*\n• Asesoría contable integral, declaraciones F29 y soporte tributario continuo.\n\n💳 *Datos de Transferencia:*\n• Banco: [BANCO]\n• Tipo de Cuenta: Cuenta Corriente\n• N° de Cuenta: [NÚMERO]\n• RUT: [RUT]\n• Email de Comprobantes: pagos@asesores.cl\n\nPor favor remitir el comprobante para la emisión de la boleta o factura exenta correspondiente. ¡Agradecemos su confianza!',
      explicacion: 'Mensaje cortés y profesional para cobro mensual de honorarios con datos bancarios listos para completar.'
    };
  }

  if (p.includes('patente') || p.includes('municipal')) {
    return {
      titulo: 'Aviso de Vencimiento: Patente Municipal y Comercial',
      categoria: 'Tributario / SII',
      cuerpo: 'Aviso de Vencimiento: Patente Comercial 🏛️\n\nEstimado cliente *{nombre}*,\n\nLes recordamos que este mes corresponde el pago de la cuota de la *Patente Municipal* de su empresa.\n\n📍 *Puntos Clave:*\n• Plazo de vencimiento: *Último día hábil del mes*.\n• Pago en portal de la Municipalidad respectiva con el RUT de la empresa.\n\nSi la municipalidad les solicita el certificado de capital propio tributario emitido ante el SII, por favor avísennos para enviárselo de inmediato.\n\nSaludos atentos,\n*Asesoría Tributaria*',
      explicacion: 'Aviso semestral para pago de patentes comerciales ante municipalidades chilenas.'
    };
  }

  if (p.includes('renta') || p.includes('f22') || p.includes('dj') || p.includes('jurada')) {
    return {
      titulo: 'Operación Renta F22 y Declaraciones Juradas Anuales',
      categoria: 'Tributario / SII',
      cuerpo: 'Proceso Operación Renta - SII Chile 📊🇨🇱\n\nEstimados señores *{nombre}*,\n\nLes informamos que se encuentra abierto el proceso de *Operación Renta Anual*.\n\n📝 *Etapas del Proceso:*\n1️⃣ Declaraciones Juradas (Sueldos, Honorarios, Retiros y Rentas).\n2️⃣ Confección del Balance General y Determinación de Renta Líquida Imponible.\n3️⃣ Declaración y presentación del *Formulario 22 (F22)*.\n\nLes solicitamos coordinar una reunión o confirmar la información financiera preliminar enviada a su correo.\n\nAtentamente,\n*Equipo Tributario & Auditoría*',
      explicacion: 'Plantilla completa para el proceso tributario anual de Renta en Chile.'
    };
  }

  // Plantilla libre basada en la petición del usuario
  const tituloLibre = promptText.length > 35 ? promptText.substring(0, 35) + '...' : promptText;
  return {
    titulo: `Plantilla: ${tituloLibre.charAt(0).toUpperCase() + tituloLibre.slice(1)}`,
    categoria: 'General',
    cuerpo: `Estimado/a *{nombre}*,\n\nEsperando que se encuentre muy bien, le contactamos desde el equipo contable:\n\n📌 *Asunto:* ${promptText}\n\n━━━━━━━━━━━━━━━━━━━━━\nℹ️ *Detalles importantes:*\n• Le solicitamos revisar la información adjunta.\n• Plazo de confirmación: Lo antes posible para evitar retrasos.\n\nQuedamos a su disposición ante cualquier duda o requerimiento.\n\nSaludos cordiales,\n*Asesoría Contable & Financiera* 🤝`,
    explicacion: 'Plantilla personalizada generada según tu instrucción con estructura ejecutiva para WhatsApp.'
  };
}

function agregarBurbujaAsistente(titulo, cuerpoWA, explicacion, categoria) {
  const stream = document.getElementById('asistente-messages-stream');
  if (!stream) return;

  const bubble = document.createElement('div');
  bubble.className = 'chat-bubble assistant';

  const previewHtml = formatWhatsAppPreview(cuerpoWA);

  bubble.innerHTML = `
    <div style="font-weight: 700; color: #f8fafc; margin-bottom: 4px; display: flex; align-items: center; justify-content: space-between; gap: 6px;">
      <span>🤖 ${escapeHtml(titulo)}</span>
      <span class="card-id-badge cat-general" style="font-size: 10px;">${escapeHtml(categoria)}</span>
    </div>
    <p style="font-size: 11.5px; color: #cbd5e1; margin: 0 0 8px 0;">${escapeHtml(explicacion)}</p>

    <!-- VISTA PREVIA FORMATO WHATSAPP -->
    <div class="wa-preview-card">
      <div class="wa-bubble-inner">
        ${previewHtml}
      </div>
      <div class="wa-bubble-time">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ✓✓</div>
    </div>

    <!-- BOTONES DE ACCIÓN RÁPIDA -->
    <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-top: 10px;">
      <button type="button" class="btn-wa-action primary btn-guardar-ia">
        💾 Guardar en Mis Plantillas
      </button>
      <button type="button" class="btn-wa-action btn-usar-ia">
        ✉️ Usar en Mensaje
      </button>
      <button type="button" class="btn-wa-action btn-copiar-ia">
        📋 Copiar
      </button>
    </div>
  `;

  // Listeners de los botones en la burbuja
  bubble.querySelector('.btn-guardar-ia')?.addEventListener('click', () => {
    guardarPlantillaGenerada(titulo, cuerpoWA, categoria);
  });

  bubble.querySelector('.btn-usar-ia')?.addEventListener('click', () => {
    usarPlantillaGeneradaDirecto(titulo, cuerpoWA);
  });

  bubble.querySelector('.btn-copiar-ia')?.addEventListener('click', () => {
    window.copiarTextoAlPortapapeles(cuerpoWA);
  });

  stream.appendChild(bubble);
  stream.scrollTop = stream.scrollHeight;
}

async function guardarPlantillaGenerada(titulo, cuerpo, categoria) {
  const newId = `plan_ia_${Date.now()}`;
  try {
    await fetch(getApiEndpoint('/api/plantillas/guardar'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: newId,
        titulo,
        categoria: categoria || 'General',
        cuerpo,
        empresa_id: currentEmpresa
      })
    });
  } catch (err) {
    console.warn("Backend no disponible al guardar plantilla IA:", err);
  }

  plantillasData.unshift({
    id: newId,
    titulo,
    categoria: categoria || 'General',
    cuerpo,
    empresa_id: currentEmpresa
  });
  localStorage.setItem(`${STORAGE_KEY_PLANTILLAS}_${currentEmpresa}`, JSON.stringify(plantillasData));
  showToast(`¡Plantilla "${titulo}" agregada a tu catálogo!`, 'success');
  actualizarUI();
}

function usarPlantillaGeneradaDirecto(titulo, cuerpo) {
  abrirModalNotificacion({
    id: '',
    titulo,
    cuerpo
  });
  showToast('Plantilla cargada en el mensaje para enviar.', 'info');
}

function enviarMensajeAsistente(promptManual = null) {
  const inputEl = document.getElementById('asistente-chat-input');
  let promptText = '';

  if (promptManual) {
    if (promptManual === 'f29') promptText = 'Recordatorio F29 Declaración mensual de IVA en SII';
    else if (promptManual === 'previred') promptText = 'Aviso de pago de cotizaciones previsionales en Previred';
    else if (promptManual === 'cierre') promptText = 'Solicitud de facturas y cartolas para cierre contable mensual';
    else if (promptManual === 'decorativos') promptText = 'Plantilla solo con marcos decorativos, separadores y emojis';
    else if (promptManual === 'honorarios') promptText = 'Cobro formal de honorarios contables mensuales';
    else if (promptManual === 'patente') promptText = 'Aviso de vencimiento de patente municipal comercial';
    else if (promptManual === 'renta') promptText = 'Declaración anual Operación Renta F22 y balances';
    else promptText = promptManual;
  } else if (inputEl) {
    promptText = inputEl.value.trim();
  }

  if (!promptText) {
    showToast('Escribe una instrucción o haz clic en una sugerencia rápida.', 'info');
    return;
  }

  const modoEl = document.querySelector('input[name="asistente-modo-salida"]:checked');
  const modo = modoEl ? modoEl.value : 'completo';

  agregarBurbujaUsuario(promptText + (modo === 'decorativos' ? ' (Modo: Solo decorativos)' : ''));
  if (inputEl) inputEl.value = '';

  const res = generarPlantillaConIA(promptText, modo);
  setTimeout(() => {
    agregarBurbujaAsistente(res.titulo, res.cuerpo, res.explicacion, res.categoria);
  }, 200);
}

// ==================== SELECTOR DE EMOTICONES Y CHAT IA EN MODALES ====================
const EMOJI_CATALOG = {
  contables: {
    label: '📊 Contables',
    items: ['📊', '📈', '📉', '💼', '🏢', '🏦', '💳', '💰', '💵', '🧾', '📋', '📑', '📁', '📅', '🗓️', '🏛️', '⚖️', '🇨🇱', '🖋️', '🧮']
  },
  alertas: {
    label: '⚠️ Alertas',
    items: ['📌', '⚠️', '🚨', '🔔', '⏰', '⏳', '❗', '❓', '✅', '☑️', '❌', '🛑', '📢', '📣', '💡', '🔥', '⭐', '🌟', '✨', '🎯']
  },
  vinetas: {
    label: '👉 Viñetas',
    items: ['👉', '🔹', '🔸', '▪️', '▫️', '▶️', '➡️', '✔️', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟', '•', '✦']
  },
  caritas: {
    label: '😊 Emoticones',
    items: ['👋', '😊', '😀', '🤝', '👍', '👏', '🙌', '🙏', '💪', '🤓', '🧐', '📞', '📱', '💻', '📧', '✉️', '🔒', '🔑', '🛡️', '🚀']
  },
  marcos: {
    label: '✨ Marcos',
    items: [
      '━━━━━━━━━━━━━━━━━━━━━',
      '🚨━━━━━━━━━━━━━━━━━━━🚨',
      '🌟━━━━━━━━━━━━━━━━━━━🌟',
      '┏━━━━━━━━━━━━━━━━━━━━┓\n  ✨ *AVISO OFICIAL* ✨\n┗━━━━━━━━━━━━━━━━━━━━┛',
      '📌 *PUNTOS CLAVE:*\n• 1️⃣ \n• 2️⃣ '
    ]
  }
};

function insertarTextoEnCursor(textareaId, texto) {
  const txt = document.getElementById(textareaId);
  if (!txt) return;
  const start = txt.selectionStart || 0;
  const end = txt.selectionEnd || 0;
  txt.value = txt.value.substring(0, start) + texto + txt.value.substring(end);
  txt.focus();
  txt.selectionStart = txt.selectionEnd = start + texto.length;
}

window.aplicarFormatoTexto = function(textareaId, wrapperChar) {
  const txt = document.getElementById(textareaId);
  if (!txt) return;
  const start = txt.selectionStart || 0;
  const end = txt.selectionEnd || 0;
  const selected = txt.value.substring(start, end) || 'texto';
  const replacement = `${wrapperChar}${selected}${wrapperChar}`;
  txt.value = txt.value.substring(0, start) + replacement + txt.value.substring(end);
  txt.focus();
  txt.selectionStart = start + wrapperChar.length;
  txt.selectionEnd = start + wrapperChar.length + selected.length;
};

function initEmojiPickers() {
  const panels = document.querySelectorAll('.emoji-picker-panel');
  panels.forEach(panel => {
    const targetId = panel.getAttribute('data-target');
    if (!targetId) return;

    let activeCat = 'contables';

    function renderPanel() {
      const catTabsHtml = Object.keys(EMOJI_CATALOG).map(catKey => {
        const cat = EMOJI_CATALOG[catKey];
        return `<button type="button" class="emoji-cat-btn ${catKey === activeCat ? 'active' : ''}" data-cat="${catKey}">${cat.label}</button>`;
      }).join('');

      const items = EMOJI_CATALOG[activeCat].items;
      const isMarcos = activeCat === 'marcos';
      const itemsHtml = items.map((item, idx) => {
        if (isMarcos) {
          return `<button type="button" class="emoji-line-item" data-idx="${idx}" title="Insertar bloque decorativo">${escapeHtml(item.replace(/\n/g, ' ↵ '))}</button>`;
        }
        return `<button type="button" class="emoji-btn-item" data-idx="${idx}" title="Insertar ${item}">${item}</button>`;
      }).join('');

      panel.innerHTML = `
        <div class="emoji-cat-tabs">${catTabsHtml}</div>
        <div class="emoji-grid-items ${isMarcos ? 'marcos-list' : ''}">${itemsHtml}</div>
      `;

      panel.querySelectorAll('.emoji-cat-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          activeCat = btn.getAttribute('data-cat');
          renderPanel();
        });
      });

      panel.querySelectorAll('.emoji-btn-item, .emoji-line-item').forEach(btn => {
        btn.addEventListener('click', () => {
          const idx = parseInt(btn.getAttribute('data-idx'), 10);
          const val = EMOJI_CATALOG[activeCat].items[idx];
          if (val) {
            insertarTextoEnCursor(targetId, isMarcos ? `\n${val}\n` : val);
          }
        });
      });
    }

    renderPanel();
  });
}

window.insertarEnInputChat = function(emoji) {
  const inputEl = document.getElementById('asistente-chat-input');
  if (!inputEl) return;
  const start = inputEl.selectionStart || inputEl.value.length;
  const end = inputEl.selectionEnd || inputEl.value.length;
  inputEl.value = inputEl.value.substring(0, start) + emoji + inputEl.value.substring(end);
  inputEl.focus();
  inputEl.selectionStart = inputEl.selectionEnd = start + emoji.length;
};

window.abrirTabChatIA = function() {
  const tabBtn = document.querySelector('.tab-item[data-tab="tab-plantillas"]');
  if (tabBtn) tabBtn.click();
  const btnSubnavChat = document.getElementById('btn-subnav-chat');
  if (btnSubnavChat) btnSubnavChat.click();
  setTimeout(() => {
    const chatInput = document.getElementById('asistente-chat-input');
    if (chatInput) chatInput.focus();
  }, 150);
};

window.generarEnModalDesdeChip = function(modalType, promptKey) {
  let promptText = promptKey;
  let modo = 'completo';
  if (promptKey === 'f29') promptText = 'Recordatorio F29 Declaración mensual de IVA en SII';
  else if (promptKey === 'previred') promptText = 'Aviso de pago de cotizaciones previsionales en Previred';
  else if (promptKey === 'cierre') promptText = 'Solicitud de facturas y cartolas para cierre contable mensual';
  else if (promptKey === 'honorarios') promptText = 'Cobro formal de honorarios contables mensuales';
  else if (promptKey === 'decorativos') {
    promptText = 'Plantilla solo con marcos decorativos, separadores y emojis';
    modo = 'decorativos';
  }
  else if (promptKey === 'alerta') {
    promptText = 'Marco de alerta urgente importante con emojis';
    modo = 'decorativos';
  }

  const res = generarPlantillaConIA(promptText, modo);
  aplicarResultadoIAEnModal(modalType, res);
};

window.generarEnModalConInput = function(modalType) {
  const inputId = modalType === 'notif' ? 'modal-notif-ai-input' : 'modal-plantilla-ai-input';
  const inputEl = document.getElementById(inputId);
  const promptText = inputEl ? inputEl.value.trim() : '';
  if (!promptText) {
    showToast('Escribe una instrucción para el Asistente IA o elige un botón rápido.', 'info');
    return;
  }
  const modo = (promptText.toLowerCase().includes('marco') || promptText.toLowerCase().includes('decorat') || promptText.toLowerCase().includes('emoji')) ? 'decorativos' : 'completo';
  const res = generarPlantillaConIA(promptText, modo);
  aplicarResultadoIAEnModal(modalType, res);
  if (inputEl) inputEl.value = '';
};

function aplicarResultadoIAEnModal(modalType, res) {
  if (modalType === 'notif') {
    const tituloEl = document.getElementById('notif-input-titulo');
    const cuerpoEl = document.getElementById('notif-input-cuerpo');
    if (tituloEl) tituloEl.value = res.titulo;
    if (cuerpoEl) {
      cuerpoEl.value = res.cuerpo;
      cuerpoEl.focus();
    }
    showToast('✨ Plantilla redactada por IA con emoticones lista para guardar.', 'success');
  } else {
    const tituloEl = document.getElementById('plantilla-input-titulo');
    const catEl = document.getElementById('plantilla-select-categoria');
    const cuerpoEl = document.getElementById('plantilla-input-cuerpo');
    if (tituloEl) tituloEl.value = res.titulo;
    if (catEl && res.categoria) catEl.value = res.categoria;
    if (cuerpoEl) {
      cuerpoEl.value = res.cuerpo;
      cuerpoEl.focus();
    }
    showToast('✨ Plantilla redactada por IA con emoticones lista para guardar.', 'success');
  }
}


