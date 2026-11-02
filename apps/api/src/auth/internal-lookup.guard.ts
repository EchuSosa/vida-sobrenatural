import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';
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
    if (!mismoSecreto(request.headers['x-internal-secret'], secret)) {
      throw new UnauthorizedException('X-Internal-Secret inválido o ausente.');
    }
    return true;
  }
}

/**
 * docs/25, S-09: compara en tiempo constante, para que el tiempo de respuesta
 * no cuente cuántos caracteres del secreto acertó quien prueba.
 */
export function mismoSecreto(recibido: unknown, secreto: string): boolean {
  if (typeof recibido !== 'string') return false;
  const a = Buffer.from(recibido);
  const b = Buffer.from(secreto);
  return a.length === b.length && timingSafeEqual(a, b);
}
