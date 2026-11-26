import { auth } from './services/auth.js';

/**
 * Router por hash (#/ruta). Protege las rutas privadas: si no hay sesión
 * redirige a #/login y recuerda a dónde quería ir el usuario.
 */
const routes = [
  { pattern: /^\/$/, tag: 'exam-list-view', title: 'Exámenes disponibles' },
  { pattern: /^\/examen\/([^/]+)$/, tag: 'exam-taker-view', title: 'Resolver examen', params: ['id'] },
  { pattern: /^\/login$/, tag: 'login-view', title: 'Ingreso', guestOnly: true },
  { pattern: /^\/admin\/usuarios$/, tag: 'users-view', title: 'Gestión de usuarios', private: true },
  { pattern: /^\/admin\/examenes$/, tag: 'exams-view', title: 'Gestión de exámenes', private: true },
  { pattern: /^\/admin\/resultados$/, tag: 'results-view', title: 'Resultados', private: true },
];

const currentPath = () => {
  const raw = location.hash.slice(1) || '/';
  return decodeURI(raw.split('?')[0]) || '/';
};

export const navigate = (path) => { location.hash = `#${path}`; };

export function startRouter(outlet) {
  const render = () => {
    const path = currentPath();
    let match = null;
    let route = routes.find((r) => (match = path.match(r.pattern)));

    if (!route) {
      outlet.innerHTML = `
        <section class="page narrow">
          <div class="card empty-state">
            <h1 tabindex="-1">Página no encontrada</h1>
            <p>La dirección <code>${path.replace(/[<>&"]/g, '')}</code> no existe.</p>
            <a class="btn btn-primary" href="#/">Ver exámenes</a>
          </div>
        </section>`;
      document.title = 'No encontrada · Acme School';
      return;
    }

    if (route.private && !auth.isAuthenticated()) {
      sessionStorage.setItem('acme:redirect', path);
      navigate('/login');
      return;
    }
    if (route.guestOnly && auth.isAuthenticated()) {
      navigate('/admin/examenes');
      return;
    }

    const view = document.createElement(route.tag);
    route.params?.forEach((name, i) => { view.params[name] = match[i + 1]; });
    outlet.replaceChildren(view);
    document.title = `${route.title} · Acme School`;
    // Lleva el foco al contenedor principal para lectores de pantalla y teclado.
    outlet.focus({ preventScroll: true });
    window.scrollTo({ top: 0 });
  };

  window.addEventListener('hashchange', render);
  render();
}
