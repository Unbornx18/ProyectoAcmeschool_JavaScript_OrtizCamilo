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