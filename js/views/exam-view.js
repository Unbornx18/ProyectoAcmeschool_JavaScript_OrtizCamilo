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

    // Delegación de eventos del panel de preguntas.
    const qCard = this.$('#questions-card');
    qCard.addEventListener('click', (e) => this.#onQuestionsClick(e));
    qCard.addEventListener('submit', (e) => { e.preventDefault(); this.#saveQuestion(); });
    qCard.addEventListener('input', () => this.#syncDraft());
    qCard.addEventListener('change', () => this.#syncDraft());

    this.#refreshTable();
  }

  /* ---------- Exámenes ---------- */

  #refreshTable() {
    const list = exams.list();
    this.table.rows = list;
    this.table.selectedId = this.#examId;
    this.$('#count').textContent = `${list.length} ${list.length === 1 ? 'examen' : 'exámenes'}`;
  }

  #resetExam() {
    this.#examId = null;
    this.#questionId = null;
    this.#draft = blankDraft();
    this.$('#exam-form').reset();
    this.$('#form-title').textContent = 'Nuevo examen';
    this.$('#exam-submit').textContent = 'Crear examen';
    this.$('#exam-cancel').hidden = true;
    this.$('#questions-card').hidden = true;
    this.setMessage(this.$('#exam-msg'), '');
    this.table.selectedId = null;
  }

  #startEdit(exam) {
    this.#examId = exam.id;
    this.#questionId = null;
    this.#draft = blankDraft();
    const form = this.$('#exam-form');
    ['codigo', 'titulo', 'tiempo', 'aprobacion', 'descripcion'].forEach((k) => { form[k].value = exam[k]; });
    this.$('#form-title').textContent = `Editando: ${exam.titulo}`;
    this.$('#exam-submit').textContent = 'Actualizar examen';
    this.$('#exam-cancel').hidden = false;
    this.setMessage(this.$('#exam-msg'), '');
    this.table.selectedId = exam.id;
    this.#renderQuestions();
    form.titulo.focus();
    form.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  async #onTableAction({ name, id }) {
    const exam = exams.get(id);
    if (!exam) return;
    if (name === 'edit') return this.#startEdit(exam);
    if (name === 'delete') {
      const ok = await confirmDialog({
        title: 'Eliminar examen',
        message: `Se eliminará «${exam.titulo}» con sus ${exam.preguntas.length} preguntas. Esta acción no se puede deshacer.`,
        confirmText: 'Eliminar', danger: true,
      });
      if (!ok) return;
      exams.remove(id);
      if (this.#examId === id) this.#resetExam();
      toast('Examen eliminado.', 'success');
      this.#refreshTable();
    }
  }

  #onExamSubmit(e) {
    e.preventDefault();
    const form = e.currentTarget;
    const msg = this.$('#exam-msg');
    this.setMessage(msg, '');
    if (!form.checkValidity()) { form.reportValidity(); return; }
    try {
      const data = readForm(form);
      if (this.#examId) {
        exams.update(this.#examId, data);
        toast('Examen actualizado.', 'success');
        this.#renderQuestions();
      } else {
        const created = exams.create(data);
        toast('Examen creado. Ahora agrégale preguntas.', 'success');
        this.#refreshTable();
        this.#startEdit(created);
        this.$('#q-texto')?.focus();
        return;
      }
      this.#refreshTable();
    } catch (err) {
      this.setMessage(msg, err.message);
    }
  }

  /* ---------- Preguntas ---------- */

  #renderQuestions() {
    const card = this.$('#questions-card');
    const exam = exams.get(this.#examId);
    if (!exam) { card.hidden = true; return; }
    card.hidden = false;
    const editing = this.#questionId !== null;
    const d = this.#draft;

    const list = exam.preguntas.map((q, i) => `
      <li class="question-item${q.id === this.#questionId ? ' selected' : ''}">
        <div class="q-head">
          <strong>${i + 1}. ${esc(q.texto)}</strong>
          <span class="q-buttons">
            <button type="button" class="btn btn-sm btn-ghost" data-q-edit="${esc(q.id)}" aria-label="Editar pregunta ${i + 1}">Editar</button>
            <button type="button" class="btn btn-sm btn-danger" data-q-del="${esc(q.id)}" aria-label="Eliminar pregunta ${i + 1}">Eliminar</button>
          </span>
        </div>
        <ul class="answers" role="list">
          ${q.respuestas.map((r) => `<li class="${r.correcta ? 'correct' : ''}">${esc(r.texto)}${r.correcta ? ' <span class="badge badge-ok">Correcta</span>' : ''}</li>`).join('')}
        </ul>
      </li>`).join('');

    const answerRows = d.respuestas.map((r, i) => `
      <div class="answer-row">
        <input type="radio" name="correcta" value="${i}" ${r.correcta ? 'checked' : ''} aria-label="Marcar la respuesta ${i + 1} como correcta" title="Respuesta correcta">
        <input type="text" class="a-text" data-i="${i}" value="${esc(r.texto)}" maxlength="150" required
               placeholder="Descripción de la respuesta ${i + 1}" aria-label="Descripción de la respuesta ${i + 1}">
        <button type="button" class="btn btn-sm btn-ghost" data-a-del="${i}" aria-label="Quitar respuesta ${i + 1}" ${d.respuestas.length <= MIN_ANSWERS ? 'disabled' : ''}>✕</button>
      </div>`).join('');

    card.innerHTML = `
      <h2>Preguntas de «${esc(exam.titulo)}» <span class="badge">${exam.preguntas.length}</span></h2>
      ${exam.preguntas.length
        ? `<ol class="questions" role="list">${list}</ol>`
        : '<p class="empty">Este examen todavía no tiene preguntas.</p>'}

      <form id="q-form" class="q-form" novalidate>
        <h3>${editing ? 'Editar pregunta' : 'Agregar pregunta'}</h3>
        <div class="field">
          <label for="q-texto">Enunciado</label>
          <textarea id="q-texto" rows="2" required minlength="5" maxlength="300">${esc(d.texto)}</textarea>
        </div>
        <fieldset class="field">
          <legend>Respuestas — marca la correcta (solo una)</legend>
          <div id="answers-box">${answerRows}</div>
          <button type="button" class="btn btn-sm btn-ghost" data-a-add ${d.respuestas.length >= MAX_ANSWERS ? 'disabled' : ''}>+ Agregar respuesta</button>
        </fieldset>
        <p id="q-msg" class="form-message" role="alert"></p>
        <div class="form-actions">
          <button class="btn btn-primary" type="submit">${editing ? 'Actualizar pregunta' : 'Guardar pregunta'}</button>
          ${editing ? '<button class="btn btn-ghost" type="button" data-q-cancel>Cancelar</button>' : ''}
        </div>
      </form>`;
  }