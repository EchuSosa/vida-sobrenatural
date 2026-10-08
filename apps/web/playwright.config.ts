import { defineConfig, devices } from '@playwright/test';
import { leerEnvE2e } from '../../scripts/e2e-base-datos.cjs';

/**
 * H-78 (revisión manual): puertos propios para el e2e de apps/web — 3011
 * (la app) y 3334 (su API) — distintos de los de desarrollo (3001/3333,
 * D104) y de los de apps/backoffice (3012/3335), para que ninguna de las
 * dos corridas reutilice el server de la otra ni la de desarrollo.
 * `reuseExistingServer: false` no es negociable acá (ver global-setup.ts):
 * si reutilizara un server ya levantado, sería el de desarrollo, y
 * volveríamos a estar exactamente donde estaba H-78.
 */
const envE2e = leerEnvE2e();

// Offset de puertos por worktree (lotes A–D de la 004): con varios `git
// worktree` corriendo e2e a la vez, cada uno suma su offset (10, 20, 30, 40)
// desde su `.env.e2e` para no chocar en puertos. Con el default 0 nada cambia.
const OFFSET_PUERTO = Number(envE2e.E2E_PUERTO_OFFSET) || 0;

const PUERTO_APP = 3011 + OFFSET_PUERTO;
const PUERTO_API = 3334 + OFFSET_PUERTO;

// H-78: ingresar.spec.ts (y cualquier otro test que le pegue a la API
// directo) lee esto de process.env — sin esto, seguiría apuntando por
// defecto a localhost:3333 (desarrollo).
process.env.API_BASE_URL = `http://localhost:${PUERTO_API}`;
// H-114 (revisión manual): globalSetup corre en ESTE proceso, antes de
// levantar ningún webServer — el `API_PUBLIC_URL` que el webServer de la
// API recibe más abajo (env propio, scopeado a ese proceso hijo) no le
// llega al `prisma db seed` que dispara `prepararBaseE2e()`
// (scripts/e2e-base-datos.cjs), porque ese seed corre en un execSync
// aparte, ANTES de que exista ningún webServer. Sin esto, LocalStorageProvider
// (instanciado a mano en prisma/seed.ts, sin pasar por Nest) usaba su
// default (localhost:3333, la API de desarrollo) para las portadas
// sembradas — URLs que no resuelven en esta corrida, connection refused
// en cada página que las muestra (/nosotros/ediciones-vs acá).
process.env.API_PUBLIC_URL = `http://localhost:${PUERTO_API}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // H-147 (el patrón de H-146): además de la salida en consola, cada corrida
  // deja un JSON en disco, con la fecha en el nombre para que una corrida que
  // falla no la pise la siguiente. No va en `test-results/`: esa carpeta la
  // vacía Playwright al empezar cada corrida. Acá vive H-145 (perfil-tema,
  // intermitente): la próxima aparición tiene que dejar rastro.
  reporter: [['list'], ['json', { outputFile: `reportes-e2e/corrida-${new Date().toISOString().replace(/[:.]/g, '-')}.json` }]],
  // H-20 (revisión manual, D111 en docs/05-decisiones.md): más de un worker
  // comparte estado de sesión entre corridas paralelas contra la misma
  // API/base y produce fallas espurias. Aislarlo (storage state o datos
  // distintos por worker) queda evaluado y descartado por ahora — la suite
  // es chica (D79); se revisa si crece lo suficiente para que esto sea un
  // cuello de botella real.
  workers: 1,
  // H-78/D124: deja vidasobrenatural_e2e lista (crear/resetear/sembrar)
  // antes de levantar los `webServer` de abajo — scripts/e2e-base-datos.cjs,
  // compartido con apps/backoffice (Principio XI).
  globalSetup: './e2e/global-setup.ts',
  webServer: [
    {
      command: 'pnpm --filter api run start:dev',
      port: PUERTO_API,
      reuseExistingServer: false,
      timeout: 90_000,
      env: {
        ...process.env,
        ...envE2e,
        PORT: String(PUERTO_API),
        // LocalStorageProvider arma la URL pública de cada portada con
        // esto (default localhost:3333, la de desarrollo) — sin
        // sobrescribirlo, las portadas subidas en este e2e quedarían con
        // una URL que apunta a la API equivocada.
        API_PUBLIC_URL: `http://localhost:${PUERTO_API}`,
      },
    },
    {
      // H-110: `exec` antes del segundo comando — sin él, `sh -c "A && B"`
      // no puede exec-arse a sí mismo en B (tiene que quedar vivo para
      // decidir si corre B después de A), así que B queda como HIJO de ese
      // shell. Al cortar la corrida, Playwright mata el PID que arrancó
      // (el shell) y `sh` no reenvía la señal a sus hijos — `next dev`
      // sobrevive, huérfano, todavía escuchando el puerto (confirmado
      // reproduciendo el corte a mano). Con `exec`, el shell se REEMPLAZA
      // por B en vez de quedar como padre — matar ese PID mata al que
      // realmente sirve.
      command: `pnpm --filter @vida-sobrenatural/shared-types run build && exec pnpm --filter web exec next dev -p ${PUERTO_APP}`,
      port: PUERTO_APP,
      reuseExistingServer: false,
      timeout: 90_000,
      env: {
        ...process.env,
        NEXTAUTH_URL: `http://localhost:${PUERTO_APP}`,
        NEXTAUTH_SECRET: envE2e.NEXTAUTH_SECRET,
        INTERNAL_API_SECRET: envE2e.INTERNAL_API_SECRET,
        API_BASE_URL: `http://localhost:${PUERTO_API}`,
        NEXT_PUBLIC_API_BASE_URL: `http://localhost:${PUERTO_API}`,
        ALLOW_TEST_LOGIN: 'true',
        PORT: String(PUERTO_APP),
        // Ver next.config.ts: sin esto, esta instancia choca con el lock
        // del `next dev` de desarrollo (mismo directorio, mismo distDir por
        // defecto) aunque el puerto sea distinto.
        NEXT_DIST_DIR: '.next-e2e-web',
      },
    },
  ],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${PUERTO_APP}`,
    trace: 'on-first-retry',
  },
  // H-R10 (revisión manual de la 004): en iPhone todos los navegadores son
  // WebKit, y los campos de fecha y hora nativos no andaban en Safari sin que
  // ningún e2e lo viera (corrían solo en Chromium). Los specs con `@webkit` en
  // el título corren también en WebKit — los flujos de fechas, horas y
  // franjas —, sin duplicar toda la suite (como `@celular`).
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'webkit', grep: /@webkit/, use: { ...devices['Desktop Safari'] } },
    // Lote 0 global (spec 006, research #13; D150): los tests marcados
    // `@celular` corren también en un celular (360–412 px, táctil).
    { name: 'celular', grep: /@celular/, use: { ...devices['Pixel 7'] } },
  ],
});
