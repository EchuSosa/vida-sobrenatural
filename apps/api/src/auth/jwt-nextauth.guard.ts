import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { jwtVerify } from 'jose';
import { PrismaService } from '../prisma/prisma.service.js';
import type { ApiJwtClaims, AuthenticatedRequest } from './authenticated-request.js';

/**
 * Verifica el JWT (HS256, jose) que NextAuth.js mintió en su callback
 * `session` para llamar a esta API — no el JWE interno de sesión de NextAuth
 * (ver research.md, Decisión 2, y contracts/auth-integration.md).
 */
@Injectable()
export class JwtNextAuthGuard implements CanActivate {
  private readonly secret = new TextEncoder().encode(requireEnv('NEXTAUTH_SECRET'));

  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Falta el header Authorization: Bearer <token>.');
    }

    const token = authHeader.slice('Bearer '.length);
    let claims: ApiJwtClaims;
    try {
      const { payload } = await jwtVerify(token, this.secret);
      claims = payload as unknown as ApiJwtClaims;
    } catch {
      throw new UnauthorizedException('Token inválido o expirado.');
    }
    request.user = await this.conRolesDeLaBase(claims);
    return true;
  }

  /**
   * docs/25, S-02 (D258): el token dice QUIÉN es; el rol y el estado salen de la base en cada
   * pedido, no del token. Antes, al Admin al que se le sacaba el rol, o a la Persona dada de baja,
   * le seguía valiendo la sesión hasta 7 días (backoffice) o 30 (web). Sin caché: es una lectura por
   * clave primaria, y así un cambio de rol vale desde el pedido siguiente. Una Persona dada de baja
   * (`activo = false`) o que ya no existe no entra. Sin `personaId` (quien todavía no se registró)
   * no hay nada que mirar en la base: el token queda como lo firmó el servidor (para esa sesión
   * siempre con `rol: []`, ver `mintApiToken`).
   */
  private async conRolesDeLaBase(claims: ApiJwtClaims): Promise<ApiJwtClaims> {
    if (!claims.personaId) return claims;
    const persona = await this.prisma.persona.findUnique({
      where: { id: claims.personaId },
      select: { rol: true, estado: true, activo: true },
    });
    if (!persona || !persona.activo) {
      throw new UnauthorizedException('La sesión ya no es válida.');
    }
    return { ...claims, rol: [...persona.rol], estado: persona.estado };
  }
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Falta la variable de entorno ${name}.`);
  }
  return value;
}
