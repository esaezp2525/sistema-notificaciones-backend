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

const DEFAULT_CLOUD_API = 'https://sistema-notificaciones-backend.onrender.com';

const EMPRESAS_CONFIG = {
  contidep: { id: 'contidep', nombre: 'Contidep', icon: '🏢', color: '#2563eb' },
  medcapital: { id: 'medcapital', nombre: 'Medcapital', icon: '🏥', color: '#10b981' }
};

let currentEmpresa = localStorage.getItem(STORAGE_KEY_EMPRESA) || 'contidep';
let currentUser = null;
let savedApi = localStorage.getItem(STORAGE_KEY_API);
if (!savedApi || (window.location.protocol === 'https:' && savedApi.startsWith('http:')) || savedApi.includes('127.0.0.1') || savedApi.includes('localhost')) {
  savedApi = DEFAULT_CLOUD_API;
  localStorage.setItem(STORAGE_KEY_API, DEFAULT_CLOUD_API);
}
let apiUrl = savedApi;

let destinatariosData = [];
let notificacionesData = [];
let automatizacionesData = [];
let usuariosData = [];
let searchQuery = '';
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
}

// ==================== INICIALIZACIÓN ====================
document.addEventListener('DOMContentLoaded', () => {
  initDefaultStorage();
  setupTabs();
  setupEventListeners();
  verificarSesion();
  iniciarPollingLogs();
});

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

  // Login
  document.getElementById('form-login')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const usernameInput = document.getElementById('login-username').value.trim().toLowerCase();
    const passwordInput = document.getElementById('login-password').value;
    const errorBox = document.getElementById('login-error-msg');

    const users = JSON.parse(localStorage.getItem(STORAGE_KEY_USERS) || '[]');
    const found = users.find(u => u.username.toLowerCase() === usernameInput && u.password === passwordInput);

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

  // Escanear WhatsApp en Vivo
  document.getElementById('btn-probar-wa')?.addEventListener('click', abrirModalQR);
  document.getElementById('btn-abrir-modal-scan')?.addEventListener('click', abrirModalQR);
  document.getElementById('btn-cerrar-modal-qr')?.addEventListener('click', cerrarModalQR);
  document.getElementById('btn-cancelar-modal-qr')?.addEventListener('click', cerrarModalQR);

  // Desconectar sesión de la empresa activa
  document.getElementById('btn-desconectar-wa-empresa')?.addEventListener('click', () => {
    const cfg = EMPRESAS_CONFIG[currentEmpresa] || EMPRESAS_CONFIG.contidep;
    solicitarConfirmacion(
      `¿Desconectar WhatsApp de ${cfg.nombre}?`,
      `Esta acción cerrará la sesión de WhatsApp para ${cfg.nombre}. La otra empresa seguirá conectada independientemente.`,
      async () => {
        try {
          const res = await fetch(getApiEndpoint('/api/whatsapp/desconectar'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ empresa: currentEmpresa })
          });
          const data = await res.json();
          showToast(data.message || 'Sesión desconectada', 'info');
          cerrarModalQR();
          verificarEstadoWhatsApp();
        } catch (err) {
          showToast('Error al desconectar sesión', 'error');
        }
      }
    );
  });

  // Limpiar consola
  document.getElementById('btn-limpiar-consola')?.addEventListener('click', () => {
    document.getElementById('terminal-body').innerHTML = '';
    fetch(getApiEndpoint('/api/logs/limpiar'), { method: 'POST' }).catch(() => {});
    showToast('Consola limpiada.', 'info');
  });
}

// ==================== GESTIÓN DE WHATSAPP EN VIVO ====================
function getApiEndpoint(path) {
  let base = apiUrl || DEFAULT_CLOUD_API;
  if (window.location.protocol === 'https:' && (base.startsWith('http:') || base.includes('127.0.0.1') || base.includes('localhost'))) {
    base = DEFAULT_CLOUD_API;
  }
  return `${base.replace(/\/+$/, '')}${path}`;
}

async function verificarEstadoWhatsApp() {
  const dot = document.getElementById('wa-status-dot');
  const text = document.getElementById('wa-status-text');
  const btnDisconnect = document.getElementById('btn-desconectar-wa-empresa');
  const cfg = EMPRESAS_CONFIG[currentEmpresa] || EMPRESAS_CONFIG.contidep;
  try {
    const res = await fetch(getApiEndpoint(`/api/whatsapp/status?empresa=${currentEmpresa}`));
    const data = await res.json();
    if (data.authenticated) {
      if (dot) dot.className = 'status-dot online';
      if (text) text.textContent = `WA ${cfg.nombre}: Conectado`;
      if (btnDisconnect) btnDisconnect.style.display = 'inline-block';
    } else {
      if (dot) dot.className = 'status-dot offline';
      if (text) text.textContent = `WA ${cfg.nombre}: Desconectado`;
      if (btnDisconnect) btnDisconnect.style.display = 'none';
    }
  } catch (e) {
    if (dot) dot.className = 'status-dot offline';
    if (text) text.textContent = `WA ${cfg.nombre}: Sin Motor`;
    if (btnDisconnect) btnDisconnect.style.display = 'none';
  }
}

