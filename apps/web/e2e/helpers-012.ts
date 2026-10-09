import { Client } from 'pg';
import { leerEnvE2e } from '../../../scripts/e2e-base-datos.cjs';

/**
 * spec 012 — helpers de e2e de Avisos (specs/IMPLEMENTACION.md §2.10). Los
 * avisos se escriben directo en la base de e2e (como el seed): un aviso real
 * necesita una transición de otra spec, y lo que se prueba acá es la pantalla.
 * `limpiar-e2e.ts` borra las Entregas de las Personas `e2e-` y las
 * Notificaciones que quedan sin Entregas.
 */
async function conBase<T>(fn: (db: Client) => Promise<T>): Promise<T> {
  const db = new Client({ connectionString: leerEnvE2e().DATABASE_URL });
  await db.connect();
  try {
    return await fn(db);
  } finally {
    await db.end();
  }
}

export interface AvisoE2e {
  tipo?: 'manual' | 'automatica';
  evento?: string;
  params?: Record<string, unknown>;
  titulo?: string;
  mensaje?: string;
  leida?: boolean;
  /** Minutos atrás (el más chico es el más nuevo). */
  haceMinutos?: number;
}

/** Crea los avisos para la Persona y devuelve los ids de sus Entregas `app`, en el mismo orden. */
export async function sembrarAvisos(personaId: string, avisos: AvisoE2e[]): Promise<string[]> {
  return conBase(async (db) => {
    const ids: string[] = [];
    for (const [i, a] of avisos.entries()) {
      const fecha = new Date(Date.now() - (a.haceMinutos ?? i) * 60_000);
      const manual = a.tipo === 'manual';
      const n = await db.query<{ id: string }>(
        `INSERT INTO "notificaciones" ("id", "tipo", "prioridad", "alcance", "alcanceId", "evento", "params", "titulo", "mensaje", "creadoPorId", "createdAt")
         VALUES (gen_random_uuid()::text, $1, 'normal', $2, $3, $4, $5::jsonb, $6, $7, $8, $9) RETURNING "id"`,
        manual
          ? ['manual', 'todos', null, null, null, a.titulo ?? 'Aviso de la iglesia', a.mensaje ?? 'Mensaje.', personaId, fecha]
          : ['automatica', 'persona', personaId, a.evento ?? 'discipulado.finalizacion_confirmada', JSON.stringify(a.params ?? { grupoId: 'g', inscripcionId: 'i' }), null, null, null, fecha],
      );
      const e = await db.query<{ id: string }>(
        `INSERT INTO "entregas_notificacion" ("id", "notificacionId", "personaId", "canal", "estado", "enviadaEn", "leidaEn", "createdAt")
         VALUES (gen_random_uuid()::text, $1, $2, 'app', 'enviada', $3, $4, $3) RETURNING "id"`,
        [n.rows[0].id, personaId, fecha, a.leida ? fecha : null],
      );
      ids.push(e.rows[0].id);
    }
    return ids;
  });
}

export async function sinLeerDe(personaId: string): Promise<number> {
  return conBase(async (db) => {
    const r = await db.query<{ n: string }>(`SELECT count(*) AS n FROM "entregas_notificacion" WHERE "personaId" = $1 AND canal = 'app' AND "leidaEn" IS NULL`, [personaId]);
    return Number(r.rows[0].n);
  });
}
