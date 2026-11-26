import { AcmeView } from '../components/acme-view.js';
import '../components/acme-timer.js';
import { exams } from '../services/exams.js';
import { attempts } from '../services/attempts.js';
import { sessionStore } from '../storage.js';
import { confirmDialog } from '../components/acme-confirm.js';
import { esc, formatClock } from '../utils.js';

const progressKey = (examId) => `attempt:${examId}`;

/**
 * Vista pública para resolver un examen: identificación → preguntas con
 * temporizador → resultado. El progreso (datos del estudiante, hora límite y
 * respuestas) se guarda en sessionStorage para sobrevivir a una recarga sin
 * reiniciar el tiempo.
 */
class ExamTakerView extends AcmeView {
  #exam = null;
  #progress = null;
  #finished = false;
  #beforeUnload = (e) => { e.preventDefault(); e.returnValue = ''; };

  connectedCallback() {
    this.#exam = exams.get(this.params.id);
    if (!this.#exam) return this.#renderMessage('Examen no encontrado', 'El examen que buscas no existe o fue eliminado.');
    if (this.#exam.preguntas.length === 0) return this.#renderMessage('Examen no disponible', 'Este examen aún no tiene preguntas.');

    const saved = sessionStore.read(progressKey(this.#exam.id));
    if (saved) {
      this.#progress = saved;
      if (saved.deadline <= Date.now()) this.#finish('tiempo');
      else this.#renderExam();
    } else {
      this.#renderIdentify();
    }
  }

  disconnectedCallback() {
    window.removeEventListener('beforeunload', this.#beforeUnload);
  }

  #renderMessage(title, text) {
    this.innerHTML = `
      <section class="page narrow">
        <div class="card empty-state">
          <h1 tabindex="-1">${esc(title)}</h1>
          <p class="muted">${esc(text)}</p>
          <a class="btn btn-primary" href="#/">← Volver a los exámenes</a>
        </div>
      </section>`;
  }

  /* ---------- 1. Identificación ---------- */

  #renderIdentify() {
    const e = this.#exam;
    this.innerHTML = `
      <section class="page narrow">
        <a class="back-link" href="#/">← Todos los exámenes</a>
        <div class="card">
          <span class="badge">${esc(e.codigo)}</span>
          <h1 tabindex="-1">${esc(e.titulo)}</h1>
          <p class="muted">${esc(e.descripcion)}</p>
          <dl class="facts">
            <div><dt>Tiempo</dt><dd>${e.tiempo} min</dd></div>
            <div><dt>Para aprobar</dt><dd>${e.aprobacion}%</dd></div>
            <div><dt>Preguntas</dt><dd>${e.preguntas.length}</dd></div>
          </dl>
          <p class="notice">⏱ El tiempo empieza a correr cuando presionas <strong>Comenzar</strong> y no se puede pausar.</p>

          <form id="id-form" novalidate>
            <div class="field">
              <label for="identificacion">Número de identificación</label>
              <input id="identificacion" name="identificacion" inputmode="numeric" required pattern="\\d{5,15}" maxlength="15" autocomplete="off">
              <small>Solo números (5 a 15 dígitos).</small>
            </div>
            <div class="field">
              <label for="nombre">Nombre completo</label>
              <input id="nombre" name="nombre" required minlength="3" maxlength="80" autocomplete="name">
            </div>
            <p id="msg" class="form-message" role="alert"></p>
            <button class="btn btn-primary btn-block" type="submit">Comenzar examen</button>
          </form>
        </div>
      </section>`;

    this.$('#id-form').addEventListener('submit', (ev) => {
      ev.preventDefault();
      const form = ev.currentTarget;
      const identificacion = form.identificacion.value.trim();
      const nombre = form.nombre.value.trim().replace(/\s+/g, ' ');
      if (!/^\d{5,15}$/.test(identificacion)) return this.setMessage(this.$('#msg'), 'La identificación debe tener entre 5 y 15 dígitos.'), form.identificacion.focus();
      if (nombre.length < 3) return this.setMessage(this.$('#msg'), 'Escribe tu nombre completo.'), form.nombre.focus();

      this.#progress = {
        identificacion, nombre,
        inicio: Date.now(),
        deadline: Date.now() + e.tiempo * 60_000,
        answers: {},
      };
      sessionStore.write(progressKey(e.id), this.#progress);
      this.#renderExam();
    });
  }

  /* ---------- 2. Examen ---------- */

  #renderExam() {
    const e = this.#exam;
    const p = this.#progress;
    window.addEventListener('beforeunload', this.#beforeUnload);

    const questions = e.preguntas.map((q, i) => `
      <fieldset class="question" data-q="${esc(q.id)}">
        <legend><span class="q-num">${i + 1}</span> ${esc(q.texto)}</legend>
        <div class="options">
          ${q.respuestas.map((r) => `
            <label class="option">
              <input type="radio" name="q-${esc(q.id)}" value="${esc(r.id)}" ${p.answers[q.id] === r.id ? 'checked' : ''}>
              <span>${esc(r.texto)}</span>
            </label>`).join('')}
        </div>
      </fieldset>`).join('');

    this.innerHTML = `
      <section class="page narrow exam-page">
        <div class="timer-bar"><acme-timer id="timer"></acme-timer></div>

        <header class="card exam-header">
          <h1 tabindex="-1">${esc(e.titulo)}</h1>
          <p class="muted">Estudiante: <strong>${esc(p.nombre)}</strong> · ID ${esc(p.identificacion)}</p>
          <dl class="facts">
            <div><dt>Total de preguntas</dt><dd>${e.preguntas.length}</dd></div>
            <div><dt>Para aprobar</dt><dd>${e.aprobacion}%</dd></div>
            <div><dt>Respondidas</dt><dd id="answered">0</dd></div>
          </dl>
        </header>

        <form id="exam-form" novalidate>
          ${questions}
          <div class="finish-bar">
            <button class="btn btn-primary btn-lg" type="submit">Terminar examen</button>
          </div>
        </form>
      </section>`;

    const form = this.$('#exam-form');
    const timer = this.$('#timer');
    const updateCount = () => { this.$('#answered').textContent = `${Object.keys(p.answers).length}/${e.preguntas.length}`; };
    updateCount();

    form.addEventListener('change', (ev) => {
      const input = ev.target;
      if (input.type !== 'radio') return;
      p.answers[input.name.slice(2)] = input.value;
      sessionStore.write(progressKey(e.id), p);
      input.closest('fieldset').classList.add('answered');
      updateCount();
    });
    // Marca visualmente las ya respondidas (al reanudar).
    Object.keys(p.answers).forEach((qid) => this.$(`fieldset[data-q="${CSS.escape(qid)}"]`)?.classList.add('answered'));

    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const pending = e.preguntas.length - Object.keys(p.answers).length;
      const ok = await confirmDialog({
        title: 'Terminar examen',
        message: pending > 0
          ? `Tienes ${pending} ${pending === 1 ? 'pregunta sin responder' : 'preguntas sin responder'}. ¿Quieres terminar de todas formas?`
          : '¿Seguro que quieres terminar y ver tu resultado?',
        confirmText: 'Terminar', cancelText: 'Seguir respondiendo',
      });
      if (ok) this.#finish('usuario');
    });

    timer.addEventListener('timer-end', () => this.#finish('tiempo'));
    timer.start(p.deadline, e.tiempo * 60);
  }

  /* ---------- 3. Resultado ---------- */

  #finish(reason) {
    if (this.#finished) return;
    this.#finished = true;
    window.removeEventListener('beforeunload', this.#beforeUnload);
    document.querySelector('acme-confirm')?.remove();

    const e = this.#exam;
    const p = this.#progress;
    const result = exams.grade(e, p.answers);
    const used = Math.min(e.tiempo * 60, Math.round((Math.min(Date.now(), p.deadline) - p.inicio) / 1000));
    attempts.save({
      exam: e, identificacion: p.identificacion, nombre: p.nombre,
      answers: p.answers, result, tiempoUsado: used, terminadoPor: reason,
    });
    sessionStore.remove(progressKey(e.id));
    this.#renderResult(result, used, reason);
  }

  #renderResult(result, used, reason) {
    const e = this.#exam;
    const p = this.#progress;
    const { aprobado, porcentaje, aciertos, total } = result;
    const C = 2 * Math.PI * 54;

    this.innerHTML = `
      <section class="page narrow">
        <div class="card result ${aprobado ? 'pass' : 'fail'}">
          <p class="muted">${esc(e.titulo)} · ${esc(p.nombre)}</p>
          <div class="ring" role="img" aria-label="Porcentaje de respuestas acertadas: ${porcentaje}%">
            <svg viewBox="0 0 120 120" aria-hidden="true">
              <circle class="track" cx="60" cy="60" r="54"/>
              <circle class="bar" cx="60" cy="60" r="54" stroke-dasharray="${C}" stroke-dashoffset="${C}"/>
            </svg>
            <span class="ring-text">${porcentaje}%</span>
          </div>
          <h1 tabindex="-1">${aprobado ? '¡Felicitaciones, aprobaste el examen!' : 'No aprobaste el examen'}</h1>
          <p class="result-msg" role="status">
            ${aprobado
              ? `Superaste el ${e.aprobacion}% requerido.`
              : `Necesitabas al menos el ${e.aprobacion}% para aprobar. ¡Sigue practicando e inténtalo de nuevo!`}
          </p>
          ${reason === 'tiempo' ? '<p class="notice">⏰ Se acabó el tiempo: el examen se envió automáticamente.</p>' : ''}
          <dl class="facts">
            <div><dt>Respuestas acertadas</dt><dd>${aciertos} de ${total}</dd></div>
            <div><dt>Porcentaje</dt><dd>${porcentaje}%</dd></div>
            <div><dt>Tiempo usado</dt><dd>${esc(formatClock(used))}</dd></div>
          </dl>
          <div class="form-actions center">
            <a class="btn btn-primary" href="#/">Ver más exámenes</a>
            <a class="btn btn-ghost" href="#/examen/${encodeURIComponent(e.id)}" id="retry">Intentar de nuevo</a>
          </div>
        </div>
      </section>`;

    // Anima el anillo de progreso.
    requestAnimationFrame(() => requestAnimationFrame(() => {
      this.$('.ring .bar')?.setAttribute('stroke-dashoffset', String(C * (1 - porcentaje / 100)));
    }));
    // «Intentar de nuevo» en la misma ruta no dispara hashchange: recarga la vista.
    this.$('#retry').addEventListener('click', (ev) => {
      ev.preventDefault();
      const view = document.createElement('exam-taker-view');
      view.params = { ...this.params };
      this.replaceWith(view);
    });
  }
}

customElements.define('exam-taker-view', ExamTakerView);