function abrirModalQR() {
  actualizarSelectorEmpresa();
  const loadingState = document.getElementById('qr-loading-state');
  const displayContainer = document.getElementById('qr-display-container');
  const successState = document.getElementById('qr-success-state');
  const qrImg = document.getElementById('qr-image-display');
  const statusText = document.getElementById('qr-status-text');
  const cfg = EMPRESAS_CONFIG[currentEmpresa] || EMPRESAS_CONFIG.contidep;

  if (loadingState) loadingState.style.display = 'block';
  if (displayContainer) displayContainer.style.display = 'none';
  if (successState) successState.style.display = 'none';
  if (statusText) statusText.textContent = `Iniciando conexión con WhatsApp para ${cfg.nombre}...`;

  abrirModal('modal-qr-whatsapp');

  if (qrPollInterval) clearInterval(qrPollInterval);

  async function pollQR() {
    try {
      const res = await fetch(getApiEndpoint(`/api/whatsapp/qr?empresa=${currentEmpresa}`));
      const data = await res.json();

      if (data.qr) {
        if (qrImg) qrImg.src = data.qr;
        if (loadingState) loadingState.style.display = 'none';
        if (displayContainer) displayContainer.style.display = 'block';
        if (successState) successState.style.display = 'none';
      } else if (data.authenticated) {
        if (loadingState) loadingState.style.display = 'none';
        if (displayContainer) displayContainer.style.display = 'none';
        if (successState) successState.style.display = 'block';
        clearInterval(qrPollInterval);
        qrPollInterval = null;
        verificarEstadoWhatsApp();
        showToast(`¡WhatsApp de ${cfg.nombre} vinculado exitosamente!`, 'success');
        setTimeout(() => cerrarModal('modal-qr-whatsapp'), 3000);
        return;
      } else if (data.status_text && statusText) {
        statusText.textContent = data.status_text;
      }
    } catch (e) {
      if (statusText) {
        statusText.innerHTML = `No se pudo conectar con el motor.<br><span style="font-size:12px; color:#ef4444;">Configura la URL de tu motor en ⚙️ Servidor.</span>`;
      }
    }
  }

  pollQR();
  qrPollInterval = setInterval(pollQR, 2500);
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
        localStorage.setItem(`${STORAGE_KEY_DEST}_${currentEmpresa}`, JSON.stringify(destinatariosData));
        localStorage.setItem(`${STORAGE_KEY_MSGS}_${currentEmpresa}`, JSON.stringify(notificacionesData));
        localStorage.setItem(`${STORAGE_KEY_AUTOS}_${currentEmpresa}`, JSON.stringify(automatizacionesData));
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
  actualizarUI();
}

