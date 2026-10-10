const API_BASE = '/api';

export async function api(path, { method = 'GET', body } = {}) {
  const token = localStorage.getItem('token');
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

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
      throw new Error('Sesion expirada');
    }
    throw new Error(data?.error?.message ?? 'Error inesperado');
  }
  return data;
}

export function formatMoney(cents) {
  return `C$ ${(Number(cents) / 100).toFixed(2)}`;
}
