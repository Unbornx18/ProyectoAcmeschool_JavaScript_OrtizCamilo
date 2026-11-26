import { formatClock } from '../utils.js';

/**
 * <acme-timer> — cuenta regresiva en tiempo real (Shadow DOM).
 *
 * El tiempo restante se calcula contra una hora límite absoluta (`deadline`),
 * no restando 1 en cada tick, así no se desfasa aunque la pestaña quede en
 * segundo plano ni al recargar la página.
 *
 *   timer.start(deadlineMs, totalSeconds)
 *   evento 'timer-end' cuando llega a 0, 'timer-tick' en cada actualización.
 */
class AcmeTimer extends HTMLElement {
  #interval = null;
  #deadline = 0;
  #total = 1;
  #lastRemaining = null;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' }).innerHTML = `
      <style>
        :host { display: block; }
        .box { display: flex; align-items: center; gap: .9rem; padding: .6rem 1rem; border-radius: .9rem;
               background: #fff; border: 2px solid #c7c9f0; font-family: system-ui, sans-serif; color: #1e1b3a;
               box-shadow: 0 4px 14px rgba(55, 48, 163, .12); transition: border-color .3s, background .3s; }
        .label { font-size: .75rem; text-transform: uppercase; letter-spacing: .06em; color: #5b5f7a; font-weight: 700; }
        .time { font-size: 1.8rem; font-weight: 800; font-variant-numeric: tabular-nums; line-height: 1.1; }
        .bar { flex: 1; min-width: 3rem; height: .55rem; border-radius: 99px; background: #e4e6fa; overflow: hidden; }
        .fill { height: 100%; width: 100%; background: #4f46e5; border-radius: inherit; transition: width .25s linear, background .3s; }
        .box.warn { border-color: #d97706; } .box.warn .fill { background: #d97706; }
        .box.danger { border-color: #dc2626; background: #fef2f2; } .box.danger .fill { background: #dc2626; }
        .box.danger .time { color: #b91c1c; animation: pulse 1s ease-in-out infinite; }
        .sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
        @keyframes pulse { 50% { opacity: .55; } }
        @media (prefers-reduced-motion: reduce) { .box.danger .time { animation: none; } .fill { transition: none; } }
      </style>
      <div class="box" role="timer" aria-label="Tiempo restante">
        <div><div class="label">Tiempo restante</div><div class="time" aria-hidden="true">--:--</div></div>
        <div class="bar" aria-hidden="true"><div class="fill"></div></div>
        <div class="sr" aria-live="polite"></div>
      </div>`;
  }

  start(deadline, totalSeconds) {
    this.stop();
    this.#deadline = deadline;
    this.#total = Math.max(1, totalSeconds);
    this.#lastRemaining = null;
    this.#tick();
    this.#interval = setInterval(() => this.#tick(), 250);
  }

  stop() {
    clearInterval(this.#interval);
    this.#interval = null;
  }

  disconnectedCallback() { this.stop(); }

  get remainingSeconds() {
    return Math.max(0, Math.ceil((this.#deadline - Date.now()) / 1000));
  }

  #tick() {
    const remaining = this.remainingSeconds;
    if (remaining === this.#lastRemaining) return;
    this.#lastRemaining = remaining;

    const root = this.shadowRoot;
    root.querySelector('.time').textContent = formatClock(remaining);
    root.querySelector('.fill').style.width = `${Math.min(100, (remaining / this.#total) * 100)}%`;
    const box = root.querySelector('.box');
    const ratio = remaining / this.#total;
    box.classList.toggle('danger', ratio <= 0.1 || remaining <= 30);
    box.classList.toggle('warn', !box.classList.contains('danger') && ratio <= 0.25);

    // Anuncios para lectores de pantalla solo en momentos clave (no cada segundo).
    if ([300, 60, 30, 10].includes(remaining)) {
      root.querySelector('.sr').textContent = remaining >= 60
        ? `Quedan ${remaining / 60} minutos` : `Quedan ${remaining} segundos`;
    }

    this.dispatchEvent(new CustomEvent('timer-tick', { detail: { remaining }, bubbles: true, composed: true }));
    if (remaining === 0) {
      this.stop();
      this.dispatchEvent(new CustomEvent('timer-end', { bubbles: true, composed: true }));
    }
  }
}

customElements.define('acme-timer', AcmeTimer);