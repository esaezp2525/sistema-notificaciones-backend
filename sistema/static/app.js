// ========================================================
// SISTEMA DE NOTIFICACIONES — CONTROLADOR PRINCIPAL
// ========================================================

let currentUser = null;
let destinatariosData = [];
let notificacionesData = [];
let automatizacionesData = [];
let usuariosData = [];
let searchQuery = '';
let pollInterval = null;
let confirmActionCallback = null;

// ==================== INICIALIZACIÓN ====================
document.addEventListener('DOMContentLoaded', () => {
  setupTabs();
  setupEventListeners();
  verificarSesion();
});

// ==================== SESIÓN Y AUTENTICACIÓN ====================
async function verificarSesion() {
  try {
    const res = await fetch('/api/auth/me');
    const data = await res.json();
    if (data.authenticated && data.user) {
      currentUser = data.user;
      document.getElementById('login-overlay').style.display = 'none';
      document.getElementById('app-layout').style.display = 'flex';

      // Actualizar cabecera de usuario
      document.getElementById('user-current-name').textContent = currentUser.nombre || currentUser.username;
      document.getElementById('user-current-role').textContent = currentUser.rol === 'admin' ? 'Administrador' : 'Operador';

      // Pestaña de usuarios para admin
      const tabUsuarios = document.getElementById('nav-tab-usuarios');
      if (currentUser.rol === 'admin') {
        tabUsuarios.style.display = 'inline-flex';
        cargarUsuarios();
      } else {
        tabUsuarios.style.display = 'none';
      }

      // Cargar datos del sistema y logs
      cargarDatos();
      iniciarPollingLogs();
    } else {
      currentUser = null;
      document.getElementById('login-overlay').style.display = 'flex';
      document.getElementById('app-layout').style.display = 'none';
      if (pollInterval) clearInterval(pollInterval);
    }
  } catch (e) {
    console.error('Error verificando sesión:', e);
    document.getElementById('login-overlay').style.display = 'flex';
    document.getElementById('app-layout').style.display = 'none';
  }
}

