import { SignJWT } from 'jose';

/**
 * H-41 (revisión manual, revisión de código): piezas de `auth.ts` que eran
 * idénticas entre `apps/web` y `apps/backoffice` — no las que difieren a
 * propósito (páginas de NextAuth, callbacks completos, el `profile()` de
 * Google). Subpath separado (`@vida-sobrenatural/shared-types/auth-server`,
 * no reexportado desde el índice principal): usa `INTERNAL_API_SECRET` y
 * `NEXTAUTH_SECRET`, secretos de servidor que no deben poder llegar a un
 * bundle de cliente ni por accidente vía el barrel general.
 */

/**
 * Gateado en CÓDIGO, no solo por configuración: `NODE_ENV === 'production'`
 * lo excluye siempre, sin importar qué valor tenga `ALLOW_TEST_LOGIN` — así
 * una env var mal seteada en producción no alcanza para habilitarlo por
 * accidente.
 */
export function testLoginHabilitado(): boolean {
  return process.env.NODE_ENV !== 'production' && process.env.ALLOW_TEST_LOGIN === 'true';
}

/**
 * Claims que cada app le pasa a apps/api en cada llamada — ver
 * specs/001-fase-bienvenida/contracts/auth-integration.md. No es el JWE
 * interno de sesión de NextAuth (ese no se comparte con el backend).
 */
export interface PersonaLookup {
  id: string;
  estado: 'activa' | 'pendiente_tutor';
  activo: boolean;
  rol: string[];
  temaPreferido: 'claro' | 'oscuro' | 'sistema';
}

export async function buscarPersonaPorEmail(email: string): Promise<PersonaLookup | null> {
  const baseUrl = process.env.API_BASE_URL ?? 'http://localhost:3333';
  const response = await fetch(
    `${baseUrl}/personas/by-email?email=${encodeURIComponent(email)}`,
    { headers: { 'X-Internal-Secret': process.env.INTERNAL_API_SECRET ?? '' } },
  );
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`GET /personas/by-email respondió ${response.status}`);
  }
  return (await response.json()) as PersonaLookup;
}

export async function mintApiToken(claims: {
  email: string;
  personaId: string | null;
  estado: 'activa' | 'pendiente_tutor' | null;
  rol: string[];
}): Promise<string> {
  const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET ?? '');
  return new SignJWT(claims)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(secret);
}
