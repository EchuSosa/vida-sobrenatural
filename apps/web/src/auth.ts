import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';
import { SignJWT } from 'jose';

/**
 * Proveedor habilitado únicamente para el E2E de Playwright (T028). Gateado
 * en CÓDIGO, no solo por configuración: `NODE_ENV === 'production'` lo
 * excluye siempre, sin importar qué valor tenga `ALLOW_TEST_LOGIN` — así una
 * env var mal seteada en producción no alcanza para habilitarlo por
 * accidente. Reemplaza el login real de Google, que no se puede automatizar
 * sin credenciales reales, sin reimplementar el cifrado interno de sesión de
 * NextAuth (se sigue pasando por su `signIn()` real).
 */
const testLoginHabilitado =
  process.env.NODE_ENV !== 'production' && process.env.ALLOW_TEST_LOGIN === 'true';

const proveedores = testLoginHabilitado
  ? [
      Google,
      Credentials({
        id: 'test-login',
        name: 'Test login (solo E2E)',
        credentials: { email: {} },
        authorize: async (credentials) => {
          const email = credentials?.email;
          if (typeof email !== 'string' || !email) return null;
          return { id: email, email, name: 'Visitante de Test' };
        },
      }),
    ]
  : [Google];

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
}

async function buscarPersonaPorEmail(email: string): Promise<PersonaLookup | null> {
  const baseUrl = process.env.API_BASE_URL ?? 'http://localhost:3000';
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
  providers: proveedores,
  session: { strategy: 'jwt' },
  callbacks: {
    async signIn({ user }) {
      // FR-008: una Persona pendiente_tutor no debe poder iniciar sesión —
      // se la redirige a la pantalla de espera en vez de completar el login.
      if (!user.email) return true;
      const persona = await buscarPersonaPorEmail(user.email);
      if (persona?.estado === 'pendiente_tutor') {
        return '/pendiente-tutor';
      }
      return true;
    },
    async jwt({ token, account }) {
      // Solo se resuelve contra apps/api en el login inicial (cuando `account`
      // está presente) — ver research.md, Decisión 6, sobre staleness de rol.
      if (account && token.email) {
        const persona = await buscarPersonaPorEmail(token.email);
        token.personaId = persona?.id ?? null;
        token.estado = persona?.estado ?? null;
        token.rol = persona?.rol ?? [];
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
