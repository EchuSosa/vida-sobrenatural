import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { RecordatoriosTurnosService } from './recordatorios-turnos.service.js';

/** spec 017 (D256): los recordatorios de turnos, todos los días a las 8:10 de Argentina (después de los de Eventos). */
@Injectable()
export class TareaRecordatoriosTurnos {
  private readonly logger = new Logger('TareaRecordatoriosTurnos');

  constructor(private readonly recordatorios: RecordatoriosTurnosService) {}

  @Cron('10 8 * * *', { name: 'recordatorios-turnos', timeZone: 'America/Argentina/Buenos_Aires' })
  async correr(): Promise<void> {
    try {
      await this.recordatorios.correr();
    } catch {
      this.logger.warn({ tipo: 'VUELTA_FALLIDA' });
    }
  }
}
