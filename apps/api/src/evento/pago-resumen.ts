import type { PagoEnBandeja, PagoResumen } from '@vida-sobrenatural/shared-types';
import type { Prisma } from '../generated/prisma/client.js';

/** spec 011 — cómo se lee un Pago hacia afuera (contracts/pagos-api.md). */
export const PAGO_SELECT = {
  id: true,
  inscripcionEventoId: true,
  monto: true,
  medio: true,
  fechaPago: true,
  estado: true,
  comprobanteRuta: true,
  comprobanteMime: true,
  creadoPorId: true,
  verificadoPorId: true,
  revisadoEn: true,
  motivoRechazo: true,
  createdAt: true,
  inscripcionEvento: {
    select: {
      persona: { select: { id: true, nombre: true, apellido: true } },
      evento: { select: { id: true, nombre: true, inicio: true, slug: true } },
    },
  },
} as const satisfies Prisma.PagoSelect;

type PagoLeido = Prisma.PagoGetPayload<{ select: typeof PAGO_SELECT }>;

export async function aPagosEnBandeja(db: Prisma.TransactionClient, pagos: PagoLeido[]): Promise<PagoEnBandeja[]> {
  const ids = [...new Set(pagos.flatMap((p) => [p.creadoPorId, p.verificadoPorId]).filter((x): x is string => Boolean(x)))];
  const personas = new Map(
    (await db.persona.findMany({ where: { id: { in: ids } }, select: { id: true, nombre: true, apellido: true } })).map((p) => [p.id, p]),
  );
  return pagos.map((p) => ({
    ...aPagoResumen(p, personas),
    persona: p.inscripcionEvento.persona,
    evento: { ...p.inscripcionEvento.evento, inicio: p.inscripcionEvento.evento.inicio.toISOString() },
  }));
}

export function aPagoResumen(p: Omit<PagoLeido, 'inscripcionEvento'>, personas: Map<string, { id: string; nombre: string; apellido: string }>): PagoResumen {
  return {
    id: p.id,
    inscripcionEventoId: p.inscripcionEventoId,
    monto: p.monto.toFixed(2),
    medio: p.medio,
    fechaPago: p.fechaPago.toISOString().slice(0, 10),
    estado: p.estado,
    tieneComprobante: p.comprobanteRuta !== null,
    comprobanteMime: p.comprobanteMime,
    creadoPor: p.creadoPorId ? (personas.get(p.creadoPorId) ?? null) : null,
    verificadoPor: p.verificadoPorId ? (personas.get(p.verificadoPorId) ?? null) : null,
    revisadoEn: p.revisadoEn?.toISOString() ?? null,
    motivoRechazo: p.motivoRechazo,
    createdAt: p.createdAt.toISOString(),
  };
}
