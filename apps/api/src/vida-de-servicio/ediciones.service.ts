import { HttpStatus, Injectable } from '@nestjs/common';
import {
  NOMBRE_EDICION_MAX,
  cronogramaValido,
  hoyEnArgentina,
  sumarDias,
  tienePermiso,
  validarCambioCronograma,
  type EdicionAdminDetalle,
  type EdicionAdminResumen,
  type Pagina,
  type TipoBaja,
} from '@vida-sobrenatural/shared-types';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AppException, type AppExceptionErrorField } from '../common/errors/app-exception.js';
import { errorDeValidacion, normalizarMotivo } from '../discipulado/validaciones.js';
import { NotificacionesService } from '../notificaciones/notificaciones.service.js';
import { alCompletarCategoria } from './efectos.js';
import {
  DE_VIDA_DE_SERVICIO,
  aFecha,
  bloquearGrupo,
  bloquearInscripcion,
  comentarioOpcional,
  conteosDeInscriptos,
  cursoVidaDeServicioId,
  fechaCivil,
  grupoNoEnCurso,
  grupoVSOFallar,
  lideresVigentes,
  nombresDeSedes,
  semanasDeUno,
} from './consultas-vs.js';
import { detalleDeEdicionAdmin } from './detalle-grupo.js';

export interface DatosNuevaEdicion {
  nombre?: string;
  sedeId?: string;
  fechaInicio?: string;
  semanas?: string[];
  lideres?: string[];
}

const FECHA_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * spec 008, Historias 1, 7, 8 y 9 — el Admin (contracts/admin-api.md): abrir
 * una edición con su cronograma y Líderes (FR-002 a FR-006), resolver bajas
 * (FR-033) y la finalización (FR-036), y el listado para el seguimiento
 * (FR-038). Cada transición bloquea la fila del Grupo (o de la Inscripción) y
 * emite su aviso DENTRO de la transacción (D197). En un Grupo finalizado no
 * se cambia nada (FR-037).
 */
