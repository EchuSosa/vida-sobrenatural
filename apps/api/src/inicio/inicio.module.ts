import { Module } from '@nestjs/common';
import { InicioController } from './inicio.controller.js';
import { MetricasService } from './metricas.service.js';

/**
 * spec 013 — lo que muestra el Inicio del backoffice: métricas
 * (`GET /inicio/metricas`, lote 3) y cumpleaños (lote 4).
 */
@Module({
  controllers: [InicioController],
  providers: [MetricasService],
})
export class InicioModule {}
