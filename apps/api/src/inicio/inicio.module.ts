import { Module } from '@nestjs/common';
import { InicioController } from './inicio.controller.js';
import { MetricasService } from './metricas.service.js';
import { CumpleanosController } from './cumpleanos.controller.js';
import { CumpleanosService } from './cumpleanos.service.js';

/**
 * spec 013 — lo que muestra el Inicio del backoffice: métricas
 * (`GET /inicio/metricas`, lote 3) y cumpleaños (lote 4).
 */
@Module({
  controllers: [InicioController, CumpleanosController],
  providers: [MetricasService, CumpleanosService],
})
export class InicioModule {}
