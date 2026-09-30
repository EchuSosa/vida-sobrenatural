import { defineConfig, devices } from '@playwright/test';
import { leerEnvE2e } from '../../scripts/e2e-base-datos.cjs';

/**
 * H-78 (revisión manual): puertos propios para el e2e de apps/backoffice —
 * 3012 (la app) y 3335 (su API) — distintos de los de desarrollo
 * (3002/3333, D104) y de los de apps/web (3011/3334), para que ninguna de
 * las dos corridas reutilice el server de la otra ni la de desarrollo.
 * `reuseExistingServer: false` no es negociable acá (ver global-setup.ts):
 * si reutilizara un server ya levantado, sería el de desarrollo, y
 * volveríamos a estar exactamente donde estaba H-78.
 *
 * Un tercero: `apps/backoffice/e2e/helpers.ts` (H-29/H-34) crea Personas de
 * prueba pasando por el flujo REAL de registro de `apps/web`
 * (`crearMenorPendienteTutor`/`crearPersonaActiva`, vía `test-login` +
 * `POST /personas`) en vez de insertarlas directo — así que este e2e
 * también necesita su propia instancia de `apps/web`, no solo de
 * `apps/backoffice`. Puerto 3013, apuntada a la MISMA API de e2e (3335) que
 * usa el resto de esta corrida — así lo que crea vía `apps/web` lo lee
 * `apps/backoffice` de la misma base (vidasobrenatural_e2e).
 */
const envE2e = leerEnvE2e();

// Offset de puertos por worktree (lotes A–D de la 004): con varios `git
// worktree` corriendo e2e a la vez, cada uno suma su offset (10, 20, 30, 40)
// desde su `.env.e2e` para no chocar en puertos. Con el default 0 nada cambia.
const OFFSET_PUERTO = Number(envE2e.E2E_PUERTO_OFFSET) || 0;

const PUERTO_APP = 3012 + OFFSET_PUERTO;
const PUERTO_API = 3335 + OFFSET_PUERTO;
const PUERTO_WEB_AUXILIAR = 3013 + OFFSET_PUERTO;

// H-78: helpers.ts lee estas dos de process.env — sin esto, seguiría
// apuntando por defecto a localhost:3001/localhost:3333 (desarrollo).
process.env.PLAYWRIGHT_WEB_BASE_URL = `http://localhost:${PUERTO_WEB_AUXILIAR}`;
process.env.NEXT_PUBLIC_API_BASE_URL = `http://localhost:${PUERTO_API}`;
// H-114 (revisión manual): globalSetup corre en ESTE proceso, antes de
// levantar ningún webServer — el `API_PUBLIC_URL` que el webServer de la
// API recibe más abajo (env propio, scopeado a ese proceso hijo) no le
// llega al `prisma db seed` que dispara `prepararBaseE2e()`
// (scripts/e2e-base-datos.cjs), porque ese seed corre en un execSync
// aparte, ANTES de que exista ningún webServer. Sin esto, LocalStorageProvider
// (instanciado a mano en prisma/seed.ts, sin pasar por Nest) usaba su
// default (localhost:3333, la API de desarrollo) para las portadas
// sembradas — URLs que no resuelven en esta corrida, connection refused en
// cada página que las muestra (/libros acá, y axe-todas-las-rutas al
// pasar por ella).
process.env.API_PUBLIC_URL = `http://localhost:${PUERTO_API}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // H-146 (aplicado también acá): además de la salida en consola, cada
  // corrida deja un JSON en disco, con la fecha en el nombre para que una
  // corrida que falla no la pise la siguiente. No va en `test-results/`: esa
  // carpeta la vacía Playwright al empezar cada corrida.
  reporter: [['list'], ['json', { outputFile: `reportes-e2e/corrida-${new Date().toISOString().replace(/[:.]/g, '-')}.json` }]],
  // H-20/D111 (specs/002-base-transversal, docs/05-decisiones.md): mismo
  // motivo que apps/web/playwright.config.ts — más de un worker comparte
  // estado de sesión entre corridas paralelas contra la misma API/base.
  workers: 1,
  // H-34 (revisión manual ronda 3): siembra la Persona admin+discipulador de
  // e2e (no existe en el seed de demo — ver apps/api/scripts/sembrar-e2e-admin.ts).
  // H-78/D124: además deja vidasobrenatural_e2e lista (crear/resetear) antes
  // de levantar los `webServer` de abajo — scripts/e2e-base-datos.cjs,
  // compartido con apps/web (Principio XI).
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
        // sobrescribirlo, las portadas subidas en este e2e (H-94,
        // libros.spec.ts) quedarían con una URL que apunta a la API
        // equivocada.
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
      command: `pnpm --filter @vida-sobrenatural/shared-types run build && exec pnpm --filter backoffice exec next dev -p ${PUERTO_APP}`,
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
        // Ver apps/backoffice/next.config.ts: distDir propio para no
        // chocar con el lock del `next dev` de desarrollo del backoffice.
        NEXT_DIST_DIR: '.next-e2e-backoffice',
      },
    },
    {
      // H-110: mismo motivo que el webServer de arriba — ver ese comentario.
      command: `pnpm --filter @vida-sobrenatural/shared-types run build && exec pnpm --filter web exec next dev -p ${PUERTO_WEB_AUXILIAR}`,
      port: PUERTO_WEB_AUXILIAR,
      reuseExistingServer: false,
      timeout: 90_000,
      env: {
        ...process.env,
        NEXTAUTH_URL: `http://localhost:${PUERTO_WEB_AUXILIAR}`,
        NEXTAUTH_SECRET: envE2e.NEXTAUTH_SECRET,
        INTERNAL_API_SECRET: envE2e.INTERNAL_API_SECRET,
        API_BASE_URL: `http://localhost:${PUERTO_API}`,
        NEXT_PUBLIC_API_BASE_URL: `http://localhost:${PUERTO_API}`,
        ALLOW_TEST_LOGIN: 'true',
        PORT: String(PUERTO_WEB_AUXILIAR),
        // Distinto del de apps/web/playwright.config.ts (.next-e2e-web) y
        // del de desarrollo (por defecto) — esta instancia también corre
        // en el directorio apps/web, así que necesita su propio distDir
        // para no chocar con ninguna de las otras dos.
        NEXT_DIST_DIR: '.next-e2e-backoffice-web-aux',
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
  //
  // specs/004 (T012b, FR-046): las pantallas del Discipulador (aceptar una
  // propuesta, cargar la agenda) se usan desde el teléfono, así que sus specs
  // —los que llevan `@celular` en el título— corren también en un viewport de
  // celular, además del de escritorio. El proyecto `celular` corre SOLO esos
  // (grep), para no duplicar el tiempo de toda la suite; el de escritorio los
  // corre igual (el `@celular` es "también en celular", no "solo").
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'celular', grep: /@celular/, use: { ...devices['Pixel 7'] } },
    { name: 'webkit', grep: /@webkit/, use: { ...devices['Desktop Safari'] } },
  ],
});