function actualizarUI() {
  document.getElementById('badge-total-destinatarios').textContent = destinatariosData.length;
  document.getElementById('badge-total-mensajes').textContent = notificacionesData.length;
  document.getElementById('badge-total-autos').textContent = automatizacionesData.length;

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
  renderAutomatizaciones();
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
  if (!tbody) return;

  let filtrados = destinatariosData.filter(d => {
    if (!searchQuery) return true;
    return d.nombre.toLowerCase().includes(searchQuery);
  });

  if (filtrados.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="empty-state-cell">No se encontraron destinatarios para esta empresa.</td></tr>`;
    return;
  }

  let html = '';
  filtrados.forEach((d, idx) => {
    let checklistHtml = '';
    if (automatizacionesData.length === 0) {
      checklistHtml = '<span style="color: #94a3b8; font-size: 11.5px; font-style: italic;">Sin automatizaciones</span>';
    } else {
      checklistHtml = '<div class="auto-checklist-chips">';
      automatizacionesData.forEach(auto => {
        const activa = Array.isArray(d.automatizaciones) && d.automatizaciones.includes(auto.id);
        checklistHtml += `
          <button type="button" 
                  class="auto-check-chip ${activa ? 'active' : ''}" 
                  onclick="toggleAutoCheck(${d.id}, '${auto.id}')"
                  title="${activa ? 'Asignada (Clic para quitar)' : 'No asignada (Clic para asignar)'}">
            <span class="chip-dot"></span>
            ${escapeHtml(auto.nombre)}
          </button>
        `;
      });
      checklistHtml += '</div>';
    }

    let badgeClass = 'badge-pending';
    if (d.estado.toLowerCase() === 'enviado') badgeClass = 'badge-success';
    else if (d.estado.toLowerCase().includes('error')) badgeClass = 'badge-error';

    html += `
      <tr>
        <td style="color: #94a3b8; font-size: 11.5px;">${idx + 1}</td>
        <td><strong>${escapeHtml(d.nombre)}</strong></td>
        <td><span class="type-pill ${d.tipo === 'Grupo' ? 'type-group' : 'type-contact'}">${d.tipo}</span></td>
        <td style="text-align: center;"><span style="font-size: 14px;">${d.activo ? '✅' : '⚪'}</span></td>
        <td>${checklistHtml}</td>
        <td><span class="status-badge ${badgeClass}">${escapeHtml(d.estado)}</span></td>
        <td style="font-size: 11.5px; color: #64748b;">${d.fecha || '—'}</td>
        <td style="text-align: center;">
          <div style="display: flex; gap: 4px; justify-content: center;">
            <button type="button" class="btn-cell-action btn-edit-dest" onclick="editarDestinatario('${d.id}')" data-id="${d.id}" title="Editar">✏️</button>
            <button type="button" class="btn-cell-action danger btn-delete-dest" onclick="eliminarDestinatario('${d.id}')" data-id="${d.id}" title="Eliminar">🗑️</button>
          </div>
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
}

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
function cargarUsuarios() {
  usuariosData = JSON.parse(localStorage.getItem(STORAGE_KEY_USERS) || '[]');
  document.getElementById('badge-total-usuarios').textContent = usuariosData.length;
  renderUsuarios();
}

function renderUsuarios() {
  const tbody = document.getElementById('tbody-usuarios');
  if (!tbody) return;
  let html = '';
  usuariosData.forEach(u => {
    const esYo = currentUser && currentUser.id === u.id;
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

function crearNuevoUsuario() {
  const username = document.getElementById('new-user-username').value.trim().toLowerCase();
  const nombre = document.getElementById('new-user-nombre').value.trim();
  const password = document.getElementById('new-user-password').value;
  const rol = document.getElementById('new-user-rol').value;

  if (!username || !password) {
    showToast('Ingresa usuario y contraseña.', 'error');
    return;
  }
  if (usuariosData.some(u => u.username.toLowerCase() === username)) {
    showToast(`El usuario '${username}' ya existe.`, 'error');
    return;
  }

  const nextId = usuariosData.length > 0 ? Math.max(...usuariosData.map(u => u.id)) + 1 : 1;
  const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
  usuariosData.push({ id: nextId, username, password, nombre: nombre || username, rol, creado_en: nowStr });
  localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(usuariosData));
  showToast('Usuario creado exitosamente.', 'success');
  cerrarModal('modal-crear-usuario');
  cargarUsuarios();
}

function cambiarMiClave() {
  const actual = document.getElementById('clave-actual').value;
  const nueva = document.getElementById('clave-nueva').value;
  const confirmar = document.getElementById('clave-confirmar').value;

  if (!actual || !nueva) {
    showToast('Completa los campos.', 'error');
    return;
  }
  if (nueva !== confirmar) {
    showToast('La nueva contraseña y su confirmación no coinciden.', 'error');
    return;
  }

  const user = usuariosData.find(u => u.id === currentUser.id);
  if (!user || user.password !== actual) {
    showToast('La contraseña actual es incorrecta.', 'error');
    return;
  }

  user.password = nueva;
  localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(usuariosData));
  showToast('Contraseña actualizada con éxito.', 'success');
  cerrarModal('modal-mi-clave');
}

window.abrirModalAdminClave = function(userId, username) {
  document.getElementById('admin-target-user-id').value = userId;
  document.getElementById('admin-target-username').textContent = username;
  document.getElementById('admin-nueva-clave').value = '';
  abrirModal('modal-admin-clave-user');
};

function confirmarClaveAdmin() {
  const userId = parseInt(document.getElementById('admin-target-user-id').value);
  const nueva = document.getElementById('admin-nueva-clave').value;
  if (!nueva) {
    showToast('Ingresa la nueva contraseña.', 'error');
    return;
  }

  const user = usuariosData.find(u => u.id === userId);
  if (user) {
    user.password = nueva;
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(usuariosData));
    showToast('Contraseña actualizada.', 'success');
    cerrarModal('modal-admin-clave-user');
  }
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
    () => {
      usuariosData = usuariosData.filter(u => String(u.id) !== String(userId));
      localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(usuariosData));
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
