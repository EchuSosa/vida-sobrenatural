import { expect, type Page } from '@playwright/test';
import { CATALOGO_PERMISOS } from '@vida-sobrenatural/shared-types';
import { NAV_BACKOFFICE } from '../src/config/nav';

/**
 * specs/005, T046 (T044/T071): la suite navega por URL, así que es
 * estructuralmente incapaz de ver un control que OFRECE algo inalcanzable —
 * el enlace "Papelera" de Libros se le mostró al Pastor desde H-129 y ningún
 * e2e lo notó, porque todos iban a /libros/papelera directo. Por eso T044
 * tuvo que ser una tabla a mano.
 *
 * Esto la vuelve mecánica: para la sesión REAL (roles leídos de
 * /api/auth/session, no de lo que el test cree), recorre cada pantalla que
 * esa sesión puede abrir, junta los `href` renderizados, y resuelve cada uno
 * contra NAV_BACKOFFICE + CATALOGO_PERMISOS — la misma fuente que
 * requerirPermiso. Un `href` que la sesión no puede abrir es una falla.
 *
 * - Las rutas dinámicas (`/sedes/[id]`) se descubren de los propios enlaces:
 *   la primera concreta que aparece se visita también.
 * - `/` siempre es alcanzable: resuelve destino para cualquier sesión (H-134).
 * - Un `href` interno que no está en NAV_BACKOFFICE también es una falla
 *   (una pantalla sin registrar no tiene permiso que resolver).
 * - Se ignoran otros orígenes, anclas (#...), `/api/...` y `/archivos/...`.
 *
 * Devuelve, además de las pantallas visitadas, los `href` internos
 * recolectados POR PANTALLA (`hrefsPorPantalla`).
 *
 * Lo que NO ve: enlaces que no están en el DOM (dentro de un menú o diálogo
 * cerrado). Para esos, el test abre la pantalla que corresponda y la pasa en
 * `paginasExtra`, o los verifica por su cuenta.
 */
export async function verificarEnlacesAlcanzables(page: Page, paginasExtra: string[] = []) {
  const sesion = (await (await page.request.get('/api/auth/session')).json()) as { user?: { rol?: string[] } };
  const roles = sesion.user?.rol ?? [];

  const patrones = NAV_BACKOFFICE.map((item) => ({
    href: item.href,
    permiso: item.permiso,
    dinamica: item.href.includes('['),
    regex: new RegExp('^' + item.href.replace(/\[[^\]]+\]/g, '[^/]+') + '$'),
  }));
  // Como el ruteo de Next: un segmento estático le gana a uno dinámico —
  // `/sedes/papelera` es la papelera, no una Sede con id "papelera".
  const entradaDe = (ruta: string) =>
    patrones.find((p) => !p.dinamica && p.href === ruta) ?? patrones.find((p) => p.dinamica && p.regex.test(ruta));
  const puedeAbrir = (ruta: string): boolean | 'sin-entrada' => {
    if (ruta === '/') return true;
    const entrada = entradaDe(ruta);
    if (!entrada) return 'sin-entrada';
    if (entrada.permiso === 'cualquier-sesion') return true;
    return CATALOGO_PERMISOS[entrada.permiso].some((rol) => roles.includes(rol));
  };

  const porVisitar = [
    ...patrones.filter((p) => !p.dinamica && puedeAbrir(p.href) === true).map((p) => p.href),
    ...paginasExtra,
  ];
  const visitadas = new Set<string>();
  const dinamicasVistas = new Set<string>();
  const fallas: string[] = [];
  // Para el diferencial entre sesiones (todo href que ve el Admin y que otra
  // sesión también podría abrir tiene que aparecerle a esa sesión) — el
  // INVERSO de lo que chequea esta función, al que es ciega por
  // construcción: un enlace que no se renderiza no está en el DOM.
  const hrefsPorPantalla: Record<string, string[]> = {};

  while (porVisitar.length > 0) {
    const ruta = porVisitar.shift()!;
    if (visitadas.has(ruta)) continue;
    visitadas.add(ruta);
    await page.goto(ruta);
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'No encontramos esta sección' }), `${ruta}: la sesión no puede abrir esta pantalla`).toHaveCount(0);

    const origen = new URL(page.url()).origin;
    const hrefs = await page.locator('a[href]').evaluateAll((as) => as.map((a) => (a as HTMLAnchorElement).href));
    const internos = new Set<string>();
    for (const absoluto of new Set(hrefs)) {
      const url = new URL(absoluto);
      if (url.origin !== origen) continue;
      const destino = url.pathname.replace(/\/$/, '') || '/';
      if (destino.startsWith('/api/') || destino.startsWith('/archivos/')) continue;
      if (url.pathname === new URL(page.url()).pathname && url.hash) continue;
      internos.add(destino);

      const veredicto = puedeAbrir(destino);
      if (veredicto === 'sin-entrada') fallas.push(`${ruta} → ${destino}: no tiene entrada en NAV_BACKOFFICE`);
      else if (!veredicto) fallas.push(`${ruta} → ${destino}: esta sesión (${roles.join(', ') || 'sin roles'}) no puede abrirla`);
      else {
        const entrada = entradaDe(destino);
        if (entrada?.dinamica && !dinamicasVistas.has(entrada.href)) {
          dinamicasVistas.add(entrada.href);
          porVisitar.push(destino);
        }
      }
    }
    hrefsPorPantalla[ruta] = [...internos].sort();
  }

  expect(fallas, `enlaces a pantallas inalcanzables para esta sesión:\n${fallas.join('\n')}`).toEqual([]);
  return { roles, visitadas: [...visitadas], hrefsPorPantalla };
}
