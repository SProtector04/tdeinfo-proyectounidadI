import { escapeHtml } from '../ui.js';

/**
 * Renderiza una tabla HTML a partir de columnas declarativas.
 * `columns[i].render(row)` debe devolver HTML ya escapado por el llamador.
 */
export function renderTable({ columns, rows, empty = 'Sin datos.', emptyHtml = null }) {
  if (!rows.length) return emptyHtml ?? `<p class="muted">${escapeHtml(empty)}</p>`;
  return `<table>
    <tr>${columns.map((c) => `<th>${escapeHtml(c.label)}</th>`).join('')}</tr>
    ${rows
      .map((row) => `<tr>${columns.map((c) => `<td>${c.render(row)}</td>`).join('')}</tr>`)
      .join('')}
  </table>`;
}
