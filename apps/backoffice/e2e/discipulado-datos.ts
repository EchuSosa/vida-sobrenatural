import { Client } from 'pg';
import { leerEnvE2e } from '../../../scripts/e2e-base-datos.cjs';

/**
 * specs/004, lote B: arma por SQL, en la base de e2e, lo que dejarían las
 * pantallas del lote A (una Solicitud con su Propuesta pendiente) y lo que
 * deja aceptar (un Grupo en curso), para probar las pantallas del
 * Discipulador y de Grupos sin depender de A.
 *
 * TODO(merge): cuando existan `pedirVidaNuevaComo` y `proponerYAceptar` en
 * helpers.ts (T009, por API), reemplazar estas funciones por esas.
 */

export const MARTES_19_A_21 = { diaSemana: 2, inicio: 19 * 60, fin: 21 * 60 };

export const EMAIL_DISCIPULADOR_1 = 'e2e-discipulador@example.com';
export const EMAIL_DISCIPULADOR_2 = 'e2e-discipulador-2@example.com';
export const EMAIL_ADMIN = 'e2e-admin@example.com';

async function conBase<T>(fn: (c: Client) => Promise<T>): Promise<T> {
  const env = leerEnvE2e();
  const cliente = new Client({ connectionString: env.DATABASE_URL.replace(/\?schema=public$/, '') });
  await cliente.connect();
  try {
    return await fn(cliente);
  } finally {
    await cliente.end();
  }
}

async function idDe(c: Client, email: string): Promise<string> {
  const { rows } = await c.query<{ id: string }>('SELECT id FROM personas WHERE email = $1', [email]);
  if (!rows[0]) throw new Error(`discipulado-datos: no existe la Persona ${email}`);
  return rows[0].id;
}

export interface OpcionesPersona {
  nombre: string;
  apellido: string;
  genero?: 'femenino' | 'masculino';
  telefono?: string;
  direccion?: string;
}

/** Una Persona activa, con email `e2e-…` (la borra limpiar-e2e.ts). Devuelve su id. */
export async function crearPersona(email: string, o: OpcionesPersona): Promise<string> {
  return conBase(async (c) => {
    const { rows: sedes } = await c.query<{ id: string }>('SELECT id FROM sedes WHERE activo = true AND "eliminadoEn" IS NULL ORDER BY "createdAt" LIMIT 1');
    const { rows } = await c.query<{ id: string }>(
      `INSERT INTO personas (id, email, nombre, apellido, genero, "fechaNacimiento", telefono, direccion, "sedeId", "estadoCivil", profesion,
         "tiempoCongregacion", estado, "consentimientoDatos", rol, "updatedAt")
       VALUES (gen_random_uuid(), $1, $2, $3, $4, '1990-05-20', $5, $6, $7, 'soltero_a', 'estudiante', 'menos_6_meses', 'activa', true,
         ARRAY['miembro_registrado'], now())
       RETURNING id`,
      [email, o.nombre, o.apellido, o.genero ?? 'femenino', o.telefono ?? '+54 9 221 555 0101', o.direccion ?? 'Calle 7 número 1234', sedes[0].id],
    );
    return rows[0].id;
  });
}

async function insertarSolicitudConPropuesta(c: Client, personaId: string, discipuladorId: string, adminId: string, estadoSolicitud: string, estadoPropuesta: string) {
  const { rows: s } = await c.query<{ id: string }>(
    `INSERT INTO solicitudes_discipulado (id, "personaId", estado, "revisadoPorId", "revisadaEn", "updatedAt")
     VALUES (gen_random_uuid(), $1, $2, $3, now(), now()) RETURNING id`,
    [personaId, estadoSolicitud, adminId],
  );
  await c.query(`INSERT INTO franjas_solicitud (id, "solicitudId", "diaSemana", inicio, fin) VALUES (gen_random_uuid(), $1, $2, $3, $4)`, [
    s[0].id,
    MARTES_19_A_21.diaSemana,
    MARTES_19_A_21.inicio,
    MARTES_19_A_21.fin,
  ]);
  const { rows: p } = await c.query<{ id: string }>(
    `INSERT INTO propuestas_discipulado (id, tipo, "solicitudId", "discipuladorId", "propuestaPorId", estado, "respondidaEn")
     VALUES (gen_random_uuid(), 'nueva', $1, $2, $3, $4::text::"EstadoPropuesta", CASE WHEN $4::text = 'pendiente' THEN NULL ELSE now() END) RETURNING id`,
    [s[0].id, discipuladorId, adminId, estadoPropuesta],
  );
  return { solicitudId: s[0].id, propuestaId: p[0].id };
}

/** Lo que deja el `proponer` del lote A: Solicitud `propuesta` + Propuesta `nueva` pendiente. */
export async function crearPropuesta(personaId: string, emailDiscipulador = EMAIL_DISCIPULADOR_1) {
  return conBase(async (c) => {
    const [disc, admin] = [await idDe(c, emailDiscipulador), await idDe(c, EMAIL_ADMIN)];
    return insertarSolicitudConPropuesta(c, personaId, disc, admin, 'propuesta', 'pendiente');
  });
}

