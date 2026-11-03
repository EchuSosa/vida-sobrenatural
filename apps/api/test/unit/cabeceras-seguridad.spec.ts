import { cabecerasDeSeguridadApi, cabecerasDeSeguridadWeb, ipDelCliente, modoCsp, origenesCors } from '@vida-sobrenatural/shared-types';

/** docs/25 (S-04, S-06, S-08): valores por defecto de producción y lo que se puede cambiar por entorno. */
const cabeceras = (lista: Array<[string, string]>) => Object.fromEntries(lista);
const PROD = { NODE_ENV: 'production', NEXT_PUBLIC_API_BASE_URL: 'https://api.ejemplo.org/x', WEB_URL: 'https://web.ejemplo.org', BACKOFFICE_URL: 'https://bo.ejemplo.org/' };
const headers = (h: Record<string, string>) => ({ get: (n: string) => h[n.toLowerCase()] ?? null });

describe('Cabeceras de seguridad (S-04)', () => {
  it('en producción: nosniff, referrer, sin embeber, HSTS de un año y CSP en modo aviso', () => {
    const c = cabeceras(cabecerasDeSeguridadWeb(PROD));
    expect(c['X-Content-Type-Options']).toBe('nosniff');
    expect(c['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
    expect(c['X-Frame-Options']).toBe('DENY');
    expect(c['Strict-Transport-Security']).toBe('max-age=31536000; includeSubDomains');
    expect(c['Content-Security-Policy']).toBeUndefined();
    const csp = c['Content-Security-Policy-Report-Only'];
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("connect-src 'self' https://api.ejemplo.org");
    expect(csp).not.toContain("'unsafe-eval'");
  });

  it('fuera de producción: sin HSTS ni CSP (next dev usa eval), el resto igual', () => {
    const c = cabeceras(cabecerasDeSeguridadWeb({ NODE_ENV: 'development' }));
    expect(c['X-Frame-Options']).toBe('DENY');
    expect(c['Strict-Transport-Security']).toBeUndefined();
    expect(c['Content-Security-Policy-Report-Only']).toBeUndefined();
    expect(modoCsp({})).toBe('off');
  });

  it('se puede cambiar por variable: CSP que bloquea, HSTS propio o apagado, todo apagado', () => {
    const c = cabeceras(cabecerasDeSeguridadWeb({ ...PROD, CSP_MODO: 'enforce', HSTS: '600', CSP_CONEXIONES_EXTRA: 'https://otra.org, https://mas.org' }));
    expect(c['Content-Security-Policy']).toContain('https://otra.org https://mas.org');
    expect(c['Strict-Transport-Security']).toBe('max-age=600; includeSubDomains');
    expect(cabeceras(cabecerasDeSeguridadWeb({ ...PROD, HSTS: 'off' }))['Strict-Transport-Security']).toBeUndefined();
    expect(cabecerasDeSeguridadWeb({ ...PROD, CABECERAS_SEGURIDAD: 'off' })).toEqual([]);
    expect(modoCsp({ ...PROD, CSP_MODO: 'cualquiera' })).toBe('report-only');
  });

  it('la API manda las suyas (sin CSP: no sirve páginas)', () => {
    const c = cabeceras(cabecerasDeSeguridadApi(PROD));
    expect(c).toEqual({ 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'X-Frame-Options': 'DENY', 'Strict-Transport-Security': 'max-age=31536000; includeSubDomains' });
  });
});

describe('CORS de la API (S-08)', () => {
  it('en producción, solo la web y el backoffice; con CORS_ORIGENES, esos', () => {
    expect(origenesCors(PROD)).toEqual(['https://web.ejemplo.org', 'https://bo.ejemplo.org']);
    expect(origenesCors({ ...PROD, CORS_ORIGENES: 'https://a.org/, https://b.org' })).toEqual(['https://a.org', 'https://b.org']);
  });

  it('fuera de producción, cualquiera (desarrollo local); en producción sin URLs, ninguno', () => {
    expect(origenesCors({ NODE_ENV: 'development' })).toBe(true);
    expect(origenesCors({ NODE_ENV: 'production' })).toEqual([]);
  });
});

describe('IP real del cliente (S-06)', () => {
  const h = headers({ 'x-forwarded-for': '6.6.6.6, 10.0.0.1', 'fly-client-ip': '200.1.2.3' });
  it('sin IP_REAL_HEADER, como hasta ahora: la primera de x-forwarded-for', () => {
    expect(ipDelCliente(h, {})).toBe('6.6.6.6');
  });
  it('con IP_REAL_HEADER=fly-client-ip, solo esa; si falta, desconocido (nunca la que escribe el navegador)', () => {
    expect(ipDelCliente(h, { IP_REAL_HEADER: 'Fly-Client-IP' })).toBe('200.1.2.3');
    expect(ipDelCliente(headers({ 'x-forwarded-for': '6.6.6.6' }), { IP_REAL_HEADER: 'fly-client-ip' })).toBe('desconocido');
  });
});
