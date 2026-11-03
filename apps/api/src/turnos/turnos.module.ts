import { Module } from '@nestjs/common';
import { DiasDeServicioController } from './dias-de-servicio.controller.js';
import { DiasDeServicioService } from './dias-de-servicio.service.js';

/** spec 017 — turnos de servicio. Entrega 1: días de servicio y cupos (US1). */
@Module({
  controllers: [DiasDeServicioController],
  providers: [DiasDeServicioService],
  exports: [DiasDeServicioService],
})
export class TurnosModule {}