/** Un Grupo en curso de este Discipulador con estas Personas, como si hubieran aceptado. */
export async function crearGrupo(personaIds: string[], emailDiscipulador = EMAIL_DISCIPULADOR_1) {
  return conBase(async (c) => {
    const [disc, admin] = [await idDe(c, emailDiscipulador), await idDe(c, EMAIL_ADMIN)];
    const { rows: curso } = await c.query<{ id: string }>(`SELECT id FROM cursos WHERE categoria = 'vida_nueva' AND tipo = 'individual'`);
    const { rows: persona } = await c.query<{ sedeId: string }>('SELECT "sedeId" FROM personas WHERE id = $1', [personaIds[0]]);
    const { rows: g } = await c.query<{ id: string }>(
      `INSERT INTO grupos (id, "cursoId", "sedeId", estado) VALUES (gen_random_uuid(), $1, $2, 'en_curso') RETURNING id`,
      [curso[0].id, persona[0].sedeId],
    );
    const grupoId = g[0].id;
    const inscripciones: string[] = [];
    for (const personaId of personaIds) {
      const { solicitudId, propuestaId } = await insertarSolicitudConPropuesta(c, personaId, disc, admin, 'aprobada', 'aceptada');
      await c.query('UPDATE solicitudes_discipulado SET "grupoId" = $1 WHERE id = $2', [grupoId, solicitudId]);
      const { rows: i } = await c.query<{ id: string }>(
        `INSERT INTO inscripciones (id, "personaId", "grupoId", "solicitudId", estado) VALUES (gen_random_uuid(), $1, $2, $3, 'activa') RETURNING id`,
        [personaId, grupoId, solicitudId],
      );
      inscripciones.push(i[0].id);
      if (inscripciones.length === 1) {
        await c.query(`INSERT INTO liderazgos (id, "personaId", "grupoId", "propuestaId") VALUES (gen_random_uuid(), $1, $2, $3)`, [disc, grupoId, propuestaId]);
      }
    }
    return { grupoId, inscripciones };
  });
}

export async function estadoDeSolicitud(solicitudId: string): Promise<string> {
  return conBase(async (c) => (await c.query<{ estado: string }>('SELECT estado FROM solicitudes_discipulado WHERE id = $1', [solicitudId])).rows[0].estado);
}

export async function estadoDeInscripcion(inscripcionId: string): Promise<string> {
  return conBase(async (c) => (await c.query<{ estado: string }>('SELECT estado FROM inscripciones WHERE id = $1', [inscripcionId])).rows[0].estado);
}

export async function estadoDeGrupo(grupoId: string): Promise<{ estado: string; motivoCierre: string | null }> {
  return conBase(async (c) => (await c.query<{ estado: string; motivoCierre: string | null }>('SELECT estado, "motivoCierre" FROM grupos WHERE id = $1', [grupoId])).rows[0]);
}

/** Cuántas Personas acepta por Grupo el Discipulador (FR-045), para armar Grupos de dos. */
export async function fijarMaximoPorGrupo(email: string, maximo: number): Promise<void> {
  await conBase((c) => c.query('UPDATE personas SET "maxPersonasPorGrupo" = $1 WHERE email = $2', [maximo, email]));
}

/** Sin scroll horizontal (docs/15, H-62): el documento no es más ancho que la ventana. */
export async function sinScrollHorizontal(page: import('@playwright/test').Page): Promise<boolean> {
  return page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
}

/** Un Encuentro ya registrado, con una Asistencia presente por Inscripción activa. */
export async function crearEncuentro(grupoId: string, datos: { fecha: string; capitulos: string; notas?: string }): Promise<string> {
  return conBase(async (c) => {
    const { rows: lider } = await c.query<{ personaId: string }>('SELECT "personaId" FROM liderazgos WHERE "grupoId" = $1 AND hasta IS NULL', [grupoId]);
    const { rows } = await c.query<{ id: string }>(
      `INSERT INTO encuentros (id, "grupoId", fecha, capitulos, notas, "registradoPorId", "updatedAt")
       VALUES (gen_random_uuid(), $1, $2::date, $3, $4, $5, now()) RETURNING id`,
      [grupoId, datos.fecha, datos.capitulos, datos.notas ?? null, lider[0].personaId],
    );
    await c.query(
      `INSERT INTO asistencias (id, "encuentroId", "inscripcionId", presente)
       SELECT gen_random_uuid(), $1, id, true FROM inscripciones WHERE "grupoId" = $2 AND estado = 'activa'`,
      [rows[0].id, grupoId],
    );
    return rows[0].id;
  });
}

/**
 * Cambiar de Persona a mitad de un test: sin borrar las cookies, el
 * test-login a veces deja la sesión anterior (se vio en la suite completa).
 */
export async function sinSesion(page: import('@playwright/test').Page): Promise<void> {
  await page.context().clearCookies();
}
