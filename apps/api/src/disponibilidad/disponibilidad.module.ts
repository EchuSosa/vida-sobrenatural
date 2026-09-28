import { Module } from '@nestjs/common';
import { DisponibilidadController } from './disponibilidad.controller.js';
import { DisponibilidadService } from './disponibilidad.service.js';

/**
 * specs/004-vida-nueva-discipulado, Historia 4 (lote C): la agenda, el toggle,
 * el máximo por Grupo y los períodos de no disponibilidad del Discipulador
 * (contracts/disponibilidad-api.md). El cruce (discipulado/cruce.service.ts)
 * lee las mismas tablas por su cuenta; este módulo no exporta nada.
 */
@Module({
  controllers: [DisponibilidadController],
  providers: [DisponibilidadService],
})
export class DisponibilidadModule {}
