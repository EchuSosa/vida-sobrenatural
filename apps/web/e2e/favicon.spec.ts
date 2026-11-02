import { test, expect } from './helpers';

/**
 * docs/24 (2026-11-02): Chrome pide `/favicon.ico` cuando una página todavía no
 * declaró su ícono, y respondía 404 — la red de consola lo agarraba como error
 * en `registro-bienvenida` (dos veces). `public/favicon.ico` es el mismo ícono
 * que `icon.png`; va en `public/` y no en `src/app/` para que Next no lo declare antes que `icon.png` (FR-035, `marca.spec.ts`).
 */
test('/favicon.ico existe y es un ícono', async ({ request }) => {
  const r = await request.get('/favicon.ico');
  expect(r.status()).toBe(200);
  expect(r.headers()['content-type']).toMatch(/image\/(x-icon|vnd\.microsoft\.icon)/);
});
