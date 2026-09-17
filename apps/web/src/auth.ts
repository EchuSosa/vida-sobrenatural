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

/**
 * Captura given_name/family_name/picture por separado — el profile() default
 * de next-auth solo mapea `name` (completo) e `image`. given_name/family_name
 * pre-completan "Nombre"/"Apellido" como campos independientes en el
 * formulario de registro; picture se guarda en Persona.fotoUrl al registrarse.
 */
const googleProvider = Google({
  profile(profile) {
    return {
      id: profile.sub,
      name: profile.name,
      email: profile.email,
      image: profile.picture,
      givenName: profile.given_name ?? null,
      familyName: profile.family_name ?? null,
    };
  },
});

const proveedores = testLoginHabilitado
  ? [
      googleProvider,
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
  providers: proveedores,
  session: { strategy: 'jwt' },
  callbacks: {
    async signIn({ user }) {
      // FR-008: una Persona pendiente_tutor no debe poder iniciar sesión —
      // se la redirige a la pantalla de espera en vez de completar el login.
      if (!user.email) return true;
      try {
        const persona = await buscarPersonaPorEmail(user.email);
        if (persona?.estado === 'pendiente_tutor') {
          return '/pendiente-tutor';
        }
        return true;
      } catch (error) {
        // Si apps/api no responde (caída, INTERNAL_API_SECRET desalineado,
        // etc.), no podemos confirmar si esta Persona es pendiente_tutor —
        // bloqueamos el login por completo en vez de dejarlo pasar sin rol,
        // y mandamos a una pantalla propia con un mensaje claro en vez del
        // AccessDenied opaco que arma Auth.js por defecto ante cualquier
        // excepción de este callback.
        console.error('[auth] signIn: no se pudo verificar la Persona contra apps/api.', error);
        return '/error-verificacion';
      }
    },
    async jwt({ token, account, user }) {
      // Solo se resuelve contra apps/api en el login inicial (cuando `account`
      // está presente) — ver research.md, Decisión 6, sobre staleness de rol.
      if (account && token.email) {
        try {
          const persona = await buscarPersonaPorEmail(token.email);
          token.personaId = persona?.id ?? null;
          token.estado = persona?.estado ?? null;
          token.rol = persona?.rol ?? [];
        } catch (error) {
          console.error('[auth] jwt: no se pudo resolver la Persona contra apps/api.', error);
        }
      }
      // `user` solo está presente en el login inicial (viene del profile()
      // de Google) — se persiste en el token para que sobreviva a refrescos.
      if (user) {
        token.givenName = user.givenName ?? null;
        token.familyName = user.familyName ?? null;
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
      session.user.givenName = (token.givenName as string | null) ?? null;
      session.user.familyName = (token.familyName as string | null) ?? null;
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
