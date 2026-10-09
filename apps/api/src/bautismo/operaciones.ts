import { COMENTARIO_BAUTISMO_MAX, errorTalleRemera, type TalleRemera } from '@vida-sobrenatural/shared-types';
import type { Prisma } from '../generated/prisma/client.js';
import { AppException } from '../common/errors/app-exception.js';
import { errorDeValidacion } from '../discipulado/validaciones.js';
import { cancelarInscripcionBautismo, inscribirEnBautismo } from '../evento/inscripcion-bautismo.js';
import type { NotificacionesService } from '../notificaciones/notificaciones.service.js';

/**
 * spec 010 — piezas de transacción que comparten los lotes A, B y C (pedir,
 * asignar, quitar, retirar). Funciones sin DI: cada servicio les pasa su
 * `tx` (research #10: todo chequeo de estado va DENTRO de la transacción).
 */

/** FR-001/FR-022: opcional, hasta 500. Vacío = sin comentario. */
export function normalizarComentarioBautismo(comentario: string | undefined | null): string | null {
  const limpio = comentario?.trim() ?? '';
  if (limpio.length > COMENTARIO_BAUTISMO_MAX) throw errorDeValidacion([{ campo: 'comentario', code: 'COMENTARIO_DEMASIADO_LARGO' }]);
  return limpio === '' ? null : limpio;
}

/**
 * FR-001/FR-022 + D220: los datos de un pedido nuevo (la Persona o en su
 * nombre). Junta los errores de los dos campos en una sola respuesta, para
 * que el formulario los marque a la vez (H-50).
 */
export function normalizarPedidoBautismo(comentario: string | undefined | null, talle: unknown): { comentario: string | null; talleRemera: TalleRemera } {
  const errores: Array<{ campo: string; code: string }> = [];
  const codigoTalle = errorTalleRemera(talle);
  if (codigoTalle) errores.push({ campo: 'talleRemera', code: codigoTalle });
  let limpio: string | null = null;
  try {
    limpio = normalizarComentarioBautismo(comentario);
  } catch {
    errores.unshift({ campo: 'comentario', code: 'COMENTARIO_DEMASIADO_LARGO' });
  }
  if (errores.length > 0) throw errorDeValidacion(errores);
  return { comentario: limpio, talleRemera: talle as TalleRemera };
}

export function yaCambio(): AppException {
  return new AppException('SOLICITUD_BAUTISMO_YA_CAMBIO', 409, 'Este pedido ya cambió: actualizá la pantalla.');
}

export function yaAbierta(): AppException {
  return new AppException('SOLICITUD_BAUTISMO_YA_ABIERTA', 409, 'Ya hay un pedido de bautismo abierto para esta Persona.');
}

export function yaBautizada(): AppException {
  return new AppException('PERSONA_YA_BAUTIZADA', 409, 'Esta Persona ya figura como bautizada.');
}

/** P2002: el índice parcial `solicitudes_bautismo_una_abierta` (FR-004, dos pedidos a la vez). */
export function esViolacionDeUnicidad(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { code?: unknown }).code === 'P2002';
}

/**
 * FR-012: bloquea el Evento (el mismo orden que la cancelación de la 011:
 * primero el Evento, después las Solicitudes) y exige que sea de bautismo,
 * publicado, no eliminado y futuro. Devuelve su inicio.
 */
export async function exigirEventoAsignable(tx: Prisma.TransactionClient, eventoId: string, ahora = new Date()): Promise<{ inicio: Date }> {
  await tx.$queryRaw`SELECT "id" FROM "eventos" WHERE "id" = ${eventoId} FOR UPDATE`;
  const evento = await tx.evento.findFirst({ where: { id: eventoId, eliminadoEn: null }, select: { tipo: true, estado: true, inicio: true } });
  if (!evento) throw new AppException('NO_ENCONTRADO', 404, 'No existe ese Evento.');
  if (evento.tipo !== 'bautismo') throw new AppException('EVENTO_NO_ES_DE_BAUTISMO', 409, 'Ese Evento no es de bautismo.');
  if (evento.estado !== 'publicado' || evento.inicio <= ahora) {
    throw new AppException('EVENTO_NO_DISPONIBLE_PARA_ASIGNAR', 409, 'Ese Evento está cancelado o ya empezó.');
  }
  return { inicio: evento.inicio };
}

