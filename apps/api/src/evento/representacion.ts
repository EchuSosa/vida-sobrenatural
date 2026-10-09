import {
  diaCivilEnArgentina,
  estadoInscripcionDeEvento,
  instanteEnArgentina,
  type DestinatariosEvento,
  type EventoPublico,
  type GeneroDestinatario,
  type PreguntaEvento,
  type TotalesEvento,
} from '@vida-sobrenatural/shared-types';
import type { Prisma } from '../generated/prisma/client.js';

/**
 * spec 011 — cómo se lee un Evento hacia afuera. Un solo `select` y una sola
 * función de armado para la página pública y el detalle del backoffice
 * (Principio XI). Nunca incluye inscriptos (FR-046).
 */
/** Una pregunta propia del Evento, hacia afuera (ampliación 2026-10-09, FR-064). */
export const PREGUNTA_SELECT = {
  id: true,
  texto: true,
  tipo: true,
  opciones: true,
  obligatoria: true,
  sensible: true,
} as const satisfies Prisma.PreguntaEventoSelect;

export function aPreguntaEvento(p: Prisma.PreguntaEventoGetPayload<{ select: typeof PREGUNTA_SELECT }>): PreguntaEvento {
  return { id: p.id, texto: p.texto, tipo: p.tipo, opciones: p.tipo === 'opcion' ? p.opciones : [], obligatoria: p.obligatoria, sensible: p.sensible };
}

export const EVENTO_SELECT = {
  id: true,
  slug: true,
  nombre: true,
  descripcion: true,
  tipo: true,
  inicio: true,
  fin: true,
  lugar: true,
  publicoObjetivo: true,
  imagenUrl: true,
  descripcionImagen: true,
  requiereInscripcion: true,
  requiereAprobacion: true,
  cupo: true,
  permiteListaEspera: true,
  costo: true,
  instruccionesPago: true,
  diasAnticipacionRecordatorio: true,
  estado: true,
  sede: { select: { id: true, nombre: true, direccion: true } },
  destinatariosGenero: true,
  edadMinima: true,
  edadMaxima: true,
  preguntas: { orderBy: { orden: 'asc' }, select: PREGUNTA_SELECT },
} as const satisfies Prisma.EventoSelect;

export type EventoLeido = Prisma.EventoGetPayload<{ select: typeof EVENTO_SELECT }>;

export function aEventoPublico(evento: EventoLeido, ocupados: number, ahora: Date = new Date()): EventoPublico {
  return {
    id: evento.id,
    slug: evento.slug,
    nombre: evento.nombre,
    descripcion: evento.descripcion,
    tipo: evento.tipo,
    inicio: evento.inicio.toISOString(),
    fin: evento.fin?.toISOString() ?? null,
    lugar: evento.lugar ?? evento.sede.direccion,
    sede: evento.sede,
    publicoObjetivo: evento.publicoObjetivo,
    imagenUrl: evento.imagenUrl,
    descripcionImagen: evento.descripcionImagen,
    requiereInscripcion: evento.requiereInscripcion,
    requiereAprobacion: evento.requiereAprobacion,
    permiteListaEspera: evento.permiteListaEspera,
    cupo: evento.cupo,
    lugaresDisponibles: evento.cupo === null ? null : Math.max(0, evento.cupo - ocupados),
    costo: evento.costo === null ? null : evento.costo.toFixed(2),
    instruccionesPago: evento.instruccionesPago,
    estado: evento.estado,
    estadoInscripcion: estadoInscripcionDeEvento(evento, ocupados, ahora),
    destinatarios: destinatariosDe(evento),
    preguntas: evento.preguntas.map(aPreguntaEvento),
  };
}

/** FR-060 — los destinatarios del Evento como los usa `correspondeAlEvento`. */
export function destinatariosDe(e: { destinatariosGenero: GeneroDestinatario; edadMinima: number | null; edadMaxima: number | null }): DestinatariosEvento {
  return { genero: e.destinatariosGenero, edadMinima: e.edadMinima, edadMaxima: e.edadMaxima };
}

/** Hoy a las 00:00 en Argentina: "el inicio es hoy o posterior" (FR-001). */
export function inicioDeHoyEnArgentina(ahora: Date = new Date()): Date {
  return instanteEnArgentina(diaCivilEnArgentina(ahora), '00:00');
}

/** Totales por Evento, en dos consultas para toda una página (FR-009, FR-025). */
export async function totalesDeEventos(
  db: Prisma.TransactionClient,
  eventoIds: string[],
): Promise<Map<string, TotalesEvento>> {
  const mapa = new Map<string, TotalesEvento>(
    eventoIds.map((id) => [id, { ocupados: 0, enEspera: 0, pendientes: 0, pagosAVerificar: 0 }]),
  );
  if (eventoIds.length === 0) return mapa;
  const grupos = await db.inscripcionEvento.groupBy({
    by: ['eventoId', 'estado'],
    where: { eventoId: { in: eventoIds } },
    _count: { _all: true },
  });
  for (const g of grupos) {
    const t = mapa.get(g.eventoId);
    if (!t) continue;
    if (g.estado === 'confirmada' || g.estado === 'pendiente') t.ocupados += g._count._all;
    if (g.estado === 'pendiente') t.pendientes += g._count._all;
    if (g.estado === 'lista_espera') t.enEspera += g._count._all;
  }
  const pagos = await db.pago.findMany({
    where: { estado: 'pendiente_verificacion', inscripcionEvento: { eventoId: { in: eventoIds } } },
    select: { inscripcionEvento: { select: { eventoId: true } } },
  });
  for (const p of pagos) {
    const t = mapa.get(p.inscripcionEvento.eventoId);
    if (t) t.pagosAVerificar += 1;
  }
  return mapa;
}
