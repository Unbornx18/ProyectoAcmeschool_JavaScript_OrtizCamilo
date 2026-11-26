import { storage } from '../storage.js';
import { hash } from '../utils.js';
import { users } from './users.js';

const KEY = 'session';

const notify = () => window.dispatchEvent(new CustomEvent('auth-changed'));

export const auth = {
  /** Usuario autenticado (o null). Si el usuario fue eliminado, cierra la sesión. */
  current() {
    const session = storage.read(KEY);
    if (!session) return null;
    const user = users.get(session.userId);
    if (!user) { storage.remove(KEY); return null; }
    return user;
  },

  isAuthenticated() {
    return this.current() !== null;
  },

  async login(email, password) {
    const user = users.findByEmail(email);
    const passwordHash = await hash(password ?? '');
    // Mensaje genérico para no revelar si el correo existe.
    if (!user || user.passwordHash !== passwordHash) throw new Error('Correo o contraseña incorrectos.');
    storage.write(KEY, { userId: user.id, desde: new Date().toISOString() });
    notify();
    return user;
  },

  logout() {
    storage.remove(KEY);
    notify();
  },
};
