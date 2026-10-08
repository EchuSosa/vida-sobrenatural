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
  crearGrupo,
  crearPersona,
  pedirVidaNuevaComo,
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

/** Abre la ruta y comprueba que la sesión llegó a la pantalla, no al 404 (H-132, abajo). */
async function abrirRuta(page: Page, item: ItemNavBackoffice) {
  await page.goto(item.href);
  await page.waitForLoadState('networkidle');
  await esperarPaginaReal(page, item.href);
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
 * mismo comentario en apps/web/e2e/axe-todas-las-rutas.spec.ts. *
 * H-149: UN test por ruta, no uno que recorra las 18. Recorriéndolas todas
 * en un solo `test()`, en CI no entraba en los 30 s (tres intentos, los tres
 * timeout) y el informe decía "algo de las 18 se pasó de tiempo", no cuál.
 * Así el informe nombra la ruta, y cada una tiene su propio presupuesto.
 * El timeout NO se subió: eso callaba el síntoma sin decir dónde está.
 */
/**
 * H-132: el smoke audita la PANTALLA, no el 404. Con las 18 rutas exigiendo
 * su permiso, una sesión sin ese permiso cae en "No encontramos esta
 * sección" y el smoke terminaría auditando el 404 en su lugar, en silencio
 * (por eso cada ruta se visita con la Persona que tiene su permiso, arriba).
 * Las rutas dinámicas (`/sedes/[id]`) se visitan con el `[id]` literal y SÍ
 * son un 404 de su segmento — se auditan así, a propósito. Salvo las tres de
 * la 004, que van con ids reales (T062, `CON_ID_REAL` abajo) y sí exigen la
 * pantalla, no el 404.
 */
async function esperarPaginaReal(page: Page, href: string) {
  if (href.includes('[')) return;
  await expect(page.getByRole('heading', { name: 'No encontramos esta sección' }), `${href}: la sesión del smoke recibió 404`).toHaveCount(0);
}

/**
 * specs/004, T062: las rutas `[id]` de la 004 se auditan con ids REALES
 * (una Solicitud pendiente y un Grupo en curso, armados por la API una vez por
 * corrida), no con el `[id]` literal: su pantalla tiene contenido propio que el
 * 404 no muestra. (`/mis-discipulados/[id]` pasó a la web app, spec 006.)
 */
const CON_ID_REAL: Record<string, { ruta: (ids: IdsReales) => string; loguearse?: (page: Page) => Promise<void> }> = {
  '/solicitudes/[id]': { ruta: (ids) => `/solicitudes/${ids.solicitudId}` },
  '/grupos/[id]': { ruta: (ids) => `/grupos/${ids.grupoId}` },
  // spec 013 (T014): el perfil de la Persona que pidió, con su Solicitud en el historial.
  '/personas/[id]': { ruta: (ids) => `/personas/${ids.personaId}` },
  // spec 013 (T083): el formulario de edición de esa misma Persona.
  '/personas/[id]/editar': { ruta: (ids) => `/personas/${ids.personaId}/editar` },
};
interface IdsReales {
  solicitudId: string;
  grupoId: string;
  personaId: string;
}
let idsReales: IdsReales | undefined;

async function asegurarIdsReales(): Promise<IdsReales> {
  if (!idsReales) {
    const sufijo = Date.now();
    const pide = await crearPersona(`e2e-axe-solicitud-${sufijo}@example.com`, { nombre: 'Axe', apellido: `Solicitud ${sufijo}` });
    const cursa = await crearPersona(`e2e-axe-grupo-${sufijo}@example.com`, { nombre: 'Axe', apellido: `Grupo ${sufijo}` });
    const solicitudId = await pedirVidaNuevaComo(pide.email);
    const { grupoId } = await crearGrupo([cursa]);
    idsReales = { solicitudId, grupoId, personaId: pide.id };
  }
  return idsReales;
}

for (const tema of ['claro', 'oscuro'] as const) {
  test.describe(`modo ${tema}`, () => {
    test.beforeEach(async ({ page }) => {
      if (tema === 'oscuro') {
        await page.addInitScript(() => window.localStorage.setItem('theme', 'dark'));
      }
    });

    for (const item of NAV_BACKOFFICE) {
      test(`${item.href} sin violaciones de axe`, async ({ page }) => {
        const conId = CON_ID_REAL[item.href];
        if (conId) {
          const href = conId.ruta(await asegurarIdsReales());
          await (conId.loguearse ?? sesionPara(item).loguearse)(page);
          await abrirRuta(page, { ...item, href });
        } else {
          await sesionPara(item).loguearse(page);
          await abrirRuta(page, item);
        }
        const { violations } = await auditar(page);
        expect(violations, `${item.href}: ${JSON.stringify(violations, null, 2)}`).toEqual([]);
      });
    }
  });
}

/**
 * H-62 (revisión manual ronda 5, punto 5): mismo chequeo que
 * apps/web/e2e/axe-todas-las-rutas.spec.ts — ver el comentario ahí. 320 px
 * es el piso real, 375 el iPhone SE de la ronda de verificación. *
 * H-149: un test por ruta, igual que el smoke de axe de arriba.
 */
const ANCHOS_CELULAR = [
  { width: 320, height: 568 },
  { width: 375, height: 667 },
];

for (const viewport of ANCHOS_CELULAR) {
  test.describe(`sin scroll horizontal a ${viewport.width}px`, () => {
    test.use({ viewport });

    for (const item of NAV_BACKOFFICE) {
      test(item.href, async ({ page }) => {
        await sesionPara(item).loguearse(page);
        await abrirRuta(page, item);
        const sinDesborde = await page.evaluate(() => document.scrollingElement!.scrollWidth <= window.innerWidth);
        expect(sinDesborde, `${item.href}: hay scroll horizontal a ${viewport.width}px`).toBe(true);
      });
    }
  });
}
