import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';
import { notFound } from 'next/navigation';
import {
  testLoginHabilitado,
  buscarPersonaPorEmail,
  mintApiToken,
} from '@vida-sobrenatural/shared-types/auth-server';
import { CATALOGO_PERMISOS, type Permiso } from '@vida-sobrenatural/shared-types';

/**
 * H-41 (revisión manual, revisión de código): `testLoginHabilitado()`,
 * `buscarPersonaPorEmail` y `mintApiToken` viven en
 * @vida-sobrenatural/shared-types/auth-server — eran idénticas a las de
 * apps/web/src/auth.ts. El resto de este archivo (proveedores, páginas,
 * callbacks completos) sigue acá: difiere a propósito entre las dos apps.
 */

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
 * excluye siempre. `apps/backoffice/playwright.config.ts` ya existe (H-34).
 */

const providers = testLoginHabilitado()
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

/**
 * H-116 (revisión manual): el chequeo "¿hay sesión?" ya lo hace
 * `apps/backoffice/src/app/layout.tsx`, para todo el backoffice — ninguna
 * `page.tsx` vuelve a llamarlo (regla `local/no-session-check-en-page`,
 * `eslint-rules/no-session-check-en-page.mjs`). Lo que sigue necesitando
 * cada página es el objeto de sesión ya tipado como no-nulo (`apiToken`,
 * `user.rol`) sin repetir el `if (!session)` que eso exigiría con `auth()`
 * a mano.
 *
 * El caso sin sesión SÍ pasa acá, y seguido — no es un bug del layout.
 * Verificado armando un build de producción y mirando el log del server:
 * Next.js arma el árbol de una ruta de adentro hacia afuera, así que
 * `page.tsx` (el "children" del layout) se ejecuta igual aunque el layout
 * después decida no usar ese resultado — el layout no evita la ejecución,
 * solo decide qué mandar. Con un `throw new Error(...)` común, esa
 * ejecución fantasma dejaba un stack trace de "esto no debería pasar
 * nunca" en el log de CADA visita sin sesión a una pantalla protegida —
 * ruido real, no un caso raro. `notFound()` (next/navigation, estable,
 * sin flag experimental) corta el segmento en el momento sin loguear nada
 * — Next lo reconoce como control de flujo de ruteo, no como una
 * excepción de la aplicación — y la respuesta final la sigue decidiendo el
 * layout, que en la rama sin sesión ni siquiera llega a mirar `children`.
 */
export async function requerirSesion() {
  const session = await auth();
  if (!session) {
    notFound();
  }
  return session;
}

/**
 * research.md #3 del spec 005: hermano de `requerirSesion()` (H-116) —
 * llama primero a esa, después resuelve `permiso` contra `CATALOGO_PERMISOS`
 * (D132) y compara con los roles de la sesión. `notFound()` si no lo tiene,
 * mismo criterio que `requerirSesion` (nunca un mensaje que revele que la
 * pantalla existe a quien no puede verla).
 */
export async function requerirPermiso(permiso: Permiso) {
  const session = await requerirSesion();
  const rolesConPermiso = CATALOGO_PERMISOS[permiso];
  const tieneRol = rolesConPermiso.some((rol) => session.user.rol.includes(rol));
  if (!tieneRol) {
    notFound();
  }
  return session;
}
