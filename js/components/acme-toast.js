/**
 * <acme-toast> — notificaciones temporales (Shadow DOM).
 * Uso: toast('Mensaje', 'success' | 'error' | 'info')
 */
class AcmeToast extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' }).innerHTML = `
      <style>
        :host { position: fixed; right: 1rem; bottom: 1rem; z-index: 1000; display: block;
                width: min(24rem, calc(100vw - 2rem)); pointer-events: none; }
        .stack { display: flex; flex-direction: column; gap: .5rem; }
        .toast { pointer-events: auto; display: flex; gap: .6rem; align-items: flex-start;
                 padding: .8rem 1rem; border-radius: .75rem; color: #fff; font: 500 .95rem/1.35 system-ui, sans-serif;
                 box-shadow: 0 10px 30px rgba(20, 16, 60, .3); animation: in .25s ease-out; }
        .toast.out { animation: out .25s ease-in forwards; }
        .success { background: #15803d; } .error { background: #b91c1c; } .info { background: #3730a3; }
        .icon { font-weight: 800; }
        button { margin-left: auto; background: none; border: 0; color: inherit; font-size: 1.1rem; cursor: pointer; line-height: 1; padding: 0 .2rem; }
        button:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
        @keyframes in { from { opacity: 0; transform: translateY(12px); } }
        @keyframes out { to { opacity: 0; transform: translateY(12px); } }
        @media (prefers-reduced-motion: reduce) { .toast, .toast.out { animation: none; } }
      </style>
      <div class="stack" role="status" aria-live="polite" aria-atomic="false"></div>`;
  }

  show(message, type = 'info', ms = 4500) {
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    const icon = { success: '✓', error: '!', info: 'i' }[type] ?? 'i';
    const text = document.createElement('span');
    text.textContent = message;
    const close = document.createElement('button');
    close.type = 'button';
    close.setAttribute('aria-label', 'Cerrar notificación');
    close.textContent = '×';
    const ic = document.createElement('span');
    ic.className = 'icon';
    ic.setAttribute('aria-hidden', 'true');
    ic.textContent = icon;
    el.append(ic, text, close);

    const dismiss = () => { el.classList.add('out'); setTimeout(() => el.remove(), 250); };
    close.addEventListener('click', dismiss);
    this.shadowRoot.querySelector('.stack').append(el);
    setTimeout(dismiss, ms);
  }
}

customElements.define('acme-toast', AcmeToast);

export function toast(message, type = 'info') {
  let host = document.querySelector('acme-toast');
  if (!host) { host = document.createElement('acme-toast'); document.body.append(host); }
  host.show(message, type);
}