// ==================== NAVEGACIÓN POR PESTAÑAS ====================
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
  // Login submit
  const formLogin = document.getElementById('form-login');
  if (formLogin) {
    formLogin.addEventListener('submit', async (e) => {
      e.preventDefault();
      const usernameInput = document.getElementById('login-username').value.trim();
      const passwordInput = document.getElementById('login-password').value;
      const errorBox = document.getElementById('login-error-msg');
      const submitBtn = document.getElementById('btn-login-submit');

      submitBtn.disabled = true;
      submitBtn.textContent = 'Verificando...';
      errorBox.style.display = 'none';

      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: usernameInput, password: passwordInput })
        });
        const data = await res.json();
        if (data.success) {
          showToast(`¡Bienvenido, ${data.user.nombre || data.user.username}!`, 'success');
          verificarSesion();
        } else {
          errorBox.textContent = data.error || 'Credenciales inválidas';
          errorBox.style.display = 'block';
        }
      } catch (err) {
        errorBox.textContent = 'Error de conexión con el servidor.';
        errorBox.style.display = 'block';
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Iniciar Sesión';
      }
    });
  }

  // Cerrar sesión
  document.getElementById('btn-cerrar-sesion')?.addEventListener('click', () => {
    solicitarConfirmacion(
      '¿Cerrar sesión?',
      '¿Deseas cerrar tu sesión del panel de control?',
      async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        showToast('Sesión cerrada.', 'info');
        verificarSesion();
      }
    );
  });

  // Filtro de búsqueda en tabla
  document.getElementById('filtro-destinatarios')?.addEventListener('input', (e) => {
    searchQuery = e.target.value.toLowerCase().trim();
    renderDestinatarios();
  });

  // Botón Abrir Excel
  document.getElementById('btn-abrir-excel')?.addEventListener('click', async () => {
    try {
      await fetch('/api/abrir-excel', { method: 'POST' });
      showToast('Abriendo destinatarios.xlsx en Excel...', 'info');
    } catch (e) {
      showToast('Error al abrir archivo Excel.', 'error');
    }
  });

  // Botón Probar / Conectar WhatsApp
  document.getElementById('btn-probar-wa')?.addEventListener('click', () => {
    abrirModalScanWhatsApp();
  });

  // Botón Detener Envío
  document.getElementById('btn-detener-envio')?.addEventListener('click', async () => {
    try {
      const res = await fetch('/api/enviar/detener', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showToast('Solicitud de detención enviada.', 'info');
      } else {
        showToast(data.error || 'Error al detener.', 'error');
      }
    } catch (e) {
      showToast('Error de comunicación.', 'error');
    }
  });

  // Limpiar Consola
  document.getElementById('btn-limpiar-consola')?.addEventListener('click', async () => {
    await fetch('/api/logs/limpiar', { method: 'POST' });
    document.getElementById('terminal-body').innerHTML = '';
    showToast('Consola limpiada.', 'info');
  });

  // Reiniciar Estados a Pendiente
  document.getElementById('btn-reiniciar-estados')?.addEventListener('click', () => {
    solicitarConfirmacion(
      '¿Reiniciar estados?',
      '¿Restablecer el estado de todos los destinatarios a "Pendiente"?',
      async () => {
        try {
          const res = await fetch('/api/destinatarios/reiniciar-estados', { method: 'POST' });
          const data = await res.json();
          if (data.success) {
            showToast('Estados reiniciados a Pendiente.', 'success');
            cargarDatos();
          }
        } catch (e) {
          showToast('Error de comunicación.', 'error');
        }
      }
    );
  });

  // ==================== MODALES ====================
  // Modal Destinatario
  document.getElementById('btn-nuevo-destinatario')?.addEventListener('click', () => abrirModalDestinatario());
  document.getElementById('btn-cerrar-modal-dest')?.addEventListener('click', () => cerrarModal('modal-destinatario'));
  document.getElementById('btn-cancelar-modal-dest')?.addEventListener('click', () => cerrarModal('modal-destinatario'));
  document.getElementById('btn-guardar-destinatario')?.addEventListener('click', guardarDestinatario);

  // Modal Notificación
  document.getElementById('btn-nueva-notificacion')?.addEventListener('click', () => abrirModalNotificacion());
  document.getElementById('btn-cerrar-modal-notif')?.addEventListener('click', () => cerrarModal('modal-notificacion'));
  document.getElementById('btn-cancelar-modal-notif')?.addEventListener('click', () => cerrarModal('modal-notificacion'));
  document.getElementById('btn-guardar-notificacion')?.addEventListener('click', guardarNotificacion);

  // Modal Automatización
  document.getElementById('btn-nueva-automatizacion')?.addEventListener('click', () => abrirModalAutomatizacion());
  document.getElementById('btn-cerrar-modal-auto')?.addEventListener('click', () => cerrarModal('modal-automatizacion'));
  document.getElementById('btn-cancelar-modal-auto')?.addEventListener('click', () => cerrarModal('modal-automatizacion'));
  document.getElementById('btn-guardar-automatizacion')?.addEventListener('click', guardarAutomatizacion);

  // Modal Escanear WhatsApp
  document.getElementById('btn-abrir-modal-scan')?.addEventListener('click', () => abrirModalScanWhatsApp());

  // Modal Enviar Ahora
  document.getElementById('btn-abrir-modal-enviar-ahora')?.addEventListener('click', () => abrirModalEnviarAhora());
  document.getElementById('btn-cerrar-modal-envio')?.addEventListener('click', () => cerrarModal('modal-enviar-ahora'));
  document.getElementById('btn-cancelar-modal-envio')?.addEventListener('click', () => cerrarModal('modal-enviar-ahora'));
  document.getElementById('btn-confirmar-disparo')?.addEventListener('click', confirmarDisparoEnvio);

  // Modal Cambiar Mi Clave
  document.getElementById('btn-modal-mi-clave')?.addEventListener('click', () => {
    document.getElementById('clave-actual').value = '';
    document.getElementById('clave-nueva').value = '';
    document.getElementById('clave-confirmar').value = '';
    abrirModal('modal-mi-clave');
  });
  document.getElementById('btn-cerrar-modal-mi-clave')?.addEventListener('click', () => cerrarModal('modal-mi-clave'));
  document.getElementById('btn-cancelar-modal-mi-clave')?.addEventListener('click', () => cerrarModal('modal-mi-clave'));
  document.getElementById('btn-confirmar-cambio-clave')?.addEventListener('click', cambiarMiClave);

  // Modal Crear Usuario (Admin)
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

  // Modal Admin Cambiar Clave de Otro
  document.getElementById('btn-cerrar-modal-admin-clave')?.addEventListener('click', () => cerrarModal('modal-admin-clave-user'));
  document.getElementById('btn-cancelar-modal-admin-clave')?.addEventListener('click', () => cerrarModal('modal-admin-clave-user'));
  document.getElementById('btn-confirmar-admin-clave')?.addEventListener('click', confirmarClaveAdmin);

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
}

