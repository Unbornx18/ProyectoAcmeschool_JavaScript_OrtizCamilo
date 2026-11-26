/** Clase base para las vistas (páginas) de la aplicación. */
export class AcmeView extends HTMLElement {
  /** Parámetros de la ruta (los asigna el router antes de conectar el elemento). */
  params = {};

  $(selector) { return this.querySelector(selector); }
  $$(selector) { return [...this.querySelectorAll(selector)]; }

  /** Muestra un mensaje de error/éxito en la región aria-live del formulario. */
  setMessage(el, text, type = 'error') {
    if (!el) return;
    el.textContent = text;
    el.className = text ? `form-message ${type}` : 'form-message';
  }
}
