import { Body, Controller, Delete, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { ROLES_DE_CARGO, type RolDeCargo } from '@vida-sobrenatural/shared-types';
import { RolesService } from './roles.service.js';
import { OtorgarRolDto } from './dto/otorgar-rol.dto.js';
import { JwtNextAuthGuard } from '../auth/jwt-nextauth.guard.js';
import { PermisosGuard } from '../auth/permisos.guard.js';
import { RequierePermiso } from '../auth/permisos.decorator.js';
import { AppException } from '../common/errors/app-exception.js';
import type { AuthenticatedRequest } from '../auth/authenticated-request.js';

/**
 * specs/005-roles-permisos-acceso, Historia 2 (contracts/roles-personas-api.md):
 * otorgar/quitar roles de cargo. Controller aparte de PersonaController pero
 * en el mismo módulo y bajo el mismo prefijo `personas`. Los dos endpoints
 * piden `personas.gestionar_roles` (solo Admin, D132).
 */
@ApiTags('personas')
@Controller('personas')
@UseGuards(JwtNextAuthGuard, PermisosGuard)
@RequierePermiso('personas.gestionar_roles')
@ApiBearerAuth()
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Post(':id/roles')
  @ApiOkResponse({ description: 'FR-006 — otorga un rol de cargo (idempotente si ya lo tiene). Rechaza a menores de edad (FR-011).' })
  otorgarRol(@Param('id') id: string, @Body() dto: OtorgarRolDto, @Req() request: AuthenticatedRequest) {
    return this.rolesService.otorgarRol(id, dto.rol, request.user?.personaId ?? null);
  }

  @Delete(':id/roles/:rol')
  @ApiOkResponse({
    description:
      'FR-007 — quita un rol de cargo (idempotente si no lo tiene). Rechaza: Admin sembrado (FR-002), auto-revocación de admin (FR-010), discipulador siempre por ahora (FR-009/H-127).',
  })
  quitarRol(@Param('id') id: string, @Param('rol') rol: string, @Req() request: AuthenticatedRequest) {
    if (!ROLES_DE_CARGO.includes(rol as RolDeCargo)) {
      throw new AppException('VALIDACION', 400, 'Solo se pueden quitar roles de cargo.', [{ campo: 'rol', code: 'ROL_INVALIDO' }]);
    }
    return this.rolesService.quitarRol(id, rol as RolDeCargo, request.user?.personaId ?? null);
  }
}
