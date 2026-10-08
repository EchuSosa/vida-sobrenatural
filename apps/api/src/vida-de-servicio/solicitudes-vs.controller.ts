import { Body, Controller, Get, HttpCode, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { JwtNextAuthGuard } from '../auth/jwt-nextauth.guard.js';
import { PermisosGuard } from '../auth/permisos.guard.js';
import { RequierePermiso } from '../auth/permisos.decorator.js';
import type { AuthenticatedRequest } from '../auth/authenticated-request.js';
import { personaDeSesion } from '../discipulado/sesion.js';
import { SolicitudesVidaDeServicioService } from './solicitudes.service.js';
import { AprobarSolicitudVsDto, MotivoOpcionalDto, PedirEnNombreDto } from './dto/solicitudes.dto.js';

/**
 * spec 008, Historia 3 — el Admin y el Pastor (contracts/admin-api.md). Leer:
 * `solicitudes.ver` / `personas.ver`. Resolver: `solicitudes.aprobar`. Pedir en
 * nombre de: `vida_servicio.inscribir_en_nombre` (solo Admin, D143).
 */
@ApiTags('vida-de-servicio')
@Controller()
@UseGuards(JwtNextAuthGuard, PermisosGuard)
@ApiBearerAuth()
export class SolicitudesVidaDeServicioController {
  constructor(private readonly service: SolicitudesVidaDeServicioService) {}

  @Post('vida-de-servicio/solicitudes')
  @RequierePermiso('vida_servicio.inscribir_en_nombre')
  @ApiCreatedResponse({ description: 'spec 008, FR-013: el Admin pide en nombre de una Persona. Mismas reglas que /me salvo la edad.' })
  pedirEnNombre(@Body() dto: PedirEnNombreDto, @Req() request: AuthenticatedRequest) {
    return this.service.crearEnNombre(dto.personaId, dto.grupoId ?? null, personaDeSesion(request));
  }

  @Get('vida-de-servicio/solicitudes/:id')
  @RequierePermiso('solicitudes.ver')
  @ApiOkResponse({ description: 'spec 008, FR-015: SolicitudVidaServicioDetalle.' })
  detalle(@Param('id') id: string) {
    return this.service.detalle(id);
  }

  @Post('vida-de-servicio/solicitudes/:id/aprobar')
  @HttpCode(200)
  @RequierePermiso('solicitudes.aprobar')
  @ApiOkResponse({ description: 'spec 008, FR-016. 409 SOLICITUD_NO_PENDIENTE, VIDA_SERVICIO_EN_CURSO_O_COMPLETADA; 422 VIDA_SERVICIO_PRERREQUISITO_NO_CUMPLIDO; 400 VALIDACION (grupoId: EDICION_NO_DISPONIBLE, EDICION_YA_CURSADA).' })
  aprobar(@Param('id') id: string, @Body() dto: AprobarSolicitudVsDto, @Req() request: AuthenticatedRequest) {
    return this.service.aprobar(id, dto.grupoId, personaDeSesion(request));
  }

  @Post('vida-de-servicio/solicitudes/:id/rechazar')
  @HttpCode(200)
  @RequierePermiso('solicitudes.aprobar')
  @ApiOkResponse({ description: 'spec 008, FR-017. 409 SOLICITUD_NO_PENDIENTE.' })
  rechazar(@Param('id') id: string, @Body() dto: MotivoOpcionalDto, @Req() request: AuthenticatedRequest) {
    return this.service.rechazar(id, dto.motivo, personaDeSesion(request));
  }

  @Get('personas/:id/vida-de-servicio')
  @RequierePermiso('personas.ver')
  @ApiOkResponse({ description: 'spec 008, FR-013: el estado de Vida de Servicio de una Persona, para su perfil.' })
  dePersona(@Param('id') id: string) {
    return this.service.deUnaPersona(id);
  }
}
