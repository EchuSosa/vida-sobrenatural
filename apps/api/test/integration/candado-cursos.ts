import pg from 'pg';

/**
 * El catálogo de Cursos es global (una fila por categoría y tipo): el test de
 * Cursos (013) borra y vuelve a crear "Vida Nueva grupal", y el `EscenarioVS`
 * de la 008 la usa con sus Grupos. Corriendo en paralelo se pisaban (el CI del
 * PR #30 lo mostró). Un candado de Postgres de sesión los ordena: los de la
 * 008 lo toman compartido (entre ellos siguen en paralelo) y el de Cursos,
 * exclusivo. Va en una conexión propia, no en el pool de Prisma: un candado de
 * sesión se suelta en la misma conexión que lo tomó (al cerrarla).
 */
const CANDADO_CATALOGO_CURSOS = 13_073_008;

/** Cuánto puede esperar un `beforeAll` a que el otro lado suelte el candado. */
export const ESPERA_CANDADO_CURSOS = 180_000;

export async function tomarCandadoCursos(modo: 'compartido' | 'exclusivo'): Promise<() => Promise<void>> {
  const cliente = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await cliente.connect();
  await cliente.query(modo === 'exclusivo' ? 'SELECT pg_advisory_lock($1)' : 'SELECT pg_advisory_lock_shared($1)', [CANDADO_CATALOGO_CURSOS]);
  return () => cliente.end();
}
