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

const PUERTO_APP = 3011;
const PUERTO_API = 3334;

// H-78: ingresar.spec.ts (y cualquier otro test que le pegue a la API
// directo) lee esto de process.env — sin esto, seguiría apuntando por
// defecto a localhost:3333 (desarrollo).
process.env.API_BASE_URL = `http://localhost:${PUERTO_API}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
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
      command: `pnpm --filter @vida-sobrenatural/shared-types run build && pnpm --filter web exec next dev -p ${PUERTO_APP}`,
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
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
