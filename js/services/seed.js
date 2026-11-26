import { storage } from '../storage.js';
import { users } from './users.js';
import { exams } from './exams.js';

export const DEMO_ADMIN = { email: 'admin@acme.edu', password: 'Admin123' };

/** Crea datos iniciales: un administrador y un examen de ejemplo. */
export async function seed() {
  if (users.list().length === 0) {
    await users.create({
      identificacion: '1000000001',
      nombre: 'Administrador Acme',
      email: DEMO_ADMIN.email,
      telefono: '3001234567',
      cargo: 'Administrativo',
      password: DEMO_ADMIN.password,
    });
  }

  if (storage.read('seeded-exams')) return;
  storage.write('seeded-exams', true);
  if (exams.list().length > 0) return;

  const exam = exams.create({
    codigo: 'JS-101',
    titulo: 'Fundamentos de JavaScript',
    tiempo: 5,
    aprobacion: 60,
    descripcion: 'Evalúa conceptos básicos del lenguaje: variables, funciones, arreglos y el DOM.',
  });

  const q = (texto, opciones, correcta) => exams.addQuestion(exam.id, {
    texto,
    respuestas: opciones.map((t, i) => ({ texto: t, correcta: i === correcta })),
  });

  q('¿Qué palabra clave declara una constante en JavaScript?', ['var', 'let', 'const', 'static'], 2);
  q('¿Qué método agrega un elemento al final de un arreglo?', ['push()', 'pop()', 'shift()', 'unshift()'], 0);
  q('¿Cuál es el resultado de typeof null?', ['"null"', '"object"', '"undefined"', '"number"'], 1);
  q('¿Qué método del DOM devuelve el primer elemento que coincide con un selector CSS?', ['getElementById()', 'querySelector()', 'getElementsByTagName()', 'createElement()'], 1);
  q('¿Qué hace el operador === ?', ['Asigna un valor', 'Compara solo el valor', 'Compara valor y tipo', 'Compara solo el tipo'], 2);
}
