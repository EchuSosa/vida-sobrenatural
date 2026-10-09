import {
  alertaFaltas,
  estadoSemanaLider,
  hoyEnArgentina,
  ultimaFecha,
  type EdicionAdminDetalle,
  type InscriptoParaLider,
  type MiGrupoDetalle,
} from '@vida-sobrenatural/shared-types';
import type { Prisma } from '../generated/prisma/client.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { nombresDe } from '../discipulado/consultas.js';
import { faltasPorInscripcion, fechaCivil, grupoVSOFallar, lideresVigentes, nombresDeSedes, semanasDeUno } from './consultas-vs.js';

type Db = PrismaService | Prisma.TransactionClient;

const ORDEN_ESTADO = { activa: 0, completada: 1, dada_de_baja: 2, abandono: 3 } as const;

/**
 * spec 008 (contracts/lider-api.md, admin-api.md): el detalle de una edición
 * — lo mismo para el Líder (`MiGrupoDetalle`, FR-019) y para el backoffice
 * (`EdicionAdminDetalle`, FR-038), que suma el historial de Líderes y quién
 * propuso. El teléfono, solo de las Inscripciones `activa` (Pregunta 3).
 * Las faltas, en una consulta agrupada (research #12).
 */
export async function detalleDeEdicion(db: Db, grupoId: string): Promise<MiGrupoDetalle> {
  const hoy = hoyEnArgentina();
  const grupo = await grupoVSOFallar(db, grupoId);
  const [semanas, lideres, sedes, inscripciones, faltas] = await Promise.all([
    semanasDeUno(db, grupoId),
    lideresVigentes(db, [grupoId]),
    nombresDeSedes(db, [grupo.sedeId]),
    db.inscripcion.findMany({
      where: { grupoId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true, personaId: true, estado: true, bajaPropuestaEn: true, bajaPropuestaTipo: true, bajaPropuestaMotivo: true, bajaRechazadaEn: true, bajaRechazadaMotivo: true,
      },
    }),
    faltasPorInscripcion(db, [grupoId]),
  ]);
  const personas = await db.persona.findMany({
    where: { id: { in: inscripciones.map((i) => i.personaId) } },
    select: { id: true, nombre: true, apellido: true, telefono: true },
  });
  const porId = new Map(personas.map((p) => [p.id, p]));
  const inscriptos: InscriptoParaLider[] = inscripciones
    .map((i) => {
      const p = porId.get(i.personaId)!;
      const cantidad = faltas.get(i.id) ?? 0;
      return {
        inscripcionId: i.id,
        personaId: i.personaId,
        nombre: p.nombre,
        apellido: p.apellido,
        telefono: i.estado === 'activa' ? p.telefono : null,
        estado: i.estado,
        faltas: cantidad,
        alertaFaltas: i.estado === 'activa' && alertaFaltas(cantidad),
        bajaPropuesta: i.bajaPropuestaEn && i.bajaPropuestaTipo ? { tipo: i.bajaPropuestaTipo, en: i.bajaPropuestaEn.toISOString(), comentario: i.bajaPropuestaMotivo } : null,
        bajaRechazada: i.bajaRechazadaEn ? { en: i.bajaRechazadaEn.toISOString(), motivo: i.bajaRechazadaMotivo } : null,
      };
    })
    .sort((a, b) => ORDEN_ESTADO[a.estado] - ORDEN_ESTADO[b.estado] || a.apellido.localeCompare(b.apellido) || a.nombre.localeCompare(b.nombre));

  return {
    grupoId,
    nombre: grupo.nombre ?? '',
    sede: sedes.get(grupo.sedeId) ?? '',
    fechaInicio: grupo.fechaInicio ? fechaCivil(grupo.fechaInicio) : '',
    estado: grupo.estado,
    lideres: lideres.get(grupoId) ?? [],
    semanas: semanas.map((s) => ({ numero: s.numero, fechaLiberacion: s.fechaLiberacion, estado: estadoSemanaLider(s.fechaLiberacion, s.conMaterial, hoy) })),
    inscriptos,
    finalizacion: {
      propuestaEn: grupo.propuestaFinalizacionEn?.toISOString() ?? null,
      rechazadaEn: grupo.finalizacionRechazadaEn?.toISOString() ?? null,
      motivoRechazo: grupo.finalizacionRechazadaMotivo,
      sePuedeProponerDesde: ultimaFecha(semanas.map((s) => s.fechaLiberacion)),
    },
  };
}

/** `EdicionAdminDetalle` (FR-038): lo del Líder + historial de Líderes, quién propuso y las bajas propuestas. */
export async function detalleDeEdicionAdmin(db: Db, grupoId: string): Promise<EdicionAdminDetalle> {
  const base = await detalleDeEdicion(db, grupoId);
  const grupo = await db.grupo.findUniqueOrThrow({ where: { id: grupoId }, select: { sedeId: true, inscripcionAbierta: true, propuestaFinalizacionPorId: true } });
  const [liderazgos, bajas] = await Promise.all([
    db.liderazgo.findMany({ where: { grupoId }, orderBy: { desde: 'asc' }, select: { personaId: true, desde: true, hasta: true } }),
    db.inscripcion.findMany({
      where: { grupoId, estado: 'activa', bajaPropuestaEn: { not: null } },
      orderBy: { bajaPropuestaEn: 'asc' },
      select: { id: true, personaId: true, bajaPropuestaTipo: true, bajaPropuestaEn: true, bajaPropuestaMotivo: true, bajaPropuestaPorId: true },
    }),
  ]);
  const nombres = await nombresDe(db, [
    ...liderazgos.map((l) => l.personaId),
    ...bajas.flatMap((b) => [b.personaId, b.bajaPropuestaPorId].filter((x): x is string => x !== null)),
    ...(grupo.propuestaFinalizacionPorId ? [grupo.propuestaFinalizacionPorId] : []),
  ]);
  return {
    ...base,
    sedeId: grupo.sedeId,
    inscripcionAbierta: grupo.inscripcionAbierta,
    historialLideres: liderazgos.map((l) => {
      const p = nombres.get(l.personaId);
      return { personaId: l.personaId, nombre: p?.nombre ?? '', apellido: p?.apellido ?? '', desde: l.desde.toISOString(), hasta: l.hasta?.toISOString() ?? null };
    }),
    finalizacionPropuestaPor: base.finalizacion.propuestaEn && grupo.propuestaFinalizacionPorId ? (nombres.get(grupo.propuestaFinalizacionPorId) ?? null) : null,
    bajasPropuestas: bajas.map((b) => ({
      inscripcionId: b.id,
      persona: nombres.get(b.personaId)!,
      tipo: b.bajaPropuestaTipo ?? 'dada_de_baja',
      en: b.bajaPropuestaEn!.toISOString(),
      comentario: b.bajaPropuestaMotivo,
      propuestaPor: b.bajaPropuestaPorId ? (nombres.get(b.bajaPropuestaPorId) ?? null) : null,
    })),
  };
}
