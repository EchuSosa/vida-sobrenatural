import { Injectable } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client.js';
import { NotificacionesService } from '../notificaciones/notificaciones.service.js';
import { bloquearSolicitudes } from './estado-bautismo.js';
import { SOLICITUD_TX_SELECT, sacarDeEvento } from './operaciones.js';

/**
 * spec 010 — Bautismo. Los dos hooks que llaman OTRAS specs, con la firma
 * que dejó el lote 0 global (`contracts/bautismo-api.md`). Corren DENTRO de
 * la transacción de quien llama; los avisos se emiten ahí mismo con
 * `NotificacionesService.emitir(tx, …)` (D197): si la transacción se
 * deshace, no queda nada.
 */
@Injectable()
export class BautismoService {
  constructor(private readonly notificaciones: NotificacionesService) {}

  /**
   * spec 011 (E7, FR-016, FR-026, T035): al cancelar un Evento de bautismo,
   * en SU transacción (que ya bloqueó el Evento). Las Solicitudes `aprobada`
   * asignadas vuelven a "esperando fecha": su inscripción se cancela y la FK
   * queda en `null`. Un aviso `bautismo.evento_cancelado` por Persona. Las
   * `realizada` no se tocan (ya se bautizaron).
   */
  async liberarAsignacionesDeEvento(tx: Prisma.TransactionClient, eventoId: string): Promise<void> {
    const asignadas = await tx.solicitudBautismo.findMany({
      where: { estado: 'aprobada', inscripcionEvento: { eventoId } },
      select: { id: true },
    });
    if (asignadas.length === 0) return;
    await bloquearSolicitudes(tx, asignadas.map((s) => s.id));
    const evento = await tx.evento.findUnique({ where: { id: eventoId }, select: { canceladoPorId: true } });
    const solicitudes = await tx.solicitudBautismo.findMany({
      where: { id: { in: asignadas.map((s) => s.id) }, estado: 'aprobada', inscripcionEvento: { eventoId } },
      orderBy: { id: 'asc' },
      select: SOLICITUD_TX_SELECT,
    });
    for (const solicitud of solicitudes) {
      await sacarDeEvento(tx, solicitud, evento?.canceladoPorId ?? null, 'admin');
      await this.notificaciones.emitir(tx, {
        nombre: 'bautismo.evento_cancelado',
        a: { tipo: 'persona', personaId: solicitud.personaId },
        datos: { solicitudId: solicitud.id, eventoId },
      });
    }
  }

  /**
   * spec 006 (H3, T061): al confirmar que la Persona ya se bautizó (una
   * declaración "Ya lo hice" o la etapa registrada por el Admin), en SU
   * transacción. Si tiene una Solicitud abierta, pasa a `retirada` (y sale
   * de su Evento): no se puede estar esperando fecha y ya bautizada. Sin
   * aviso: la Persona recibe el de la confirmación.
   */
  async retirarPorDeclaracion(tx: Prisma.TransactionClient, personaId: string): Promise<void> {
    const abierta = await tx.solicitudBautismo.findFirst({ where: { personaId, estado: { in: ['pendiente', 'aprobada'] } }, select: { id: true } });
    if (!abierta) return;
    await bloquearSolicitudes(tx, [abierta.id]);
    const solicitud = await tx.solicitudBautismo.findUnique({ where: { id: abierta.id }, select: SOLICITUD_TX_SELECT });
    if (!solicitud || (solicitud.estado !== 'pendiente' && solicitud.estado !== 'aprobada')) return;
    await sacarDeEvento(tx, solicitud, null, 'admin');
    await tx.solicitudBautismo.update({ where: { id: solicitud.id }, data: { estado: 'retirada', retiradaEn: new Date() } });
  }
}
