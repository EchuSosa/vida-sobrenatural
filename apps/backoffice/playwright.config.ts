import { defineConfig, devices } from '@playwright/test';

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
  // e2e (no existe en el seed de demo — ver apps/api/scripts/sembrar-e2e-admin.ts)
  // antes de correr, y reutiliza la misma limpieza por prefijo `e2e-` que ya
  // usa apps/web al terminar.
  globalSetup: './e2e/global-setup.ts',
  globalTeardown: './e2e/global-teardown.ts',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3002',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
