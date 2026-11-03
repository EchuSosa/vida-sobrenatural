/**
 * docs/25 (S-04, S-06, S-08), pedido de Echu del 2026-11-03: las cabeceras de seguridad, CORS y la
 * IP real del cliente, configurables por variable de entorno con valores por defecto pensados para
 * producción. Una sola versión para la API y las dos apps de Next (Principio XI). Funciones puras:
 * reciben el entorno, no lo leen solas, así se prueban sin tocar `process.env`.
 *
 * Variables (todas opcionales):
 * - `CABECERAS_SEGURIDAD=off`: no manda ninguna (para depurar algo puntual).
 * - `CSP_MODO`: `enforce` | `report-only` | `off`. Por defecto `report-only` en producción (avisa
 *   sin bloquear, D: docs/25 S-04) y `off` fuera de producción (`next dev` usa `eval`).
 * - `CSP_CONEXIONES_EXTRA`: orígenes extra para `connect-src`, separados por coma.
 * - `HSTS`: `off` o los segundos de `max-age`. Por defecto un año en producción y `off` fuera.
 * - `CORS_ORIGENES` (API): orígenes permitidos, separados por coma. Por defecto, en producción,
 *   `WEB_URL` y `BACKOFFICE_URL`; fuera de producción, cualquiera (desarrollo local).
 * - `IP_REAL_HEADER`: la cabecera que pone el proxy de confianza con la IP del cliente (en Fly.io,
 *   `fly-client-ip`). Sin ella, se usa la primera de `x-forwarded-for` como hasta ahora.
 */
export type Entorno = Record<string, string | undefined>;

const UN_ANIO = 31_536_000;

const esProduccion = (env: Entorno) => env.NODE_ENV === 'production';

const lista = (valor: string | undefined): string[] =>
  (valor ?? '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);

function origen(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

export type ModoCsp = 'enforce' | 'report-only' | 'off';

export function modoCsp(env: Entorno): ModoCsp {
  const v = env.CSP_MODO?.trim();
  if (v === 'enforce' || v === 'report-only' || v === 'off') return v;
  return esProduccion(env) ? 'report-only' : 'off';
}

/**
 * La política de las apps de Next. Sin nonce todavía: `script-src` necesita `'unsafe-inline'` para
 * los scripts de hidratación de Next. Para pasar a `enforce` sin eso, ver la guía de CSP de Next
 * (nonce desde el proxy, renderizado dinámico).
 */
export function politicaCsp(env: Entorno): string {
  const conexiones = ["'self'", origen(env.NEXT_PUBLIC_API_BASE_URL), 'https://*.sentry.io', 'https://*.ingest.sentry.io', ...lista(env.CSP_CONEXIONES_EXTRA)].filter(
    (x): x is string => Boolean(x),
  );
  const directivas: Record<string, string[]> = {
    'default-src': ["'self'"],
    'script-src': ["'self'", "'unsafe-inline'", ...(esProduccion(env) ? [] : ["'unsafe-eval'"])],
    'style-src': ["'self'", "'unsafe-inline'"],
    // Fotos de perfil de Google, portadas y flyers de la API, y los `blob:` de las vistas previas.
    'img-src': ["'self'", 'data:', 'blob:', 'https:'],
    'font-src': ["'self'", 'data:'],
    'connect-src': [...new Set(conexiones)],
    // La Palabra Profética (video de YouTube, sin cookies).
    'frame-src': ['https://www.youtube-nocookie.com'],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    // El ingreso con Google pasa por accounts.google.com después de un POST propio.
    'form-action': ["'self'", 'https://accounts.google.com'],
    'frame-ancestors': ["'none'"],
  };
  return Object.entries(directivas)
    .map(([k, v]) => `${k} ${v.join(' ')}`)
    .join('; ');
}

function hsts(env: Entorno): string | null {
  const v = env.HSTS?.trim();
  if (v === 'off') return null;
  const segundos = v && /^\d+$/.test(v) ? Number(v) : esProduccion(env) ? UN_ANIO : null;
  return segundos ? `max-age=${segundos}; includeSubDomains` : null;
}

/** Las cabeceras de las páginas de web y backoffice (S-04). */
export function cabecerasDeSeguridadWeb(env: Entorno): Array<[string, string]> {
  if (env.CABECERAS_SEGURIDAD?.trim() === 'off') return [];
  const cabeceras: Array<[string, string]> = [
    ['X-Content-Type-Options', 'nosniff'],
    ['Referrer-Policy', 'strict-origin-when-cross-origin'],
    // Nadie embebe la app (clickjacking sobre acciones del Admin); lo mismo dice `frame-ancestors`.
    ['X-Frame-Options', 'DENY'],
    // La ubicación la usa la búsqueda de Grupos de Extensión (D224), solo en la propia app.
    ['Permissions-Policy', 'camera=(), microphone=(), payment=(), usb=(), geolocation=(self)'],
  ];
  const sts = hsts(env);
  if (sts) cabeceras.push(['Strict-Transport-Security', sts]);
  const modo = modoCsp(env);
  if (modo !== 'off') cabeceras.push([modo === 'enforce' ? 'Content-Security-Policy' : 'Content-Security-Policy-Report-Only', politicaCsp(env)]);
  return cabeceras;
}

/** Las cabeceras de la API: responde JSON y archivos, nunca páginas. */
export function cabecerasDeSeguridadApi(env: Entorno): Array<[string, string]> {
  if (env.CABECERAS_SEGURIDAD?.trim() === 'off') return [];
  const cabeceras: Array<[string, string]> = [
    ['X-Content-Type-Options', 'nosniff'],
    ['Referrer-Policy', 'no-referrer'],
    ['X-Frame-Options', 'DENY'],
  ];
  const sts = hsts(env);
  if (sts) cabeceras.push(['Strict-Transport-Security', sts]);
  return cabeceras;
}

/**
 * S-08: qué orígenes acepta la API. `true` = cualquiera (refleja el origen, como hasta ahora en
 * desarrollo); una lista = solo esos.
 */
export function origenesCors(env: Entorno): true | string[] {
  const explicitos = lista(env.CORS_ORIGENES);
  if (explicitos.length > 0) return explicitos.map((o) => origen(o) ?? o);
  if (!esProduccion(env)) return true;
  return [origen(env.WEB_URL), origen(env.BACKOFFICE_URL)].filter((x): x is string => Boolean(x));
}

/**
 * S-06: la IP del cliente. Con `IP_REAL_HEADER` (la pone el proxy de confianza y el navegador no la
 * puede falsear), solo esa: si falta, `desconocido`, nunca la de `x-forwarded-for`. Sin la
 * variable, como hasta ahora (desarrollo local).
 */
export function ipDelCliente(h: { get(nombre: string): string | null }, env: Entorno): string {
  const cabecera = env.IP_REAL_HEADER?.trim().toLowerCase();
  if (cabecera) return h.get(cabecera)?.trim() || 'desconocido';
  const reenviado = h.get('x-forwarded-for')?.split(',')[0]?.trim();
  return reenviado || h.get('x-real-ip')?.trim() || 'desconocido';
}
