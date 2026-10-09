import {
  ESTADOS_INSCRIPCION_ABIERTA,
  VALORES_SI_NO,
  campoDePregunta,
  validarRespuestas,
  type DatosPreguntaEvento,
  type ErrorDeCampo,
  type RespuestaEnInscripcion,
  type RespuestaPregunta,
  type ResumenPreguntaEvento,
} from '@vida-sobrenatural/shared-types';
import type { Prisma } from '../generated/prisma/client.js';
import { AppException } from '../common/errors/app-exception.js';
import { aPreguntaEvento, PREGUNTA_SELECT } from './representacion.js';

/**
 * spec 011, ampliación 2026-10-09 (FR-064 a FR-068, D221, D222) — las
 * preguntas propias del Evento y sus respuestas. Las respuestas viven solo en
 * la Inscripción (`RespuestaPreguntaEvento`), nunca en el perfil, y nunca se
 * loguean ni viajan en avisos: los errores llevan el campo y el código, no el
 * valor. Las de preguntas sensibles solo las ve `eventos.gestionar` (y la
 * propia Persona, en `mi-inscripcion`).
 */

/** Normaliza lo que manda el formulario (texto y opciones recortados; sin opciones si no es "Una opción"). */
export function normalizarPreguntas(preguntas: readonly DatosPreguntaEvento[]): DatosPreguntaEvento[] {
  return preguntas.map((p) => ({
    id: typeof p.id === 'string' && p.id !== '' ? p.id : undefined,
    texto: typeof p.texto === 'string' ? p.texto.trim() : '',
    tipo: p.tipo,
    opciones: p.tipo === 'opcion' && Array.isArray(p.opciones) ? p.opciones.map((o) => (typeof o === 'string' ? o.trim() : '')) : [],
    obligatoria: p.obligatoria === true,
    sensible: p.sensible === true,
  }));
}

/**
 * FR-064, FR-066 — deja las preguntas del Evento como la lista recibida (en
 * su orden). Con respuestas, una pregunta no se borra, no cambia de tipo, no
 * deja de ser sensible ni pierde opciones (`PREGUNTA_CON_RESPUESTAS`); el
 * texto sí se edita. Se llama ya validada la forma (`validarPreguntas`).
 */
export async function sincronizarPreguntas(tx: Prisma.TransactionClient, eventoId: string, preguntas: readonly DatosPreguntaEvento[]): Promise<void> {
  const existentes = await tx.preguntaEvento.findMany({
    where: { eventoId },
    select: { id: true, tipo: true, sensible: true, opciones: true, _count: { select: { respuestas: true } } },
  });
  const porId = new Map(existentes.map((p) => [p.id, p]));
  const conflictos: ErrorDeCampo[] = [];
  preguntas.forEach((p, i) => {
    const previa = p.id ? porId.get(p.id) : undefined;
    if (!previa || previa._count.respuestas === 0) return;
    const pierdeOpciones = previa.tipo === 'opcion' && previa.opciones.some((o) => !(p.opciones ?? []).includes(o));
    if (previa.tipo !== p.tipo) conflictos.push({ campo: campoDePregunta(i, 'tipo'), code: 'PREGUNTA_CON_RESPUESTAS' });
    else if (pierdeOpciones) conflictos.push({ campo: campoDePregunta(i, 'opciones'), code: 'PREGUNTA_CON_RESPUESTAS' });
    else if (previa.sensible && !p.sensible) conflictos.push({ campo: campoDePregunta(i, 'texto'), code: 'PREGUNTA_CON_RESPUESTAS' });
  });
  const quedan = new Set(preguntas.map((p) => p.id).filter((id): id is string => Boolean(id && porId.has(id))));
  const aBorrar = existentes.filter((p) => !quedan.has(p.id));
  if (aBorrar.some((p) => p._count.respuestas > 0)) conflictos.push({ campo: 'preguntas', code: 'PREGUNTA_CON_RESPUESTAS' });
  if (conflictos.length > 0) {
    throw new AppException('PREGUNTA_CON_RESPUESTAS', 409, 'Una pregunta con respuestas no se borra ni cambia de tipo.', conflictos);
  }

  if (aBorrar.length > 0) await tx.preguntaEvento.deleteMany({ where: { id: { in: aBorrar.map((p) => p.id) } } });
  for (const [orden, p] of preguntas.entries()) {
    const datos = { orden, texto: p.texto, tipo: p.tipo, opciones: p.opciones ?? [], obligatoria: p.obligatoria, sensible: p.sensible };
    if (p.id && porId.has(p.id)) await tx.preguntaEvento.update({ where: { id: p.id }, data: datos });
    else await tx.preguntaEvento.create({ data: { ...datos, eventoId } });
  }
}