@Injectable()
export class EdicionesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificaciones: NotificacionesService,
  ) {}

  /** GET /grupos/vida-de-servicio (FR-038, FR-039). */
  async listar(filtros: { estado?: 'en_curso' | 'finalizado' | 'todos'; pendiente?: 'finalizacion' | 'baja'; q?: string; skip?: number; take?: number }): Promise<Pagina<EdicionAdminResumen>> {
    const where: Prisma.GrupoWhereInput = {
      ...DE_VIDA_DE_SERVICIO,
      ...(filtros.estado && filtros.estado !== 'todos' ? { estado: filtros.estado } : {}),
      ...(filtros.pendiente === 'finalizacion' ? { estado: 'en_curso', propuestaFinalizacionEn: { not: null } } : {}),
      ...(filtros.pendiente === 'baja' ? { estado: 'en_curso', inscripciones: { some: { estado: 'activa', bajaPropuestaEn: { not: null } } } } : {}),
      ...(filtros.q?.trim() ? { nombre: { contains: filtros.q.trim(), mode: 'insensitive' } } : {}),
    };
    const [total, grupos] = await Promise.all([
      this.prisma.grupo.count({ where }),
      this.prisma.grupo.findMany({
        where,
        // En curso primero, y las más recientes arriba.
        orderBy: [{ estado: 'asc' }, { fechaInicio: 'desc' }, { nombre: 'asc' }],
        skip: filtros.skip ?? 0,
        take: Math.min(filtros.take ?? 20, 100),
        select: { id: true, nombre: true, sedeId: true, fechaInicio: true, estado: true, inscripcionAbierta: true, propuestaFinalizacionEn: true },
      }),
    ]);
    const ids = grupos.map((g) => g.id);
    const [conteos, lideres, sedes, bajas] = await Promise.all([
      conteosDeInscriptos(this.prisma, ids),
      lideresVigentes(this.prisma, ids),
      nombresDeSedes(this.prisma, grupos.map((g) => g.sedeId)),
      this.prisma.inscripcion.groupBy({ by: ['grupoId'], where: { grupoId: { in: ids }, estado: 'activa', bajaPropuestaEn: { not: null } }, _count: { _all: true } }),
    ]);
    const bajasPorGrupo = new Map(bajas.map((b) => [b.grupoId, b._count._all]));
    return {
      total,
      items: grupos.map((g) => ({
        grupoId: g.id,
        nombre: g.nombre ?? '',
        sede: sedes.get(g.sedeId) ?? '',
        fechaInicio: g.fechaInicio ? fechaCivil(g.fechaInicio) : '',
        estado: g.estado,
        inscripcionAbierta: g.inscripcionAbierta,
        inscriptosActivos: conteos.get(g.id)?.activos ?? 0,
        conAlertaDeFaltas: conteos.get(g.id)?.conAlerta ?? 0,
        lideres: lideres.get(g.id) ?? [],
        pendientes: { finalizacion: g.estado === 'en_curso' && g.propuestaFinalizacionEn !== null, bajas: bajasPorGrupo.get(g.id) ?? 0 },
      })),
    };
  }

  /** GET /grupos/vida-de-servicio/:grupoId (FR-038). */
  detalle(grupoId: string): Promise<EdicionAdminDetalle> {
    return detalleDeEdicionAdmin(this.prisma, grupoId);
  }

  /** POST /grupos/vida-de-servicio (FR-002, FR-003, FR-006). Todos los errores de campo juntos (H-50). */
  async crear(datos: DatosNuevaEdicion): Promise<{ grupoId: string }> {
    const nombre = datos.nombre?.trim() ?? '';
    const errores: AppExceptionErrorField[] = [];
    if (nombre === '') errores.push({ campo: 'nombre', code: 'NOMBRE_REQUERIDO' });
    else if (nombre.length > NOMBRE_EDICION_MAX) errores.push({ campo: 'nombre', code: 'NOMBRE_DEMASIADO_LARGO' });
    const sede = datos.sedeId ? await this.prisma.sede.findUnique({ where: { id: datos.sedeId }, select: { activo: true } }).catch(() => null) : null;
    if (!sede?.activo) errores.push({ campo: 'sedeId', code: 'SEDE_INACTIVA' });
    const fechaInicio = datos.fechaInicio ?? '';
    if (!FECHA_RE.test(fechaInicio) || Number.isNaN(Date.parse(fechaInicio))) errores.push({ campo: 'fechaInicio', code: 'FECHA_INVALIDA' });
    else errores.push(...cronogramaValido(datos.semanas ?? [], fechaInicio));
    const lideres = [...new Set(datos.lideres ?? [])];
    if (lideres.length === 0) errores.push({ campo: 'lideres', code: 'LIDERES_REQUERIDOS' });
    else if (!(await this.sonLideresValidos(this.prisma, lideres))) errores.push({ campo: 'lideres', code: 'PERSONA_SIN_ROL_LIDER' });
    if (errores.length > 0) throw errorDeValidacion(errores);

    return this.prisma.$transaction(async (tx) => {
      const grupo = await tx.grupo.create({
        data: {
          cursoId: await cursoVidaDeServicioId(tx),
          sedeId: datos.sedeId!,
          nombre,
          fechaInicio: aFecha(fechaInicio),
          inscripcionAbierta: true,
          items: { create: datos.semanas!.map((f, i) => ({ numeroSemana: i + 1, fechaLiberacion: aFecha(f) })) },
          liderazgos: { create: lideres.map((personaId) => ({ personaId })) },
        },
        select: { id: true },
      });
      for (const personaId of lideres) {
        await this.notificaciones.emitir(tx, { nombre: 'vida_servicio.lider_asignado', a: { tipo: 'persona', personaId }, datos: { grupoId: grupo.id } });
      }
      return { grupoId: grupo.id };
    });
  }

  /**
   * PUT /grupos/vida-de-servicio/:grupoId/cronograma (FR-004): el cronograma
   * completo. Las fechas que cambian pasan primero por una fecha provisoria
   * para no chocar con el índice único "una semana por fecha" a mitad del cambio.
   */
  async cambiarCronograma(grupoId: string, semanas: Array<{ numero: number; fechaLiberacion: string }>): Promise<EdicionAdminDetalle> {
    await this.prisma.$transaction(async (tx) => {
      const grupo = await this.grupoEnCursoBloqueado(tx, grupoId);
      const actual = await semanasDeUno(tx, grupoId);
      const { errores, conflicto } = validarCambioCronograma(actual, semanas, fechaCivil(grupo.fechaInicio!), hoyEnArgentina());
      if (errores.length > 0) throw errorDeValidacion(errores);
      if (conflicto === 'SEMANA_LIBERADA_NO_EDITABLE') throw new AppException(conflicto, HttpStatus.CONFLICT, 'Una semana que ya se ve no se puede mover ni quitar.');
      if (conflicto === 'SEMANA_CON_MATERIAL') throw new AppException(conflicto, HttpStatus.CONFLICT, 'Esa semana tiene material cargado: no se puede quitar.');

      const porNumero = new Map(semanas.map((s) => [s.numero, s.fechaLiberacion]));
      const quitadas = actual.filter((s) => !porNumero.has(s.numero));
      const movidas = actual.filter((s) => porNumero.has(s.numero) && porNumero.get(s.numero) !== s.fechaLiberacion);
      if (quitadas.length > 0) await tx.itemCronograma.updateMany({ where: { id: { in: quitadas.map((s) => s.itemId) } }, data: { eliminadoEn: new Date() } });
      for (const s of movidas) {
        await tx.itemCronograma.update({ where: { id: s.itemId }, data: { fechaLiberacion: aFecha(sumarDias('1900-01-01', s.numero)) } });
      }
      for (const s of movidas) await tx.itemCronograma.update({ where: { id: s.itemId }, data: { fechaLiberacion: aFecha(porNumero.get(s.numero)!) } });
      const existentes = new Set(actual.map((s) => s.numero));
      const nuevas = semanas.filter((s) => !existentes.has(s.numero));
      if (nuevas.length > 0) {
        await tx.itemCronograma.createMany({ data: nuevas.map((s) => ({ grupoId, numeroSemana: s.numero, fechaLiberacion: aFecha(s.fechaLiberacion) })) });
      }
    });
    return this.detalle(grupoId);
  }

  /** POST /grupos/vida-de-servicio/:grupoId/lideres (FR-005). */
  async sumarLider(grupoId: string, personaId: string): Promise<EdicionAdminDetalle> {
    await this.prisma.$transaction(async (tx) => {
      await this.grupoEnCursoBloqueado(tx, grupoId);
      if (!(await this.sonLideresValidos(tx, [personaId]))) throw errorDeValidacion([{ campo: 'personaId', code: 'PERSONA_SIN_ROL_LIDER' }]);
      const vigente = await tx.liderazgo.findFirst({ where: { grupoId, personaId, hasta: null }, select: { id: true } });
      if (vigente) throw new AppException('YA_ES_LIDER', HttpStatus.CONFLICT, 'Esa Persona ya es Líder de esta edición.');
      await tx.liderazgo.create({ data: { grupoId, personaId } });
      await this.notificaciones.emitir(tx, { nombre: 'vida_servicio.lider_asignado', a: { tipo: 'persona', personaId }, datos: { grupoId } });
    });
    return this.detalle(grupoId);
  }

  /** DELETE /grupos/vida-de-servicio/:grupoId/lideres/:personaId (FR-005): cierra el Liderazgo; nunca el último. */
  async sacarLider(grupoId: string, personaId: string, adminId: string): Promise<EdicionAdminDetalle> {
    await this.prisma.$transaction(async (tx) => {
      await this.grupoEnCursoBloqueado(tx, grupoId);
      const vigentes = await tx.liderazgo.findMany({ where: { grupoId, hasta: null }, select: { id: true, personaId: true } });
      const este = vigentes.find((l) => l.personaId === personaId);
      if (!este) throw new AppException('NO_ENCONTRADO', HttpStatus.NOT_FOUND, 'Esa Persona no es Líder de esta edición.');
      if (vigentes.length === 1) throw new AppException('ULTIMO_LIDER', HttpStatus.CONFLICT, 'Es el único Líder: sumá a otro antes de sacarlo.');
      await tx.liderazgo.update({ where: { id: este.id }, data: { hasta: new Date(), cerradoPorId: adminId } });
    });
    return this.detalle(grupoId);
  }

  /** PUT /grupos/vida-de-servicio/:grupoId/inscripcion-abierta (FR-006). */
  async abrirInscripcion(grupoId: string, abierta: boolean): Promise<EdicionAdminDetalle> {
    await this.prisma.$transaction(async (tx) => {
      await this.grupoEnCursoBloqueado(tx, grupoId);
      await tx.grupo.update({ where: { id: grupoId }, data: { inscripcionAbierta: abierta } });
    });
    return this.detalle(grupoId);
  }

  /** POST …/inscripciones/:id/baja/confirmar (FR-033): con el tipo propuesto o el corregido. */
  async confirmarBaja(grupoId: string, inscripcionId: string, tipo: TipoBaja | undefined): Promise<EdicionAdminDetalle> {
    await this.prisma.$transaction(async (tx) => {
      await this.grupoEnCursoBloqueado(tx, grupoId);
      const i = await this.inscripcionBloqueada(tx, grupoId, inscripcionId);
      if (i.estado !== 'activa' || !i.bajaPropuestaEn) throw bajaNoPropuesta();
      await this.aplicarBaja(tx, grupoId, inscripcionId, i.personaId, tipo ?? i.bajaPropuestaTipo ?? 'dada_de_baja');
    });
    return this.detalle(grupoId);
  }

  /** POST …/inscripciones/:id/baja/rechazar (FR-033): vuelve a la normalidad, con el motivo para los Líderes. */
  async rechazarBaja(grupoId: string, inscripcionId: string, motivoCrudo: string | undefined): Promise<EdicionAdminDetalle> {
    const motivo = normalizarMotivo(motivoCrudo);
    await this.prisma.$transaction(async (tx) => {
      await this.grupoEnCursoBloqueado(tx, grupoId);
      const i = await this.inscripcionBloqueada(tx, grupoId, inscripcionId);
      if (i.estado !== 'activa' || !i.bajaPropuestaEn) throw bajaNoPropuesta();
      await tx.inscripcion.update({
        where: { id: inscripcionId },
        data: { bajaPropuestaEn: null, bajaPropuestaPorId: null, bajaPropuestaMotivo: null, bajaPropuestaTipo: null, bajaRechazadaEn: new Date(), bajaRechazadaMotivo: motivo },
      });
      await this.notificaciones.emitir(tx, { nombre: 'vida_servicio.baja_rechazada', a: { tipo: 'lideres_grupo', grupoId }, datos: { grupoId, inscripcionId } });
    });
    return this.detalle(grupoId);
  }

  /** POST …/inscripciones/:id/baja (FR-033): baja o abandono directo, sin propuesta. */
  async bajaDirecta(grupoId: string, inscripcionId: string, tipo: TipoBaja, comentarioCrudo: string | undefined): Promise<EdicionAdminDetalle> {
    const comentario = comentarioOpcional(comentarioCrudo, 'comentario');
    await this.prisma.$transaction(async (tx) => {
      await this.grupoEnCursoBloqueado(tx, grupoId);
      const i = await this.inscripcionBloqueada(tx, grupoId, inscripcionId);
      if (i.estado !== 'activa') throw inscripcionNoActiva();
      if (comentario) await tx.inscripcion.update({ where: { id: inscripcionId }, data: { bajaPropuestaMotivo: comentario } });
      await this.aplicarBaja(tx, grupoId, inscripcionId, i.personaId, tipo);
    });
    return this.detalle(grupoId);
  }

  /**
   * POST …/finalizacion/confirmar (FR-036), en una transacción: cierra el
   * Grupo como completado, pasa TODAS las `activa` a `completada` y les da
   * Apto para Ministerio (agrega, nunca quita, H-139). Con bajas propuestas
   * sin resolver, no: las nombra.
   */
  async confirmarFinalizacion(grupoId: string, adminId: string): Promise<EdicionAdminDetalle> {
    await this.prisma.$transaction(async (tx) => {
      const grupo = await this.grupoEnCursoBloqueado(tx, grupoId);
      if (!grupo.propuestaFinalizacionEn) throw new AppException('FINALIZACION_NO_PROPUESTA', HttpStatus.CONFLICT, 'Nadie propuso cerrar esta edición.');
      const bajas = await tx.inscripcion.findMany({ where: { grupoId, estado: 'activa', bajaPropuestaEn: { not: null } }, select: { id: true, personaId: true } });
      if (bajas.length > 0) {
        const personas = await tx.persona.findMany({ where: { id: { in: bajas.map((b) => b.personaId) } }, select: { id: true, nombre: true, apellido: true } });
        throw new AppException('BAJAS_PROPUESTAS_SIN_RESOLVER', HttpStatus.CONFLICT, 'Primero resolvé las bajas propuestas.', undefined, {
          bajas: bajas.map((b) => ({ inscripcionId: b.id, persona: personas.find((p) => p.id === b.personaId) })),
        });
      }
      const ahora = new Date();
      await tx.grupo.update({ where: { id: grupoId }, data: { estado: 'finalizado', motivoCierre: 'completado', cerradoEn: ahora, cerradoPorId: adminId, inscripcionAbierta: false } });
      const activas = await tx.inscripcion.findMany({ where: { grupoId, estado: 'activa' }, select: { id: true, personaId: true } });
      await tx.inscripcion.updateMany({ where: { id: { in: activas.map((a) => a.id) } }, data: { estado: 'completada', cerradaEn: ahora } });
      for (const a of activas) {
        await alCompletarCategoria(tx, a.personaId, 'vida_de_servicio');
        await this.notificaciones.emitir(tx, { nombre: 'vida_servicio.completada', a: { tipo: 'persona', personaId: a.personaId }, datos: { grupoId, inscripcionId: a.id } });
      }
    });
    return this.detalle(grupoId);
  }

  /** POST …/finalizacion/rechazar (FR-035): el motivo lo ven los Líderes, que pueden volver a proponer. */
  async rechazarFinalizacion(grupoId: string, motivoCrudo: string | undefined): Promise<EdicionAdminDetalle> {
    const motivo = normalizarMotivo(motivoCrudo);
    await this.prisma.$transaction(async (tx) => {
      const grupo = await this.grupoEnCursoBloqueado(tx, grupoId);
      if (!grupo.propuestaFinalizacionEn) throw new AppException('FINALIZACION_NO_PROPUESTA', HttpStatus.CONFLICT, 'Nadie propuso cerrar esta edición.');
      await tx.grupo.update({
        where: { id: grupoId },
        data: { propuestaFinalizacionEn: null, propuestaFinalizacionPorId: null, finalizacionRechazadaEn: new Date(), finalizacionRechazadaMotivo: motivo },
      });
      await this.notificaciones.emitir(tx, { nombre: 'vida_servicio.finalizacion_rechazada', a: { tipo: 'lideres_grupo', grupoId }, datos: { grupoId } });
    });
    return this.detalle(grupoId);
  }

  /** Pendientes del Inicio (FR-039). */
  contarFinalizacionesPropuestas(): Promise<number> {
    return this.prisma.grupo.count({ where: { ...DE_VIDA_DE_SERVICIO, estado: 'en_curso', propuestaFinalizacionEn: { not: null } } });
  }

  contarBajasPropuestas(): Promise<number> {
    return this.prisma.inscripcion.count({ where: { estado: 'activa', bajaPropuestaEn: { not: null }, grupo: { ...DE_VIDA_DE_SERVICIO, estado: 'en_curso' } } });
  }

  private async aplicarBaja(tx: Prisma.TransactionClient, grupoId: string, inscripcionId: string, personaId: string, tipo: TipoBaja): Promise<void> {
    await tx.inscripcion.update({ where: { id: inscripcionId }, data: { estado: tipo, cerradaEn: new Date(), bajaPropuestaTipo: tipo } });
    await this.notificaciones.emitir(tx, { nombre: 'vida_servicio.inscripcion_dada_de_baja', a: { tipo: 'persona', personaId }, datos: { grupoId, inscripcionId } });
  }

  private async grupoEnCursoBloqueado(tx: Prisma.TransactionClient, grupoId: string) {
    await bloquearGrupo(tx, grupoId);
    const grupo = await grupoVSOFallar(tx, grupoId);
    if (grupo.estado !== 'en_curso') throw grupoNoEnCurso();
    return grupo;
  }

  private async inscripcionBloqueada(tx: Prisma.TransactionClient, grupoId: string, inscripcionId: string) {
    await bloquearInscripcion(tx, inscripcionId);
    const i = await tx.inscripcion.findFirst({
      where: { id: inscripcionId, grupoId },
      select: { estado: true, personaId: true, bajaPropuestaEn: true, bajaPropuestaTipo: true },
    });
    if (!i) throw new AppException('NO_ENCONTRADO', HttpStatus.NOT_FOUND, 'No existe esa Inscripción en esta edición.');
    return i;
  }

  /** FR-003, D131: Personas activas con el rol de cargo `lider_curso` (el permiso del catálogo, no un rol literal). */
  private async sonLideresValidos(db: PrismaService | Prisma.TransactionClient, ids: string[]): Promise<boolean> {
    const personas = await db.persona.findMany({ where: { id: { in: ids }, estado: 'activa' }, select: { rol: true } });
    return personas.length === ids.length && personas.every((p) => tienePermiso(p.rol, 'mis_grupos.gestionar'));
  }
}

function bajaNoPropuesta(): AppException {
  return new AppException('BAJA_NO_PROPUESTA', HttpStatus.CONFLICT, 'No hay una baja propuesta para esa Inscripción.');
}

export function inscripcionNoActiva(): AppException {
  return new AppException('INSCRIPCION_NO_ACTIVA', HttpStatus.CONFLICT, 'Esa Inscripción ya no está activa.');
}
