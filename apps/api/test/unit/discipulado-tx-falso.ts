import type { PrismaService } from '../../src/prisma/prisma.service.js';
import { EventosDiscipuladoService } from '../../src/discipulado/eventos.js';

/**
 * specs/004, lote B: un Prisma falso para los tests unitarios de las
 * transiciones del discipulado. Los servicios leen con `SELECT … FOR UPDATE`
 * ($queryRaw) y escriben con el cliente; acá el $queryRaw devuelve la fila
 * que cada test declara según la tabla, y cada método del cliente es un
 * `jest.fn` que el test puede configurar o inspeccionar ("escribió X" / "no
 * escribió nada"). `$transaction` ejecuta la función con el mismo objeto.
 */
export interface FilasBloqueadas {
  propuesta?: Record<string, unknown> | null;
  reasignacionPendiente?: Record<string, unknown> | null;
  grupo?: Record<string, unknown> | null;
  persona?: Record<string, unknown> | null;
  inscripcion?: Record<string, unknown> | null;
}

function modelo() {
  return {
    findUnique: jest.fn().mockResolvedValue(null),
    findFirst: jest.fn().mockResolvedValue(null),
    findMany: jest.fn().mockResolvedValue([]),
    count: jest.fn().mockResolvedValue(0),
    create: jest.fn().mockResolvedValue({ id: 'creado' }),
    update: jest.fn().mockResolvedValue({ id: 'actualizado' }),
    updateMany: jest.fn().mockResolvedValue({ count: 0 }),
    upsert: jest.fn().mockResolvedValue({ id: 'upsert' }),
  };
}

export function prismaFalso(filas: FilasBloqueadas) {
  const $queryRaw = jest.fn((strings: TemplateStringsArray) => {
    const sql = strings.join('?');
    const fila = (valor: Record<string, unknown> | null | undefined) => Promise.resolve(valor ? [valor] : []);
    if (sql.includes('"propuestas_discipulado"')) {
      return fila(sql.includes("'reasignacion'") ? filas.reasignacionPendiente : filas.propuesta);
    }
    if (sql.includes('"grupos"')) return fila(filas.grupo);
    if (sql.includes('"personas"')) return fila(filas.persona);
    if (sql.includes('"inscripciones"')) return fila(filas.inscripcion);
    if (sql.includes('"solicitudes_discipulado"')) return Promise.resolve([{ id: 's' }]);
    throw new Error(`SQL inesperado en el test: ${sql}`);
  });
  const prisma = {
    $queryRaw,
    propuestaDiscipulado: modelo(),
    solicitudDiscipulado: modelo(),
    inscripcion: modelo(),
    liderazgo: modelo(),
    grupo: modelo(),
    curso: modelo(),
    persona: modelo(),
    franjaAgenda: modelo(),
    franjaSolicitud: modelo(),
    bloqueoDisponibilidad: modelo(),
    encuentro: modelo(),
    asistencia: modelo(),
    relacionFamiliar: modelo(),
    $transaction: (fn: (tx: unknown) => unknown) => fn(prisma),
  };
  return prisma;
}

export type PrismaFalso = ReturnType<typeof prismaFalso>;

export function comoPrisma(p: PrismaFalso): PrismaService {
  return p as unknown as PrismaService;
}

export function eventosEspia() {
  const eventos = new EventosDiscipuladoService();
  const emitir = jest.spyOn(eventos, 'emitir').mockImplementation(() => undefined);
  return { eventos, emitir };
}

export async function codigoDe(promesa: Promise<unknown>): Promise<string | undefined> {
  const error = (await promesa.catch((e: unknown) => e)) as { code?: string; errors?: unknown };
  return error?.code;
}

export async function erroresDeCampo(promesa: Promise<unknown>): Promise<Array<{ campo: string; code: string }> | undefined> {
  const error = (await promesa.catch((e: unknown) => e)) as { errors?: Array<{ campo: string; code: string }> };
  return error?.errors;
}
