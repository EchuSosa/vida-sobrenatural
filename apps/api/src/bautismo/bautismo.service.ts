import { Injectable } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client.js';

/**
 * spec 010 — Bautismo. Lote 0 global: los dos hooks que llaman OTRAS specs,
 * con su firma definitiva (`contracts/bautismo-api.md`). Mientras la 010 no
 * los implemente no puede haber Solicitudes de Bautismo, así que no hacer
 * nada es el comportamiento correcto. Los avisos que generen se emiten
 * adentro, con `NotificacionesService.emitir(tx, …)` (D197).
 */
@Injectable()
export class BautismoService {
  /** spec 011 (E7, FR-016): al cancelar o desactivar un Evento de bautismo, en SU transacción. */
  async liberarAsignacionesDeEvento(_tx: Prisma.TransactionClient, _eventoId: string): Promise<void> {
    // La 010 (lote C) lo implementa.
  }

  /** spec 006 (H3): al confirmar una declaración "Ya me bauticé", en SU transacción. */
  async retirarPorDeclaracion(_tx: Prisma.TransactionClient, _personaId: string): Promise<void> {
    // La 010 lo implementa (T061).
  }
}
