import { Client } from 'pg';
import { leerEnvE2e } from '../../../scripts/e2e-base-datos.cjs';

/**
 * spec 015 — helpers de e2e de la elección de ministerio en el backoffice. La
 * edición y las personas las siembra `sembrar-e2e/015-eleccion-ministerio.ts`.
 * Cada test deja a la persona "charlada" con su elección lista para el Admin
 * (charla hecha, una sola área: e2e-Bienvenida · Seguridad) y sin
 * membresías, directo en la base de e2e (como los helpers-012 de la web): por
 * la API una elección no se borra ni una membresía se deshace sin dejar rastro.
 */
export const EDICION_015 = 'e2e-Edición con elección de ministerio';
export const EMAIL_CHARLADA_015 = 'e2e-elm-charlada@example.com';

async function conBase<T>(fn: (db: Client) => Promise<T>): Promise<T> {
  const db = new Client({ connectionString: leerEnvE2e().DATABASE_URL });
  await db.connect();
  try {
    return await fn(db);
  } finally {
    await db.end();
  }
}

export async function idDeEdicion015(): Promise<string> {
  return conBase(async (db) => (await db.query<{ id: string }>(`SELECT "id" FROM "grupos" WHERE "nombre" = $1`, [EDICION_015])).rows[0].id);
}

/** Deja la elección de la persona "charlada" con la charla hecha y sin membresías; devuelve su id. */
export async function prepararEleccionCharlada(): Promise<string> {
  return conBase(async (db) => {
    const persona = (await db.query<{ id: string }>(`SELECT "id" FROM "personas" WHERE "email" = $1`, [EMAIL_CHARLADA_015])).rows[0].id;
    const grupo = (await db.query<{ id: string }>(`SELECT "id" FROM "grupos" WHERE "nombre" = $1`, [EDICION_015])).rows[0].id;
    const lider = (await db.query<{ id: string }>(`SELECT "personaId" AS id FROM "liderazgos" WHERE "grupoId" = $1 LIMIT 1`, [grupo])).rows[0].id;
    const area = (
      await db.query<{ ministerioId: string; celulaId: string }>(
        `SELECT c."ministerioId", c."id" AS "celulaId" FROM "celulas" c JOIN "ministerios" m ON m."id" = c."ministerioId"
          WHERE m."nombre" = 'e2e-Bienvenida' AND c."nombre" = 'Seguridad'`,
      )
    ).rows[0];
    await db.query(`DELETE FROM "elecciones_ministerio" WHERE "personaId" = $1`, [persona]);
    await db.query(`DELETE FROM "postulaciones" WHERE "personaId" = $1`, [persona]);
    const eleccion = (
      await db.query<{ id: string }>(
        `INSERT INTO "elecciones_ministerio" ("id", "personaId", "grupoId", "estado", "comentario", "notas", "notasPorId", "notasEn", "charlaPorId", "charlaEn", "updatedAt")
         VALUES (gen_random_uuid()::text, $1, $2, 'charla_hecha', 'Me gusta cuidar a la gente.', 'e2e-nota: responsable y puntual', $3, now(), $3, now(), now()) RETURNING "id"`,
        [persona, grupo, lider],
      )
    ).rows[0].id;
    await db.query(
      `INSERT INTO "opciones_eleccion_ministerio" ("id", "eleccionId", "ministerioId", "celulaId") VALUES (gen_random_uuid()::text, $1, $2, $3)`,
      [eleccion, area.ministerioId, area.celulaId],
    );
    return eleccion;
  });
}
