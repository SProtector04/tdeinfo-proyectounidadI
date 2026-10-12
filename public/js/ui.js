/**
 * Helpers de UX compartidos por todas las paginas: toasts, escape HTML,
 * fechas legibles, estados de carga y formularios con envio bloqueado.
 */

const toastsByType = {
  success: 'toast success',
  error: 'toast error',
  info: 'toast info',
};

/** Escapa valores para insercion segura en templates innerHTML. */
export function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/** Muestra un toast (exito/error) que se auto-oculta. */
export function toast(message, type = 'success') {
  let root = document.getElementById('toast-root');
  if (!root) {
    root = document.createElement('div');
    root.id = 'toast-root';
    document.body.appendChild(root);
  }
  const el = document.createElement('div');
  el.className = toastsByType[type] ?? toastsByType.info;
  el.textContent = message;
  root.appendChild(el);
  setTimeout(() => el.remove(), 4000);
}

/** Fecha ISO -> texto legible en espanol (relativa si es reciente). */
export function formatDate(iso) {
  if (!iso) return '-';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return String(iso);
  const diffMs = date.getTime() - Date.now();
  const absMin = Math.round(Math.abs(diffMs) / 60000);
  const rtf = new Intl.RelativeTimeFormat('es', { numeric: 'auto' });
  if (absMin < 60) return rtf.format(Math.round(diffMs / 60000), 'minute');
  const absHours = Math.round(absMin / 60);
  if (absHours < 24) return rtf.format(Math.round(diffMs / 3600000), 'hour');
  const absDays = Math.round(absHours / 24);
  if (absDays <= 7) return rtf.format(Math.round(diffMs / 86400000), 'day');
  return new Intl.DateTimeFormat('es', { dateStyle: 'medium' }).format(date);
}

/** Bloquea el boton de envio mientras la operacion esta en curso. */
export async function withSubmitting(form, fn) {
  const button = form.querySelector('button[type="submit"], button:not([type])');
  if (button) button.disabled = true;
  try {
    return await fn();
  } finally {
    if (button) button.disabled = false;
  }
}

/** Muestra un mensaje de carga dentro de un contenedor; devuelve un remover. */
export function placeholder(container, message = 'Cargando...') {
  container.innerHTML = `<p class="muted loading">${escapeHtml(message)}</p>`;
  return { remove: () => { container.innerHTML = ''; } };
}

/**
 * Controles de paginacion simple (sin total del servidor).
 * `fetched` debe incluir el extra solicitado (limit + 1) para saber si hay mas.
 */
export function renderPager(container, { offset, limit, fetched, onChange }) {
  const page = Math.floor(offset / limit) + 1;
  const hasNext = fetched > limit;
  container.innerHTML = `
    <button type="button" class="ghost" data-page="prev" ${offset === 0 ? 'disabled' : ''}>Anteriores</button>
    <span class="muted">Página ${page}</span>
    <button type="button" class="ghost" data-page="next" ${hasNext ? '' : 'disabled'}>Siguientes</button>`;
  container.querySelector('[data-page="prev"]').addEventListener('click', () => onChange(Math.max(0, offset - limit)));
  container.querySelector('[data-page="next"]').addEventListener('click', () => onChange(offset + limit));
}
