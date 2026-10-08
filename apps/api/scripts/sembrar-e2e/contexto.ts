import type { PrismaClient } from '../../src/generated/prisma/client.js';

/**
 * Lote 0 global (specs/IMPLEMENTACION.md): cada spec siembra sus fixtures de
 * e2e en SU archivo `sembrar-e2e/<spec>.ts` (Personas `e2e-…@example.com`,
 * entidades con nombre `e2e-…`, que `limpiar-e2e.ts` sabe borrar);
 * `sembrar-e2e-admin.ts` ya los llama a todos, en orden. Idempotente: se corre
 * en cada global setup.
 */
export interface ContextoSembrarE2e {
  prisma: PrismaClient;
  sedeId: string;
}