// ==================== CARGAR DATOS ====================
async function cargarDatos() {
  try {
    const res = await fetch('/api/data');
    if (res.status === 401) {
      verificarSesion();
      return;
    }
    const data = await res.json();
    if (!data.success) return;

    destinatariosData = data.destinatarios || [];
    notificacionesData = data.notificaciones || [];
    automatizacionesData = data.automatizaciones || [];

    // Actualizar badges
    document.getElementById('badge-total-destinatarios').textContent = destinatariosData.length;
    document.getElementById('badge-total-mensajes').textContent = notificacionesData.length;
    document.getElementById('badge-total-autos').textContent = automatizacionesData.length;

    // Actualizar KPIs
    const t = data.totales || {};
    document.getElementById('kpi-total').textContent = t.total || 0;
    document.getElementById('kpi-activos').textContent = t.activos || 0;
    document.getElementById('kpi-pendientes').textContent = t.pendientes || 0;
    document.getElementById('kpi-enviados').textContent = t.enviados || 0;
    document.getElementById('kpi-errores').textContent = t.errores || 0;

    // Estado WhatsApp
    const waDot = document.getElementById('wa-status-dot');
    const waText = document.getElementById('wa-status-text');
    if (data.session_activa) {
      waDot.className = 'status-dot online';
      waText.textContent = 'WhatsApp: Conectado';
    } else {
      waDot.className = 'status-dot offline';
      waText.textContent = 'WhatsApp: No vinculado';
    }

    // Botones de ejecución
    const btnDetener = document.getElementById('btn-detener-envio');
    if (btnDetener) btnDetener.disabled = !data.is_running;

    renderDestinatarios();
    renderNotificaciones();
    renderAutomatizaciones();
  } catch (e) {
    console.error('Error cargando datos:', e);
  }
}

