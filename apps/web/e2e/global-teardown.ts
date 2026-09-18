import { execSync } from 'node:child_process';

/**
 * H-17 (revisión manual, actualización 2026-09-18): estos e2e crean Personas
 * reales contra la API que tengan configurada (por defecto la de desarrollo,
 * `localhost:3333`/DB `vidasobrenatural`) y no se borraban nunca. Cada una
 * tiene el email con el prefijo `e2e-`; este teardown corre
 * `apps/api`'s `db:limpiar-e2e` (borrado físico — son datos de test, no
 * dominio) una sola vez al final de toda la corrida.
 *
 * Si `apps/api` no es un workspace alcanzable desde acá (ej. una instancia
 * aislada de prueba, como las usadas para verificar rondas de revisión
 * manual, que solo copian `apps/web`) no hace falta limpiar nada — esa base
 * de test se descarta entera — así que un fallo acá se ignora en vez de
 * romper la corrida completa de e2e.
 */
export default function globalTeardown() {
  try {
    execSync('pnpm --filter api run db:limpiar-e2e', { stdio: 'inherit' });
  } catch (error) {
    console.warn('[global-teardown] no se pudo correr db:limpiar-e2e (¿apps/api no está en este workspace?):', error);
  }
}
