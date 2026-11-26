/**
 * <acme-confirm> — diálogo modal de confirmación (Shadow DOM, <dialog> nativo:
 * atrapa el foco, cierra con Esc y devuelve el foco al elemento anterior).
 * Uso: const ok = await confirmDialog({ title, message, confirmText, danger })
 */
class AcmeConfirm extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' }).innerHTML = `
      <style>
        dialog { border: 0; border-radius: 1rem; padding: 0; width: min(28rem, calc(100vw - 2rem));
                 box-shadow: 0 25px 60px rgba(20, 16, 60, .4); font-family: system-ui, sans-serif; color: #1e1b3a; }
        dialog::backdrop { background: rgba(20, 16, 60, .55); backdrop-filter: blur(2px); }
        dialog[open] { animation: pop .2s ease-out; }
        .body { padding: 1.5rem 1.5rem 1rem; }
        h2 { margin: 0 0 .5rem; font-size: 1.2rem; }
        p { margin: 0; color: #5b5f7a; line-height: 1.5; }
        .actions { display: flex; justify-content: flex-end; gap: .6rem; padding: 1rem 1.5rem 1.5rem; flex-wrap: wrap; }
        button { font: 600 .95rem system-ui, sans-serif; padding: .65rem 1.1rem; border-radius: .6rem; cursor: pointer; border: 2px solid transparent; }
        .cancel { background: #eef0fb; color: #1e1b3a; }
        .ok { background: #4f46e5; color: #fff; }
        .ok.danger { background: #b91c1c; }
        button:hover { filter: brightness(.95); }
        button:focus-visible { outline: 3px solid #14b8a6; outline-offset: 2px; }
        @keyframes pop { from { opacity: 0; transform: scale(.96); } }
        @media (prefers-reduced-motion: reduce) { dialog[open] { animation: none; } }
      </style>
      <dialog aria-labelledby="t" aria-describedby="m">
        <div class="body"><h2 id="t"></h2><p id="m"></p></div>
        <div class="actions">
          <button type="button" class="cancel"></button>
          <button type="button" class="ok"></button>
        </div>
      </dialog>`;
  }

  ask({ title, message, confirmText = 'Aceptar', cancelText = 'Cancelar', danger = false }) {
    const root = this.shadowRoot;
    const dialog = root.querySelector('dialog');
    const ok = root.querySelector('.ok');
    const cancel = root.querySelector('.cancel');
    root.getElementById('t').textContent = title;
    root.getElementById('m').textContent = message;
    ok.textContent = confirmText;
    cancel.textContent = cancelText;
    ok.classList.toggle('danger', danger);

    return new Promise((resolve) => {
      let result = false;
      ok.onclick = () => { result = true; dialog.close(); };
      cancel.onclick = () => dialog.close();
      dialog.onclose = () => { resolve(result); this.remove(); };
      dialog.showModal();
      cancel.focus();
    });
  }
}

customElements.define('acme-confirm', AcmeConfirm);

export function confirmDialog(options) {
  const el = document.createElement('acme-confirm');
  document.body.append(el);
  return el.ask(options);
}