// ==================== RENDERIZAR DESTINATARIOS & CHECKLIST ====================
function renderDestinatarios() {
  const tbody = document.getElementById('tbody-destinatarios');
  if (!tbody) return;

  let filtrados = destinatariosData.filter(d => {
    if (!searchQuery) return true;
    return d.nombre.toLowerCase().includes(searchQuery);
  });

  if (filtrados.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="empty-state-cell">No se encontraron destinatarios que coincidan.</td></tr>`;
    return;
  }

  let html = '';
  filtrados.forEach((d, idx) => {
    // Generar chips interactivos de checklist para cada automatización
    let checklistHtml = '';
    if (automatizacionesData.length === 0) {
      checklistHtml = '<span style="color: #94a3b8; font-size: 11.5px; font-style: italic;">Sin automatizaciones creadas</span>';
    } else {
      checklistHtml = '<div class="auto-checklist-chips">';
      automatizacionesData.forEach(auto => {
        const activaEnDest = Array.isArray(d.automatizaciones) && d.automatizaciones.includes(auto.id);
        checklistHtml += `
          <button type="button" 
                  class="auto-check-chip ${activaEnDest ? 'active' : ''}" 
                  onclick="toggleAutoCheck(${d.id}, '${auto.id}')"
                  title="${activaEnDest ? 'Asignada (Clic para quitar)' : 'No asignada (Clic para asignar)'}">
            <span class="chip-dot"></span>
            ${escapeHtml(auto.nombre)}
          </button>
        `;
      });
      checklistHtml += '</div>';
    }

    // Estado badge
    let badgeClass = 'badge-pending';
    let estadoLower = d.estado.toLowerCase();
    if (estadoLower === 'enviado') badgeClass = 'badge-success';
    else if (['error', 'invalido', 'no encontrado', 'nombre vacio'].some(x => estadoLower.includes(x))) badgeClass = 'badge-error';

    html += `
      <tr>
        <td style="color: #94a3b8; font-size: 11.5px;">${idx + 1}</td>
        <td>
          <div style="font-weight: 600; color: #1e293b;">${escapeHtml(d.nombre)}</div>
        </td>
        <td>
          <span class="type-pill ${d.tipo === 'Grupo' ? 'type-group' : 'type-contact'}">${d.tipo}</span>
        </td>
        <td style="text-align: center;">
          <span style="font-size: 14px;">${d.activo ? '✅' : '⚪'}</span>
        </td>
        <td>${checklistHtml}</td>
        <td>
          <span class="status-badge ${badgeClass}">${escapeHtml(d.estado)}</span>
        </td>
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

// Toggle interactivo de checklist
window.toggleAutoCheck = async function(destId, autoId) {
  try {
    const res = await fetch('/api/destinatarios/toggle-auto', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ destinatario_id: destId, auto_id: autoId })
    });
    const data = await res.json();
    if (data.success) {
      // Actualizar localmente
      const dest = destinatariosData.find(x => x.id === destId);
      if (dest) dest.automatizaciones = data.automatizaciones;
      renderDestinatarios();
    } else {
      showToast(data.error || 'Error al actualizar checklist.', 'error');
    }
  } catch (e) {
    showToast('Error de comunicación.', 'error');
  }
};

