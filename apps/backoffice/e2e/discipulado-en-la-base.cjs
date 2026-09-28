'use strict';

const { Client } = require('pg');
const { leerEnvE2e, verificarBaseE2e } = require('../../../scripts/e2e-base-datos.cjs');

/**
 * specs/004, T058: arma en la base de e2e un discipulado activo (Grupo en
 * curso con Liderazgo vigente de la discipuladora e Inscripción de la
 * inscripta) y una Propuesta pendiente de la discipuladora para la Solicitud
 * de `pide`. Directo en la base porque los endpoints que lo arman (proponer y
 * aceptar, lotes A y B) no están en esta rama; cuando estén, esto se
 * reemplaza por `proponerYAceptar` de helpers.ts (T009). Con la guarda de
 * H-78: nunca contra otra base que la de e2e.
 *
 * CJS plano, como scripts/e2e-base-datos.cjs: `pg` no tiene tipos en el
 * backoffice (solo `apps/api` tiene `@types/pg`).
 *
 * @param {{ discipuladora: string; inscripta: string; pide: string }} emails
 * @returns {Promise<{ grupoId: string; solicitudId: string }>}
 */
async function armarDiscipuladoYPropuesta(emails) {
  const { DATABASE_URL } = leerEnvE2e();
  verificarBaseE2e(DATABASE_URL);
  const url = new URL(DATABASE_URL);
  url.searchParams.delete('schema');
  const cliente = new Client({ connectionString: url.toString() });
  await cliente.connect();
  try {
    const idDe = async (email) =>
      (await cliente.query('SELECT "id" FROM "personas" WHERE "email" = $1', [email])).rows[0].id;
    const discipuladora = await idDe(emails.discipuladora);
    const inscripta = await idDe(emails.inscripta);
    const pide = await idDe(emails.pide);
    await cliente.query(`UPDATE "personas" SET "rol" = array_append("rol", 'discipulador') WHERE "id" = $1`, [discipuladora]);
    const { rows: cursos } = await cliente.query(
      `SELECT "id" FROM "cursos" WHERE "categoria" = 'vida_nueva' AND "tipo" = 'individual'`,
    );
    const { rows: sedes } = await cliente.query('SELECT "sedeId" FROM "personas" WHERE "id" = $1', [inscripta]);
    const grupoId = (
      await cliente.query(
        `INSERT INTO "grupos" ("id", "cursoId", "sedeId") VALUES (gen_random_uuid()::text, $1, $2) RETURNING "id"`,
        [cursos[0].id, sedes[0].sedeId],
      )
    ).rows[0].id;
    const aprobada = (
      await cliente.query(
        `INSERT INTO "solicitudes_discipulado" ("id", "personaId", "estado", "grupoId", "updatedAt")
         VALUES (gen_random_uuid()::text, $1, 'aprobada', $2, NOW()) RETURNING "id"`,
        [inscripta, grupoId],
      )
    ).rows[0].id;
    await cliente.query(
      `INSERT INTO "inscripciones" ("id", "personaId", "grupoId", "solicitudId") VALUES (gen_random_uuid()::text, $1, $2, $3)`,
      [inscripta, grupoId, aprobada],
    );
    await cliente.query(`INSERT INTO "liderazgos" ("id", "personaId", "grupoId") VALUES (gen_random_uuid()::text, $1, $2)`, [
      discipuladora,
      grupoId,
    ]);
    const solicitudId = (
      await cliente.query(
        `INSERT INTO "solicitudes_discipulado" ("id", "personaId", "estado", "updatedAt")
         VALUES (gen_random_uuid()::text, $1, 'propuesta', NOW()) RETURNING "id"`,
        [pide],
      )
    ).rows[0].id;
    await cliente.query(
      `INSERT INTO "propuestas_discipulado" ("id", "tipo", "solicitudId", "discipuladorId", "propuestaPorId")
       VALUES (gen_random_uuid()::text, 'nueva', $1, $2, $2)`,
      [solicitudId, discipuladora],
    );
    return { grupoId, solicitudId };
  } finally {
    await cliente.end();
  }
}

module.exports = { armarDiscipuladoYPropuesta };
