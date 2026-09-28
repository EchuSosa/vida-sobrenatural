import { Injectable, Logger } from '@nestjs/common';
import type { EventoDiscipulado } from '@vida-sobrenatural/shared-types';

/**
 * specs/004, FR-023/FR-048 (contracts/eventos.md): la costura para el sistema
 * de notificaciones futuro. Cada transición llama a esto DESPUÉS de confirmar
 * su transacción; hoy solo se loguea, sin datos personales (Principio X: solo
 * el nombre del evento, el tipo de destinatario y los ids que ya trae `datos`).
 * Cuando exista Notificaciones, esta función es el único enchufe.
 */
@Injectable()
export class EventosDiscipuladoService {
  private readonly logger = new Logger('EventosDiscipulado');

  emitir(evento: EventoDiscipulado): void {
    this.logger.log({ evento: evento.nombre, destinatario: evento.a.tipo, ...evento.datos });
  }
}
