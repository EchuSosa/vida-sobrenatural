import { Client } from 'pg';
import { fechasDeServicio, hoyEnArgentina } from '@vida-sobrenatural/shared-types';
import { leerEnvE2e } from '../../../scripts/e2e-base-datos.cjs';

/**
 * spec 017 — helpers de e2e de turnos. e2e-Bienvenida (sembrar-e2e/009) con la líder de la 016 y
 * el miembro de Seguridad. Una fecha publicada no se "despublica" por la API, así que cada test
 * empieza dejando el Ministerio sin turnos ni fechas, con "todos los domingos", directo en la base
 * de e2e (como helpers-015). También borra los avisos de turnos que dejaron los tests anteriores.
 */
export const EMAILS_017 = {
  lider: 'e2e-lider-ministerio@example.com',
  liderCelular: 'e2e-lider-ministerio-celular@example.com',
  miembro: 'e2e-ministerio-miembro@example.com',
} as const;

export const MIEMBRO_017 = 'Miembro E2E Ministerio';
export const MINISTERIO_017 = 'e2e-Bienvenida';

/** El próximo domingo (o hoy, si es domingo), en Argentina: la primera fecha de la grilla. */
export const primerDomingo = () => fechasDeServicio([{ frecuencia: 'semanal', diaSemana: 0 }], 1, hoyEnArgentina())[0];

export async function reiniciarTurnos(): Promise<void> {
  const db = new Client({ connectionString: leerEnvE2e().DATABASE_URL });
  await db.connect();
  try {
    const { rows } = await db.query<{ id: string }>(`SELECT "id" FROM "ministerios" WHERE "nombre" = $1 AND "eliminadoEn" IS NULL`, [MINISTERIO_017]);
    const ministerioId = rows[0]?.id;
    if (!ministerioId) throw new Error(`helpers-017: falta ${MINISTERIO_017} (sembrar-e2e 009).`);
    await db.query(`DELETE FROM "entregas_notificacion" WHERE "notificacionId" IN (SELECT "id" FROM "notificaciones" WHERE "entidadTipo" = 'turno')`);
    await db.query(`DELETE FROM "notificaciones" WHERE "entidadTipo" = 'turno'`);
    await db.query(`DELETE FROM "turnos" WHERE "fechaId" IN (SELECT "id" FROM "fechas_de_servicio" WHERE "ministerioId" = $1)`, [ministerioId]);
    await db.query(`DELETE FROM "fechas_de_servicio" WHERE "ministerioId" = $1`, [ministerioId]);
    await db.query(`DELETE FROM "dias_de_servicio" WHERE "ministerioId" = $1`, [ministerioId]);
    await db.query(`UPDATE "celulas" SET "cupoTurno" = 1 WHERE "ministerioId" = $1`, [ministerioId]);
    await db.query(
      `INSERT INTO "dias_de_servicio" ("id", "ministerioId", "frecuencia", "diaSemana", "activo", "creadoPorId", "updatedAt")
       VALUES (gen_random_uuid(), $1, 'semanal', 0, true, (SELECT "id" FROM "personas" WHERE "email" = 'e2e-admin@example.com'), now())`,
      [ministerioId],
    );
  } finally {
    await db.end();
  }
}
