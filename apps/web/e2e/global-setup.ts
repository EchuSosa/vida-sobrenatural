import { prepararBaseE2e } from '../../../scripts/e2e-base-datos.cjs';

/**
 * H-78 (revisión manual): antes de esto, los e2e de apps/web corrían
 * contra la API y la base de DESARROLLO (localhost:3333, DB
 * `vidasobrenatural`) — la única protección era el prefijo `e2e-` y el
 * globalTeardown que limpia por ese prefijo al final, que limpia
 * DESPUÉS, no aísla. Ya rompió la base de desarrollo tres veces (H-17,
 * H-67, y la Palabra Profética vigente borrada a mitad de una corrida).
 *
 * Ahora cada corrida tiene su propia base (vidasobrenatural_e2e) y su
 * propia API/app (ver los `webServer` de playwright.config.ts, puertos
 * 3334/3011 acá — 3335/3012 en apps/backoffice, para que las dos suites no
 * choquen si corren a la vez). `prepararBaseE2e()` (scripts/e2e-base-datos.cjs)
 * la crea si falta, la resetea (H-97: sembrar no alcanza para reparar) y
 * siembra el fixture de e2e-admin — con una guarda que aborta ruidoso si
 * DATABASE_URL no es exactamente la base de e2e.
 */
export default async function globalSetup() {
  await prepararBaseE2e();
}
