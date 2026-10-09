import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiNoContentResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { JwtNextAuthGuard } from '../auth/jwt-nextauth.guard.js';
import type { AuthenticatedRequest } from '../auth/authenticated-request.js';
import { AppException } from '../common/errors/app-exception.js';
import { personaDeSesion } from '../discipulado/sesion.js';
import { MiVidaDeServicioService } from './mi-vida-de-servicio.service.js';
import { SolicitudesVidaDeServicioService } from './solicitudes.service.js';
import { PedirVidaDeServicioDto } from './dto/solicitudes.dto.js';

/**
 * spec 008, Historias 2 y 5 — la Persona (contracts/persona-api.md). Sin
 * permiso de rol: pedir para una misma y ver su propia Vida de Servicio se
 * resuelven por identidad (research #15, D134). La Persona es SIEMPRE la de
 * la sesión, nunca un parámetro.
 */
@ApiTags('vida-de-servicio')
@Controller('vida-de-servicio')
@UseGuards(JwtNextAuthGuard)
@ApiBearerAuth()
export class MiVidaDeServicioController {
  constructor(
    private readonly mia: MiVidaDeServicioService,
    private readonly solicitudes: SolicitudesVidaDeServicioService,
  ) {}

  @Get('me')
  @ApiOkResponse({ description: 'spec 008, FR-025: EstadoMiVidaDeServicio de la Persona de la sesión.' })
  estado(@Req() request: AuthenticatedRequest) {
    return this.mia.estado(personaActivaDeSesion(request));
  }

  @Get('me/semanas/:numero')
  @ApiOkResponse({ description: 'spec 008, FR-021/FR-034: el material de una semana que tiene derecho a ver. 404 CONTENIDO_NO_DISPONIBLE si no.' })
  semana(@Param('numero', ParseIntPipe) numero: number, @Req() request: AuthenticatedRequest) {
    return this.mia.semana(personaActivaDeSesion(request), numero);
  }

  @Post('solicitudes/me')
  @ApiCreatedResponse({ description: 'spec 008, FR-010 a FR-012. 422 VIDA_SERVICIO_PRERREQUISITO_NO_CUMPLIDO, EDAD_INSUFICIENTE_PARA_PEDIR_SOLO; 409 SOLICITUD_VIDA_SERVICIO_YA_PENDIENTE, VIDA_SERVICIO_EN_CURSO_O_COMPLETADA; 400 VALIDACION (grupoId: EDICION_NO_DISPONIBLE, EDICION_REQUERIDA).' })
  pedir(@Body() dto: PedirVidaDeServicioDto, @Req() request: AuthenticatedRequest) {
    return this.solicitudes.crearPropia(personaActivaDeSesion(request), dto.grupoId ?? null);
  }

  @Delete('solicitudes/me')
  @HttpCode(204)
  @ApiNoContentResponse({ description: 'spec 008, FR-012: retira el pedido pendiente. 409 SOLICITUD_NO_PENDIENTE.' })
  async retirar(@Req() request: AuthenticatedRequest) {
    await this.solicitudes.retirarPropia(personaActivaDeSesion(request));
  }
}

/** Como las rutas de la Persona de la 004 y la 006: hace falta una Persona `activa`. */
export function personaActivaDeSesion(request: AuthenticatedRequest): string {
  const personaId = personaDeSesion(request);
  if (request.user.estado !== 'activa') throw new AppException('SIN_PERMISO', 403, 'Tu cuenta todavía no está activa.');
  return personaId;
}
