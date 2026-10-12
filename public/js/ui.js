/**
 * Helpers de UX compartidos por todas las paginas: toasts, escape HTML,
 * fechas legibles, estados de carga y formularios con envio bloqueado.
 */

const toastsByType = {
  success: 'toast success',
  error: 'toast error',
  info: 'toast info',
};

const TOAST_ICON = { success: 'checkCircle', error: 'critical', info: 'info' };

/**
 * Iconos SVG de linea (stroke) con `currentColor`: el color hereda del texto
 * circundante, por lo que funcionan igual en nav, botones, badges y texto
 * muted. Sin dependencias: los paths viven en el mapa ICONS.
 *
 * Uso: `${icon('cart')}` dentro de un template, o `icon('search', 'Buscar')`
 * cuando el icono va solo (devuelve aria-hidden + title accesible).
 *
 * @param {string} name Clave del icono en ICONS.
 * @param {string} [label] Si se pasa, el icono se marca accesible con `title`.
 * @returns {string} SVG inline seguro para innerHTML.
 */
const ICONS = {
  // Navegacion
  dashboard: '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
  cart: '<circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/><path d="M2.5 3.5h2.2l2.3 11.2a1.6 1.6 0 0 0 1.6 1.3h8.3a1.6 1.6 0 0 0 1.6-1.2l1.4-6.3H6"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  box: '<path d="M21 8.5v7a1.6 1.6 0 0 1-.85 1.4l-7.2 3.85a1.6 1.6 0 0 1-1.5 0L4.25 16.9A1.6 1.6 0 0 1 3.4 15.5v-7a1.6 1.6 0 0 1 .85-1.4l7.2-3.85a1.6 1.6 0 0 1 1.5 0l7.2 3.85A1.6 1.6 0 0 1 21 8.5z"/><path d="M3.6 7.5 12 12l8.4-4.5M12 21v-9"/>',
  alert: '<path d="M12 4.5 2.8 20h18.4L12 4.5z"/><path d="M12 10v4.2"/><path d="M12 17.3h.01"/>',
  users: '<circle cx="9" cy="8" r="3.2"/><path d="M2.8 19.5a6.4 6.4 0 0 1 12.4 0"/><path d="M16.2 5.2a3.2 3.2 0 0 1 0 5.9"/><path d="M17.6 13.6a6.4 6.4 0 0 1 3.6 5.9"/>',

  // Acciones
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  check: '<path d="M4.5 12.5 9.5 17.5 19.5 6.5"/>',
  print: '<path d="M6.5 9V3.5h11V9"/><path d="M6.5 18H5a1.5 1.5 0 0 1-1.5-1.5v-5A1.5 1.5 0 0 1 5 10h14a1.5 1.5 0 0 1 1.5 1.5v5A1.5 1.5 0 0 1 19 18h-1.5"/><rect x="6.5" y="14.5" width="11" height="6" rx="1"/>',
  refresh: '<path d="M20 12a8 8 0 1 1-2.5-5.8"/><path d="M20.5 3.5v4.8h-4.8"/>',
  logout: '<path d="M15 4.5h3.5A1.5 1.5 0 0 1 20 6v12a1.5 1.5 0 0 1-1.5 1.5H15"/><path d="M10 8.5 6 12l4 3.5"/><path d="M6 12h9"/>',

  // Busqueda / filtros / paginacion
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/>',
  filter: '<path d="M4 6h16l-6.2 7.2v5.3l-3.6 2v-7.3L4 6z"/>',
  chevronLeft: '<path d="M14.5 6 9 12l5.5 6"/>',
  chevronRight: '<path d="M9.5 6 15 12l-5.5 6"/>',

  // Estados / severidad
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11.2v5"/><path d="M12 8h.01"/>',
  checkCircle: '<circle cx="12" cy="12" r="8.5"/><path d="M8.5 12.3 11 14.8l4.5-5"/>',
  warning: '<path d="M12 4.5 2.8 20h18.4L12 4.5z"/><path d="M12 10v4.2"/><path d="M12 17.3h.01"/>',
  critical: '<path d="M8.6 3.5h6.8L20.5 8.6v6.8L15.4 20.5H8.6L3.5 15.4V8.6L8.6 3.5z"/><path d="M12 8.2v4.2"/><path d="M12 15.6h.01"/>',
  emptyBox: '<path d="M20.5 8.5v7a1.6 1.6 0 0 1-.85 1.4l-7.2 3.85a1.6 1.6 0 0 1-1.5 0L3.75 16.9A1.6 1.6 0 0 1 2.9 15.5v-7a1.6 1.6 0 0 1 .85-1.4l7.2-3.85a1.6 1.6 0 0 1 1.5 0l7.2 3.85A1.6 1.6 0 0 1 20.5 8.5z"/><path d="M3.1 7.5 12 12l8.9-4.5M12 21.3V12"/>',
};

