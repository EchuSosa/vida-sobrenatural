import type { PrismaClient } from '../../src/generated/prisma/client.js';

/**
 * Lote 0 global (specs/IMPLEMENTACION.md): lo que `seed-demo.ts` ya sembró y
 * cada spec puede usar para su parte del seed demo (D120). Cada spec escribe
 * SOLO su archivo `seed-demo/<spec>.ts`; `seed-demo.ts` ya los llama a todos,
 * en orden, así que nadie edita el `main`.
 */
export interface ContextoSeedDemo {
  prisma: PrismaClient;
  sedes: { laPlata: string; buenosAires: string; rosario: string };
}
