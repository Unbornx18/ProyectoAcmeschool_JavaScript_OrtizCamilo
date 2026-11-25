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