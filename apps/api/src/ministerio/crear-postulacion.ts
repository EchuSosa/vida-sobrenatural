import type { NuevaPostulacion } from '@vida-sobrenatural/shared-types';
import type { Prisma } from '../generated/prisma/client.js';
import { AppException } from '../common/errors/app-exception.js';
import type { NotificacionesService } from '../notificaciones/notificaciones.service.js';
import { bloquearPersona } from '../camino/consultas.js';
import {
  excepcionDe,
  textoOpcional,
  validarNuevaPostulacion,
} from './reglas-postulacion.js';

/** Postgres 23505 (o Prisma P2002): la violación de un índice único. */
export function esViolacionDeUnico(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const e = error as {
    code?: unknown;
    meta?: { code?: unknown };
    cause?: { code?: unknown };
  };
  return (
    e.code === 'P2002' ||
    e.code === '23505' ||
    e.meta?.code === '23505' ||
    e.cause?.code === '23505'
  );
}

/**
 * spec 009 (FR-001 a FR-007, FR-024): crear una Postulación — la misma para la
 * Persona (`creadoPorId = null`) y para el Admin en nombre de ella. Bloquea la
 * fila de la Persona (patrón research #5) para que dos pedidos simultáneos se
 * serialicen; el índice `postulaciones_una_pendiente` queda de garantía final
 * y su violación se traduce a 409, nunca a 500 (SC-003). El aviso al Admin
 * viaja dentro de la transacción (D197).
 */
export async function crearPostulacion(
  db: {
    $transaction: <T>(
      fn: (tx: Prisma.TransactionClient) => Promise<T>,
    ) => Promise<T>;
  },
  notificaciones: NotificacionesService,
  personaId: string,
  ministerioId: string,
  dto: NuevaPostulacion,
  creadoPorId: string | null,
): Promise<string> {
  const motivacion = textoOpcional(dto.motivacion);
  const disponibilidad = textoOpcional(dto.disponibilidad);
  const celulaId = dto.celulaId ? dto.celulaId : null;
  try {
    return await db.$transaction(async (tx) => {
      if (!(await bloquearPersona(tx, personaId)))
        throw new AppException(
          'NO_ENCONTRADO',
          404,
          'No existe una Persona con ese id.',
        );
      const [persona, ministerio, celula, aprobada, pendiente] =
        await Promise.all([
          tx.persona.findUniqueOrThrow({
            where: { id: personaId },
            select: { estado: true, activo: true, rol: true },
          }),
          tx.ministerio.findFirst({
            where: { id: ministerioId, eliminadoEn: null },
            select: { id: true, activo: true, requiereFormacion: true },
          }),
          celulaId
            ? tx.celula.findFirst({
                where: { id: celulaId, eliminadoEn: null },
                select: { ministerioId: true, activo: true },
              })
            : Promise.resolve(undefined),
          tx.postulacion.findFirst({
            where: { personaId, estado: 'aprobada' },
            select: { ministerioId: true },
          }),
          tx.postulacion.findFirst({
            where: { personaId, estado: 'pendiente' },
            select: { id: true },
          }),
        ]);
      const fallo = validarNuevaPostulacion({
        persona: {
          activa: persona.activo && persona.estado === 'activa',
          roles: persona.rol,
        },
        ministerio,
        ...(celulaId ? { celula: celula ?? null } : {}),
        motivacion,
        disponibilidad,
        ministerioAprobadoId: aprobada?.ministerioId ?? null,
        tienePendiente: pendiente !== null,
      });
      if (fallo) throw excepcionDe(fallo);

      const creada = await tx.postulacion.create({
        data: {
          personaId,
          ministerioId,
          celulaId,
          motivacion,
          disponibilidad,
          creadoPorId,
          requiereFormacion: ministerio!.requiereFormacion,
        },
        select: { id: true },
      });
      await notificaciones.emitir(tx, {
        nombre: 'ministerio.postulacion_creada',
        a: { tipo: 'admin' },
        datos: {
          postulacionId: creada.id,
          ministerioId,
          enNombreDe: creadoPorId !== null,
        },
      });
      return creada.id;
    });
  } catch (error) {
    if (esViolacionDeUnico(error)) {
      throw new AppException(
        'POSTULACION_YA_PENDIENTE',
        409,
        'Ya hay una postulación en revisión.',
      );
    }
    throw error;
  }
}
