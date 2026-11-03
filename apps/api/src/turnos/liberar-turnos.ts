import { hoyEnArgentina } from '@vida-sobrenatural/shared-types';
import type { Prisma } from '../generated/prisma/client.js';
import type { NotificacionesService } from '../notificaciones/notificaciones.service.js';
import { datosAvisoTurno } from './avisos-turno.js';

/**
 * spec 017, casos borde (T023): una persona deja de ser integrante de un Ministerio (baja o cambio
 * de Ministerio, D241). Sus turnos de hoy en adelante quedan "quitados" — la celda vuelve a decir
 * "Falta…" — y, si la fecha estaba publicada, cada líder vigente recibe el aviso de que falta
 * cubrir un lugar. Va en la transacción de la baja (D197). Devuelve cuántos turnos liberó.
 */
export async function liberarTurnosFuturos(
  tx: Prisma.TransactionClient,
  notificaciones: NotificacionesService,
  args: { personaId: string; ministerioId: string; autorId: string },
  hoy: string = hoyEnArgentina(),
): Promise<number> {
  const turnos = await tx.turno.findMany({
    where: {
      personaId: args.personaId,
      estado: 'asignado',
      fecha: { ministerioId: args.ministerioId, dia: { gte: new Date(`${hoy}T00:00:00.000Z`) }, estado: { not: 'suspendida' } },
    },
    select: { id: true, celula: { select: { nombre: true } }, fecha: { select: { dia: true, estado: true, ministerio: { select: { id: true, nombre: true } } } } },
  });
  if (turnos.length === 0) return 0;
  await tx.turno.updateMany({ where: { id: { in: turnos.map((t) => t.id) } }, data: { estado: 'quitado', cerradoPorId: args.autorId, cerradoEn: new Date() } });
  const publicados = turnos.filter((t) => t.fecha.estado === 'publicada');
  if (publicados.length > 0) {
    const lideres = await tx.liderMinisterio.findMany({ where: { ministerioId: args.ministerioId, hasta: null, personaId: { not: args.personaId } }, select: { personaId: true } });
    for (const t of publicados) {
      const dia = t.fecha.dia.toISOString().slice(0, 10);
      for (const l of lideres) {
        await notificaciones.emitir(tx, { nombre: 'turno.no_puede', a: { tipo: 'persona', personaId: l.personaId }, datos: datosAvisoTurno(t.id, t.fecha.ministerio, dia, t.celula?.nombre ?? null) });
      }
    }
  }
  return turnos.length;
}