// ==================== RENDERIZAR NOTIFICACIONES ====================
function renderNotificaciones() {
  const grid = document.getElementById('grid-notificaciones');
  if (!grid) return;

  if (notificacionesData.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; padding: 40px; text-align: center; color: #94a3b8;">
        <div style="font-size: 36px; margin-bottom: 10px;">💬</div>
        <p style="margin: 0; font-weight: 500;">No tienes plantillas de mensaje creadas.</p>
        <button type="button" class="btn-action primary" onclick="abrirModalNotificacion()" style="margin-top: 14px;">➕ Crear Primera Plantilla</button>
      </div>
    `;
    return;
  }

  let html = '';
  notificacionesData.forEach(n => {
    // Cuántas automatizaciones usan este mensaje
    const autosQueLoUsan = automatizacionesData.filter(a => a.mensaje_id === n.id).length;

    html += `
      <div class="notif-card">
        <div class="card-top-row">
          <h3 class="card-title">${escapeHtml(n.titulo)}</h3>
          <span class="card-id-badge">${n.id}</span>
        </div>
        <div class="card-preview-body">${escapeHtml(n.cuerpo)}</div>
        <div class="card-meta-line">
          <span>📅 Creado: ${n.fecha_creacion || '2026'}</span>
          <span>⏰ En uso por: <strong>${autosQueLoUsan}</strong> automatización(es)</span>
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

// ==================== RENDERIZAR AUTOMATIZACIONES ====================
function renderAutomatizaciones() {
  const grid = document.getElementById('grid-automatizaciones');
  if (!grid) return;

  if (automatizacionesData.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; padding: 40px; text-align: center; color: #94a3b8;">
        <div style="font-size: 36px; margin-bottom: 10px;">⏰</div>
        <p style="margin: 0; font-weight: 500;">No tienes automatizaciones configuradas.</p>
        <button type="button" class="btn-action primary" onclick="abrirModalAutomatizacion()" style="margin-top: 14px;">➕ Crear Primera Automatización</button>
      </div>
    `;
    return;
  }

  let html = '';
  automatizacionesData.forEach(a => {
    const msg = notificacionesData.find(m => m.id === a.mensaje_id);
    const msgTitulo = msg ? msg.titulo : '(Mensaje no encontrado)';
    const modalidadBadge = a.modalidad_dia === 'habil' 
      ? '<span class="card-badge-habil">💼 Día Hábil</span>' 
      : '<span class="card-badge-cal">📅 Día Calendario</span>';

    html += `
      <div class="auto-card ${a.activo ? '' : 'auto-card-inactive'}">
        <div class="card-top-row">
          <h3 class="card-title">${escapeHtml(a.nombre)}</h3>
          <span class="status-badge ${a.activo ? 'badge-success' : 'badge-disabled'}">${a.activo ? 'Activa' : 'Inactiva'}</span>
        </div>
        <div class="auto-detail-box">
          <div><strong>Mensaje:</strong> ${escapeHtml(msgTitulo)}</div>
          <div style="display: flex; align-items: center; gap: 8px; margin-top: 4px;">
            <span><strong>Día programado:</strong> Día ${a.dia_mes} a las ${a.hora} hrs</span>
            ${modalidadBadge}
          </div>
          <div style="margin-top: 4px;"><strong>Próximo envío:</strong> <span style="color: #2563eb; font-weight: 600;">${a.proximo_texto || 'Calculando...'}</span></div>
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

// ==================== GESTIÓN DE USUARIOS (ADMIN) ====================
async function cargarUsuarios() {
  if (!currentUser || currentUser.rol !== 'admin') return;
  try {
    const res = await fetch('/api/usuarios');
    const data = await res.json();
    if (data.success) {
      usuariosData = data.usuarios || [];
      document.getElementById('badge-total-usuarios').textContent = usuariosData.length;
      renderUsuarios();
    }
  } catch (e) {
    console.error('Error cargando usuarios:', e);
  }
}

function renderUsuarios() {
  const tbody = document.getElementById('tbody-usuarios');
  if (!tbody) return;

  if (usuariosData.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty-state-cell">No hay usuarios registrados.</td></tr>`;
    return;
  }

  let html = '';
  usuariosData.forEach(u => {
    const esYo = currentUser && currentUser.id === u.id;
    html += `
      <tr>
        <td style="color: #94a3b8; font-size: 11.5px;">${u.id}</td>
        <td><strong>${escapeHtml(u.username)}</strong> ${esYo ? '<span style="font-size: 11px; color: #2563eb;">(Tú)</span>' : ''}</td>
        <td>${escapeHtml(u.nombre)}</td>
        <td>
          <span class="status-badge ${u.rol === 'admin' ? 'badge-success' : 'badge-pending'}">${u.rol === 'admin' ? 'Administrador' : 'Operador'}</span>
        </td>
        <td style="font-size: 12px; color: #64748b;">${u.creado_en || '—'}</td>
        <td style="text-align: center;">
          <div style="display: flex; gap: 6px; justify-content: center;">
            <button type="button" class="btn-card-action" onclick="abrirModalAdminClave(${u.id}, '${escapeHtml(u.username)}')" title="Cambiar Contraseña">🔑 Clave</button>
            ${!esYo ? `<button type="button" class="btn-card-action danger" onclick="eliminarUsuario(${u.id}, '${escapeHtml(u.username)}')" title="Eliminar Usuario">🗑️</button>` : ''}
          </div>
        </td>
      </tr>
    `;
  });
  tbody.innerHTML = html;
}

async function crearNuevoUsuario() {
  const username = document.getElementById('new-user-username').value.trim();
  const nombre = document.getElementById('new-user-nombre').value.trim();
  const password = document.getElementById('new-user-password').value;
  const rol = document.getElementById('new-user-rol').value;

  if (!username || !password) {
    showToast('Debes ingresar usuario y contraseña.', 'error');
    return;
  }

  try {
    const res = await fetch('/api/usuarios/crear', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, nombre, password, rol })
    });
    const data = await res.json();
    if (data.success) {
      showToast(data.message || 'Usuario creado exitosamente.', 'success');
      cerrarModal('modal-crear-usuario');
      cargarUsuarios();
    } else {
      showToast(data.error || 'Error al crear usuario.', 'error');
    }
  } catch (e) {
    showToast('Error de comunicación.', 'error');
  }
}

async function cambiarMiClave() {
  const actual = document.getElementById('clave-actual').value;
  const nueva = document.getElementById('clave-nueva').value;
  const confirmar = document.getElementById('clave-confirmar').value;

  if (!actual || !nueva) {
    showToast('Completa todos los campos de contraseña.', 'error');
    return;
  }
  if (nueva !== confirmar) {
    showToast('La nueva contraseña y su confirmación no coinciden.', 'error');
    return;
  }

  try {
    const res = await fetch('/api/auth/cambiar-clave', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clave_actual: actual, nueva_clave: nueva })
    });
    const data = await res.json();
    if (data.success) {
      showToast(data.message || 'Contraseña actualizada con éxito.', 'success');
      cerrarModal('modal-mi-clave');
    } else {
      showToast(data.error || 'Error al actualizar contraseña.', 'error');
    }
  } catch (e) {
    showToast('Error de comunicación.', 'error');
  }
}

