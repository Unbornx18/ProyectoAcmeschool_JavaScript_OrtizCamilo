import { esc } from '../utils.js';
import { auth } from '../services/auth.js';
import { toast } from './acme-toast.js';

/**
 * <acme-header> — barra de navegación. Muestra los enlaces privados
 * únicamente cuando hay una sesión activa.
 */
class AcmeHeader extends HTMLElement {
  connectedCallback() {
    this.#render();
    this.update = () => this.#render();
    window.addEventListener('auth-changed', this.update);
    window.addEventListener('hashchange', this.update);
    this.addEventListener('click', (e) => {
      if (e.target.closest('[data-toggle]')) {
        const nav = this.querySelector('nav');
        const open = nav.dataset.open !== 'true';
        nav.dataset.open = String(open);
        this.querySelector('[data-toggle]').setAttribute('aria-expanded', String(open));
      } else if (e.target.closest('[data-logout]')) {
        auth.logout();
        toast('Sesión cerrada correctamente.', 'info');
        location.hash = '#/';
      } else if (e.target.closest('nav a')) {
        const nav = this.querySelector('nav');
        nav.dataset.open = 'false';
        this.querySelector('[data-toggle]').setAttribute('aria-expanded', 'false');
      }
    });
  }

  disconnectedCallback() {
    window.removeEventListener('auth-changed', this.update);
    window.removeEventListener('hashchange', this.update);
  }

  #link(href, label) {
    const path = location.hash.slice(1) || '/';
    const active = href.slice(1) === path || (href === '#/' && path.startsWith('/examen/'));
    return `<a href="${href}"${active ? ' aria-current="page"' : ''}>${label}</a>`;
  }

  #render() {
    const user = auth.current();
    const wasOpen = this.querySelector('nav')?.dataset.open === 'true';
    this.innerHTML = `
      <header class="site-header">
        <div class="header-inner">
          <a class="brand" href="#/" aria-label="Acme School, ir al inicio">
            <svg viewBox="0 0 64 64" width="34" height="34" aria-hidden="true"><rect width="64" height="64" rx="14" fill="#fff" fill-opacity=".18"/><path d="M18 44 32 16l14 28M23 36h18" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
            <span>Acme <strong>School</strong></span>
          </a>
          <button type="button" class="nav-toggle" data-toggle aria-expanded="${wasOpen}" aria-controls="main-nav" aria-label="Menú de navegación">
            <span></span><span></span><span></span>
          </button>
          <nav id="main-nav" aria-label="Principal" data-open="${wasOpen}">
            ${this.#link('#/', 'Exámenes')}
            ${user ? `
              ${this.#link('#/admin/examenes', 'Gestión de exámenes')}
              ${this.#link('#/admin/usuarios', 'Usuarios')}
              ${this.#link('#/admin/resultados', 'Resultados')}
              <span class="who" title="${esc(user.email)}">${esc(user.nombre.split(' ')[0])}</span>
              <button type="button" class="btn btn-sm btn-light" data-logout>Cerrar sesión</button>`
              : this.#link('#/login', 'Ingreso docentes')}
          </nav>
        </div>
      </header>`;
  }
}

customElements.define('acme-header', AcmeHeader);
