import { estadoPagoDeInscripcion, type MiInscripcionEvento } from '@vida-sobrenatural/shared-types';
import type { Prisma } from '../generated/prisma/client.js';
import { aEventoPublico, EVENTO_SELECT, totalesDeEventos } from './representacion.js';
import { posicionEnLista } from './motor-cupo.js';

/**
 * spec 011 — cómo ve su dueña una Inscripción (`MiInscripcionEvento`): el
 * Evento, su lugar en la lista, el estado de pago derivado (FR-024) y el
 * último Pago. Una sola función para la página del Evento, Mis eventos y
 * cancelar (Principio XI).
 */
export const INSCRIPCION_SELECT = {
  id: true,
  eventoId: true,
  estado: true,
  createdAt: true,
  enListaDesde: true,
  promovidaEn: true,
  motivoRechazo: true,
  motivoCancelacion: true,
  evento: { select: EVENTO_SELECT },
  pagos: {
    select: { id: true, estado: true, monto: true, medio: true, fechaPago: true, motivoRechazo: true, comprobanteRuta: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  },
} as const satisfies Prisma.InscripcionEventoSelect;

export type InscripcionLeida = Prisma.InscripcionEventoGetPayload<{ select: typeof INSCRIPCION_SELECT }>;

export async function aMisInscripciones(db: Prisma.TransactionClient, filas: InscripcionLeida[]): Promise<MiInscripcionEvento[]> {
  const totales = await totalesDeEventos(db, [...new Set(filas.map((f) => f.eventoId))]);
  return Promise.all(
    filas.map(async (f) => {
      const costo = f.evento.costo === null ? null : f.evento.costo.toFixed(2);
      const pago = estadoPagoDeInscripcion(costo, f.pagos);
      const ultimo = f.pagos[0];
      return {
        id: f.id,
        estado: f.estado,
        createdAt: f.createdAt.toISOString(),
        posicionEnLista: f.estado === 'lista_espera' ? await posicionEnLista(db, f) : null,
        promovidaEn: f.promovidaEn?.toISOString() ?? null,
        motivoRechazo: f.motivoRechazo,
        motivoCancelacion: f.motivoCancelacion,
        estadoPago: pago.estado,
        ultimoRechazoPago: pago.ultimoRechazo,
        ultimoPago: ultimo
          ? {
              id: ultimo.id,
              estado: ultimo.estado,
              monto: ultimo.monto.toFixed(2),
              medio: ultimo.medio,
              fechaPago: ultimo.fechaPago.toISOString().slice(0, 10),
              motivoRechazo: ultimo.motivoRechazo,
              tieneComprobante: ultimo.comprobanteRuta !== null,
            }
          : null,
        evento: aEventoPublico(f.evento, totales.get(f.eventoId)?.ocupados ?? 0),
      };
    }),
  );
}