window.abrirModalAdminClave = function(userId, username) {
  document.getElementById('admin-target-user-id').value = userId;
  document.getElementById('admin-target-username').textContent = username;
  document.getElementById('admin-nueva-clave').value = '';
  abrirModal('modal-admin-clave-user');
};

async function confirmarClaveAdmin() {
  const userId = document.getElementById('admin-target-user-id').value;
  const nueva = document.getElementById('admin-nueva-clave').value;
  if (!nueva) {
    showToast('Ingresa la nueva contraseña.', 'error');
    return;
  }

  try {
    const res = await fetch('/api/usuarios/cambiar-clave-admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: userId, nueva_clave: nueva })
    });
    const data = await res.json();
    if (data.success) {
      showToast(data.message || 'Contraseña cambiada.', 'success');
      cerrarModal('modal-admin-clave-user');
    } else {
      showToast(data.error || 'Error al actualizar.', 'error');
    }
  } catch (e) {
    showToast('Error de comunicación.', 'error');
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
    `¿Estás seguro de eliminar el usuario "${username}"?`,
    async () => {
      try {
        const res = await fetch('/api/usuarios/eliminar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: userId })
        });
        const data = await res.json();
        if (data.success) {
          showToast(`Usuario '${username}' eliminado.`, 'info');
          cargarUsuarios();
        } else {
          showToast(data.error || 'Error al eliminar.', 'error');
        }
      } catch (e) {
        showToast('Error de comunicación.', 'error');
      }
    }
  );
};

// ==================== OPERACIONES CRUD ====================
// Destinatarios
window.abrirModalDestinatario = function(d = null) {
  document.getElementById('dest-id').value = d ? d.id : '';
  document.getElementById('dest-nombre').value = d ? d.nombre : '';
  document.getElementById('dest-tipo').value = d ? d.tipo : 'Grupo';
  document.getElementById('dest-activo').checked = d ? d.activo : true;
  document.getElementById('modal-destinatario-titulo').textContent = d ? 'Editar Destinatario' : 'Agregar Destinatario';
  abrirModal('modal-destinatario');
};

window.editarDestinatario = function(id) {
  const d = destinatariosData.find(x => x.id === id);
  if (d) abrirModalDestinatario(d);
};

window.eliminarDestinatario = function(id) {
  const d = destinatariosData.find(x => String(x.id) === String(id));
  const nombre = d ? d.nombre : 'este destinatario';
  solicitarConfirmacion(
    '¿Eliminar destinatario?',
    `¿Estás seguro de que deseas eliminar a "${nombre}" de la base de datos?`,
    async () => {
      try {
        const res = await fetch('/api/destinatarios/eliminar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id })
        });
        const data = await res.json();
        if (data.success) {
          showToast(`Destinatario "${nombre}" eliminado.`, 'info');
          cargarDatos();
        } else {
          showToast(data.error || 'Error al eliminar.', 'error');
        }
      } catch (e) {
        showToast('Error de comunicación.', 'error');
      }
    }
  );
};

