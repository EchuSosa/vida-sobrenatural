import { Body, Controller, Delete, Get, HttpCode, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { JwtNextAuthGuard } from '../auth/jwt-nextauth.guard.js';
import { PermisosGuard } from '../auth/permisos.guard.js';
import { RequierePermiso } from '../auth/permisos.decorator.js';
import type { AuthenticatedRequest } from '../auth/authenticated-request.js';
import { AppException } from '../common/errors/app-exception.js';
import { personaDeSesion } from '../discipulado/sesion.js';
import { LideresMinisterioService } from './lideres.service.js';
import { AsignarLiderDto } from './dto/postulacion.dto.js';

/**
 * spec 016 (D244): los líderes de un Ministerio. Va registrado ANTES de
 * `MinisterioController`: `/ministerios/liderados` tiene que ganarle a
 * `/ministerios/:id`. Lo del líder no lleva permiso del catálogo (la Persona
 * es la de la sesión, D134): la pertenencia la resuelve el servicio contra la
 * base (D226, límite de D132).
 */
@ApiTags('ministerios')
@Controller()
@UseGuards(JwtNextAuthGuard)
@ApiBearerAuth()
export class LideresMinisterioController {
  constructor(private readonly lideres: LideresMinisterioService) {}

  @Get('ministerios/liderados')
  @ApiOkResponse({ description: 'spec 016: MinisterioLiderado[] — los Ministerios activos que lidera la persona de la sesión.' })
  liderados(@Req() request: AuthenticatedRequest) {
    return this.lideres.liderados(personaActiva(request));
  }

  @Get('ministerios/liderados/:id')
  @ApiOkResponse({ description: 'spec 016: MinisterioLideradoDetalle — el equipo por área, con contacto. 404 si no lo lidera.' })
  liderado(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.lideres.lideradoDetalle(personaActiva(request), id);
  }

  @Get('ministerios/:id/lideres')
  @UseGuards(PermisosGuard)
  @RequierePermiso('ministerios.ver')
  @ApiOkResponse({ description: 'spec 016: LiderMinisterioVista[] vigentes, por apellido.' })
  listar(@Param('id') id: string) {
    return this.lideres.listar(id);
  }

  @Post('ministerios/:id/lideres')
  @UseGuards(PermisosGuard)
  @RequierePermiso('ministerios.gestionar')
  @ApiCreatedResponse({
    description:
      'spec 016: asignar líder. 409 YA_ES_LIDER_DEL_MINISTERIO, PERSONA_MENOR_DE_EDAD_NO_PUEDE_TENER_ROL_DE_CARGO, MINISTERIO_NO_DISPONIBLE; 404 Persona inexistente o no activa.',
  })
  asignar(@Param('id') id: string, @Body() dto: AsignarLiderDto, @Req() request: AuthenticatedRequest) {
    return this.lideres.asignar(id, dto.personaId, personaDeSesion(request));
  }

  @Delete('ministerios/:id/lideres/:personaId')
  @HttpCode(200)
  @UseGuards(PermisosGuard)
  @RequierePermiso('ministerios.gestionar')
  @ApiOkResponse({ description: 'spec 016: cierra el liderazgo vigente (hasta). 404 si no es líder vigente.' })
  quitar(@Param('id') id: string, @Param('personaId') personaId: string, @Req() request: AuthenticatedRequest) {
    return this.lideres.quitar(id, personaId, personaDeSesion(request));
  }
}

function personaActiva(request: AuthenticatedRequest): string {
  const personaId = personaDeSesion(request);
  if (request.user.estado !== 'activa') throw new AppException('SIN_PERMISO', 403, 'Tu cuenta todavía no está activa.');
  return personaId;
}
