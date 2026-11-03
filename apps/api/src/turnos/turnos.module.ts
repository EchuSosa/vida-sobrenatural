import { Module } from '@nestjs/common';
import { DiasDeServicioController } from './dias-de-servicio.controller.js';
import { DiasDeServicioService } from './dias-de-servicio.service.js';
import { TurnosController } from './turnos.controller.js';
import { TurnosService } from './turnos.service.js';
import { RecordatoriosTurnosService } from './recordatorios-turnos.service.js';
import { TareaRecordatoriosTurnos } from './tarea-recordatorios-turnos.js';

/**
 * spec 017 — turnos de servicio. Entrega 1: días de servicio y cupos (US1). Entrega 2: la grilla,
 * publicar, avisos, recordatorio y "mis turnos" (US2, US3). El `@Cron` solo corre con el
 * planificador encendido (`TareasProgramadasModule`).
 */
@Module({
  controllers: [TurnosController, DiasDeServicioController],
  providers: [DiasDeServicioService, TurnosService, RecordatoriosTurnosService, TareaRecordatoriosTurnos],
  exports: [DiasDeServicioService, TurnosService, RecordatoriosTurnosService],
})
export class TurnosModule {}