async function guardarDestinatario() {
  const id = document.getElementById('dest-id').value;
  const nombre = document.getElementById('dest-nombre').value.trim();
  const tipo = document.getElementById('dest-tipo').value;
  const activo = document.getElementById('dest-activo').checked;

  if (!nombre) {
    showToast('El nombre del destinatario es obligatorio.', 'error');
    return;
  }

  try {
    const res = await fetch('/api/destinatarios/guardar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, nombre, tipo, activo })
    });
    const data = await res.json();
    if (data.success) {
      showToast('Destinatario guardado.', 'success');
      cerrarModal('modal-destinatario');
      cargarDatos();
    } else {
      showToast(data.error || 'Error al guardar.', 'error');
    }
  } catch (e) {
    showToast('Error de comunicación.', 'error');
  }
}

// Notificaciones
window.abrirModalNotificacion = function(n = null) {
  document.getElementById('notif-id').value = n ? n.id : '';
  document.getElementById('notif-input-titulo').value = n ? n.titulo : '';
  document.getElementById('notif-input-cuerpo').value = n ? n.cuerpo : 'Hola {nombre}, este es un aviso importante.';
  document.getElementById('modal-notif-titulo').textContent = n ? 'Editar Plantilla de Mensaje' : 'Nueva Plantilla de Mensaje';
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
    `¿Estás seguro de eliminar la plantilla "${titulo}"? Las automatizaciones asociadas también serán eliminadas.`,
    async () => {
      try {
        const res = await fetch('/api/notificaciones/eliminar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id })
        });
        const data = await res.json();
        if (data.success) {
          showToast('Plantilla eliminada.', 'info');
          cargarDatos();
        } else {
          showToast(data.error || 'Error al eliminar.', 'error');
        }
      } catch (e) {
        showToast('Error de comunicación.', 'error');
      }
    }
  );
};

async function guardarNotificacion() {
  const id = document.getElementById('notif-id').value;
  const titulo = document.getElementById('notif-input-titulo').value.trim();
  const cuerpo = document.getElementById('notif-input-cuerpo').value.trim();

  if (!titulo) {
    showToast('El título del mensaje es requerido.', 'error');
    return;
  }

  try {
    const res = await fetch('/api/notificaciones/guardar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, titulo, cuerpo })
    });
    const data = await res.json();
    if (data.success) {
      showToast('Plantilla guardada.', 'success');
      cerrarModal('modal-notificacion');
      cargarDatos();
    } else {
      showToast(data.error || 'Error al guardar plantilla.', 'error');
    }
  } catch (e) {
    showToast('Error de comunicación.', 'error');
  }
}

window.insertarVariable = function(tag) {
  const txt = document.getElementById('notif-input-cuerpo');
  if (!txt) return;
  const start = txt.selectionStart;
  const end = txt.selectionEnd;
  const val = txt.value;
  txt.value = val.substring(0, start) + tag + val.substring(end);
  txt.focus();
  txt.selectionStart = txt.selectionEnd = start + tag.length;
};

// Automatizaciones
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
    `¿Estás seguro de eliminar la automatización "${nombre}"? Se desmarcará automáticamente del checklist de tus destinatarios.`,
    async () => {
      try {
        const res = await fetch('/api/automatizaciones/eliminar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id })
        });
        const data = await res.json();
        if (data.success) {
          showToast('Automatización eliminada.', 'info');
          cargarDatos();
        } else {
          showToast(data.error || 'Error al eliminar.', 'error');
        }
      } catch (e) {
        showToast('Error de comunicación.', 'error');
      }
    }
  );
};

