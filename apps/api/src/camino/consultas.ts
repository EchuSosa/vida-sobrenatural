import { ETAPAS_CAMINO, type ComoSeCompleto, type Completas, type EtapaCamino, type HechosCamino } from '@vida-sobrenatural/shared-types';
import type { Prisma } from '../generated/prisma/client.js';
import type { PrismaService } from '../prisma/prisma.service.js';

type Db = PrismaService | Prisma.TransactionClient;

/**
 * spec 006 (D155, FR-016) — la ÚNICA consulta "¿completó esta etapa?". La
 * usan Mi camino, el pedido de Vida Nueva (FR-017) y los prerrequisitos de
 * Vida de Servicio (008), Ministerio (009) y Bautismo (010): nadie
 * reimplementa "por el sistema o por historial" (`docs/04`: los dos caminos).
 *
 * Funciones de transacción sin DI, para que cualquier módulo las importe sin
 * ciclos (research #5). Cuando importa (pedir, declarar, registrar), quien
 * llama bloquea antes la fila de la Persona con `bloquearPersona`.
 *
 * Fuente "por el sistema" de cada etapa:
 * - vida_nueva / vida_de_servicio: una Inscripción `completada` en un Grupo
 *   de un Curso de esa categoría (individual o grupal cuentan igual).
 * - bautismo: una Solicitud de Bautismo `realizada` (D180).
 * - ministerio (spec 009): una Postulación que llegó a `aprobada` — la vigente
 *   o una que ya no lo está (`inactiva`: solo se llega ahí desde aprobada, por
 *   cambio de Ministerio o baja). Como el rol `miembro_ministerio` (D170), una
 *   vez que sirvió en un Ministerio la etapa queda hecha.
 */
export async function completoPorSistema(db: Db, personaId: string, etapa: EtapaCamino): Promise<boolean> {
  switch (etapa) {
    case 'vida_nueva':
    case 'vida_de_servicio': {
      const inscripcion = await db.inscripcion.findFirst({
        where: { personaId, estado: 'completada', grupo: { curso: { categoria: etapa } } },
        select: { id: true },
      });
      return inscripcion !== null;
    }
    case 'bautismo': {
      const solicitud = await db.solicitudBautismo.findFirst({ where: { personaId, estado: 'realizada' }, select: { id: true } });
      return solicitud !== null;
    }
    case 'ministerio': {
      const postulacion = await db.postulacion.findFirst({ where: { personaId, estado: { in: ['aprobada', 'inactiva'] } }, select: { id: true } });
      return postulacion !== null;
    }
  }
}

/** La Completitud Manual vigente (no anulada) de esa etapa, si hay. */
export async function completitudVigente(db: Db, personaId: string, etapa: EtapaCamino): Promise<{ id: string } | null> {
  return db.completitudManual.findFirst({ where: { personaId, etapa, anuladaEn: null }, select: { id: true } });
}

/** FR-016: ¿completó la etapa, y por qué camino? `null` = no la completó. */
export async function completoEtapa(db: Db, personaId: string, etapa: EtapaCamino): Promise<ComoSeCompleto | null> {
  if (await completoPorSistema(db, personaId, etapa)) return 'sistema';
  if (await completitudVigente(db, personaId, etapa)) return 'historial';
  return null;
}

/**
 * research #5 (patrón D137/H-142): bloquea la fila de la Persona hasta el fin
 * de la transacción, para que pedir Vida Nueva, declararla y registrar su
 * Completitud no se pisen por una carrera. Devuelve si existe.
 */
export async function bloquearPersona(tx: Prisma.TransactionClient, personaId: string): Promise<boolean> {
  const filas = await tx.$queryRaw<{ id: string }[]>`SELECT "id" FROM "personas" WHERE "id" = ${personaId} FOR UPDATE`;
  return filas.length > 0;
}

/**
 * FR-010/FR-014: Vida Nueva "en marcha dentro del sistema" — un pedido abierto
 * (`pendiente` o `propuesta`) o una Inscripción `activa` en un Grupo de Vida
 * Nueva. Mientras tanto no se declara "Ya lo hice" ni se registra la etapa
 * hecha (`ETAPA_EN_CURSO`): primero se retira el pedido o se cierra el Grupo.
 * La Inscripción `completada` no es "en marcha": la cubre `completoEtapa`.
 */
export async function vidaNuevaEnMarcha(db: Db, personaId: string): Promise<boolean> {
  const [pedido, inscripcion] = await Promise.all([
    db.solicitudDiscipulado.findFirst({ where: { personaId, estado: { in: ['pendiente', 'propuesta'] } }, select: { id: true } }),
    db.inscripcion.findFirst({
      where: { personaId, estado: 'activa', grupo: { curso: { categoria: 'vida_nueva' } } },
      select: { id: true },
    }),
  ]);
  return pedido !== null || inscripcion !== null;
}

/** Las cuatro etapas, con por qué camino se completó cada una (FR-016), para `HechosCamino`. */
export async function etapasCompletas(db: Db, personaId: string): Promise<Completas> {
  const resultados = await Promise.all(ETAPAS_CAMINO.map(async (etapa) => [etapa, await completoEtapa(db, personaId, etapa)] as const));
  const completas: Completas = {};
  for (const [etapa, como] of resultados) if (como) completas[etapa] = como;
  return completas;
}

/** La declaración MÁS RECIENTE de cada etapa, en cualquier estado (`HechosCamino.ultimaDeclaracion`). */
export async function ultimasDeclaraciones(db: Db, personaId: string): Promise<HechosCamino['ultimaDeclaracion']> {
  const filas = await db.declaracionHistorial.findMany({
    where: { personaId },
    distinct: ['etapa'],
    orderBy: [{ etapa: 'asc' }, { createdAt: 'desc' }],
    select: { id: true, etapa: true, estado: true, createdAt: true, revisadaEn: true, motivoRechazo: true },
  });
  const ultima: HechosCamino['ultimaDeclaracion'] = {};
  for (const f of filas) {
    // La fecha que importa: cuándo la revisaron (rechazada/confirmada) o, si no, cuándo la contó.
    ultima[f.etapa] = { id: f.id, estado: f.estado, fecha: (f.revisadaEn ?? f.createdAt).toISOString(), motivo: f.motivoRechazo };
  }
  return ultima;
}
