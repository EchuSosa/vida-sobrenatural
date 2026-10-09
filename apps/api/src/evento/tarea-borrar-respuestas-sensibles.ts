import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { BorradoRespuestasSensiblesService } from './borrado-respuestas-sensibles.service.js';

/**
 * spec 011, ampliación 2026-10-09 (FR-069, D222) — todos los días a las 3 de
 * Argentina. Con `TAREAS_PROGRAMADAS=false` no corre sola (tests); a mano:
 * `pnpm --filter api run tareas:correr respuestas-sensibles`.
 */
@Injectable()
export class TareaBorrarRespuestasSensibles {
  private readonly logger = new Logger('TareaBorrarRespuestasSensibles');

  constructor(private readonly borrado: BorradoRespuestasSensiblesService) {}

  @Cron('0 3 * * *', { name: 'borrar-respuestas-sensibles', timeZone: 'America/Argentina/Buenos_Aires' })
  async correr(): Promise<void> {
    try {
      const r = await this.borrado.correr();
      this.logger.log({ tipo: 'RESPUESTAS_SENSIBLES_BORRADAS', eventos: r.eventos, respuestas: r.respuestas });
    } catch {
      this.logger.warn({ tipo: 'VUELTA_FALLIDA' });
    }
  }
}
