import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import { SignJWT } from 'jose';

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
  providers: [Google],
  session: { strategy: 'jwt' },
  callbacks: {
    async signIn({ user }) {
      // FR-008: una Persona pendiente_tutor no debe poder iniciar sesión.
      if (!user.email) return true;
      const persona = await buscarPersonaPorEmail(user.email);
      if (persona?.estado === 'pendiente_tutor') {
        return false;
      }
      return true;
    },
    async jwt({ token, account }) {
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
