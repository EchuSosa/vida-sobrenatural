import { Body, Controller, Delete, Get, HttpCode, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { JwtNextAuthGuard } from '../auth/jwt-nextauth.guard.js';
import type { AuthenticatedRequest } from '../auth/authenticated-request.js';
import { personaDeSesion } from '../discipulado/sesion.js';
import { TurnosService } from './turnos.service.js';
import { AsignarTurnoDto } from './dto/turnos.dto.js';

/**
 * spec 017, US2 y US3. Sin permiso del catálogo en el guard: quién puede lo resuelve el servicio
 * contra la base (líder vigente de ESE Ministerio, o `turnos.gestionar` / `turnos.ver`, D253).
 * `turnos/me` va antes que `turnos/:id`.
 */
@ApiTags('turnos')
@Controller()
@UseGuards(JwtNextAuthGuard)
@ApiBearerAuth()
export class TurnosController {
  constructor(private readonly turnos: TurnosService) {}

  @Get('turnos/me')
  @ApiOkResponse({ description: 'spec 017 (US3): MiTurno[] — los turnos publicados y futuros de la persona de la sesión.' })
  mios(@Req() request: AuthenticatedRequest) {
    return this.turnos.misTurnos(personaDeSesion(request));
  }

  @Get('ministerios/:id/turnos')
  @ApiOkResponse({ description: 'spec 017 (US2): GrillaDeTurnos. 403 si no lo lidera ni es Admin o Pastor; 404 si no está activo.' })
  grilla(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.turnos.grilla(id, request.user);
  }

  @Post('ministerios/:id/fechas/:dia/turnos')
  @ApiCreatedResponse({
    description:
      'spec 017 (D255): TurnoAsignado, con `advertencias` si ese día sirve en otro Ministerio. 400 AREA_INVALIDA (campo celulaId); 409 NO_ES_INTEGRANTE, YA_TIENE_TURNO_ESE_DIA (campo personaId), FECHA_SUSPENDIDA, FECHA_YA_PASO, NO_ES_DIA_DE_SERVICIO.',
  })
  asignar(@Param('id') id: string, @Param('dia') dia: string, @Body() dto: AsignarTurnoDto, @Req() request: AuthenticatedRequest) {
    return this.turnos.asignar(id, dia, dto, request.user);
  }

  @Delete('turnos/:id')
  @HttpCode(200)
  @ApiOkResponse({ description: 'spec 017: saca a la persona del turno (queda "quitado"); si la fecha estaba publicada, le avisa.' })
  quitar(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.turnos.quitar(id, request.user);
  }

  @Post('ministerios/:id/fechas/:dia/copiar-anterior')
  @HttpCode(200)
  @ApiOkResponse({ description: 'spec 017 (US2-4): { copiados }. 409 SIN_FECHA_ANTERIOR.' })
  copiar(@Param('id') id: string, @Param('dia') dia: string, @Req() request: AuthenticatedRequest) {
    return this.turnos.copiarAnterior(id, dia, request.user);
  }

  @Post('ministerios/:id/fechas/:dia/publicacion')
  @HttpCode(200)
  @ApiOkResponse({ description: 'spec 017 (D256): publica y avisa una sola vez. { dia, estado, avisados }. 409 FECHA_SUSPENDIDA.' })
  publicar(@Param('id') id: string, @Param('dia') dia: string, @Req() request: AuthenticatedRequest) {
    return this.turnos.publicar(id, dia, request.user);
  }
}
