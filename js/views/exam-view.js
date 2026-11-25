import { AcmeView } from '../components/acme-view.js';
import { exams } from '../services/exams.js';
import { toast } from '../components/acme-toast.js';
import { confirmDialog } from '../components/acme-confirm.js';
import { esc, readForm } from '../utils.js';

const MIN_ANSWERS = 2;
const MAX_ANSWERS = 6;
const blankDraft = () => ({ texto: '', respuestas: [{ texto: '', correcta: true }, { texto: '', correcta: false }] });

class ExamsView extends AcmeView {
  #examId = null;        // examen en edición
  #questionId = null;    // pregunta en edición
  #draft = blankDraft(); // borrador del formulario de pregunta

  connectedCallback() {
    this.innerHTML = `
      <section class="page">
        <header class="page-head">
          <div>
            <h1 tabindex="-1">Gestión de exámenes</h1>
            <p class="muted">Crea exámenes y agrégales preguntas con sus respuestas.</p>
          </div>
          <span class="badge" id="count" aria-live="polite"></span>
        </header>

        <div class="split">
          <div class="card">
            <h2>Exámenes registrados</h2>
            <acme-data-table id="table"></acme-data-table>
          </div>

          <div class="stack">
            <div class="card">
              <h2 id="form-title">Nuevo examen</h2>
              <form id="exam-form" novalidate>
                <div class="grid-2">
                  <div class="field">
                    <label for="codigo">Código</label>
                    <input id="codigo" name="codigo" required pattern="[A-Za-z0-9_\\-]{2,15}" maxlength="15" autocomplete="off">
                  </div>
                  <div class="field">
                    <label for="tiempo">Tiempo (minutos)</label>
                    <input id="tiempo" name="tiempo" type="number" min="1" max="300" step="1" required inputmode="numeric">
                  </div>
                </div>
                <div class="field">
                  <label for="titulo">Título</label>
                  <input id="titulo" name="titulo" required minlength="3" maxlength="100" autocomplete="off">
                </div>
                <div class="field">
                  <label for="aprobacion">Porcentaje de aprobación (%)</label>
                  <input id="aprobacion" name="aprobacion" type="number" min="1" max="100" step="1" required inputmode="numeric">
                </div>
                <div class="field">
                  <label for="descripcion">Descripción del examen</label>
                  <textarea id="descripcion" name="descripcion" rows="3" required minlength="5" maxlength="400"></textarea>
                </div>
                <p id="exam-msg" class="form-message" role="alert"></p>
                <div class="form-actions">
                  <button class="btn btn-primary" type="submit" id="exam-submit">Crear examen</button>
                  <button class="btn btn-ghost" type="button" id="exam-cancel" hidden>Nuevo / cancelar</button>
                </div>
              </form>
            </div>

            <div class="card" id="questions-card" hidden></div>
          </div>
        </div>
      </section>`;

    this.table = this.$('#table');
    this.table.caption = 'Exámenes registrados';
    this.table.emptyText = 'Aún no hay exámenes registrados.';
    this.table.columns = [
      { key: 'codigo', label: 'Código', render: (e) => `<span class="badge">${esc(e.codigo)}</span>` },
      { key: 'titulo', label: 'Título' },
      { key: 'tiempo', label: 'Tiempo', render: (e) => `${e.tiempo} min` },
      { key: 'aprobacion', label: 'Aprobación', render: (e) => `${e.aprobacion}%` },
      { key: 'preguntas', label: 'Preguntas', render: (e) => String(e.preguntas.length) },
    ];
    this.table.addEventListener('row-action', (e) => this.#onTableAction(e.detail));
    this.$('#exam-form').addEventListener('submit', (e) => this.#onExamSubmit(e));
    this.$('#exam-cancel').addEventListener('click', () => this.#resetExam());
