import { storage } from '../storage.js';
import { uid, hash } from '../utils.js';

const KEY = 'users';
export const CARGOS = ['Administrativo', 'Docente'];

const all = () => storage.read(KEY, []);
const save = (list) => storage.write(KEY, list);

function clean(d) {
  return {
    identificacion: String(d.identificacion ?? '').trim(),
    nombre: String(d.nombre ?? '').trim().replace(/\s+/g, ' '),
    email: String(d.email ?? '').trim().toLowerCase(),
    telefono: String(d.telefono ?? '').trim(),
    cargo: String(d.cargo ?? '').trim(),
  };
}

function validate(data, ignoreId) {
  if (!/^\d{5,15}$/.test(data.identificacion)) throw new Error('La identificación debe tener entre 5 y 15 dígitos.');
  if (data.nombre.length < 3) throw new Error('El nombre completo es obligatorio (mínimo 3 caracteres).');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(data.email)) throw new Error('Ingresa un correo electrónico válido.');
  if (!/^\+?\d{7,15}$/.test(data.telefono)) throw new Error('El teléfono debe tener entre 7 y 15 dígitos.');
  if (!CARGOS.includes(data.cargo)) throw new Error('Selecciona un cargo válido.');
  const others = all().filter((u) => u.id !== ignoreId);
  if (others.some((u) => u.email === data.email)) throw new Error('Ya existe un usuario con ese correo.');
  if (others.some((u) => u.identificacion === data.identificacion)) throw new Error('Ya existe un usuario con ese número de identificación.');
}

export const users = {
  list: () => all(),
  get: (id) => all().find((u) => u.id === id) ?? null,
  findByEmail: (email) => all().find((u) => u.email === String(email).trim().toLowerCase()) ?? null,

  async create(input) {
    const data = clean(input);
    validate(data, null);
    if (!input.password || input.password.length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres.');
    const user = { id: uid(), ...data, passwordHash: await hash(input.password), creadoEn: new Date().toISOString() };
    save([...all(), user]);
    return user;
  },

  async update(id, input) {
    const list = all();
    const idx = list.findIndex((u) => u.id === id);
    if (idx === -1) throw new Error('El usuario ya no existe.');
    const data = clean(input);
    validate(data, id);
    if (list[idx].cargo === 'Administrativo' && data.cargo !== 'Administrativo' &&
        list.filter((u) => u.cargo === 'Administrativo').length === 1) {
      throw new Error('Debe existir al menos un usuario administrativo.');
    }
    const next = { ...list[idx], ...data };
    if (input.password) {
      if (input.password.length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres.');
      next.passwordHash = await hash(input.password);
    }
    list[idx] = next;
    save(list);
    return next;
  },

  remove(id, currentUserId) {
    const list = all();
    const target = list.find((u) => u.id === id);
    if (!target) throw new Error('El usuario ya no existe.');
    if (id === currentUserId) throw new Error('No puedes eliminar tu propia cuenta mientras estás conectado.');
    if (target.cargo === 'Administrativo' && list.filter((u) => u.cargo === 'Administrativo').length === 1) {
      throw new Error('Debe existir al menos un usuario administrativo.');
    }
    save(list.filter((u) => u.id !== id));
  },
};
