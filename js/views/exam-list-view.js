import { AcmeView } from '../components/acme-view.js';
import { exams } from '../services/exams.js';
import { esc } from '../utils.js';

class ExamListView extends AcmeView {
  connectedCallback() {
    const list = exams.list();
    const cards = list.map((exam) => {
      const n = exam.preguntas.length;
      const ready = n > 0;
      return `
        <li>
          <article class="card exam-card">
            <span class="badge">${esc(exam.codigo)}</span>
            <h2>${esc(exam.titulo)}</h2>
            <p class="muted">${esc(exam.descripcion)}</p>
            <dl class="facts">
              <div><dt>Tiempo</dt><dd>${exam.tiempo} min</dd></div>
              <div><dt>Para aprobar</dt><dd>${exam.aprobacion}%</dd></div>
              <div><dt>Preguntas</dt><dd>${n}</dd></div>
            </dl>
            ${ready
              ? `<a class="btn btn-primary btn-block" href="#/examen/${encodeURIComponent(exam.id)}" aria-label="Presentar examen ${esc(exam.titulo)}">Presentar examen →</a>`
              : '<button class="btn btn-block" disabled>Aún sin preguntas</button>'}
          </article>
        </li>`;
    }).join('');

    this.innerHTML = `
      <section class="page">
        <header class="hero">
          <h1 tabindex="-1">Exámenes disponibles</h1>
          <p>Elige un examen para comenzar. No necesitas iniciar sesión: solo tu identificación y nombre completo.</p>
        </header>
        ${list.length
          ? `<ul class="grid-cards" role="list">${cards}</ul>`
          : `<div class="card empty-state"><h2>No hay exámenes disponibles</h2><p class="muted">Vuelve más tarde.</p></div>`}
      </section>`;
  }
}

customElements.define('exam-list-view', ExamListView);
