import { Body, Controller, Delete, Get, HttpCode, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiNoContentResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { JwtNextAuthGuard } from '../auth/jwt-nextauth.guard.js';
import type { AuthenticatedRequest } from '../auth/authenticated-request.js';
import { AppException } from '../common/errors/app-exception.js';
import { personaDeSesion } from '../discipulado/sesion.js';
import { CaminoService } from './camino.service.js';
import { DeclararDto } from './dto/declarar.dto.js';

/**
 * spec 006, Historias 1 y 2 — Mi camino de la Persona (contracts/camino-api.md).
 * Sin permiso del catálogo: "Ya lo hice" no es de cargo, lo hace cualquier
 * Persona con sesión para sí misma (FR-028, D132 "límite del catálogo"). La
 * Persona es SIEMPRE la de la sesión, nunca un parámetro (D134).
 */
@ApiTags('camino')
@Controller('camino/me')
@UseGuards(JwtNextAuthGuard)
@ApiBearerAuth()
export class CaminoController {
  constructor(private readonly service: CaminoService) {}

  @Get()
  @ApiOkResponse({ description: 'spec 006, FR-007: las cuatro etapas de la Persona de la sesión (CaminoDeLaPersona), en orden; `vidaNueva` es lo de GET /discipulado/me.' })
  estado(@Req() request: AuthenticatedRequest) {
    return this.service.estadoDeEtapas(personaActivaDeSesion(request));
  }

  @Post('declaraciones')
  @ApiCreatedResponse({ description: 'spec 006, FR-008 a FR-010: "Ya lo hice". 409 EDAD_INSUFICIENTE_PARA_PEDIR_SOLO, ETAPA_YA_COMPLETADA, DECLARACION_YA_PENDIENTE, ETAPA_EN_CURSO; 400 VALIDACION (comentario > 500).' })
  declarar(@Body() dto: DeclararDto, @Req() request: AuthenticatedRequest) {
    return this.service.declarar(personaActivaDeSesion(request), dto.etapa, dto.comentario);
  }

  @Delete('declaraciones/:id')
  @HttpCode(204)
  @ApiNoContentResponse({ description: 'spec 006, FR-011: retira una declaración propia pendiente. 404 si es ajena o no existe; 409 DECLARACION_NO_PENDIENTE.' })
  async retirar(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    await this.service.retirar(personaActivaDeSesion(request), id);
  }
}

/** Como las rutas de la Persona de la 004: hace falta una Persona `activa` (un `pendiente_tutor` todavía no usa la app). */
function personaActivaDeSesion(request: AuthenticatedRequest): string {
  const personaId = personaDeSesion(request);
  if (request.user.estado !== 'activa') throw new AppException('SIN_PERMISO', 403, 'Tu cuenta todavía no está activa.');
  return personaId;
}
