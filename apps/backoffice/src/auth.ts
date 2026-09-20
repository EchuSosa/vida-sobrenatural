import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';
import { SignJWT } from 'jose';

/**
 * Captura `email_verified` (claim estándar del perfil OIDC de Google) —
 * actualización 2026-09-17, FR-017, Constitución Principio V: una cuenta SSO
 * solo se vincula si el proveedor confirma el email como verificado.
 */
const googleProvider = Google({
  profile(profile) {
    return {
      id: profile.sub,
      name: profile.name,
      email: profile.email,
      image: profile.picture,
      emailVerificadoPorProveedor: profile.email_verified === true,
    };
  },
});

/**
 * H-29 (revisión manual, actualización 2026-09-20): backoffice no tenía
 * ningún proveedor de test-login — apps/web sí (T028), y sin su equivalente
 * acá no hay forma de automatizar un e2e de las pantallas con sesión
 * (Personas, Sedes). Mismo patrón que apps/web/src/auth.ts: gateado en
 * CÓDIGO, no solo por configuración — `NODE_ENV === 'production'` lo
 * excluye siempre. No se armó un playwright.config.ts propio para
 * apps/backoffice en este lote (alcance del hallazgo era arreglar el
 * feedback de Personas/Sedes, no construir infraestructura de e2e nueva);
 * queda disponible para cuando se decida agregarlo.
 */
const testLoginHabilitado =
  process.env.NODE_ENV !== 'production' && process.env.ALLOW_TEST_LOGIN === 'true';

const providers = testLoginHabilitado
  ? [
      googleProvider,
      Credentials({
        id: 'test-login',
        name: 'Test login (solo E2E)',
        credentials: { email: {} },
        authorize: async (credentials) => {
          const email = credentials?.email;
          if (typeof email !== 'string' || !email) return null;
          return { id: email, email, name: 'Admin de Test', emailVerificadoPorProveedor: true };
        },
      }),
    ]
  : [googleProvider];

/**
 * Claims que este servidor le pasa a apps/api en cada llamada — ver
 * specs/001-fase-bienvenida/contracts/auth-integration.md. No es el JWE
 * interno de sesión de NextAuth (ese no se comparte con el backend).
 */
interface PersonaLookup {
  id: string;
  estado: 'activa' | 'pendiente_tutor';
  activo: boolean;
  rol: string[];
  temaPreferido: 'claro' | 'oscuro' | 'sistema';
}

async function buscarPersonaPorEmail(email: string): Promise<PersonaLookup | null> {
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

async function mintApiToken(claims: {
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

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers,
  session: { strategy: 'jwt' },
  // H-14 (actualización 2026-09-18): el backoffice no depende de las
  // pantallas por defecto de NextAuth — todavía no tiene una página de
  // error propia, así que error/signIn/signOut vuelven al Inicio, que ya
  // resuelve tanto el estado sin sesión (botón "Ingresar con Google") como
  // el diálogo de "Cerrar sesión" (MenuUsuario).
  pages: {
    signIn: '/',
    signOut: '/',
    error: '/',
  },
  callbacks: {
    async signIn({ user }) {
      // FR-017 (actualización 2026-09-17): mismo patrón que pendiente_tutor
      // más abajo — sin página propia en el backoffice, `return false` deja
      // que NextAuth muestre su pantalla de error genérica.
      if (user.emailVerificadoPorProveedor === false) {
        return false;
      }
      // FR-008: una Persona pendiente_tutor no debe poder iniciar sesión.
      if (!user.email) return true;
      const persona = await buscarPersonaPorEmail(user.email);
      if (persona?.estado === 'pendiente_tutor') {
        return false;
      }
      return true;
    },
    async jwt({ token, account, trigger, session }) {
      if (account && token.email) {
        const persona = await buscarPersonaPorEmail(token.email);
        token.personaId = persona?.id ?? null;
        token.estado = persona?.estado ?? null;
        token.rol = persona?.rol ?? [];
        // Historia 5 (specs/002-base-transversal) — hidrata el tema sin
        // flash en el layout server-side.
        token.temaPreferido = persona?.temaPreferido ?? 'sistema';
      }
      // `update()` desde el cliente (MenuUsuario) — ver auth.ts de apps/web
      // para la misma lógica documentada. Generalizado en H-19 (actualización
      // 2026-09-18): cualquier update() refresca personaId/estado/rol.
      if (trigger === 'update' && token.email) {
        try {
          const persona = await buscarPersonaPorEmail(token.email);
          token.personaId = persona?.id ?? token.personaId ?? null;
          token.estado = persona?.estado ?? token.estado ?? null;
          token.rol = persona?.rol ?? token.rol ?? [];
          token.temaPreferido = session?.temaPreferido ?? persona?.temaPreferido ?? token.temaPreferido;
        } catch (error) {
          console.error('[auth] jwt: no se pudo refrescar la Persona contra apps/api en update().', error);
        }
      }
      return token;
    },
    async session({ session, token }) {
      const personaId = (token.personaId as string | null) ?? null;
      const estado = (token.estado as 'activa' | 'pendiente_tutor' | null) ?? null;
      const rol = (token.rol as string[] | undefined) ?? [];

      session.user.personaId = personaId;
      session.user.estado = estado;
      session.user.rol = rol;
      session.user.temaPreferido =
        (token.temaPreferido as 'claro' | 'oscuro' | 'sistema' | undefined) ?? 'sistema';
      session.apiToken = await mintApiToken({
        email: session.user.email ?? '',
        personaId,
        estado,
        rol,
      });
      return session;
    },
  },
});
