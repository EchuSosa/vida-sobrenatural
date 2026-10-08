import { Body, Controller, Get, HttpCode, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { JwtNextAuthGuard } from '../auth/jwt-nextauth.guard.js';
import { PermisosGuard } from '../auth/permisos.guard.js';
import { RequierePermiso } from '../auth/permisos.decorator.js';
import type { AuthenticatedRequest } from '../auth/authenticated-request.js';
import { personaDeSesion } from '../discipulado/sesion.js';
import { HistorialAdminService } from './historial-admin.service.js';
import { RechazarDeclaracionDto, RegistrarCompletitudDto } from './dto/historial-admin.dto.js';

/**
 * spec 006, Historia 2 — el Admin y el Pastor (contracts/historial-admin-api.md).
 * Leer: `solicitudes.ver` / `personas.ver` (Admin y Pastor). Escribir:
 * `historial.resolver` y `completitud_manual.gestionar` (solo Admin, FR-028).
 * Quien resuelve queda registrado: sin Persona en la sesión no se hace (H-140).
 */
@ApiTags('historial')
@Controller()
@UseGuards(JwtNextAuthGuard, PermisosGuard)
@ApiBearerAuth()
export class HistorialAdminController {
  constructor(private readonly service: HistorialAdminService) {}

  @Get('historial/declaraciones/:id')
  @RequierePermiso('solicitudes.ver')
  @ApiOkResponse({ description: 'spec 006, FR-013: el detalle de un "Ya lo hice", con lo que el sistema ya sabe de esa Persona en esa etapa.' })
  detalle(@Param('id') id: string) {
    return this.service.detalle(id);
  }

  @Post('historial/declaraciones/:id/confirmar')
  @HttpCode(200)
  @RequierePermiso('historial.resolver')
  @ApiOkResponse({ description: 'spec 006, FR-013: confirma y registra la etapa hecha. 409 DECLARACION_NO_PENDIENTE, ETAPA_YA_COMPLETADA, ETAPA_EN_CURSO.' })
  confirmar(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.service.confirmar(id, personaDeSesion(request));
  }

  @Post('historial/declaraciones/:id/rechazar')
  @HttpCode(200)
  @RequierePermiso('historial.resolver')
  @ApiOkResponse({ description: 'spec 006, FR-013: "No confirmar", con motivo opcional (≤ 500) que lee la Persona. 409 DECLARACION_NO_PENDIENTE.' })
  rechazar(@Param('id') id: string, @Body() dto: RechazarDeclaracionDto, @Req() request: AuthenticatedRequest) {
    return this.service.rechazar(id, dto.motivo, personaDeSesion(request));
  }

  @Get('personas/:id/camino')
  @RequierePermiso('personas.ver')
  @ApiOkResponse({ description: 'spec 006, FR-014: las cuatro etapas de una Persona (completa, en curso, registrada, declaración pendiente).' })
  camino(@Param('id') id: string) {
    return this.service.caminoDePersona(id);
  }

  @Post('personas/:id/completitudes')
  @RequierePermiso('completitud_manual.gestionar')
  @ApiCreatedResponse({ description: 'spec 006, FR-014: registra una etapa hecha. 409 ETAPA_YA_COMPLETADA, ETAPA_EN_CURSO.' })
  registrar(@Param('id') id: string, @Body() dto: RegistrarCompletitudDto, @Req() request: AuthenticatedRequest) {
    return this.service.registrar(id, dto.etapa, dto.nota, personaDeSesion(request));
  }

  @Post('personas/:id/completitudes/:completitudId/anular')
  @HttpCode(200)
  @RequierePermiso('completitud_manual.gestionar')
  @ApiOkResponse({ description: 'spec 006, FR-015: anula (borrado lógico). 409 COMPLETITUD_NO_VIGENTE.' })
  async anular(@Param('id') id: string, @Param('completitudId') completitudId: string, @Req() request: AuthenticatedRequest) {
    await this.service.anular(id, completitudId, personaDeSesion(request));
    return { ok: true };
  }
}
