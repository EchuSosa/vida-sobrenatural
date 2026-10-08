import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { RecordatoriosEventosService } from './recordatorios-eventos.service.js';

/** spec 012, T056 (FR-038, D202) — los recordatorios de Eventos, todos los días a las 8 de Argentina. */
@Injectable()
export class TareaRecordatoriosEventos {
  private readonly logger = new Logger('TareaRecordatoriosEventos');

  constructor(private readonly recordatorios: RecordatoriosEventosService) {}

  @Cron('0 8 * * *', { name: 'recordatorios-eventos', timeZone: 'America/Argentina/Buenos_Aires' })
  async correr(): Promise<void> {
    try {
      await this.recordatorios.correr();
    } catch {
      this.logger.warn({ tipo: 'VUELTA_FALLIDA' });
    }
  }
}
