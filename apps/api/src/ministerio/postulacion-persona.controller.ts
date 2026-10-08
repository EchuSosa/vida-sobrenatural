import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtNextAuthGuard } from '../auth/jwt-nextauth.guard.js';
import type { AuthenticatedRequest } from '../auth/authenticated-request.js';
import { AppException } from '../common/errors/app-exception.js';
import { personaDeSesion } from '../discipulado/sesion.js';
import { PostulacionPersonaService } from './postulacion-persona.service.js';
import { NuevaPostulacionDto } from './dto/postulacion.dto.js';

/**
 * spec 009, Historias 1 y 3 (T017, contracts/postulaciones-api.md): lo de la
 * Persona. Sin permiso del catálogo: postularse no es de cargo (D132); hace
 * falta una sesión `activa`, y la Persona es SIEMPRE la de la sesión (D134):
 * una Postulación ajena responde 404. Las rutas estáticas van antes de
 * `:ministerioId` (contracts/ministerios-api.md, "Orden de rutas").
 */
@ApiTags('ministerios')
@Controller()
@UseGuards(JwtNextAuthGuard)
@ApiBearerAuth()
export class PostulacionPersonaController {
  constructor(private readonly service: PostulacionPersonaService) {}

  @Get('ministerios/me')
  @ApiOkResponse({
    description:
      'spec 009, FR-011: EstadoMiMinisterio de la Persona de la sesión (sin motivos, FR-014).',
  })
  estado(@Req() request: AuthenticatedRequest) {
    return this.service.estado(personaActivaDeSesion(request));
  }

  @Get('ministerios/me/disponibles')
  @ApiOkResponse({
    description:
      'spec 009, FR-009: Ministerios activos con su contenido completo (docs/22) y sus Células activas.',
  })
  disponibles(@Req() request: AuthenticatedRequest) {
    personaActivaDeSesion(request);
    return this.service.disponibles();
  }

  @Get('ministerios/me/:ministerioId')
  @ApiOkResponse({
    description:
      'spec 009, FR-010: detalle con la situación de la Persona. 404 si no está disponible.',
  })
  detalle(
    @Param('ministerioId') ministerioId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.service.detalle(personaActivaDeSesion(request), ministerioId);
  }

  @Post('ministerios/:ministerioId/postulaciones/me')
  @ApiCreatedResponse({
    description:
      'spec 009, FR-001 a FR-008: postularse. 409 NO_APTA_PARA_MINISTERIO, MINISTERIO_NO_DISPONIBLE, YA_ES_MIEMBRO_DEL_MINISTERIO, POSTULACION_YA_PENDIENTE; 400 VALIDACION (celulaId, motivacion, disponibilidad).',
  })
  crear(
    @Param('ministerioId') ministerioId: string,
    @Body() dto: NuevaPostulacionDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.service.crear(
      personaActivaDeSesion(request),
      ministerioId,
      dto,
    );
  }

  @Post('postulaciones/me/:id/retirar')
  @HttpCode(200)
  @ApiOkResponse({
    description:
      'spec 009, FR-006: retira la propia pendiente. 404 si es ajena; 409 POSTULACION_NO_PENDIENTE.',
  })
  retirar(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.service.retirar(personaActivaDeSesion(request), id);
  }
}

/** Como las rutas de la Persona de la 004 y la 006: un `pendiente_tutor` todavía no usa la app. */
function personaActivaDeSesion(request: AuthenticatedRequest): string {
  const personaId = personaDeSesion(request);
  if (request.user.estado !== 'activa')
    throw new AppException(
      'SIN_PERMISO',
      403,
      'Tu cuenta todavía no está activa.',
    );
  return personaId;
}
