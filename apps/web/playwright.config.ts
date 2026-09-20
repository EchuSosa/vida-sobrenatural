import { defineConfig, devices } from '@playwright/test';

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
  // H-17: borra las Personas que estos e2e crean (email con prefijo `e2e-`)
  // al terminar toda la corrida — ver e2e/global-teardown.ts.
  globalTeardown: './e2e/global-teardown.ts',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3001',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
