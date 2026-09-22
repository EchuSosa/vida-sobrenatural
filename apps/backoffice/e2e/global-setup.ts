import { prepararBaseE2e } from '../../../scripts/e2e-base-datos.cjs';

/**
 * H-78 (revisión manual): antes de esto, este globalSetup solo sembraba el
 * fixture de e2e-admin contra la API/base de DESARROLLO (execSync
 * heredando el entorno del shell, sin DATABASE_URL propio) — exactamente
 * el mismo agujero que apps/web, del lado del backoffice. Ya rompió la
 * base de desarrollo tres veces (H-17, H-67, la Palabra Profética
 * vigente).
 *
 * Ahora esta corrida tiene su propia base (vidasobrenatural_e2e, compartida
 * con apps/web) y su propia API/app (ver los `webServer` de
 * playwright.config.ts, puertos 3335/3012 acá — 3334/3011 en apps/web,
 * para que las dos suites no choquen si corren a la vez).
 * `prepararBaseE2e()` (scripts/e2e-base-datos.cjs, compartida con
 * apps/web — no duplicada, Principio XI) la crea si falta, la resetea
 * (H-97: sembrar no alcanza para reparar) y siembra el
 * admin/pastor/otro-rol de e2e — con una guarda que aborta ruidoso si
 * DATABASE_URL no es exactamente la base de e2e.
 */
export default async function globalSetup() {
  await prepararBaseE2e();
}
