import type { Prisma } from '../generated/prisma/client.js';
import type { PrismaService } from '../prisma/prisma.service.js';

type Db = PrismaService | Prisma.TransactionClient;

/**
 * specs/004, FR-001/FR-042 (data-model → Inscripcion): "está cursando o
 * completó Vida Nueva" = una Inscripción `activa` o `completada` en un Grupo de
 * Curso `vida_nueva`. `abandono` y `dada_de_baja` NO cuentan: quien se dio de
 * baja puede volver a pedir. Única definición (Principio XI): la usan pedir
 * y proponer (lote A) y aceptar (lote B), que la re-exige con la fila bloqueada.
 */
export async function cursaOCompletoVidaNueva(db: Db, personaId: string): Promise<boolean> {
  const cantidad = await db.inscripcion.count({
    where: {
      personaId,
      estado: { in: ['activa', 'completada'] },
      grupo: { curso: { categoria: 'vida_nueva' } },
    },
  });
  return cantidad > 0;
}
