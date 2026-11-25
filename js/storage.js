/**
 * Capa de persistencia. Guarda estructuras JSON en localStorage (datos
 * permanentes) y sessionStorage (progreso temporal de un examen en curso).
 */
const PREFIX = 'acme:';

function makeStore(backend) {
  return {
    read(key, fallback = null) {
      try {
        const raw = backend.getItem(PREFIX + key);
        return raw === null ? fallback : JSON.parse(raw);
      } catch {
        return fallback;
      }
    },
    write(key, value) {
      try {
        backend.setItem(PREFIX + key, JSON.stringify(value));
        return true;
      } catch (err) {
        console.error('No se pudo guardar en el almacenamiento:', err);
        throw new Error('No se pudo guardar la información (almacenamiento lleno o bloqueado).');
      }
    },
    remove(key) {
      try { backend.removeItem(PREFIX + key); } catch { /* sin acción */ }
    },
  };
}

export const storage = makeStore(window.localStorage);
export const sessionStore = makeStore(window.sessionStorage);