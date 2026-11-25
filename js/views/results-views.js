import { AcmeView } from '../components/acme-view.js';
import { attempts } from '../services/attempts.js';
import { toast } from '../components/acme-toast.js';
import { confirmDialog } from '../components/acme-confirm.js';
import { esc, formatDate, formatClock } from '../utils.js';

/** Vista privada con los intentos realizados por los estudiantes. */
class ResultsView extends AcmeView {
  connectedCallback() {
    this.innerHTML = `
      <section class="page">
        <header class="page-head">
          <div>
            <h1 tabindex="-1">Resultados de exámenes</h1>
            <p class="muted">Intentos realizados por los estudiantes, asociados a su identificación y nombre.</p>
          </div>
          <span class="badge" id="count" aria-live="polite"></span>
        </header>
        <div class="card">
          <div class="field inline">
            <label for="filter">Filtrar por examen</label>
            <select id="filter"></select>
          </div>
          <acme-data-table id="table"></acme-data-table>
        </div>
      </section>`;

    this.table = this.$('#table');
    this.table.caption = 'Resultados de exámenes';
    this.table.emptyText = 'Todavía no hay exámenes resueltos.';
    this.table.actions = [{ name: 'delete', label: 'Eliminar', variant: 'danger' }];
    this.table.columns = [
      { key: 'fecha', label: 'Fecha', render: (a) => esc(formatDate(a.fecha)) },
      { key: 'identificacion', label: 'Identificación' },
      { key: 'nombre', label: 'Estudiante' },
      { key: 'examenTitulo', label: 'Examen', render: (a) => `${esc(a.examenTitulo)} <small class="muted">(${esc(a.examenCodigo)})</small>` },
      { key: 'porcentaje', label: 'Resultado', render: (a) => `${a.aciertos}/${a.preguntas} · <strong>${a.porcentaje}%</strong>` },
      { key: 'tiempoUsado', label: 'Tiempo', render: (a) => esc(formatClock(a.tiempoUsado)) },
      { key: 'aprobado', label: 'Estado', render: (a) => `<span class="badge ${a.aprobado ? 'badge-ok' : 'badge-bad'}">${a.aprobado ? 'Aprobado' : 'No aprobado'}</span>` },
    ];
    this.table.addEventListener('row-action', async ({ detail }) => {
      if (detail.name !== 'delete') return;
      const ok = await confirmDialog({
        title: 'Eliminar resultado', message: 'Se eliminará este intento del historial.',
        confirmText: 'Eliminar', danger: true,
      });
      if (!ok) return;
      attempts.remove(detail.id);
      toast('Resultado eliminado.', 'success');
      this.#refresh();
    });
    this.$('#filter').addEventListener('change', () => this.#refresh());
    this.#refresh();
  }

  #refresh() {
    const all = attempts.list();
    const select = this.$('#filter');
    const current = select.value;
    const exams = [...new Map(all.map((a) => [a.examenId, `${a.examenCodigo} · ${a.examenTitulo}`]))];
    select.innerHTML = `<option value="">Todos los exámenes</option>` +
      exams.map(([id, label]) => `<option value="${esc(id)}">${esc(label)}</option>`).join('');
    select.value = exams.some(([id]) => id === current) ? current : '';
    const rows = select.value ? all.filter((a) => a.examenId === select.value) : all;
    this.table.rows = rows;
    this.$('#count').textContent = `${rows.length} ${rows.length === 1 ? 'intento' : 'intentos'}`;
  }
}

customElements.define('results-view', ResultsView);