/** FR-065 — valida y guarda las respuestas de una Inscripción nueva. Errores por campo (`respuesta-<id>`). */
export async function guardarRespuestas(
  tx: Prisma.TransactionClient,
  eventoId: string,
  inscripcionId: string,
  respuestas: readonly RespuestaPregunta[] | undefined,
): Promise<void> {
  const preguntas = await preguntasDelEvento(tx, eventoId);
  if (preguntas.length === 0) return;
  const { errores, validas } = validarRespuestas(preguntas, respuestas);
  if (errores.length > 0) throw new AppException('VALIDACION', 400, 'Revisá tus respuestas.', errores);
  if (validas.length > 0) {
    await tx.respuestaPreguntaEvento.createMany({ data: validas.map((r) => ({ inscripcionId, preguntaId: r.preguntaId, valor: r.valor })) });
  }
}

/** Valida las respuestas sin guardar (antes de crear la Inscripción, para no dejarla a medias). */
export async function validarRespuestasDelEvento(
  tx: Prisma.TransactionClient,
  eventoId: string,
  respuestas: readonly RespuestaPregunta[] | undefined,
): Promise<void> {
  const preguntas = await preguntasDelEvento(tx, eventoId);
  const { errores } = validarRespuestas(preguntas, respuestas);
  if (errores.length > 0) throw new AppException('VALIDACION', 400, 'Revisá tus respuestas.', errores);
}

async function preguntasDelEvento(tx: Prisma.TransactionClient, eventoId: string) {
  return (await tx.preguntaEvento.findMany({ where: { eventoId }, orderBy: { orden: 'asc' }, select: PREGUNTA_SELECT })).map(aPreguntaEvento);
}

/** FR-067, FR-068 — las respuestas de varias Inscripciones, en el orden de las preguntas; sin las sensibles si no corresponde verlas. */
export async function respuestasDeInscripciones(
  db: Prisma.TransactionClient,
  inscripcionIds: readonly string[],
  verSensibles: boolean,
): Promise<Map<string, RespuestaEnInscripcion[]>> {
  const mapa = new Map<string, RespuestaEnInscripcion[]>(inscripcionIds.map((id) => [id, []]));
  if (inscripcionIds.length === 0) return mapa;
  const filas = await db.respuestaPreguntaEvento.findMany({
    where: { inscripcionId: { in: [...inscripcionIds] }, ...(verSensibles ? {} : { pregunta: { sensible: false } }) },
    orderBy: { pregunta: { orden: 'asc' } },
    select: { inscripcionId: true, valor: true, pregunta: { select: { id: true, texto: true, tipo: true, sensible: true } } },
  });
  for (const f of filas) {
    mapa.get(f.inscripcionId)?.push({ preguntaId: f.pregunta.id, pregunta: f.pregunta.texto, tipo: f.pregunta.tipo, sensible: f.pregunta.sensible, valor: f.valor });
  }
  return mapa;
}

/** FR-067 — resumen por pregunta sobre las Inscripciones abiertas; sin las sensibles si no corresponde verlas (FR-068). */
export async function resumenDePreguntas(db: Prisma.TransactionClient, eventoId: string, verSensibles: boolean): Promise<ResumenPreguntaEvento[]> {
  const preguntas = await db.preguntaEvento.findMany({
    where: { eventoId, ...(verSensibles ? {} : { sensible: false }) },
    orderBy: { orden: 'asc' },
    select: PREGUNTA_SELECT,
  });
  if (preguntas.length === 0) return [];
  const grupos = await db.respuestaPreguntaEvento.groupBy({
    by: ['preguntaId', 'valor'],
    where: { preguntaId: { in: preguntas.map((p) => p.id) }, inscripcion: { estado: { in: [...ESTADOS_INSCRIPCION_ABIERTA] } } },
    _count: { _all: true },
  });
  return preguntas.map((p) => {
    const propios = grupos.filter((g) => g.preguntaId === p.id);
    const cuenta = (valor: string) => propios.find((g) => g.valor === valor)?._count._all ?? 0;
    const valores = p.tipo === 'si_no' ? [...VALORES_SI_NO] : p.tipo === 'opcion' ? p.opciones : [];
    return {
      preguntaId: p.id,
      texto: p.texto,
      tipo: p.tipo,
      sensible: p.sensible,
      conteos: valores.map((valor) => ({ valor, cantidad: cuenta(valor) })),
      respondidas: propios.reduce((n, g) => n + g._count._all, 0),
    };
  });
}
