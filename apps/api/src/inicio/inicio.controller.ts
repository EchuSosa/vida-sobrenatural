import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { JwtNextAuthGuard } from '../auth/jwt-nextauth.guard.js';
import { PermisosGuard } from '../auth/permisos.guard.js';
import { RequierePermiso } from '../auth/permisos.decorator.js';
import { MetricasService } from './metricas.service.js';

/** spec 013, Historia 3: lo que muestra el Inicio del backoffice (contracts/inicio-api.md). */
@ApiTags('inicio')
@Controller('inicio')
@UseGuards(JwtNextAuthGuard, PermisosGuard)
@ApiBearerAuth()
export class InicioController {
  constructor(private readonly metricas: MetricasService) {}

  @Get('metricas')
  @RequierePermiso('inicio.ver')
  @ApiOkResponse({ description: 'spec 013, FR-022–FR-025: Personas activas, por tiempo congregándose (los cuatro rangos de D214, en orden) y por Sede (no eliminadas, con `activa`).' })
  obtenerMetricas() {
    return this.metricas.metricas();
  }
}
