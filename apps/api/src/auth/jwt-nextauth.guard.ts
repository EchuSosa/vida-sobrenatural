import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { jwtVerify } from 'jose';
import type { ApiJwtClaims, AuthenticatedRequest } from './authenticated-request.js';

/**
 * Verifica el JWT (HS256, jose) que NextAuth.js mintió en su callback
 * `session` para llamar a esta API — no el JWE interno de sesión de NextAuth
 * (ver research.md, Decisión 2, y contracts/auth-integration.md).
 */
@Injectable()
export class JwtNextAuthGuard implements CanActivate {
  private readonly secret = new TextEncoder().encode(requireEnv('NEXTAUTH_SECRET'));

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Falta el header Authorization: Bearer <token>.');
    }

    const token = authHeader.slice('Bearer '.length);
    try {
      const { payload } = await jwtVerify(token, this.secret);
      request.user = payload as unknown as ApiJwtClaims;
      return true;
    } catch {
      throw new UnauthorizedException('Token inválido o expirado.');
    }
  }
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Falta la variable de entorno ${name}.`);
  }
  return value;
}
