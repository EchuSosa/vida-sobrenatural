import type { DiscipuladoActivo, PropuestaPendiente } from '@vida-sobrenatural/shared-types';
import type { Prisma } from '../generated/prisma/client.js';
import type { PrismaService } from '../prisma/prisma.service.js';

type Db = PrismaService | Prisma.TransactionClient;

/**
 * specs/004, D137 (research #1): la ÚNICA definición de "discipulado activo" —
 * un Liderazgo vigente (`hasta = null`) en un Grupo `en_curso`. La usan la
 * guarda de quitar el rol (FR-009/FR-043, lote D), el listado de Personas y la
 * sugerencia del cruce (FR-035). No hay contador ni flag: se calcula en el
 * momento, con la fila de la Persona ya bloqueada cuando importa (H-142).
 *
 * Los nombres se resuelven con una segunda consulta (personaId es referencia
 * lógica, como en CambioDeRolService).
 */

/** Un Grupo que la Persona lidera hoy, con el nombre de una de sus Personas (para el mensaje de rechazo). */
export async function discipuladosActivosDe(db: Db, personaId: string): Promise<DiscipuladoActivo[]> {
  const liderazgos = await db.liderazgo.findMany({
    where: { personaId, hasta: null, grupo: { estado: 'en_curso' } },
    select: { grupoId: true },
  });
  const grupoIds = liderazgos.map((l) => l.grupoId);
  if (grupoIds.length === 0) return [];
  return nombrarGruposPorInscripta(db, grupoIds);
}

/** Las propuestas pendientes de esta Persona como Discipulador (FR-043). */
export async function propuestasPendientesDe(db: Db, personaId: string): Promise<PropuestaPendiente[]> {
  const propuestas = await db.propuestaDiscipulado.findMany({
    where: { discipuladorId: personaId, estado: 'pendiente' },
    select: { id: true, tipo: true, solicitudId: true, grupoId: true },
  });
  if (propuestas.length === 0) return [];

  // El nombre de la Persona: para `nueva`, la de la Solicitud; para
  // `reasignacion`, una del Grupo. Se resuelven en lote.
  const solicitudIds = propuestas.map((p) => p.solicitudId).filter((id): id is string => id !== null);
  const grupoIds = propuestas.map((p) => p.grupoId).filter((id): id is string => id !== null);

  const [solicitudes, gruposNombrados] = await Promise.all([
    solicitudIds.length
      ? db.solicitudDiscipulado.findMany({ where: { id: { in: solicitudIds } }, select: { id: true, personaId: true } })
      : Promise.resolve([]),
    grupoIds.length ? nombrarGruposPorInscripta(db, grupoIds) : Promise.resolve([] as DiscipuladoActivo[]),
  ]);

  const personaDeSolicitud = new Map(solicitudes.map((s) => [s.id, s.personaId]));
  const idsPersonasSolicitud = [...new Set(solicitudes.map((s) => s.personaId))];
  const nombres = await nombresDe(db, idsPersonasSolicitud);
  const nombrePorGrupo = new Map(gruposNombrados.map((g) => [g.grupoId, g.persona]));

  return propuestas.map((p) => {
    if (p.tipo === 'nueva' && p.solicitudId) {
      const pid = personaDeSolicitud.get(p.solicitudId);
      return { propuestaId: p.id, persona: (pid && nombres.get(pid)) || { nombre: '', apellido: '' } };
    }
    const persona = (p.grupoId && nombrePorGrupo.get(p.grupoId)) || { nombre: '', apellido: '' };
    return { propuestaId: p.id, persona };
  });
}

/** Versión en lote para el listado de Personas (lote D, T056) — una consulta por relación, no una por fila. */
export async function discipuladosActivosDeVarias(db: Db, personaIds: string[]): Promise<Map<string, DiscipuladoActivo[]>> {
  const mapa = new Map<string, DiscipuladoActivo[]>(personaIds.map((id) => [id, []]));
  if (personaIds.length === 0) return mapa;
  const liderazgos = await db.liderazgo.findMany({
    where: { personaId: { in: personaIds }, hasta: null, grupo: { estado: 'en_curso' } },
    select: { personaId: true, grupoId: true },
  });
  if (liderazgos.length === 0) return mapa;
  const nombrados = new Map((await nombrarGruposPorInscripta(db, liderazgos.map((l) => l.grupoId))).map((d) => [d.grupoId, d]));
  for (const l of liderazgos) {
    const d = nombrados.get(l.grupoId);
    if (d) mapa.get(l.personaId)!.push(d);
  }
  return mapa;
}

export async function propuestasPendientesDeVarias(db: Db, personaIds: string[]): Promise<Map<string, PropuestaPendiente[]>> {
  const mapa = new Map<string, PropuestaPendiente[]>(personaIds.map((id) => [id, []]));
  await Promise.all(
    personaIds.map(async (id) => {
      mapa.set(id, await propuestasPendientesDe(db, id));
    }),
  );
  return mapa;
}

/** Para cada Grupo, una `DiscipuladoActivo` con el nombre de su primera Persona activa. */
async function nombrarGruposPorInscripta(db: Db, grupoIds: string[]): Promise<DiscipuladoActivo[]> {
  const inscripciones = await db.inscripcion.findMany({
    where: { grupoId: { in: grupoIds }, estado: 'activa' },
    select: { grupoId: true, personaId: true },
    orderBy: { createdAt: 'asc' },
  });
  const primeraPorGrupo = new Map<string, string>();
  for (const i of inscripciones) if (!primeraPorGrupo.has(i.grupoId)) primeraPorGrupo.set(i.grupoId, i.personaId);
  const nombres = await nombresDe(db, [...new Set(primeraPorGrupo.values())]);
  return grupoIds.map((grupoId) => ({
    grupoId,
    persona: (primeraPorGrupo.get(grupoId) && nombres.get(primeraPorGrupo.get(grupoId)!)) || { nombre: '', apellido: '' },
  }));
}

async function nombresDe(db: Db, ids: string[]): Promise<Map<string, { nombre: string; apellido: string }>> {
  if (ids.length === 0) return new Map();
  const personas = await db.persona.findMany({ where: { id: { in: ids } }, select: { id: true, nombre: true, apellido: true } });
  return new Map(personas.map((p) => [p.id, { nombre: p.nombre, apellido: p.apellido }]));
}
