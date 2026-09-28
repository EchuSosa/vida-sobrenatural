import { Injectable } from '@nestjs/common';
import type {
  DiscipuladoResumen,
  EncuentroAdministrativo,
  Franja,
  Pagina,
  PersonaBreve,
} from '@vida-sobrenatural/shared-types';
import { PrismaService } from '../prisma/prisma.service.js';
import type { Prisma } from '../generated/prisma/client.js';
import { AppException } from '../common/errors/app-exception.js';
import { comoFechaCivil, franjasDeSolicitudes, nombresDe } from './consultas.js';
import { interseccionDeFranjas } from './validaciones.js';

export type FiltroPendiente = 'finalizacion' | 'baja' | 'reasignacion';

export interface FiltrosGrupos {
  estado: 'en_curso' | 'finalizado';
  pendiente?: FiltroPendiente;
  dir: 'asc' | 'desc';
  skip: number;
  take: number;
}

export type DetalleDiscipuladoAdmin = DiscipuladoResumen & {
  encuentros: EncuentroAdministrativo[];
  liderazgos: Array<{ discipulador: PersonaBreve; desde: string; hasta: string | null }>;
  franjasDelGrupo: Franja[];
};

/**
 * specs/004, T044 (D134): la vista administrativa de los discipulados, para
 * Admin y Pastor. **Ningún `select` de este archivo incluye `notas`**: las
 * notas de un Encuentro son del Discipulador vigente (FR-029, test de
 * integración que busca el texto en la respuesta).
 */
@Injectable()
export class GruposService {
  constructor(private readonly prisma: PrismaService) {}

  async listar(filtros: FiltrosGrupos): Promise<Pagina<DiscipuladoResumen>> {
    const where = await this.whereDe(filtros);
    const [grupos, total] = await Promise.all([
      this.prisma.grupo.findMany({
        where,
        select: { id: true },
        // Desempate por id: sin orden total, Postgres puede repetir filas entre páginas.
        orderBy: [{ createdAt: filtros.dir }, { id: 'asc' }],
        skip: filtros.skip,
        take: filtros.take,
      }),
      this.prisma.grupo.count({ where }),
    ]);
    const items = await this.resumenes(grupos.map((g) => g.id));
    return { items, total };
  }

  async detalle(grupoId: string): Promise<DetalleDiscipuladoAdmin> {
    const [resumen] = await this.resumenes([grupoId]);
    if (!resumen) throw new AppException('NO_ENCONTRADO', 404, 'No encontramos este discipulado.');

    const [encuentros, liderazgos, inscripciones] = await Promise.all([
      this.prisma.encuentro.findMany({
        where: { grupoId },
        // Sin `notas` (D134).
        select: { id: true, fecha: true, capitulos: true, updatedAt: true, asistencias: { select: { presente: true, inscripcion: { select: { personaId: true } } } } },
        orderBy: [{ fecha: 'desc' }, { createdAt: 'desc' }],
      }),
      this.prisma.liderazgo.findMany({ where: { grupoId }, select: { personaId: true, desde: true, hasta: true }, orderBy: { desde: 'asc' } }),
      this.prisma.inscripcion.findMany({ where: { grupoId, estado: 'activa' }, select: { solicitudId: true } }),
    ]);
    const nombres = await nombresDe(this.prisma, liderazgos.map((l) => l.personaId));
    const vigente = liderazgos.find((l) => l.hasta === null);
    const [agenda, franjas] = await Promise.all([
      vigente
        ? this.prisma.franjaAgenda.findMany({ where: { personaId: vigente.personaId, eliminadaEn: null }, select: { diaSemana: true, inicio: true, fin: true } })
        : Promise.resolve([] as Franja[]),
      franjasDeSolicitudes(this.prisma, inscripciones.map((i) => i.solicitudId)),
    ]);

    return {
      ...resumen,
      encuentros: encuentros.map((e) => ({
        id: e.id,
        fecha: comoFechaCivil(e.fecha),
        capitulos: e.capitulos,
        asistencias: e.asistencias.map((a) => ({ personaId: a.inscripcion.personaId, presente: a.presente })),
        updatedAt: e.updatedAt.toISOString(),
      })),
      liderazgos: liderazgos.map((l) => ({
        discipulador: nombres.get(l.personaId) ?? { id: l.personaId, nombre: '', apellido: '' },
        desde: l.desde.toISOString(),
        hasta: l.hasta?.toISOString() ?? null,
      })),
      // research #14: la agenda de hoy del Discipulador ∩ las franjas de cada Persona activa.
      franjasDelGrupo: inscripciones.length === 0 ? [] : interseccionDeFranjas([agenda, ...inscripciones.map((i) => franjas.get(i.solicitudId) ?? [])]),
    };
  }

