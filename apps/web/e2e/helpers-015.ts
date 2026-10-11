import { Client } from 'pg';
import { leerEnvE2e } from '../../../scripts/e2e-base-datos.cjs';
import { entrarConTema } from './helpers-009';

/**
 * spec 015 — helpers de e2e de la elección de ministerio. Las personas y la
 * edición las siembra `sembrar-e2e/015-eleccion-ministerio.ts`; los e2e
 * (escritorio y celular, claro y oscuro) comparten esas filas, así que cada
 * test empieza borrando la elección de su persona, directo en la base de e2e
 * (como helpers-012): por la API una elección no se borra.
 */
export const EMAILS_015 = {
  lider: 'e2e-elm-lider@example.com',
  persona: 'e2e-elm-persona@example.com',
  personaCelular: 'e2e-elm-persona-celular@example.com',
} as const;

export const EDICION_015 = 'e2e-Edición con elección de ministerio';

export async function reiniciarEleccion(email: string): Promise<void> {
  const db = new Client({ connectionString: leerEnvE2e().DATABASE_URL });
  await db.connect();
  try {
    await db.query(
      `DELETE FROM "elecciones_ministerio" WHERE "personaId" = (SELECT "id" FROM "personas" WHERE "email" = $1)
         AND "grupoId" = (SELECT "id" FROM "grupos" WHERE "nombre" = $2)`,
      [email, EDICION_015],
    );
  } finally {
    await db.end();
  }
}

export { entrarConTema };
