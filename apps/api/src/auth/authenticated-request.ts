import type { Request } from 'express';

/**
 * Claims carried by the API JWT minted by NextAuth's `session` callback
 * (jose, HS256, signed with NEXTAUTH_SECRET) — see contracts/auth-integration.md.
 * Not NextAuth's own internal session cookie (that one is an encrypted JWE we
 * deliberately do not try to decode in the backend — see research.md, Decisión 2).
 */
export interface ApiJwtClaims {
  email: string;
  personaId: string | null;
  estado: 'activa' | 'pendiente_tutor' | null;
  rol: string[];
}

export interface AuthenticatedRequest extends Request {
  user: ApiJwtClaims;
}
