import { Body, Controller, Delete, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
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

  /**
   * H-140: el chequeo de AUTOR va PRIMERO, antes que cualquier guarda de
   * negocio (FR-002, FR-010, FR-009, FR-011). No responde "¿puede hacer
   * esto?" — el permiso ya lo resolvió el guard — sino "¿puedo saber quién lo
   * está haciendo?", y las guardas siguientes dependen de esa respuesta
   * (FR-010 compara contra el autor; la auditoría lo registra). Sin Persona
   * en la sesión: 403 con código propio, no SIN_PERMISO — el Admin sí tiene
   * el permiso; lo que falla es que el sistema no puede identificarlo.
   */
  private autorDeSesion(request: AuthenticatedRequest): string {
    const personaId = request.user?.personaId;
    if (!personaId) {
      throw new AppException(
        'SESION_SIN_PERSONA',
        403,
        'La sesión no tiene una Persona asociada: el sistema no puede registrar quién hace el cambio, así que no lo hace.',
      );
    }
    return personaId;
  }

  @Post(':id/roles')
  // T059: 201 es lo que Nest responde a un POST (y lo que verifican los tests);
  // antes se documentaba como 200.
  @ApiCreatedResponse({
    description:
      'specs/005, Historia 2/6 — FR-006: otorga un rol de cargo (idempotente si ya lo tiene: no cambia nada ni deja registro). Cada otorgamiento real queda en el historial (GET /cambios-de-rol, FR-022), en la misma transacción. Rechaza: sesión sin Persona (403 SESION_SIN_PERSONA, antes que cualquier otra regla), menor de edad (409, FR-011).',
  })
  otorgarRol(@Param('id') id: string, @Body() dto: OtorgarRolDto, @Req() request: AuthenticatedRequest) {
    const autor = this.autorDeSesion(request);
    return this.rolesService.otorgarRol(id, dto.rol, autor);
  }

  @Delete(':id/roles/:rol')
  @ApiOkResponse({
    description:
      'specs/005, Historia 2/6 — FR-007: quita un rol de cargo (idempotente si no lo tiene: no cambia nada ni deja registro). Cada quita real queda en el historial (GET /cambios-de-rol, FR-022), en la misma transacción. Rechaza: sesión sin Persona (403 SESION_SIN_PERSONA, antes que cualquier otra regla), Admin sembrado (409, FR-002), auto-revocación de admin (409, FR-010), discipulador siempre por ahora (409, FR-009/H-127), un rol que no es de cargo (400).',
  })
  quitarRol(@Param('id') id: string, @Param('rol') rol: string, @Req() request: AuthenticatedRequest) {
    const autor = this.autorDeSesion(request);
    if (!ROLES_DE_CARGO.includes(rol as RolDeCargo)) {
      throw new AppException('VALIDACION', 400, 'Solo se pueden quitar roles de cargo.', [{ campo: 'rol', code: 'ROL_INVALIDO' }]);
    }
    return this.rolesService.quitarRol(id, rol as RolDeCargo, autor);
  }
}
