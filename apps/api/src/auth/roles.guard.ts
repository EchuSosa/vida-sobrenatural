import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator.js';
import type { AuthenticatedRequest } from './authenticated-request.js';

/** Debe ir después de JwtNextAuthGuard — depende de que req.user ya exista. */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const tieneRol = requiredRoles.some((rol) => request.user?.rol?.includes(rol));
    if (!tieneRol) {
      throw new ForbiddenException(
        `Requiere alguno de estos roles: ${requiredRoles.join(', ')}.`,
      );
    }
    return true;
  }
}
