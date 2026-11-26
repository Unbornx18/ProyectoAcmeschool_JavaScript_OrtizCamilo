import { storage } from '../storage.js';
import { uid } from '../utils.js';

const KEY = 'attempts';
const all = () => storage.read(KEY, []);

export const attempts = {
  list: () => all().sort((a, b) => b.fecha.localeCompare(a.fecha)),

  /** Guarda un intento asociado a la identificación y nombre del estudiante. */
  save({ exam, identificacion, nombre, answers, result, tiempoUsado, terminadoPor }) {
    const attempt = {
      id: uid(),
      examenId: exam.id,
      examenCodigo: exam.codigo,
      examenTitulo: exam.titulo,
      aprobacionRequerida: exam.aprobacion,
      identificacion,
      nombre,
      respuestas: answers,
      preguntas: result.total,
      aciertos: result.aciertos,
      porcentaje: result.porcentaje,
      aprobado: result.aprobado,
      tiempoUsado,
      terminadoPor,
      fecha: new Date().toISOString(),
    };
    storage.write(KEY, [...all(), attempt]);
    return attempt;
  },

  remove(id) {
    storage.write(KEY, all().filter((a) => a.id !== id));
  },
};