/** Mapa de icono -> clave (para usar junto a `icon()`). */
export const ICON_NAMES = Object.keys(ICONS);

export function icon(name, label) {
  const paths = ICONS[name];
  if (!paths) return '';
  const a11y = label
    ? `role="img" aria-label="${escapeHtml(label)}"`
    : 'aria-hidden="true" focusable="false"';
  return `<svg class="icon" viewBox="0 0 24 24" ${a11y} fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
}

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
  el.innerHTML = `${icon(TOAST_ICON[type] ?? TOAST_ICON.info)}<span>${escapeHtml(message)}</span>`;
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

/** Estado vacio homogeneo: icono + texto corto. */
export function emptyState(message, iconName = 'emptyBox') {
  return `<div class="empty-state">${icon(iconName)}<p>${escapeHtml(message)}</p></div>`;
}

/**
 * Controles de paginacion simple (sin total del servidor).
 * `fetched` debe incluir el extra solicitado (limit + 1) para saber si hay mas.
 */
export function renderPager(container, { offset, limit, fetched, onChange }) {
  const page = Math.floor(offset / limit) + 1;
  const hasNext = fetched > limit;
  container.innerHTML = `
    <button type="button" class="ghost" data-page="prev" ${offset === 0 ? 'disabled' : ''}>${icon('chevronLeft')}<span>Anteriores</span></button>
    <span class="muted">Página ${page}</span>
    <button type="button" class="ghost" data-page="next" ${hasNext ? '' : 'disabled'}><span>Siguientes</span>${icon('chevronRight')}</button>`;
  container.querySelector('[data-page="prev"]').addEventListener('click', () => onChange(Math.max(0, offset - limit)));
  container.querySelector('[data-page="next"]').addEventListener('click', () => onChange(offset + limit));
}

/**
 * Cambia entre varias vistas de una misma pagina usando el hash de la URL
 * (p. ej. `#historial`). Cada vista es un elemento con `data-view`. El boton
 * «atras» del navegador funciona y el enlace es compartible.
 *
 * @param {object} params
 * @param {string} params.defaultView Vista por defecto si no hay hash.
 * @param {Record<string, () => void | Promise<void>>} params.onEnter
 *        Mapa vista -> callback al mostrarse (para cargar datos solo cuando
 *        se necesita, en lugar de todo al cargar la pagina).
 * @returns {{ current: () => string, go: (v: string) => void }}
 */
export function initViewSwitcher({ defaultView, onEnter, viewIcon = {} }) {
  const views = [...document.querySelectorAll('[data-view]')];
  const links = [...document.querySelectorAll('[data-view-link]')];
  let current = null;

  // Icono izquierdo de cada tab, segun su atributo data-view-link.
  for (const a of links) {
    const name = a.dataset.viewLink;
    if (viewIcon[name]) a.insertAdjacentHTML('afterbegin', icon(viewIcon[name]));
  }

  function viewFromHash() {
    const name = window.location.hash.replace(/^#/, '');
    return onEnter[name] ? name : defaultView;
  }

  async function show(name) {
    if (name === current) return;
    current = name;
    for (const v of views) v.classList.toggle('hidden', v.dataset.view !== name);
    for (const a of links) a.classList.toggle('active', a.dataset.viewLink === name);
    const enter = onEnter[name];
    if (enter) await enter();
  }

  function go(name) {
    if (name === defaultView) {
      // Sin hash: URL limpia y vista por defecto.
      if (window.location.hash) history.replaceState(null, '', window.location.pathname);
      show(defaultView);
    } else if (window.location.hash === `#${name}`) {
      show(name);
    } else {
      window.location.hash = name;
    }
  }

  window.addEventListener('hashchange', () => show(viewFromHash()));

  for (const a of links) {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      go(a.dataset.viewLink);
    });
  }

  show(viewFromHash());

  return { current: () => current, go };
}
