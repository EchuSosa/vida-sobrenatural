import { HttpStatus, Injectable } from '@nestjs/common';
import {
  estadoSemanaLider,
  hoyEnArgentina,
  sePuedeProponerFinalizacion,
  ultimaFecha,
  type MiGrupoDetalle,
  type MiGrupoResumen,
  type TipoBaja,
} from '@vida-sobrenatural/shared-types';
import { PrismaService } from '../prisma/prisma.service.js';
import { AppException } from '../common/errors/app-exception.js';
import { NotificacionesService } from '../notificaciones/notificaciones.service.js';
import { DE_VIDA_DE_SERVICIO, bloquearGrupo, comentarioOpcional, bloquearInscripcion, conteosDeInscriptos, grupoDelLiderOFallar, grupoNoEnCurso, semanasDe } from './consultas-vs.js';
import { detalleDeEdicion } from './detalle-grupo.js';
import { inscripcionNoActiva } from './ediciones.service.js';

/** Un Líder tiene pocos Grupos por construcción; si hay más, se corta (contracts/lider-api.md). */
const MIS_GRUPOS_MAX = 20;

/**
 * spec 008, Historias 4, 6, 7 y 8 — el Líder de curso en la web app
 * (contracts/lider-api.md, D142): sus ediciones (FR-019, recortadas por
 * identidad, D134), proponer bajas (FR-032) y la finalización (FR-035).
 * Cada método verifica el Liderazgo VIGENTE del que pide en ese Grupo
 * (Principio V): si no, 404 sin confirmar que exista.
 */
@Injectable()
export class MisGruposService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificaciones: NotificacionesService,
  ) {}

  /** GET /vida-de-servicio/mis-grupos: en curso primero; después los finalizados del último año. */
  async listar(personaId: string): Promise<MiGrupoResumen[]> {
    const haceUnAnio = new Date();
    haceUnAnio.setUTCFullYear(haceUnAnio.getUTCFullYear() - 1);
    const grupos = await this.prisma.grupo.findMany({
      where: {
        ...DE_VIDA_DE_SERVICIO,
        liderazgos: { some: { personaId, hasta: null } },
        OR: [{ estado: 'en_curso' }, { cerradoEn: { gte: haceUnAnio } }],
      },
      orderBy: [{ estado: 'asc' }, { fechaInicio: 'desc' }],
      take: MIS_GRUPOS_MAX,
      select: { id: true, nombre: true, estado: true },
    });
    const ids = grupos.map((g) => g.id);
    const hoy = hoyEnArgentina();
    const [semanas, conteos] = await Promise.all([semanasDe(this.prisma, ids), conteosDeInscriptos(this.prisma, ids)]);
    return grupos.map((g) => {
      const delGrupo = semanas.get(g.id) ?? [];
      const proxima = delGrupo.find((s) => s.fechaLiberacion >= hoy) ?? null;
      return {
        grupoId: g.id,
        nombre: g.nombre ?? '',
        estado: g.estado,
        inscriptosActivos: conteos.get(g.id)?.activos ?? 0,
        conAlertaDeFaltas: conteos.get(g.id)?.conAlerta ?? 0,
        proximaSemana: g.estado === 'en_curso' && proxima ? { numero: proxima.numero, fechaLiberacion: proxima.fechaLiberacion, conMaterial: proxima.conMaterial } : null,
        semanasSinMaterialVencidas: delGrupo.filter((s) => estadoSemanaLider(s.fechaLiberacion, s.conMaterial, hoy) === 'vencida_sin_material').length,
      };
    });
  }

  /** GET /vida-de-servicio/mis-grupos/:grupoId. */
  async detalle(grupoId: string, personaId: string): Promise<MiGrupoDetalle> {
    await grupoDelLiderOFallar(this.prisma, grupoId, personaId);
    return detalleDeEdicion(this.prisma, grupoId);
  }

  /** POST …/inscripciones/:id/baja/proponer (FR-032). Mientras está propuesta, la Persona sigue con normalidad. */
  async proponerBaja(grupoId: string, inscripcionId: string, personaId: string, tipo: TipoBaja, comentarioCrudo: string | undefined): Promise<MiGrupoDetalle> {
    const comentario = comentarioOpcional(comentarioCrudo, 'comentario');
    await grupoDelLiderOFallar(this.prisma, grupoId, personaId);
    await this.prisma.$transaction(async (tx) => {
      await bloquearGrupo(tx, grupoId);
      const grupo = await tx.grupo.findUniqueOrThrow({ where: { id: grupoId }, select: { estado: true } });
      if (grupo.estado !== 'en_curso') throw grupoNoEnCurso();
      await bloquearInscripcion(tx, inscripcionId);
      const i = await tx.inscripcion.findFirst({ where: { id: inscripcionId, grupoId }, select: { estado: true, bajaPropuestaEn: true } });
      if (!i) throw new AppException('NO_ENCONTRADO', HttpStatus.NOT_FOUND, 'No existe esa Inscripción en esta edición.');
      if (i.estado !== 'activa') throw inscripcionNoActiva();
      if (i.bajaPropuestaEn) throw new AppException('BAJA_YA_PROPUESTA', HttpStatus.CONFLICT, 'Ya hay una baja propuesta para esta Persona.');
      await tx.inscripcion.update({
        where: { id: inscripcionId },
        data: { bajaPropuestaEn: new Date(), bajaPropuestaPorId: personaId, bajaPropuestaTipo: tipo, bajaPropuestaMotivo: comentario, bajaRechazadaEn: null, bajaRechazadaMotivo: null },
      });
      await this.notificaciones.emitir(tx, { nombre: 'vida_servicio.baja_propuesta', a: { tipo: 'admin' }, datos: { grupoId, inscripcionId } });
    });
    return detalleDeEdicion(this.prisma, grupoId);
  }

  /** POST …/finalizacion/proponer (FR-035): recién desde la fecha de la última semana. */
  async proponerFinalizacion(grupoId: string, personaId: string): Promise<MiGrupoDetalle> {
    await grupoDelLiderOFallar(this.prisma, grupoId, personaId);
    await this.prisma.$transaction(async (tx) => {
      await bloquearGrupo(tx, grupoId);
      const grupo = await tx.grupo.findUniqueOrThrow({ where: { id: grupoId }, select: { estado: true, propuestaFinalizacionEn: true } });
      if (grupo.estado !== 'en_curso') throw grupoNoEnCurso();
      if (grupo.propuestaFinalizacionEn) throw new AppException('FINALIZACION_YA_PROPUESTA', HttpStatus.CONFLICT, 'Ya se propuso cerrar esta edición.');
      const fechas = ((await semanasDe(tx, [grupoId])).get(grupoId) ?? []).map((s) => s.fechaLiberacion);
      if (!sePuedeProponerFinalizacion(fechas, hoyEnArgentina())) {
        throw new AppException('FINALIZACION_ANTES_DE_TIEMPO', HttpStatus.CONFLICT, 'Se puede proponer cerrar la edición desde la fecha de la última semana.', undefined, {
          desde: ultimaFecha(fechas),
        });
      }
      await tx.grupo.update({ where: { id: grupoId }, data: { propuestaFinalizacionEn: new Date(), propuestaFinalizacionPorId: personaId } });
      await this.notificaciones.emitir(tx, { nombre: 'vida_servicio.finalizacion_propuesta', a: { tipo: 'admin' }, datos: { grupoId } });
    });
    return detalleDeEdicion(this.prisma, grupoId);
  }
}
