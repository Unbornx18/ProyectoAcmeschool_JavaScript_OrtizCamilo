import { storage } from '../storage.js';
import { uid } from '../utils.js';

const KEY = 'exams';
const all = () => storage.read(KEY, []);
const save = (list) => storage.write(KEY, list);

function cleanExam(d) {
  return {
    codigo: String(d.codigo ?? '').trim().toUpperCase(),
    titulo: String(d.titulo ?? '').trim().replace(/\s+/g, ' '),
    tiempo: Number(d.tiempo),
    aprobacion: Number(d.aprobacion),
    descripcion: String(d.descripcion ?? '').trim(),
  };
}

function validateExam(data, ignoreId) {
  if (!/^[A-Z0-9_-]{2,15}$/.test(data.codigo)) throw new Error('El código debe tener 2 a 15 caracteres (letras, números, guion).');
  if (data.titulo.length < 3) throw new Error('El título es obligatorio (mínimo 3 caracteres).');
  if (!Number.isInteger(data.tiempo) || data.tiempo < 1 || data.tiempo > 300) throw new Error('El tiempo debe ser un número entero de minutos entre 1 y 300.');
  if (!Number.isFinite(data.aprobacion) || data.aprobacion < 1 || data.aprobacion > 100) throw new Error('El porcentaje de aprobación debe estar entre 1 y 100.');
  if (data.descripcion.length < 5) throw new Error('Agrega una descripción del examen (mínimo 5 caracteres).');
  if (all().some((e) => e.id !== ignoreId && e.codigo === data.codigo)) throw new Error('Ya existe un examen con ese código.');
}

function cleanQuestion(d) {
  const texto = String(d.texto ?? '').trim();
  const respuestas = (d.respuestas ?? []).map((r) => ({
    id: r.id ?? uid(),
    texto: String(r.texto ?? '').trim(),
    correcta: Boolean(r.correcta),
  }));
  if (texto.length < 5) throw new Error('El enunciado de la pregunta es obligatorio (mínimo 5 caracteres).');
  if (respuestas.length < 2) throw new Error('Cada pregunta necesita al menos 2 respuestas.');
  if (respuestas.length > 6) throw new Error('Cada pregunta admite máximo 6 respuestas.');
  if (respuestas.some((r) => !r.texto)) throw new Error('Todas las respuestas deben tener una descripción.');
  const lower = respuestas.map((r) => r.texto.toLowerCase());
  if (new Set(lower).size !== lower.length) throw new Error('Las respuestas de una pregunta no pueden repetirse.');
  const correctas = respuestas.filter((r) => r.correcta).length;
  if (correctas !== 1) throw new Error('Debes marcar exactamente una respuesta como correcta.');
  return { texto, respuestas };
}

function mutate(examId, fn) {
  const list = all();
  const idx = list.findIndex((e) => e.id === examId);
  if (idx === -1) throw new Error('El examen ya no existe.');
  const result = fn(list[idx]);
  save(list);
  return result;
}

export const exams = {
  list: () => all(),
  get: (id) => all().find((e) => e.id === id) ?? null,

  create(input) {
    const data = cleanExam(input);
    validateExam(data, null);
    const exam = { id: uid(), ...data, preguntas: [], creadoEn: new Date().toISOString() };
    save([...all(), exam]);
    return exam;
  },

  update(id, input) {
    const data = cleanExam(input);
    validateExam(data, id);
    return mutate(id, (exam) => Object.assign(exam, data));
  },

  remove(id) {
    save(all().filter((e) => e.id !== id));
  },

  addQuestion(examId, input) {
    const q = cleanQuestion(input);
    return mutate(examId, (exam) => {
      const question = { id: uid(), ...q };
      exam.preguntas.push(question);
      return question;
    });
  },

  updateQuestion(examId, questionId, input) {
    const q = cleanQuestion(input);
    return mutate(examId, (exam) => {
      const idx = exam.preguntas.findIndex((p) => p.id === questionId);
      if (idx === -1) throw new Error('La pregunta ya no existe.');
      exam.preguntas[idx] = { id: questionId, ...q };
      return exam.preguntas[idx];
    });
  },

  removeQuestion(examId, questionId) {
    mutate(examId, (exam) => { exam.preguntas = exam.preguntas.filter((p) => p.id !== questionId); });
  },

  /** Calcula el resultado de un intento. answers = { [preguntaId]: respuestaId } */
  grade(exam, answers) {
    const total = exam.preguntas.length;
    const aciertos = exam.preguntas.filter((p) => {
      const chosen = p.respuestas.find((r) => r.id === answers[p.id]);
      return chosen?.correcta === true;
    }).length;
    const porcentaje = total === 0 ? 0 : Math.round((aciertos / total) * 1000) / 10;
    return { total, aciertos, porcentaje, aprobado: porcentaje >= exam.aprobacion };
  },
};