async function guardarAutomatizacion() {
  const id = document.getElementById('auto-id').value;
  const nombre = document.getElementById('auto-input-nombre').value.trim();
  const mensaje_id = document.getElementById('auto-select-mensaje').value;
  const dia_mes = document.getElementById('auto-input-dia').value;
  const hora = document.getElementById('auto-input-hora').value;
  const modalidad_dia = document.getElementById('auto-select-modalidad').value;
  const repetir_mensual = document.getElementById('auto-check-repetir').checked;
  const activo = document.getElementById('auto-check-activo').checked;

  if (!nombre) {
    showToast('El nombre de la automatización es requerido.', 'error');
    return;
  }

  try {
    const res = await fetch('/api/automatizaciones/guardar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, nombre, mensaje_id, dia_mes, hora, modalidad_dia, repetir_mensual, activo })
    });
    const data = await res.json();
    if (data.success) {
      showToast('Automatización guardada con éxito.', 'success');
      cerrarModal('modal-automatizacion');
      cargarDatos();
    } else {
      showToast(data.error || 'Error al guardar.', 'error');
    }
  } catch (e) {
    showToast('Error de comunicación.', 'error');
  }
}

// ==================== DISPARAR ENVÍO INMEDIATO ====================
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
  const nombreTarea = auto ? `Envío Manual: ${auto.nombre}` : 'Envío Inmediato';

  try {
    const res = await fetch('/api/enviar/iniciar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ auto_id: autoId, nombre_tarea: nombreTarea })
    });
    const data = await res.json();
    if (data.success) {
      showToast('¡Proceso de envío iniciado!', 'success');
      cerrarModal('modal-enviar-ahora');
      // Cambiar a la pestaña de consola
      document.querySelector('[data-tab="tab-consola"]')?.click();
      cargarDatos();
    } else {
      showToast(data.error || 'Error al iniciar envío.', 'error');
    }
  } catch (e) {
    showToast('Error de comunicación.', 'error');
  }
}

// ==================== ESCANEAR WHATSAPP ====================
function abrirModalScanWhatsApp() {
  solicitarConfirmacion(
    '¿Escanear WhatsApp?',
    'Se abrirá una ventana de WhatsApp Web para escanear grupos y contactos automáticamente. ¿Deseas iniciar?',
    () => {
      fetch('/api/whatsapp/escanear', { method: 'POST' });
      showToast('Escaneo iniciado. Revisa la ventana de WhatsApp Web...', 'info');
      document.querySelector('[data-tab="tab-consola"]')?.click();
    }
  );
}

// ==================== POLLING DE LOGS ====================
function iniciarPollingLogs() {
  if (pollInterval) clearInterval(pollInterval);
  pollInterval = setInterval(async () => {
    try {
      const res = await fetch('/api/logs');
      if (res.status === 401) {
        clearInterval(pollInterval);
        verificarSesion();
        return;
      }
      const data = await res.json();
      renderLogs(data.logs || []);

      const miniStatus = document.getElementById('mini-progress-status');
      const badgeTarea = document.getElementById('console-current-task');

      if (data.is_running) {
        miniStatus.textContent = `Enviando (${data.procesados}/${data.total})`;
        miniStatus.className = 'tab-status-mini active';
        badgeTarea.style.display = 'inline-block';
        badgeTarea.textContent = `Tarea activa: ${data.tarea_actual} (${data.procesados}/${data.total})`;
      } else {
        miniStatus.textContent = 'Listo';
        miniStatus.className = 'tab-status-mini';
        badgeTarea.style.display = 'none';
      }
    } catch (e) {
      // Ignorar errores de red transitorios
    }
  }, 2500);
}

function renderLogs(logs) {
  const terminal = document.getElementById('terminal-body');
  if (!terminal) return;

  terminal.innerHTML = logs.map(l => {
    let cls = 'log-info';
    if (l.level === 'success') cls = 'log-success';
    else if (l.level === 'error') cls = 'log-error';
    else if (l.level === 'warning') cls = 'log-warning';
    else if (l.level === 'pause') cls = 'log-pause';
    return `<div class="log-entry ${cls}"><span class="log-time">[${l.time}]</span> <span class="log-msg">${escapeHtml(l.msg)}</span></div>`;
  }).join('');

  terminal.scrollTop = terminal.scrollHeight;
}

// ==================== MODALES UTILIDADES ====================
function abrirModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('active');
}

function cerrarModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('active');
}

// ==================== TOASTS ====================
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
