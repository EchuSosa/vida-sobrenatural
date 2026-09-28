import { Injectable } from '@nestjs/common';
import type { Cruce, Franja, GrupoConLugar } from '@vida-sobrenatural/shared-types';
import { franjasCoinciden, hoyEnArgentina, bloqueoVigente } from '@vida-sobrenatural/shared-types';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { armarCruce, type CandidatoCruce } from './cruce-puro.js';

type Db = PrismaService | Prisma.TransactionClient;

/**
 * specs/004, T011c (contracts/solicitudes-api.md): el cruce que ve el Admin al
 * proponer (FR-034) o reasignar (FR-030). Un solo lugar (Principio XI): lo usan
 * el módulo de Solicitudes y el de reasignación. Carga los disponibles (FR-006)
 * y delega el reparto por franja, las reglas y la sugerencia en `armarCruce`
 * (puro, `cruce-puro.ts`).
 */
@Injectable()
export class CruceService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * FR-006: los Discipuladores que hoy pueden recibir una propuesta — rol
   * `discipulador`, `activo`, `disponibleDiscipulado`, con al menos una franja
   * de agenda viva y sin un período de no disponibilidad vigente. Devuelve
   * también su carga y sus Grupos con lugar, contra las `franjasObjetivo`.
   */
  async disponibles(franjasObjetivo: Franja[], db: Db = this.prisma): Promise<CandidatoCruce[]> {
    const personas = await db.persona.findMany({
      where: { rol: { has: 'discipulador' }, activo: true, disponibleDiscipulado: true },
      select: { id: true, nombre: true, apellido: true, genero: true },
    });
    if (personas.length === 0) return [];
    const ids = personas.map((p) => p.id);
    const hoy = hoyEnArgentina();

    const [franjasAgenda, bloqueos] = await Promise.all([
      db.franjaAgenda.findMany({
        where: { personaId: { in: ids }, eliminadaEn: null },
        select: { personaId: true, diaSemana: true, inicio: true, fin: true },
      }),
      db.bloqueoDisponibilidad.findMany({
        where: { personaId: { in: ids }, eliminadoEn: null },
        select: { personaId: true, desde: true, hasta: true },
      }),
    ]);

    const agendaPorPersona = new Map<string, Franja[]>();
    for (const f of franjasAgenda) {
      const lista = agendaPorPersona.get(f.personaId) ?? [];
      lista.push({ diaSemana: f.diaSemana, inicio: f.inicio, fin: f.fin });
      agendaPorPersona.set(f.personaId, lista);
    }
    const bloqueadoHoy = new Set(
      bloqueos
        .filter((b) => bloqueoVigente({ desde: comoFechaCivil(b.desde), hasta: comoFechaCivil(b.hasta) }, hoy))
        .map((b) => b.personaId),
    );

    // FR-006: agenda no vacía y sin bloqueo vigente.
    const candidatas = personas.filter((p) => (agendaPorPersona.get(p.id)?.length ?? 0) > 0 && !bloqueadoHoy.has(p.id));
    if (candidatas.length === 0) return [];

    const [cargas, gruposConLugarPorPersona] = await Promise.all([
      this.cargaDe(db, candidatas.map((p) => p.id)),
      this.gruposConLugarDe(db, candidatas.map((p) => p.id), franjasObjetivo, agendaPorPersona),
    ]);

    return candidatas.map((p) => ({
      id: p.id,
      nombre: p.nombre,
      apellido: p.apellido,
      genero: p.genero,
      franjas: agendaPorPersona.get(p.id) ?? [],
      carga: cargas.get(p.id) ?? { discipuladosActivos: 0, propuestasPendientes: 0 },
      gruposConLugar: gruposConLugarPorPersona.get(p.id) ?? [],
    }));
  }

  /** El cruce contra unas franjas objetivo y el género de la Persona, excluyendo opcionalmente a un Discipulador (el vigente, al reasignar). */
  async cruce(franjasObjetivo: Franja[], personaGenero: string, excluirId: string | undefined, db: Db = this.prisma): Promise<Cruce> {
    const candidatos = (await this.disponibles(franjasObjetivo, db)).filter((c) => c.id !== excluirId);
    return armarCruce(candidatos, { franjas: franjasObjetivo, genero: personaGenero });
  }

  private async cargaDe(db: Db, ids: string[]): Promise<Map<string, { discipuladosActivos: number; propuestasPendientes: number }>> {
    const [liderazgos, propuestas] = await Promise.all([
      db.liderazgo.findMany({ where: { personaId: { in: ids }, hasta: null, grupo: { estado: 'en_curso' } }, select: { personaId: true } }),
      db.propuestaDiscipulado.findMany({ where: { discipuladorId: { in: ids }, estado: 'pendiente' }, select: { discipuladorId: true } }),
    ]);
    const mapa = new Map(ids.map((id) => [id, { discipuladosActivos: 0, propuestasPendientes: 0 }]));
    for (const l of liderazgos) mapa.get(l.personaId)!.discipuladosActivos += 1;
    for (const p of propuestas) mapa.get(p.discipuladorId)!.propuestasPendientes += 1;
    return mapa;
  }

  /** Grupos en curso del candidato con lugar (FR-045), con su horario derivado para `coincideHorario` (research #14). */
  private async gruposConLugarDe(
    db: Db,
    ids: string[],
    franjasObjetivo: Franja[],
    agendaPorPersona: Map<string, Franja[]>,
  ): Promise<Map<string, GrupoConLugar[]>> {
    const mapa = new Map<string, GrupoConLugar[]>(ids.map((id) => [id, []]));
    const liderazgos = await db.liderazgo.findMany({
      where: { personaId: { in: ids }, hasta: null, grupo: { estado: 'en_curso' } },
      select: { personaId: true, grupoId: true },
    });
    if (liderazgos.length === 0) return mapa;

    const grupoIds = liderazgos.map((l) => l.grupoId);
    // Personas activas de cada Grupo (solicitudId es referencia lógica: las
    // franjas de cada miembro se traen aparte, no por relación).
    const inscripciones = await db.inscripcion.findMany({
      where: { grupoId: { in: grupoIds }, estado: 'activa' },
      select: { grupoId: true, personaId: true, solicitudId: true },
    });
    const [nombres, franjasSolicitud, personaMax] = await Promise.all([
      nombresDe(db, [...new Set(inscripciones.map((i) => i.personaId))]),
      db.franjaSolicitud.findMany({
        where: { solicitudId: { in: [...new Set(inscripciones.map((i) => i.solicitudId))] } },
        select: { solicitudId: true, diaSemana: true, inicio: true, fin: true },
      }),
      db.persona.findMany({ where: { id: { in: ids } }, select: { id: true, maxPersonasPorGrupo: true } }),
    ]);
    const maxPorPersona = new Map(personaMax.map((p) => [p.id, p.maxPersonasPorGrupo]));
    const franjasPorSolicitud = new Map<string, Franja[]>();
    for (const f of franjasSolicitud) {
      const lista = franjasPorSolicitud.get(f.solicitudId) ?? [];
      lista.push({ diaSemana: f.diaSemana, inicio: f.inicio, fin: f.fin });
      franjasPorSolicitud.set(f.solicitudId, lista);
    }

    const porGrupo = new Map<string, { personas: string[]; franjasMiembros: Franja[] }>();
    for (const i of inscripciones) {
      const g = porGrupo.get(i.grupoId) ?? { personas: [], franjasMiembros: [] };
      const n = nombres.get(i.personaId);
      if (n) g.personas.push(`${n.nombre} ${n.apellido}`);
      for (const f of franjasPorSolicitud.get(i.solicitudId) ?? []) g.franjasMiembros.push(f);
      porGrupo.set(i.grupoId, g);
    }

    for (const l of liderazgos) {
      const g = porGrupo.get(l.grupoId) ?? { personas: [], franjasMiembros: [] };
      const maximo = maxPorPersona.get(l.personaId) ?? 1;
      const ocupado = g.personas.length;
      if (ocupado >= maximo) continue; // sin lugar
      const agenda = agendaPorPersona.get(l.personaId) ?? [];
      const coincideHorario = franjasObjetivo.some(
        (fo) => agenda.some((fa) => franjasCoinciden(fo, fa)) && g.franjasMiembros.some((fm) => franjasCoinciden(fo, fm)),
      );
      mapa.get(l.personaId)!.push({ grupoId: l.grupoId, ocupado, maximo, coincideHorario, personas: g.personas });
    }
    return mapa;
  }
}

/** Fecha civil `YYYY-MM-DD` de un `@db.Date` (llega como Date a medianoche UTC). */
function comoFechaCivil(fecha: Date): string {
  return fecha.toISOString().slice(0, 10);
}

async function nombresDe(db: Db, ids: string[]): Promise<Map<string, { nombre: string; apellido: string }>> {
  if (ids.length === 0) return new Map();
  const personas = await db.persona.findMany({ where: { id: { in: ids } }, select: { id: true, nombre: true, apellido: true } });
  return new Map(personas.map((p) => [p.id, { nombre: p.nombre, apellido: p.apellido }]));
}
