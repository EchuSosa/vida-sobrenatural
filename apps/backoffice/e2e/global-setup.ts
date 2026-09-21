import { execSync } from 'node:child_process';

/**
 * H-34 (revisión manual ronda 3): siembra (idempotente) la Persona
 * `e2e-admin@example.com` con rol admin+discipulador — necesaria para entrar
 * a Pendientes de tutor y Sedes vía el proveedor `test-login`. Ver
 * apps/api/scripts/sembrar-e2e-admin.ts. Mismo criterio de tolerancia a
 * fallos que global-teardown.ts: si `apps/api` no es un workspace alcanzable
 * desde acá, no bloquea la corrida — se ve en los tests que fallen después.
 */
export default function globalSetup() {
  try {
    execSync('pnpm --filter api run db:sembrar-e2e-admin', { stdio: 'inherit' });
  } catch (error) {
    console.warn('[global-setup] no se pudo sembrar la Persona admin de e2e:', error);
  }
}
