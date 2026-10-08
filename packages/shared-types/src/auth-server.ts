import { SignJWT } from 'jose';
import { normalizarEmail } from './codigo-ingreso.js';

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

/**
 * spec 007 (contracts/codigo-ingreso-api.md, contracts/nextauth-codigo-email.md):
 * las llamadas servidor-a-servidor del ingreso con código, iguales en las dos
 * apps (H-41). Lo que difiere (el proveedor de Auth.js con su
 * `CredentialsSignin`, la cookie de la web, a dónde se va después) queda en
 * cada app. Nunca se loguea el email ni el código (FR-020).
 */
export type ResultadoPedidoCodigo =
  | { ok: true }
  | { ok: false; errores: Array<{ campo: 'email' | 'codigo'; code: string }>; reintentarEn?: number };

interface ProblemaApi {
  code?: string;
  errors?: Array<{ campo: 'email' | 'codigo'; code: string }>;
  reintentarEn?: number;
}

function urlApi(ruta: string): string {
  return `${process.env.API_BASE_URL ?? 'http://localhost:3333'}${ruta}`;
}

async function leerProblema(response: Response): Promise<ProblemaApi> {
  try {
    return (await response.json()) as ProblemaApi;
  } catch {
    return {};
  }
}

/**
 * `POST /auth/codigo-ingreso/pedidos`. Una API que no responde se muestra como
 * un envío fallido ("probá de nuevo en unos minutos"): pedir un código no
 * deja entrar a nadie, así que no hace falta la pantalla de fail-closed.
 */
export async function pedirCodigoIngreso(email: string, origen: string): Promise<ResultadoPedidoCodigo> {
  const fallido: ResultadoPedidoCodigo = { ok: false, errores: [{ campo: 'email', code: 'ENVIO_EMAIL_FALLIDO' }] };
  let response: Response;
  try {
    response = await fetch(urlApi('/auth/codigo-ingreso/pedidos'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Secret': process.env.INTERNAL_API_SECRET ?? '',
        'X-Origen-Cliente': origen,
      },
      body: JSON.stringify({ email }),
    });
  } catch {
    return fallido;
  }
  if (response.status === 202) return { ok: true };
  if (response.status === 400 || response.status === 429) {
    const problema = await leerProblema(response);
    const errores = problema.errors?.length ? problema.errors : [{ campo: 'email' as const, code: problema.code ?? 'EMAIL_INVALIDO' }];
    return { ok: false, errores, ...(problema.reintentarEn ? { reintentarEn: problema.reintentarEn } : {}) };
  }
  return fallido;
}

export type ResultadoVerificacionCodigo = { ok: true; email: string } | { ok: false; code: string };

/**
 * `POST /auth/codigo-ingreso/verificaciones`. `422` y `400` son respuestas del
 * código (van al campo); cualquier otra cosa, o la API sin responder, **lanza**:
 * el ingreso se bloquea (D88, FR-015, fail-closed).
 */
export async function verificarCodigoIngreso(email: string, codigo: string): Promise<ResultadoVerificacionCodigo> {
  const response = await fetch(urlApi('/auth/codigo-ingreso/verificaciones'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Internal-Secret': process.env.INTERNAL_API_SECRET ?? '' },
    body: JSON.stringify({ email, codigo }),
  });
  if (response.status === 200) {
    const cuerpo = (await response.json()) as { email: string };
    return { ok: true, email: cuerpo.email };
  }
  if (response.status === 422 || response.status === 400) {
    const problema = await leerProblema(response);
    const delCodigo = problema.errors?.find((e) => e.campo === 'codigo')?.code;
    return { ok: false, code: problema.code === 'VALIDACION' ? (delCodigo ?? 'CODIGO_INVALIDO') : (problema.code ?? 'CODIGO_INCORRECTO') };
  }
  throw new Error(`POST /auth/codigo-ingreso/verificaciones respondió ${response.status}`);
}

/**
 * spec 007 (T019, T034): el `authorize()` del proveedor `codigo-email`, igual
 * en las dos apps (H-41). `crearError` arma la subclase de `CredentialsSignin`
 * de cada app (shared-types no depende de `next-auth`). Si la API no responde,
 * `verificarCodigoIngreso` lanza un `Error` común: Auth.js lo trata como error
 * de configuración y el ingreso se bloquea (D88, FR-015).
 */
export function autorizarCodigoEmail(crearError: (code: string) => Error) {
  return async (credentials: Partial<Record<'email' | 'codigo', unknown>> | undefined) => {
    const email = typeof credentials?.email === 'string' ? normalizarEmail(credentials.email) : '';
    const codigo = typeof credentials?.codigo === 'string' ? credentials.codigo : '';
    const resultado = await verificarCodigoIngreso(email, codigo);
    if (!resultado.ok) throw crearError(resultado.code);
    return { id: resultado.email, email: resultado.email, name: null, emailVerificadoPorProveedor: true as const };
  };
}
