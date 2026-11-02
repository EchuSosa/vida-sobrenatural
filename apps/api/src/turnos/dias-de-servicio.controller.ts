import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { JwtNextAuthGuard } from '../auth/jwt-nextauth.guard.js';
import { PermisosGuard } from '../auth/permisos.guard.js';
import { RequierePermiso } from '../auth/permisos.decorator.js';
import type { AuthenticatedRequest } from '../auth/authenticated-request.js';
import { personaDeSesion } from '../discipulado/sesion.js';
import { DiasDeServicioService } from './dias-de-servicio.service.js';
import { CupoTurnoDto, NuevoDiaDeServicioDto } from './dto/dias-de-servicio.dto.js';

/** spec 017, US1 (D250, D251, D253): lo carga el Admin; el Pastor lo ve. */
@ApiTags('turnos')
@Controller()
@UseGuards(JwtNextAuthGuard, PermisosGuard)
@ApiBearerAuth()
export class DiasDeServicioController {
  constructor(private readonly dias: DiasDeServicioService) {}

  @Get('ministerios/:id/dias-de-servicio')
  @RequierePermiso('turnos.ver')
  @ApiOkResponse({ description: 'spec 017: DiasDeServicioDelMinisterio — reglas, cupos y las próximas fechas con su estado.' })
  vista(@Param('id') id: string) {
    return this.dias.vista(id);
  }

  @Post('ministerios/:id/dias-de-servicio')
  @RequierePermiso('turnos.gestionar')
  @ApiCreatedResponse({ description: 'spec 017 (D250): agrega una regla. 400 VALIDACION por campo; 409 DIA_DE_SERVICIO_REPETIDO.' })
  agregar(@Param('id') id: string, @Body() dto: NuevoDiaDeServicioDto, @Req() request: AuthenticatedRequest) {
    return this.dias.agregarRegla(id, dto, personaDeSesion(request));
  }

  @Delete('ministerios/:id/dias-de-servicio/:diaId')
  @HttpCode(200)
  @RequierePermiso('turnos.gestionar')
  @ApiOkResponse({ description: 'spec 017: quita una regla (queda inactiva, Principio III).' })
  quitar(@Param('id') id: string, @Param('diaId') diaId: string) {
    return this.dias.quitarRegla(id, diaId);
  }

  @Patch('ministerios/:id/cupo-turno')
  @RequierePermiso('turnos.gestionar')
  @ApiOkResponse({ description: 'spec 017 (D251): cupo del Ministerio sin Células. 400 CUPO_TURNO_INVALIDO.' })
  cupoMinisterio(@Param('id') id: string, @Body() dto: CupoTurnoDto) {
    return this.dias.cupoMinisterio(id, dto.cupo);
  }

  @Patch('celulas/:id/cupo-turno')
  @RequierePermiso('turnos.gestionar')
  @ApiOkResponse({ description: 'spec 017 (D251): cupo de una Célula (área). 400 CUPO_TURNO_INVALIDO.' })
  cupoCelula(@Param('id') id: string, @Body() dto: CupoTurnoDto) {
    return this.dias.cupoCelula(id, dto.cupo);
  }

  @Post('ministerios/:id/fechas/:dia/suspension')
  @RequierePermiso('turnos.gestionar')
  @ApiCreatedResponse({ description: 'spec 017 (US1-3): "este día no hay". 409 NO_ES_DIA_DE_SERVICIO o FECHA_YA_PASO.' })
  suspender(@Param('id') id: string, @Param('dia') dia: string, @Req() request: AuthenticatedRequest) {
    return this.dias.suspender(id, dia, personaDeSesion(request));
  }

  @Delete('ministerios/:id/fechas/:dia/suspension')
  @HttpCode(200)
  @RequierePermiso('turnos.gestionar')
  @ApiOkResponse({ description: 'spec 017: vuelve a habilitar la fecha.' })
  habilitar(@Param('id') id: string, @Param('dia') dia: string) {
    return this.dias.habilitar(id, dia);
  }
}
