import { Body, Controller, Get, HttpCode, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { JwtNextAuthGuard } from '../auth/jwt-nextauth.guard.js';
import type { AuthenticatedRequest } from '../auth/authenticated-request.js';
import { AppException } from '../common/errors/app-exception.js';
import { personaDeSesion } from '../discipulado/sesion.js';
import { SolicitudesGexService } from './solicitudes-gex.service.js';
import { BuscarGruposDto, RechazarSolicitudGexDto } from './dto/grupo-extension.dto.js';

/**
 * spec 014 (D223–D225; contracts/api.md): lo de la persona y lo del líder,
 * en la web app. Sin permiso del catálogo: la Persona es SIEMPRE la de la
 * sesión (D134). Lo del líder se autoriza contra la base (líder vigente de
 * ESE Grupo), no contra el rol del JWT, que puede estar viejo si la
 * asignaron con la sesión abierta.
 */
@ApiTags('grupos-extension')
@Controller()
@UseGuards(JwtNextAuthGuard)
@ApiBearerAuth()
export class GruposPersonaController {
  constructor(private readonly service: SolicitudesGexService) {}

  @Get('grupos-extension/me')
  @ApiOkResponse({ description: 'spec 014: EstadoMiGrupoExtension de la persona de la sesión.' })
  estado(@Req() request: AuthenticatedRequest) {
    return this.service.estado(personaActiva(request));
  }

  @Post('grupos-extension/buscar')
  @HttpCode(200)
  @ApiOkResponse({ description: 'spec 014, D223: Grupos compatibles por cercanía, sin dirección exacta. 400 DIRECCION_NO_UBICADA; 503 UBICACION_NO_DISPONIBLE.' })
  buscar(@Body() dto: BuscarGruposDto, @Req() request: AuthenticatedRequest) {
    return this.service.buscar(personaActiva(request), dto);
  }

  @Get('grupos-extension/liderados')
  @ApiOkResponse({ description: 'spec 014, D225: los Grupos que lidera la persona de la sesión, con pedidos e integrantes.' })
  liderados(@Req() request: AuthenticatedRequest) {
    return this.service.liderados(personaActiva(request));
  }

  @Post('grupos-extension/liderados/solicitudes/:id/aceptar')
  @HttpCode(200)
  aceptar(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.service.aceptar(id, { tipo: 'lider', personaId: personaActiva(request) });
  }

  @Post('grupos-extension/liderados/solicitudes/:id/rechazar')
  @HttpCode(200)
  rechazar(@Param('id') id: string, @Body() dto: RechazarSolicitudGexDto, @Req() request: AuthenticatedRequest) {
    return this.service.rechazar(id, { tipo: 'lider', personaId: personaActiva(request) }, dto.mensaje);
  }

  @Post('grupos-extension/:id/solicitudes/me')
  @ApiCreatedResponse({ description: 'spec 014, D224: pedir sumarse. 409 GRUPO_EXTENSION_PEDIDO_PENDIENTE, _YA_INTEGRANTE, _NO_DISPONIBLE, _NO_COMPATIBLE, _COMPLETO.' })
  pedir(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.service.pedir(personaActiva(request), id);
  }

  @Post('solicitudes-grupo-extension/me/:id/retirar')
  @HttpCode(200)
  retirar(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.service.retirar(personaActiva(request), id);
  }
}

/** Como las rutas de la Persona de la 004/009: un `pendiente_tutor` todavía no usa la app. */
function personaActiva(request: AuthenticatedRequest): string {
  const personaId = personaDeSesion(request);
  if (request.user.estado !== 'activa') throw new AppException('SIN_PERMISO', 403, 'Tu cuenta todavía no está activa.');
  return personaId;
}
