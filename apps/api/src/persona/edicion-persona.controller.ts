import { Body, Controller, Param, ParseUUIDPipe, Patch, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { JwtNextAuthGuard } from '../auth/jwt-nextauth.guard.js';
import { PermisosGuard } from '../auth/permisos.guard.js';
import { RequierePermiso } from '../auth/permisos.decorator.js';
import type { AuthenticatedRequest } from '../auth/authenticated-request.js';
import { AppException } from '../common/errors/app-exception.js';
import { CAMPOS_EDITABLES, EdicionPersonaService } from './edicion-persona.service.js';
import { EditarPersonaDto } from './dto/editar-persona.dto.js';

/** spec 013, Historia 7 (T080): el Admin corrige los datos de una Persona (`personas.editar`). */
@ApiTags('personas')
@Controller('personas')
@UseGuards(JwtNextAuthGuard, PermisosGuard)
@ApiBearerAuth()
export class EdicionPersonaController {
  constructor(private readonly edicion: EdicionPersonaService) {}

  @Patch(':id')
  @RequierePermiso('personas.editar')
  @ApiOkResponse({
    description:
      'spec 013, FR-057/FR-058: corrige datos de una Persona; responde el `PerfilPersona` actualizado. 400 VALIDACION por campo, 409 EMAIL_DUPLICADO, 409 PERSONA_MENOR_DE_EDAD_NO_PUEDE_TENER_ROL_DE_CARGO, 404.',
  })
  editar(
    @Param('id', new ParseUUIDPipe({ exceptionFactory: () => new AppException('NO_ENCONTRADO', 404, 'No existe una Persona con ese id.') })) id: string,
    @Body() dto: EditarPersonaDto,
    @Req() request: AuthenticatedRequest,
  ) {
    // Solo los campos que vinieron (el DTO, ya filtrado por `whitelist`, puede traer los ausentes como `undefined`).
    const cambios = Object.fromEntries(CAMPOS_EDITABLES.filter((c) => c in dto && (dto as Record<string, unknown>)[c] !== undefined).map((c) => [c, (dto as Record<string, unknown>)[c]]));
    return this.edicion.editar(id, cambios, request.user?.personaId ?? null);
  }
}
