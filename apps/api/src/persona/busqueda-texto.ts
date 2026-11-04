import { normalizarNombre } from '@vida-sobrenatural/shared-types';
import { Prisma } from '../generated/prisma/client.js';

/**
 * BUG-11 (QA ronda 2, D267): cómo se busca a una Persona por texto en todas las búsquedas (Personas,
 * Pendientes tutor, elegir líder o integrante, inscriptos, "en nombre de…").
 *
 * - **Por palabras:** cada palabra tiene que aparecer en alguno de los campos; así "Valeria
 *   Domínguez" encuentra a Valeria Domínguez (antes se buscaba la frase entera en cada campo, y
 *   ninguno la tenía).
 * - **Sin importar tildes ni mayúsculas:** "dominguez" encuentra "Domínguez" y "nunez", "Núñez".
 *   Del lado de la consulta normaliza `normalizarNombre` (shared-types); del lado de la base, la
 *   misma regla en SQL con `translate`, sin depender de la extensión `unaccent`. Un test de
 *   integración compara las dos (Principio XI: copia con test que falla si diverge).
 */
export type CampoBusquedaPersona = 'nombre' | 'apellido' | 'email' | 'telefono';

/** Hasta 4 palabras: con más, la búsqueda ya no ayuda y el SQL crece. */
export const PALABRAS_BUSQUEDA_MAX = 4;

// Las letras con marca que `normalizarNombre` (NFD + quitar marcas) lleva a su base.
export const CON_MARCA = 'áàäâãåéèëêíìïîóòöôõúùüûñçýÿ';
export const SIN_MARCA = 'aaaaaaeeeeiiiiooooouuuuncyy';

export function palabrasDeBusqueda(texto: string): string[] {
  return normalizarNombre(texto).split(' ').filter(Boolean).slice(0, PALABRAS_BUSQUEDA_MAX);
}

/** La expresión SQL de un campo, en minúsculas y sin tildes. */
export function campoSinTildes(campo: CampoBusquedaPersona): Prisma.Sql {
  return Prisma.sql`translate(lower(coalesce(${Prisma.raw(`"${campo}"`)}, '')), ${CON_MARCA}, ${SIN_MARCA})`;
}

const comoLike = (palabra: string) => `%${palabra.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

/**
 * Los ids de las Personas cuyo texto coincide; `null` si no hay palabras (sin filtro). Se combina
 * con el resto del `where` de Prisma como `{ id: { in: ids } }`, así cada búsqueda conserva sus
 * filtros, su orden y su paginación.
 */
export async function idsQueCoinciden(
  db: { $queryRaw<T>(query: Prisma.Sql): Prisma.PrismaPromise<T> },
  texto: string,
  campos: readonly CampoBusquedaPersona[],
): Promise<string[] | null> {
  const palabras = palabrasDeBusqueda(texto);
  if (palabras.length === 0) return null;
  const condiciones = palabras.map(
    (p) => Prisma.sql`(${Prisma.join(campos.map((c) => Prisma.sql`${campoSinTildes(c)} LIKE ${comoLike(p)}`), ' OR ')})`,
  );
  const filas = await db.$queryRaw<Array<{ id: string }>>(Prisma.sql`SELECT "id" FROM "personas" WHERE ${Prisma.join(condiciones, ' AND ')}`);
  return filas.map((f) => f.id);
}

/** El pedazo de `where` de Prisma para una búsqueda; `{}` si no hay texto. */
export async function filtroDeBusqueda(
  db: { $queryRaw<T>(query: Prisma.Sql): Prisma.PrismaPromise<T> },
  texto: string | undefined,
  campos: readonly CampoBusquedaPersona[],
): Promise<{ id?: { in: string[] } }> {
  const ids = texto ? await idsQueCoinciden(db, texto, campos) : null;
  return ids === null ? {} : { id: { in: ids } };
}
