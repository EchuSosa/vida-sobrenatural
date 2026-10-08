import NextAuth, { CredentialsSignin, type Session } from 'next-auth';
import { redirect } from 'next/navigation';
import { DURACION_SESION_WEB_S, tienePermiso, type Permiso } from '@vida-sobrenatural/shared-types';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';
import {
  testLoginHabilitado,
  buscarPersonaPorEmail,
  mintApiToken,
  autorizarCodigoEmail,
} from '@vida-sobrenatural/shared-types/auth-server';

/**
 * H-41 (revisión manual, revisión de código): `testLoginHabilitado()`,
 * `buscarPersonaPorEmail` y `mintApiToken` viven en
 * @vida-sobrenatural/shared-types/auth-server — eran idénticas a las de
 * apps/backoffice/src/auth.ts. El resto de este archivo (proveedores,
 * páginas, callbacks completos) sigue acá: difiere a propósito entre las
 * dos apps.
 */

/**
 * Captura given_name/family_name/picture por separado — el profile() default
 * de next-auth solo mapea `name` (completo) e `image`. given_name/family_name
 * pre-completan "Nombre"/"Apellido" como campos independientes en el
 * formulario de registro; picture se guarda en Persona.fotoUrl al registrarse.
 * `email_verified` (claim estándar del perfil OIDC de Google) se captura
 * como `emailVerificadoPorProveedor` — actualización 2026-09-17, FR-017,
 * Constitución Principio V: una cuenta SSO solo se vincula si el proveedor
 * confirma el email como verificado.
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
      emailVerificadoPorProveedor: profile.email_verified === true,
    };
  },
});

/**
 * spec 007 (T019, contracts/nextauth-codigo-email.md): un `code` del catálogo
 * (`CODIGO_INCORRECTO`, `CODIGO_SIN_INTENTOS`, `CODIGO_VENCIDO`,
 * `CODIGO_INVALIDO`) para que la acción de servidor lo muestre en el campo.
 */
export class ErrorCodigoIngreso extends CredentialsSignin {
  constructor(code: string) {
    super();
    this.code = code;
  }
}

/**
 * spec 007 (T019): ingreso con un código enviado al email. Registrado
 * SIEMPRE, también en producción (a diferencia de `test-login`). La API solo
 * confirma que el email es de quien escribe el código; quién entra y a dónde
 * lo deciden los mismos callbacks que para Google. Si la API no responde,
 * `verificarCodigoIngreso` lanza y el ingreso se bloquea (D88, FR-015).
 */
const codigoEmailProvider = Credentials({
  id: 'codigo-email',
  name: 'Código por email',
  credentials: { email: {}, codigo: {} },
  authorize: autorizarCodigoEmail((code) => new ErrorCodigoIngreso(code)),
});

