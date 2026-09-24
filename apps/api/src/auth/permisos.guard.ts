import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CATALOGO_PERMISOS, type Permiso } from '@vida-sobrenatural/shared-types';
import { PERMISO_KEY } from './permisos.decorator.js';
import type { AuthenticatedRequest } from './authenticated-request.js';

/**
 * Debe ir después de JwtNextAuthGuard — depende de que req.user ya exista.
 * Resuelve el permiso pedido por `@RequierePermiso` contra `CATALOGO_PERMISOS`
 * (D132) — nunca contra una lista de roles declarada acá. Si el permiso no
 * existe en el catálogo (error de programación, no de datos), deniega:
 * fail-closed (Principio V), nunca "cualquier rol pasa".
 */
@Injectable()
export class PermisosGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const permiso = this.reflector.getAllAndOverride<Permiso | undefined>(PERMISO_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!permiso) {
      return true;
    }

    const rolesConPermiso = CATALOGO_PERMISOS[permiso];
    if (!rolesConPermiso) {
      throw new ForbiddenException(`Permiso desconocido: ${permiso}.`);
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const tieneRol = rolesConPermiso.some((rol) => request.user?.rol?.includes(rol));
    if (!tieneRol) {
      throw new ForbiddenException(`Requiere el permiso: ${permiso}.`);
    }
    return true;
  }
}
