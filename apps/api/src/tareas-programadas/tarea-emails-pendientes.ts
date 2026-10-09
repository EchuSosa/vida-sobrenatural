import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { EnvioEmailsService } from '../notificaciones/envio-emails.service.js';

/**
 * spec 012, T043 (FR-022) — la red de seguridad del envío de mails: cada 30 s
 * manda lo pendiente que ya venció (reintentos, y lo que nadie empujó). Con el
 * planificador apagado, el decorador no hace nada.
 */
@Injectable()
export class TareaEmailsPendientes {
  private readonly logger = new Logger('TareaEmailsPendientes');

  constructor(private readonly envio: EnvioEmailsService) {}

  @Interval('emails-pendientes', 30_000)
  async correr(): Promise<void> {
    try {
      await this.envio.procesarPendientes();
    } catch {
      this.logger.warn({ tipo: 'VUELTA_FALLIDA' });
    }
  }
}
