import { execSync } from 'node:child_process';

/**
 * H-34 (revisión manual ronda 3): mismo patrón que apps/web/e2e/global-teardown.ts
 * (H-17) — borra por prefijo `e2e-` (incluida `e2e-admin@example.com`, T142)
 * todo lo que estos e2e crearon, vía apps/api's `db:limpiar-e2e`.
 */
export default function globalTeardown() {
  try {
    execSync('pnpm --filter api run db:limpiar-e2e', { stdio: 'inherit' });
  } catch (error) {
    console.warn('[global-teardown] no se pudo correr db:limpiar-e2e (¿apps/api no está en este workspace?):', error);
  }
}
