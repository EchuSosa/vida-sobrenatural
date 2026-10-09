import { Body, Controller, Get, HttpCode, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { JwtNextAuthGuard } from '../auth/jwt-nextauth.guard.js';
import { PermisosGuard } from '../auth/permisos.guard.js';
import { RequierePermiso } from '../auth/permisos.decorator.js';
import type { AuthenticatedRequest } from '../auth/authenticated-request.js';
import { personaDeSesion } from '../discipulado/sesion.js';
import { GruposExtensionService } from './grupos-extension.service.js';
import { SolicitudesGexService } from './solicitudes-gex.service.js';
import { AgregarIntegranteDto, DatosGrupoExtensionDto, RechazarSolicitudGexDto } from './dto/grupo-extension.dto.js';

/**
 * spec 014 (D221–D223, D227; contracts/api.md): Backoffice › Grupos de
 * extensión. El Pastor ve (`grupos_extension.ver`), el Admin gestiona. Quien
 * actúa queda registrado: sin Persona en la sesión no se hace (H-140).
 * Va DESPUÉS del controller de la persona: `/grupos-extension/me` y
 * `/grupos-extension/liderados` tienen que ganarle a `/grupos-extension/:id`.
 */
@ApiTags('grupos-extension')
@Controller()
@UseGuards(JwtNextAuthGuard, PermisosGuard)
@ApiBearerAuth()
export class GruposAdminController {
  constructor(
    private readonly grupos: GruposExtensionService,
    private readonly solicitudes: SolicitudesGexService,
  ) {}

  @Get('grupos-extension')
  @RequierePermiso('grupos_extension.ver')
  @ApiOkResponse({ description: 'spec 014: GrupoExtensionResumen[] (estado=todos incluye los inactivos).' })
  listar(@Query('estado') estado?: string) {
    return this.grupos.listar(estado !== 'todos');
  }

  @Get('grupos-extension/personas-elegibles')
  @RequierePermiso('grupos_extension.gestionar')
  @ApiOkResponse({ description: 'spec 014: Personas activas por nombre/apellido/email, con la marca de menor (D133).' })
  elegibles(@Query('q') q?: string) {
    return this.grupos.personasElegibles(q ?? '');
  }

  @Get('grupos-extension/:id')
  @RequierePermiso('grupos_extension.ver')
  @ApiOkResponse({ description: 'spec 014: GrupoExtensionDetalle, con integrantes y pedidos (y su contacto).' })
  detalle(@Param('id') id: string) {
    return this.grupos.detalle(id);
  }

  @Post('grupos-extension')
  @RequierePermiso('grupos_extension.gestionar')
  @ApiCreatedResponse({ description: 'spec 014: { id, ubicado }. 400 VALIDACION por campo.' })
  crear(@Body() dto: DatosGrupoExtensionDto, @Req() request: AuthenticatedRequest) {
    return this.grupos.crear(dto, personaDeSesion(request));
  }

  @Patch('grupos-extension/:id')
  @RequierePermiso('grupos_extension.gestionar')
  @ApiOkResponse({ description: 'spec 014: { id, ubicado }. 400 VALIDACION por campo.' })
  editar(@Param('id') id: string, @Body() dto: DatosGrupoExtensionDto, @Req() request: AuthenticatedRequest) {
    return this.grupos.editar(id, dto, personaDeSesion(request));
  }

  @Post('grupos-extension/:id/inactivar')
  @HttpCode(200)
  @RequierePermiso('grupos_extension.gestionar')
  @ApiOkResponse({ description: 'spec 014, FR-015: 409 GRUPO_EXTENSION_CON_INTEGRANTES.' })
  inactivar(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.grupos.inactivar(id, personaDeSesion(request));
  }

  @Post('grupos-extension/:id/reactivar')
  @HttpCode(200)
  @RequierePermiso('grupos_extension.gestionar')
  reactivar(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.grupos.reactivar(id, personaDeSesion(request));
  }

  @Post('grupos-extension/:id/integrantes')
  @RequierePermiso('grupos_extension.gestionar')
  @ApiCreatedResponse({ description: 'spec 014, D227: suma a una Persona directamente.' })
  agregar(@Param('id') id: string, @Body() dto: AgregarIntegranteDto, @Req() request: AuthenticatedRequest) {
    return this.solicitudes.agregar(id, dto.personaId, personaDeSesion(request));
  }

  @Post('grupos-extension/:id/integrantes/:solicitudId/quitar')
  @HttpCode(200)
  @RequierePermiso('grupos_extension.gestionar')
  quitar(@Param('id') id: string, @Param('solicitudId') solicitudId: string, @Req() request: AuthenticatedRequest) {
    return this.solicitudes.quitar(id, solicitudId, personaDeSesion(request));
  }

  @Get('solicitudes-grupo-extension/:id')
  @RequierePermiso('solicitudes.ver')
  @ApiOkResponse({ description: 'spec 014: SolicitudGrupoExtensionDetalle (bandeja).' })
  detalleSolicitud(@Param('id') id: string) {
    return this.solicitudes.detalle(id);
  }

  @Post('solicitudes-grupo-extension/:id/aceptar')
  @HttpCode(200)
  @RequierePermiso('grupos_extension.gestionar')
  aceptar(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.solicitudes.aceptar(id, { tipo: 'admin', personaId: personaDeSesion(request) });
  }

  @Post('solicitudes-grupo-extension/:id/rechazar')
  @HttpCode(200)
  @RequierePermiso('grupos_extension.gestionar')
  rechazar(@Param('id') id: string, @Body() dto: RechazarSolicitudGexDto, @Req() request: AuthenticatedRequest) {
    return this.solicitudes.rechazar(id, { tipo: 'admin', personaId: personaDeSesion(request) }, dto.mensaje);
  }
}
