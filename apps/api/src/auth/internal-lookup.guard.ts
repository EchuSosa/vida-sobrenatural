import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';

/**
 * Protege GET /personas/by-email: llamada servidor-a-servidor desde el
 * callback de NextAuth, antes de que exista una sesión de usuario
 * (contracts/personas-api.md, contracts/auth-integration.md).
 */
@Injectable()
export class InternalLookupGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const secret = process.env.INTERNAL_API_SECRET;
    if (!secret) {
      throw new Error('Falta la variable de entorno INTERNAL_API_SECRET.');
    }
    if (request.headers['x-internal-secret'] !== secret) {
      throw new UnauthorizedException('X-Internal-Secret inválido o ausente.');
    }
    return true;
  }
}
