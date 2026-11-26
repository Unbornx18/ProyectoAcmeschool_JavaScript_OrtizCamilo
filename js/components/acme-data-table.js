import { esc } from '../utils.js';

/**
 * <acme-data-table> — tabla accesible y responsive reutilizable.
 *
 *   table.columns = [{ key, label, render?(row) => htmlSeguro }]
 *   table.rows    = [...]            (cada fila con `id`)
 *   table.actions = [{ name, label, variant }]   (por defecto Editar / Eliminar)
 *   table.selectedId = 'id'          (resalta la fila en edición)
 *   Evento 'row-action' → detail: { name, id }
 *
 * En pantallas pequeñas cada fila se transforma en una tarjeta (data-label).
 */
class AcmeDataTable extends HTMLElement {
  #columns = [];
  #rows = [];
  #actions = [
    { name: 'edit', label: 'Editar', variant: 'ghost' },
    { name: 'delete', label: 'Eliminar', variant: 'danger' },
  ];
  #selectedId = null;
  caption = 'Tabla de datos';
  emptyText = 'No hay registros.';

  set columns(v) { this.#columns = v; this.render(); }
  set rows(v) { this.#rows = v; this.render(); }
  set actions(v) { this.#actions = v; this.render(); }
  set selectedId(v) { this.#selectedId = v; this.render(); }

  connectedCallback() {
    this.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;
      this.dispatchEvent(new CustomEvent('row-action', {
        detail: { name: btn.dataset.action, id: btn.dataset.id }, bubbles: true,
      }));
    });
    this.render();
  }

  render() {
    if (!this.isConnected) return;
    if (this.#rows.length === 0) {
      this.innerHTML = `<p class="empty">${esc(this.emptyText)}</p>`;
      return;
    }
    const head = this.#columns.map((c) => `<th scope="col">${esc(c.label)}</th>`).join('');
    const actionsHead = this.#actions.length ? '<th scope="col">Acciones</th>' : '';
    const body = this.#rows.map((row) => {
      const cells = this.#columns.map((c) =>
        `<td data-label="${esc(c.label)}">${c.render ? c.render(row) : esc(row[c.key])}</td>`).join('');
      const buttons = this.#actions.map((a) =>
        `<button type="button" class="btn btn-sm btn-${esc(a.variant)}" data-action="${esc(a.name)}" data-id="${esc(row.id)}"
           aria-label="${esc(a.label)}: ${esc(row.nombre ?? row.titulo ?? row.codigo ?? row.id)}">${esc(a.label)}</button>`).join('');
      const actionCell = this.#actions.length ? `<td data-label="Acciones" class="actions-cell">${buttons}</td>` : '';
      const selected = row.id === this.#selectedId ? ' class="selected" aria-current="true"' : '';
      return `<tr${selected}>${cells}${actionCell}</tr>`;
    }).join('');

    this.innerHTML = `
      <div class="table-wrap">
        <table class="data-table">
          <caption class="sr-only">${esc(this.caption)}</caption>
          <thead><tr>${head}${actionsHead}</tr></thead>
          <tbody>${body}</tbody>
        </table>
      </div>`;
  }
}

customElements.define('acme-data-table', AcmeDataTable);