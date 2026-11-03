import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { BajaPersonaService } from './baja-persona.service.js';

/** spec 018 (FR-004): reintenta borrar los comprobantes de una baja que no se pudieron borrar al momento. */
@Injectable()
export class TareaArchivosDeBaja {
  private readonly logger = new Logger('TareaArchivosDeBaja');

  constructor(private readonly baja: BajaPersonaService) {}

  @Cron('20 3 * * *', { name: 'archivos-de-baja', timeZone: 'America/Argentina/Buenos_Aires' })
  async correr(): Promise<void> {
    try {
      await this.baja.reintentarArchivos();
    } catch {
      this.logger.warn({ tipo: 'VUELTA_FALLIDA' });
    }
  }
}