const proveedores = testLoginHabilitado()
  ? [
      googleProvider,
      codigoEmailProvider,
      Credentials({
        id: 'test-login',
        name: 'Test login (solo E2E)',
        // `emailVerified` es un credential opcional (string "false" para
        // simular el caso negativo de FR-017) — por defecto se considera
        // verificado, ya que este proveedor reemplaza el login real de
        // Google solo para poder automatizar el flujo feliz.
        credentials: { email: {}, emailVerified: {} },
        authorize: async (credentials) => {
          const email = credentials?.email;
          if (typeof email !== 'string' || !email) return null;
          return {
            id: email,
            email,
            name: 'Visitante de Test',
            emailVerificadoPorProveedor: credentials?.emailVerified !== 'false',
          };
        },
      }),
    ]
  : [googleProvider, codigoEmailProvider];

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: proveedores,
  // spec 007 (FR-016): 30 días, renovándose una vez por día mientras se use.
  // Igual para Google y para el código.
  session: { strategy: 'jwt', maxAge: DURACION_SESION_WEB_S, updateAge: 24 * 60 * 60 },
  // H-14 (actualización 2026-09-18): la app no depende de las pantallas por
  // defecto de NextAuth (en inglés, sin el diseño propio) — signIn/signOut
  // ya tienen su propia UI (formulario de /registro, diálogo de "Cerrar
  // sesión" en Perfil); error reutiliza la pantalla de fail-closed de D88.
  pages: {
    // spec 007: la pantalla de ingreso (Google y código) es /ingresar.
    signIn: '/ingresar',
    signOut: '/',
    error: '/error-verificacion',
  },
  callbacks: {
    async signIn({ user }) {
      // FR-017 (actualización 2026-09-17): una cuenta SSO solo se vincula (o
      // arranca un registro) si el proveedor confirma el email como
      // verificado — chequeo ANTES de tocar apps/api, sin importar si el
      // email coincide con una Persona existente.
      if (user.emailVerificadoPorProveedor === false) {
        return '/email-no-verificado';
      }
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
    async jwt({ token, account, user, trigger, session }) {
      // Solo se resuelve contra apps/api en el login inicial (cuando `account`
      // está presente) — ver research.md, Decisión 6, sobre staleness de rol.
      if (account && token.email) {
        try {
          const persona = await buscarPersonaPorEmail(token.email);
          token.personaId = persona?.id ?? null;
          token.estado = persona?.estado ?? null;
          token.rol = persona?.rol ?? [];
          // Historia 5 (specs/002-base-transversal) — hidrata el tema sin
          // flash en el layout server-side (T078).
          token.temaPreferido = persona?.temaPreferido ?? 'sistema';
        } catch (error) {
          console.error('[auth] jwt: no se pudo resolver la Persona contra apps/api.', error);
        }
      }
      // `update()` desde el cliente — el JWT no se vuelve a resolver contra
      // apps/api en cada refresco (Decisión 6 de arriba), así que sin esto
      // la sesión seguiría mostrando datos viejos hasta el próximo login
      // real. Generalizado en H-19 (actualización 2026-09-18): CUALQUIER
      // update() vuelve a resolver personaId/estado/rol contra apps/api —
      // no solo cuando llega temaPreferido — para que apps/web/(publica)/
      // registro/page.tsx pueda refrescar la sesión apenas termina el
      // registro, sin esperar un nuevo login.
      if (trigger === 'update' && token.email) {
        try {
          const persona = await buscarPersonaPorEmail(token.email);
          token.personaId = persona?.id ?? token.personaId ?? null;
          token.estado = persona?.estado ?? token.estado ?? null;
          token.rol = persona?.rol ?? token.rol ?? [];
          // El valor pasado explícitamente por el cliente (SelectorTema)
          // gana sobre el recién leído de la base, para no depender de que
          // el PATCH ya haya terminado de persistir en ese instante exacto.
          token.temaPreferido = session?.temaPreferido ?? persona?.temaPreferido ?? token.temaPreferido;
        } catch (error) {
          console.error('[auth] jwt: no se pudo refrescar la Persona contra apps/api en update().', error);
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
 * spec 006, T020 (FR-024, contracts/navegacion.md): las pantallas del
 * Discipulador en la web app (Mis discipulados, Mi disponibilidad) exigen un
 * permiso del catálogo (D132), resuelto con la MISMA regla que el backoffice
 * (`tienePermiso` de shared-types). Sin el permiso, la persona vuelve a Mi
 * camino sin ver datos de nadie (la API, además, se los rechaza). Sin sesión,
 * lo resuelve el layout de la app.
 */
export async function requerirPermiso(permiso: Permiso): Promise<Session> {
  const session = await auth();
  if (!session) redirect('/registro');
  if (!tienePermisoSesion(session, permiso)) redirect('/mi-camino');
  return session;
}

/** Qué mostrar DENTRO de una pantalla según un permiso del catálogo (nunca un rol literal). */
export function tienePermisoSesion(session: Session, permiso: Permiso): boolean {
  return tienePermiso(session.user.rol, permiso);
}