  private async whereDe(filtros: FiltrosGrupos): Promise<Prisma.GrupoWhereInput> {
    const where: Prisma.GrupoWhereInput = { estado: filtros.estado, curso: { categoria: 'vida_nueva' } };
    if (filtros.pendiente === 'finalizacion') where.propuestaFinalizacionEn = { not: null };
    if (filtros.pendiente === 'baja') where.inscripciones = { some: { estado: 'activa', bajaPropuestaEn: { not: null } } };
    if (filtros.pendiente === 'reasignacion') {
      // La Propuesta guarda `grupoId` como referencia lógica (sin relación de Prisma).
      const pendientes = await this.prisma.propuestaDiscipulado.findMany({
        where: { tipo: 'reasignacion', estado: 'pendiente' },
        select: { grupoId: true },
      });
      where.id = { in: pendientes.map((p) => p.grupoId).filter((id): id is string => id !== null) };
    }
    return where;
  }

  /** Arma los `DiscipuladoResumen` de estos Grupos en pocas consultas (no una por fila, H-42), en el mismo orden. */
  private async resumenes(grupoIds: string[]): Promise<DiscipuladoResumen[]> {
    if (grupoIds.length === 0) return [];
    const [grupos, inscripciones, liderazgos, ultimos, reasignaciones] = await Promise.all([
      this.prisma.grupo.findMany({
        where: { id: { in: grupoIds } },
        select: { id: true, estado: true, motivoCierre: true, createdAt: true, propuestaFinalizacionEn: true, _count: { select: { encuentros: true } } },
      }),
      this.prisma.inscripcion.findMany({
        where: { grupoId: { in: grupoIds } },
        select: { grupoId: true, personaId: true, estado: true, bajaPropuestaEn: true },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.liderazgo.findMany({ where: { grupoId: { in: grupoIds }, hasta: null }, select: { grupoId: true, personaId: true, desde: true } }),
      this.prisma.encuentro.findMany({
        where: { grupoId: { in: grupoIds } },
        select: { grupoId: true, fecha: true, capitulos: true },
        orderBy: [{ grupoId: 'asc' }, { fecha: 'desc' }, { createdAt: 'desc' }],
        distinct: ['grupoId'],
      }),
      this.prisma.propuestaDiscipulado.findMany({
        where: { grupoId: { in: grupoIds }, tipo: 'reasignacion', estado: 'pendiente' },
        select: { grupoId: true, discipuladorId: true, propuestaEn: true },
      }),
    ]);
    const nombres = await nombresDe(this.prisma, [
      ...inscripciones.map((i) => i.personaId),
      ...liderazgos.map((l) => l.personaId),
      ...reasignaciones.map((r) => r.discipuladorId),
    ]);
    const maximos = new Map(
      (
        await this.prisma.persona.findMany({
          where: { id: { in: liderazgos.map((l) => l.personaId) } },
          select: { id: true, maxPersonasPorGrupo: true },
        })
      ).map((p) => [p.id, p.maxPersonasPorGrupo]),
    );
    const breve = (id: string): PersonaBreve => nombres.get(id) ?? { id, nombre: '', apellido: '' };
    const grupoPorId = new Map(grupos.map((g) => [g.id, g]));
    const liderazgoPorGrupo = new Map(liderazgos.map((l) => [l.grupoId, l]));
    const ultimoPorGrupo = new Map(ultimos.map((u) => [u.grupoId, u]));
    const reasignacionPorGrupo = new Map(reasignaciones.map((r) => [r.grupoId, r]));

    return grupoIds.flatMap((id): DiscipuladoResumen[] => {
      const g = grupoPorId.get(id);
      if (!g) return [];
      const delGrupo = inscripciones.filter((i) => i.grupoId === id);
      const lider = liderazgoPorGrupo.get(id);
      const ultimo = ultimoPorGrupo.get(id);
      const reasignacion = reasignacionPorGrupo.get(id);
      return [
        {
          grupoId: id,
          personas: delGrupo.map((i) => ({
            ...breve(i.personaId),
            estadoInscripcion: i.estado,
            bajaPropuesta: i.estado === 'activa' && i.bajaPropuestaEn !== null,
          })),
          discipulador: lider ? breve(lider.personaId) : { id: '', nombre: '', apellido: '' },
          desde: g.createdAt.toISOString(),
          estado: g.estado,
          motivoCierre: g.motivoCierre,
          lugar: { ocupado: delGrupo.filter((i) => i.estado === 'activa').length, maximo: (lider && maximos.get(lider.personaId)) ?? 1 },
          cantidadEncuentros: g._count.encuentros,
          ultimoEncuentro: ultimo ? { fecha: comoFechaCivil(ultimo.fecha), capitulos: ultimo.capitulos } : null,
          propuestaFinalizacionEn: g.propuestaFinalizacionEn?.toISOString() ?? null,
          reasignacionPropuesta: reasignacion
            ? { discipulador: breve(reasignacion.discipuladorId), propuestaEn: reasignacion.propuestaEn.toISOString() }
            : null,
        },
      ];
    });
  }
}
