import type { Page } from '@playwright/test';
import { CATALOGO_PERMISOS, type RolDeCargo } from '@vida-sobrenatural/shared-types';
import {
  test,
  expect,
  auditar,
  loguearseComoAdminE2E,
  loguearseComoPastorE2E,
  loguearseComoOtroRolE2E,
  loguearseComoLiderCursoE2E,
} from './helpers';
import { NAV_BACKOFFICE, type ItemNavBackoffice } from '../src/config/nav';

/**
 * T073 (H-138): una Persona de e2e por rol de cargo, cada una con UN rol. El
 * smoke ya no usa un superusuario: cada ruta se visita con la Persona cuyo rol
 * tiene el permiso de esa ruta, resuelto contra CATALOGO_PERMISOS (la misma
 * fuente que requerirPermiso). Si una ruta no la alcanza ninguna, falla — no
 * se saltea en silencio.
 */
const SESIONES_POR_ROL: Array<{ rol: RolDeCargo; loguearse: (page: Page) => Promise<void> }> = [
  { rol: 'admin', loguearse: loguearseComoAdminE2E },
  { rol: 'pastor', loguearse: loguearseComoPastorE2E },
  { rol: 'discipulador', loguearse: loguearseComoOtroRolE2E },
  { rol: 'lider_curso', loguearse: loguearseComoLiderCursoE2E },
];

function sesionPara(item: ItemNavBackoffice) {
  const sesion =
    item.permiso === 'cualquier-sesion'
      ? SESIONES_POR_ROL[0]
      : SESIONES_POR_ROL.find((s) => CATALOGO_PERMISOS[item.permiso as Exclude<typeof item.permiso, 'cualquier-sesion'>].includes(s.rol));
  if (!sesion) throw new Error(`${item.href}: ninguna Persona de e2e tiene el permiso "${item.permiso}" — sumá una en sembrar-e2e-admin.ts`);
  return sesion;
}

/** Recorre NAV_BACKOFFICE iniciando sesión, en cada ruta, con la Persona que puede abrirla. */
async function recorrerRutas(page: Page, enCadaRuta: (item: ItemNavBackoffice) => Promise<void>) {
  let rolActual: RolDeCargo | null = null;
  for (const item of NAV_BACKOFFICE) {
    const sesion = sesionPara(item);
    if (sesion.rol !== rolActual) {
      await page.context().clearCookies();
      await sesion.loguearse(page);
      rolActual = sesion.rol;
    }
    await page.goto(item.href);
    await page.waitForLoadState('networkidle');
    await esperarPaginaReal(page, item.href);
    await enCadaRuta(item);
  }
}

/**
 * H-61 (revisión manual, punto 2): audita TODAS las rutas con axe, no solo
 * los flujos críticos que ya cubren los demás e2e — en los dos temas. La
 * lista de rutas sale de nav.ts (NAV_BACKOFFICE), no de un array a mano que
 * se desactualice (Principio XI). Todas las rutas del backoffice requieren
 * sesión — no hay una lista pública separada acá.
 *
 * D106/H-22: el tema por defecto es claro, no "system" — se fuerza oscuro
 * escribiendo la misma clave de localStorage que lee next-themes, ver el
 * mismo comentario en apps/web/e2e/axe-todas-las-rutas.spec.ts.
 */
/**
 * H-132: el smoke audita la PANTALLA, no el 404. Con las 18 rutas exigiendo
 * su permiso, una sesión sin ese permiso cae en "No encontramos esta
 * sección" y el smoke terminaría auditando el 404 en su lugar, en silencio
 * (por eso cada ruta se visita con la Persona que tiene su permiso, arriba).
 * Las rutas dinámicas (`/sedes/[id]`) se visitan con el `[id]` literal y SÍ
 * son un 404 de su segmento — se auditan así, a propósito.
 */
async function esperarPaginaReal(page: Page, href: string) {
  if (href.includes('[')) return;
  await expect(page.getByRole('heading', { name: 'No encontramos esta sección' }), `${href}: la sesión del smoke recibió 404`).toHaveCount(0);
}

for (const tema of ['claro', 'oscuro'] as const) {
  test.describe(`modo ${tema}`, () => {
    test.beforeEach(async ({ page }) => {
      if (tema === 'oscuro') {
        await page.addInitScript(() => window.localStorage.setItem('theme', 'dark'));
      }
    });

    test('todas las rutas del backoffice sin violaciones de axe', async ({ page }) => {
      await recorrerRutas(page, async (item) => {
        const { violations } = await auditar(page);
        expect(violations, `${item.href}: ${JSON.stringify(violations, null, 2)}`).toEqual([]);
      });
    });
  });
}

/**
 * H-62 (revisión manual ronda 5, punto 5): mismo chequeo que
 * apps/web/e2e/axe-todas-las-rutas.spec.ts — ver el comentario ahí. 320 px
 * es el piso real, 375 el iPhone SE de la ronda de verificación.
 */
const ANCHOS_CELULAR = [
  { width: 320, height: 568 },
  { width: 375, height: 667 },
];

for (const viewport of ANCHOS_CELULAR) {
  test.describe(`sin scroll horizontal a ${viewport.width}px`, () => {
    test.use({ viewport });

    test('todas las rutas del backoffice', async ({ page }) => {
      await recorrerRutas(page, async (item) => {
        const sinDesborde = await page.evaluate(() => document.scrollingElement!.scrollWidth <= window.innerWidth);
        expect(sinDesborde, `${item.href}: hay scroll horizontal a ${viewport.width}px`).toBe(true);
      });
    });
  });
}
