import { Body, Controller, Get, HttpCode, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { JwtNextAuthGuard } from '../auth/jwt-nextauth.guard.js';
import type { AuthenticatedRequest } from '../auth/authenticated-request.js';
import { AppException } from '../common/errors/app-exception.js';
import { personaDeSesion } from '../discipulado/sesion.js';
import { BautismoPersonaService } from './acciones-persona.js';
import { PedirBautismoDto } from './dto/bautismo.dto.js';

/**
 * spec 010, lote A — la Persona en su card de Mi camino. Sin permiso del
 * catálogo (como `/discipulado/me`): lo hace cualquier Persona `activa` para
 * sí misma; la Persona sale SIEMPRE de la sesión (D134).
 */
@ApiTags('bautismo')
@Controller('bautismo')
@UseGuards(JwtNextAuthGuard)
@ApiBearerAuth()
export class BautismoMeController {
  constructor(private readonly service: BautismoPersonaService) {}

  @Get('me')
  @ApiOkResponse({ description: 'spec 010, FR-019: el estado de la card de Bautismo (EstadoCardBautismo). Nunca el motivo de rechazo.' })
  estado(@Req() request: AuthenticatedRequest) {
    return this.service.estado(personaActivaDeSesion(request));
  }

  @Post('solicitudes/me')
  @ApiCreatedResponse({ description: 'spec 010, FR-001 a FR-005: pedir. 409 BAUTISMO_NO_HABILITADO, EDAD_INSUFICIENTE_PARA_PEDIR_BAUTISMO_SOLO, SOLICITUD_BAUTISMO_YA_ABIERTA, PERSONA_YA_BAUTIZADA; 400 VALIDACION (comentario > 500).' })
  pedir(@Body() dto: PedirBautismoDto, @Req() request: AuthenticatedRequest) {
    return this.service.pedir(personaActivaDeSesion(request), dto.comentario);
  }

  @Post('solicitudes/me/retirar')
  @HttpCode(200)
  @ApiOkResponse({ description: 'spec 010, FR-020: retira el pedido (y sale de su fecha, si tenía). 409 SOLICITUD_BAUTISMO_YA_CAMBIO.' })
  retirar(@Req() request: AuthenticatedRequest) {
    return this.service.retirar(personaActivaDeSesion(request));
  }

  @Post('solicitudes/me/no-puedo')
  @HttpCode(200)
  @ApiOkResponse({ description: 'spec 010, FR-020a: "No puedo ese día" — sale del Evento y vuelve a esperar fecha. 409 SOLICITUD_BAUTISMO_YA_CAMBIO.' })
  noPuedo(@Req() request: AuthenticatedRequest) {
    return this.service.noPuedo(personaActivaDeSesion(request));
  }
}

/** Como las rutas de la Persona de la 004/006: hace falta una Persona `activa`. */
function personaActivaDeSesion(request: AuthenticatedRequest): string {
  const personaId = personaDeSesion(request);
  if (request.user.estado !== 'activa') throw new AppException('SIN_PERMISO', 403, 'Tu cuenta todavía no está activa.');
  return personaId;
}
