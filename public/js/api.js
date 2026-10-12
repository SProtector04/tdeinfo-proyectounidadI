const API_BASE = '/api';

/** Pausa util para el reintento (evita el patron immediate-retry). */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function request(path, { method = 'GET', body, retries = 0 } = {}) {
  const token = localStorage.getItem('token');
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  let lastError;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const res = await fetch(API_BASE + path, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
      });

      if (res.status === 204) return null;

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (res.status === 401) {
          localStorage.removeItem('token');
          window.location.href = '/login.html';
          throw new Error('Sesión expirada');
        }
        throw new Error(data?.error?.message ?? 'Error inesperado');
      }
      return data;
    } catch (err) {
      // `fetch` solo rechaza ante fallo de red/CORS/aborte; los errores de
      // aplicacion (status HTTP) viajan como excepcion propia y no se
      // reintentan: repetirlos seria inseguro e inutil (p. ej. un 409).
      const isNetwork = err instanceof TypeError;
      if (!isNetwork || attempt === retries) {
        lastError = isNetwork
          ? new Error('Sin conexión con el servidor. Reintenta en unos segundos.')
          : err;
        break;
      }
      await sleep(400 * (attempt + 1));
    }
  }
  throw lastError;
}

/**
 * Cliente de la API.
 * - Lecturas (GET): se reintenta una vez ante fallo de red (la app sigue
 *   funcionando si el servidor tarda un instante en responder).
 * - Escrituras (POST/PUT/...): sin reintento automatico; el usuario decide
 *   reenviar para no duplicar una venta o un movimiento de inventario.
 */
export async function api(path, options = {}) {
  const isRead = !options.method || options.method === 'GET';
  return request(path, { ...options, retries: isRead ? 1 : 0 });
}

export function formatMoney(cents) {
  return `C$ ${(Number(cents) / 100).toFixed(2)}`;
}
