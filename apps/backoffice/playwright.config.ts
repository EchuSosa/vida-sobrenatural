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

const PUERTO_APP = 3012;
const PUERTO_API = 3335;
const PUERTO_WEB_AUXILIAR = 3013;

// H-78: helpers.ts lee estas dos de process.env — sin esto, seguiría
// apuntando por defecto a localhost:3001/localhost:3333 (desarrollo).
process.env.PLAYWRIGHT_WEB_BASE_URL = `http://localhost:${PUERTO_WEB_AUXILIAR}`;
process.env.NEXT_PUBLIC_API_BASE_URL = `http://localhost:${PUERTO_API}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
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
      command: `pnpm --filter @vida-sobrenatural/shared-types run build && pnpm --filter backoffice exec next dev -p ${PUERTO_APP}`,
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
      command: `pnpm --filter @vida-sobrenatural/shared-types run build && pnpm --filter web exec next dev -p ${PUERTO_WEB_AUXILIAR}`,
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
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
