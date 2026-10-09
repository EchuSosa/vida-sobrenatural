import { Body, Controller, Delete, Get, Param, Post, Put, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { JwtNextAuthGuard } from '../auth/jwt-nextauth.guard.js';
import { PermisosGuard } from '../auth/permisos.guard.js';
import { RequierePermiso } from '../auth/permisos.decorator.js';
import type { AuthenticatedRequest } from '../auth/authenticated-request.js';
import { personaDeSesion } from '../discipulado/sesion.js';
import { BautismoExcepcionesService } from './acciones-excepciones.js';
import { CrearEnNombreBautismoDto } from './dto/bautismo.dto.js';

/**
 * spec 010, lote C — las excepciones del Admin (FR-021, FR-022) y lo que el
 * Perfil de Persona muestra del bautismo. Permisos propios, solo Admin
 * (research #12: no `solicitudes.crear_en_nombre`, que incluye al
 * Discipulador — D143).
 */
@ApiTags('bautismo')
@Controller()
@UseGuards(JwtNextAuthGuard, PermisosGuard)
@ApiBearerAuth()
export class BautismoEnNombreController {
  constructor(private readonly service: BautismoExcepcionesService) {}

  @Get('bautismo/personas/:id')
  @RequierePermiso('personas.ver')
  @ApiOkResponse({ description: 'spec 010: la situación de una Persona respecto del bautismo, para su Perfil (BautismoDePersona).' })
  dePersona(@Param('id') id: string) {
    return this.service.dePersona(id);
  }

  @Post('bautismo/solicitudes')
  @RequierePermiso('bautismo.crear_en_nombre')
  @ApiCreatedResponse({ description: 'spec 010, FR-022: pedido en nombre de una Persona activa. 409 SOLICITUD_BAUTISMO_YA_ABIERTA, PERSONA_YA_BAUTIZADA; 404 NO_ENCONTRADO; 400 VALIDACION (talleRemera obligatorio, D229).' })
  crear(@Body() dto: CrearEnNombreBautismoDto, @Req() request: AuthenticatedRequest) {
    return this.service.crearEnNombre(dto.personaId, dto.comentario, personaDeSesion(request), dto.talleRemera);
  }

  @Put('personas/:id/habilitacion-bautismo')
  @RequierePermiso('bautismo.habilitar')
  @ApiOkResponse({ description: 'spec 010, FR-021: habilita el bautismo sin Vida Nueva (idempotente). 404 si no es una Persona activa.' })
  habilitar(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.service.habilitar(id, personaDeSesion(request));
  }

  @Delete('personas/:id/habilitacion-bautismo')
  @RequierePermiso('bautismo.habilitar')
  @ApiOkResponse({ description: 'spec 010, FR-021: quita la habilitación; no toca una Solicitud ya abierta.' })
  deshabilitar(@Param('id') id: string) {
    return this.service.deshabilitar(id);
  }
}
