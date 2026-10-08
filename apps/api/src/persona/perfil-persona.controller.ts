import { Controller, Get, Param, ParseUUIDPipe, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { JwtNextAuthGuard } from '../auth/jwt-nextauth.guard.js';
import { PermisosGuard } from '../auth/permisos.guard.js';
import { RequierePermiso } from '../auth/permisos.decorator.js';
import type { AuthenticatedRequest } from '../auth/authenticated-request.js';
import { AppException } from '../common/errors/app-exception.js';
import { PerfilPersonaService } from './perfil-persona.service.js';

/**
 * spec 013, Historia 2 (T030, T031): el Perfil de Persona del backoffice.
 * Lectura para Admin y Pastor (`personas.ver`, D64: con contacto).
 */
@ApiTags('personas')
@Controller('personas')
@UseGuards(JwtNextAuthGuard, PermisosGuard)
@ApiBearerAuth()
export class PerfilPersonaController {
  constructor(private readonly perfiles: PerfilPersonaService) {}

  @Get(':id/perfil')
  @RequierePermiso('personas.ver')
  @ApiOkResponse({ description: 'spec 013, FR-011–FR-017: `PerfilPersona`. Relaciones Familiares en las dos direcciones; nunca notas ni campos técnicos. 404 NO_ENCONTRADO.' })
  perfil(@Param('id', new ParseUUIDPipe({ exceptionFactory: () => noEncontrada() })) id: string, @Req() request: AuthenticatedRequest) {
    return this.perfiles.perfil(id, request.user?.personaId ?? null);
  }

  @Get(':id/grupos')
  @RequierePermiso('personas.ver')
  @ApiOkResponse({ description: 'spec 013, FR-013: los Grupos que cursó y los que tuvo a cargo, 20 más recientes de cada uno, con los totales. 404 NO_ENCONTRADO.' })
  grupos(@Param('id', new ParseUUIDPipe({ exceptionFactory: () => noEncontrada() })) id: string) {
    return this.perfiles.grupos(id);
  }
}

/** Un id que ni siquiera es un uuid tampoco existe (H2.8): 404, no 400. */
function noEncontrada() {
  return new AppException('NO_ENCONTRADO', 404, 'No existe una Persona con ese id.');
}
