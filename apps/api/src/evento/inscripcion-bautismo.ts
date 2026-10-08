import type { Prisma } from '../generated/prisma/client.js';
import { AppException } from '../common/errors/app-exception.js';

/**
 * Lote 0 global — la operación E5 del contrato de la 010 con la 011
 * (`specs/010-bautismo/contracts/dependencia-evento.md`): inscribir a una
 * Persona en un Evento de BAUTISMO salteando cupo y aprobación, y cancelarla.
 * La 010 las llama dentro de SU transacción; ninguna otra vía toca estas
 * inscripciones (E6). Viven en la carpeta de la 011 (dueña de la tabla), pero
 * ya están implementadas para que la 010 no espere a que la 011 mergee.
 */
export async function inscribirEnBautismo(
  tx: Prisma.TransactionClient,
  args: { eventoId: string; personaId: string; creadoPorId: string },
): Promise<{ inscripcionId: string }> {
  const evento = await tx.evento.findFirst({
    where: { id: args.eventoId, eliminadoEn: null },
    select: { tipo: true, estado: true, inicio: true },
  });
  if (!evento || evento.tipo !== 'bautismo') throw new AppException('EVENTO_NO_ES_DE_BAUTISMO', 422, 'El Evento no es de bautismo.');
  if (evento.estado !== 'publicado' || evento.inicio <= new Date()) {
    throw new AppException('EVENTO_NO_DISPONIBLE_PARA_ASIGNAR', 409, 'El Evento está cancelado o ya empezó.');
  }
  const inscripcion = await tx.inscripcionEvento.create({
    data: { eventoId: args.eventoId, personaId: args.personaId, estado: 'confirmada', creadoPorId: args.creadoPorId },
    select: { id: true },
  });
  return { inscripcionId: inscripcion.id };
}

/** Cancela una inscripción de bautismo (la Persona "no puede" o el Admin le quita la fecha). */
export async function cancelarInscripcionBautismo(
  tx: Prisma.TransactionClient,
  args: { inscripcionId: string; canceladaPorId: string; motivo: 'persona' | 'admin' },
): Promise<void> {
  await tx.inscripcionEvento.updateMany({
    where: { id: args.inscripcionId, estado: { not: 'cancelada' } },
    data: { estado: 'cancelada', canceladaEn: new Date(), canceladaPorId: args.canceladaPorId, motivoCancelacion: args.motivo },
  });
}
