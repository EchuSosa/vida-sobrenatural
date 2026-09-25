import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { JwtNextAuthGuard } from '../auth/jwt-nextauth.guard.js';
import { PermisosGuard } from '../auth/permisos.guard.js';
import { RequierePermiso } from '../auth/permisos.decorator.js';
import { CambioDeRolService } from './cambio-de-rol.service.js';

/** H-42: default de paginación, acotado a 100. */
const CAMBIOS_DE_ROL_TAKE_DEFAULT = 20;

/**
 * specs/005, Historia 6 (T051, contracts/auditoria-api.md): solo lectura. No
 * hay POST/PATCH/DELETE — las filas nacen únicamente como efecto de otorgar
 * o quitar un rol (o del comando de recuperación). Mismo permiso que
 * gestionar roles: spec.md no pide una pantalla de auditoría con permiso propio.
 */
@ApiTags('cambios-de-rol')
@Controller('cambios-de-rol')
export class CambioDeRolController {
  constructor(private readonly cambioDeRolService: CambioDeRolService) {}

  @Get()
  @UseGuards(JwtNextAuthGuard, PermisosGuard)
  @RequierePermiso('personas.gestionar_roles')
  @ApiBearerAuth()
  @ApiQuery({ name: 'personaId', required: false })
  @ApiQuery({ name: 'skip', required: false })
  @ApiQuery({ name: 'take', required: false })
  @ApiOkResponse({
    description:
      'FR-022/FR-023 — historial de cambios de rol de cargo, el más reciente primero. `origen`: backoffice (con `realizadoPor`) o recuperacion_cli (`realizadoPor: null` — lo corrió quien tenga acceso al servidor).',
  })
  listar(
    @Query('personaId') personaId?: string,
    @Query('skip') skipParam?: string,
    @Query('take') takeParam?: string,
  ) {
    const skip = Math.max(0, Number(skipParam) || 0);
    const take = Math.min(
      100,
      Math.max(1, Number(takeParam) || CAMBIOS_DE_ROL_TAKE_DEFAULT),
    );
    return this.cambioDeRolService.listar(personaId || undefined, skip, take);
  }
}
