import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CUMPLEANOS_PAGINA, hoyEnArgentina } from '@vida-sobrenatural/shared-types';
import { JwtNextAuthGuard } from '../auth/jwt-nextauth.guard.js';
import { PermisosGuard } from '../auth/permisos.guard.js';
import { RequierePermiso } from '../auth/permisos.decorator.js';
import { CumpleanosService } from './cumpleanos.service.js';
import { CumpleanosMesDto } from './dto/cumpleanos-mes.dto.js';

/** spec 013, Historia 4 (T050): cumpleaños del mes y de la semana. */
@ApiTags('inicio')
@Controller()
@UseGuards(JwtNextAuthGuard, PermisosGuard)
@ApiBearerAuth()
export class CumpleanosController {
  constructor(private readonly cumpleanos: CumpleanosService) {}

  @Get('personas/cumpleanos')
  @RequierePermiso('personas.ver')
  @ApiOkResponse({ description: 'spec 013, FR-030, FR-032: `Pagina<Cumpleanero>` de las Personas activas que cumplen en `mes` (del año en curso), por día y apellido. 400 VALIDACION si `mes` no es 1..12.' })
  delMes(@Query() q: CumpleanosMesDto) {
    return this.cumpleanos.delMes(q.mes ?? Number(hoyEnArgentina().slice(5, 7)), q.skip ?? 0, q.take ?? CUMPLEANOS_PAGINA);
  }

  @Get('inicio/cumpleanos-semana')
  @RequierePermiso('inicio.ver')
  @ApiOkResponse({ description: 'spec 013, FR-031: hoy y los próximos 7 días (cruza fin de mes y de año), hasta 50 con `hayMas`.' })
  deLaSemana() {
    return this.cumpleanos.deLaSemana();
  }
}