/** Lo que las transiciones leen de una Solicitud ya bloqueada. */
export const SOLICITUD_TX_SELECT = {
  id: true,
  personaId: true,
  estado: true,
  inscripcionEventoId: true,
  inscripcionEvento: { select: { id: true, eventoId: true, estado: true, evento: { select: { inicio: true } } } },
} as const satisfies Prisma.SolicitudBautismoSelect;

export type SolicitudTx = Prisma.SolicitudBautismoGetPayload<{ select: typeof SOLICITUD_TX_SELECT }>;

/**
 * FR-012, FR-013, FR-017: asigna una Solicitud `aprobada` (ya bloqueada) a un
 * Evento asignable (ya validado con `exigirEventoAsignable`). Si estaba en
 * otro Evento, cancela esa inscripción en la misma operación. La asignación
 * ES una Inscripción a Evento `confirmada` creada por el Admin (E5), así el
 * recordatorio de la 012 le llega sin caso especial. Si la Persona ya tenía
 * una Inscripción abierta a ese Evento (la anotó el Admin por la vía
 * genérica de la 011), se reusa. Devuelve `false` si ya estaba en ese Evento.
 */
export async function asignarAEvento(
  tx: Prisma.TransactionClient,
  notificaciones: NotificacionesService,
  solicitud: SolicitudTx,
  evento: { id: string; inicio: Date },
  actorId: string,
): Promise<boolean> {
  if (solicitud.estado !== 'aprobada') throw yaCambio();
  const actual = solicitud.inscripcionEvento;
  if (actual && actual.estado !== 'cancelada' && actual.eventoId === evento.id) return false;
  if (actual && actual.estado !== 'cancelada') {
    await cancelarInscripcionBautismo(tx, { inscripcionId: actual.id, canceladaPorId: actorId, motivo: 'admin' });
  }
  const existente = await tx.inscripcionEvento.findFirst({
    where: { eventoId: evento.id, personaId: solicitud.personaId, estado: { in: ['confirmada', 'pendiente', 'lista_espera'] }, solicitudBautismo: null },
    select: { id: true, estado: true },
  });
  let inscripcionId: string;
  if (existente) {
    if (existente.estado !== 'confirmada') {
      await tx.inscripcionEvento.update({ where: { id: existente.id }, data: { estado: 'confirmada', enListaDesde: null } });
    }
    inscripcionId = existente.id;
  } else {
    ({ inscripcionId } = await inscribirEnBautismo(tx, { eventoId: evento.id, personaId: solicitud.personaId, creadoPorId: actorId }));
  }
  await tx.solicitudBautismo.update({ where: { id: solicitud.id }, data: { inscripcionEventoId: inscripcionId } });
  await notificaciones.emitir(tx, {
    nombre: 'bautismo.fecha_asignada',
    a: { tipo: 'persona', personaId: solicitud.personaId },
    datos: { solicitudId: solicitud.id, eventoId: evento.id, fecha: evento.inicio.toISOString() },
  });
  return true;
}

/**
 * FR-015, FR-016, FR-020, FR-020a: saca a la Solicitud de su Evento — cancela
 * la inscripción (D69: no se borra) y la FK queda en `null`. No avisa: quien
 * llama decide (la Persona no recibe aviso de lo que hizo ella, FR-025).
 * Devuelve el Evento del que salió, o `null` si no tenía.
 */
export async function sacarDeEvento(
  tx: Prisma.TransactionClient,
  solicitud: SolicitudTx,
  canceladaPorId: string | null,
  motivo: 'persona' | 'admin',
): Promise<string | null> {
  const actual = solicitud.inscripcionEvento;
  if (!actual) return null;
  if (actual.estado !== 'cancelada') {
    await tx.inscripcionEvento.updateMany({
      where: { id: actual.id, estado: { not: 'cancelada' } },
      data: { estado: 'cancelada', canceladaEn: new Date(), canceladaPorId, motivoCancelacion: motivo },
    });
  }
  await tx.solicitudBautismo.update({ where: { id: solicitud.id }, data: { inscripcionEventoId: null } });
  return actual.eventoId;
}
