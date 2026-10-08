import { HttpStatus } from '@nestjs/common';
import { alertaFaltas, diaDeLaSemana, hoyEnArgentina, type EdicionAbierta } from '@vida-sobrenatural/shared-types';
import type { Prisma } from '../generated/prisma/client.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { AppException } from '../common/errors/app-exception.js';

type Db = PrismaService | Prisma.TransactionClient;

/**
 * spec 008 — consultas que comparten los servicios de Vida de Servicio
 * (Persona, Admin y Líder). Funciones de transacción sin DI. Fechas civiles
 * `YYYY-MM-DD`: las columnas `@db.Date` llegan como medianoche UTC.
 */

export function fechaCivil(fecha: Date): string {
  return fecha.toISOString().slice(0, 10);
}

export function aFecha(fecha: string): Date {
  return new Date(`${fecha}T00:00:00Z`);
}

/** El instante de cierre de una Inscripción, como fecha civil de Argentina (FR-034). */
export function cierreCivil(cerradaEn: Date | null): string | null {
  return cerradaEn ? hoyEnArgentina(cerradaEn) : null;
}

/** El filtro de "Grupo de Vida de Servicio" (por categoría del Curso, nunca por un id fijo). */
export const DE_VIDA_DE_SERVICIO = { curso: { categoria: 'vida_de_servicio' } } as const;

/** FR-001: el Curso de referencia. Lo crea el seed; sin él no se puede abrir una edición. */
export async function cursoVidaDeServicioId(db: Db): Promise<string> {
  const curso = await db.curso.findFirst({ where: { categoria: 'vida_de_servicio', eliminadoEn: null }, orderBy: { tipo: 'asc' }, select: { id: true } });
  if (!curso) throw new AppException('NO_ENCONTRADO', HttpStatus.NOT_FOUND, 'Falta el Curso "Vida de Servicio" (corré el seed).');
  return curso.id;
}

export interface SemanaConMaterial {
  itemId: string;
  numero: number;
  fechaLiberacion: string;
  conMaterial: boolean;
  contenidoId: string | null;
  titulo: string | null;
}

/** El Cronograma vigente de cada Grupo, en orden, con si tiene material (una consulta, H-42). */
export async function semanasDe(db: Db, grupoIds: readonly string[]): Promise<Map<string, SemanaConMaterial[]>> {
  const items = await db.itemCronograma.findMany({
    where: { grupoId: { in: [...grupoIds] }, eliminadoEn: null },
    orderBy: [{ grupoId: 'asc' }, { numeroSemana: 'asc' }],
    select: { id: true, grupoId: true, numeroSemana: true, fechaLiberacion: true, contenido: { select: { id: true, titulo: true } } },
  });
  const porGrupo = new Map<string, SemanaConMaterial[]>(grupoIds.map((id) => [id, []]));
  for (const i of items) {
    porGrupo.get(i.grupoId)?.push({
      itemId: i.id,
      numero: i.numeroSemana,
      fechaLiberacion: fechaCivil(i.fechaLiberacion),
      conMaterial: i.contenido !== null,
      contenidoId: i.contenido?.id ?? null,
      titulo: i.contenido?.titulo ?? null,
    });
  }
  return porGrupo;
}

export async function semanasDeUno(db: Db, grupoId: string): Promise<SemanaConMaterial[]> {
  return (await semanasDe(db, [grupoId])).get(grupoId) ?? [];
}

/**
 * FR-029 (research #12): faltas de cada Inscripción de los Grupos, en UNA
 * consulta agrupada (no una por fila). Las Asistencias solo existen para
 * quien estaba `activa` en esa fecha, así que no hay que filtrar por fecha.
 */
export async function faltasPorInscripcion(db: Db, grupoIds: readonly string[]): Promise<Map<string, number>> {
  if (grupoIds.length === 0) return new Map();
  const filas = await db.asistencia.groupBy({
    by: ['inscripcionId'],
    where: { presente: false, encuentro: { grupoId: { in: [...grupoIds] } } },
    _count: { _all: true },
  });
  return new Map(filas.map((f) => [f.inscripcionId, f._count._all]));
}

/** Inscriptos activos y con alerta de faltas de cada Grupo (listados del Admin y del Líder). */
export async function conteosDeInscriptos(db: Db, grupoIds: readonly string[]): Promise<Map<string, { activos: number; conAlerta: number }>> {
  const [activas, faltas] = await Promise.all([
    db.inscripcion.findMany({ where: { grupoId: { in: [...grupoIds] }, estado: 'activa' }, select: { id: true, grupoId: true } }),
    faltasPorInscripcion(db, grupoIds),
  ]);
  const conteos = new Map(grupoIds.map((id) => [id, { activos: 0, conAlerta: 0 }]));
  for (const i of activas) {
    const c = conteos.get(i.grupoId)!;
    c.activos += 1;
    if (alertaFaltas(faltas.get(i.id) ?? 0)) c.conAlerta += 1;
  }
  return conteos;
}

/** Los Líderes vigentes de cada Grupo, por nombre. */
export async function lideresVigentes(db: Db, grupoIds: readonly string[]): Promise<Map<string, Array<{ personaId: string; nombre: string; apellido: string }>>> {
  const liderazgos = await db.liderazgo.findMany({ where: { grupoId: { in: [...grupoIds] }, hasta: null }, orderBy: { desde: 'asc' }, select: { grupoId: true, personaId: true } });
  const personas = await db.persona.findMany({ where: { id: { in: liderazgos.map((l) => l.personaId) } }, select: { id: true, nombre: true, apellido: true } });
  const porId = new Map(personas.map((p) => [p.id, p]));
  const resultado = new Map<string, Array<{ personaId: string; nombre: string; apellido: string }>>(grupoIds.map((id) => [id, []]));
  for (const l of liderazgos) {
    const p = porId.get(l.personaId);
    if (p) resultado.get(l.grupoId)?.push({ personaId: p.id, nombre: p.nombre, apellido: p.apellido });
  }
  return resultado;
}

/** Nombre de cada Sede (los Grupos guardan `sedeId` como referencia lógica). */
export async function nombresDeSedes(db: Db, sedeIds: readonly string[]): Promise<Map<string, string>> {
  const sedes = await db.sede.findMany({ where: { id: { in: [...new Set(sedeIds)] } }, select: { id: true, nombre: true } });
  return new Map(sedes.map((s) => [s.id, s.nombre]));
}

/**
 * FR-010: las ediciones que la Persona puede elegir — en curso, de Vida de
 * Servicio, con la inscripción abierta, y donde no tuvo ya una Inscripción
 * (FR-016: no se vuelve a una edición de la que se dio de baja). La Sede se
 * nombra solo si hay más de una activa.
 */
export async function edicionesAbiertas(db: Db, personaId: string | null, soloGrupoId?: string): Promise<EdicionAbierta[]> {
  const grupos = await db.grupo.findMany({
    where: {
      ...DE_VIDA_DE_SERVICIO,
      // `soloGrupoId`: la edición de un pedido ya hecho, aunque hoy esté cerrada o finalizada.
      ...(soloGrupoId ? { id: soloGrupoId } : { estado: 'en_curso', inscripcionAbierta: true }),
      ...(personaId ? { inscripciones: { none: { personaId } } } : {}),
    },
    orderBy: [{ fechaInicio: 'asc' }, { nombre: 'asc' }],
    select: { id: true, nombre: true, fechaInicio: true, sedeId: true },
  });
  const [sedesActivas, sedes, semanas] = await Promise.all([
    db.sede.count({ where: { activo: true } }),
    nombresDeSedes(db, grupos.map((g) => g.sedeId)),
    semanasDe(db, grupos.map((g) => g.id)),
  ]);
  return grupos.map((g) => {
    const primera = semanas.get(g.id)?.[0]?.fechaLiberacion ?? (g.fechaInicio ? fechaCivil(g.fechaInicio) : '');
    return {
      grupoId: g.id,
      nombre: g.nombre ?? '',
      sede: sedesActivas > 1 ? (sedes.get(g.sedeId) ?? null) : null,
      fechaInicio: g.fechaInicio ? fechaCivil(g.fechaInicio) : '',
      diaLiberacion: primera ? diaDeLaSemana(primera) : 0,
    };
  });
}

/** La Inscripción de Vida de Servicio que cuenta para la Persona: la `activa`, o la última cerrada. */
export async function inscripcionVigenteOUltima(db: Db, personaId: string) {
  const select = { id: true, grupoId: true, estado: true, cerradaEn: true, createdAt: true } as const;
  const activa = await db.inscripcion.findFirst({ where: { personaId, estado: 'activa', grupo: DE_VIDA_DE_SERVICIO }, select });
  if (activa) return activa;
  return db.inscripcion.findFirst({ where: { personaId, grupo: DE_VIDA_DE_SERVICIO }, orderBy: [{ cerradaEn: 'desc' }, { createdAt: 'desc' }], select });
}

/** La Inscripción de Vida de Servicio `activa` o `completada` de la Persona (FR-012: impide pedir otra). */
export async function inscripcionVSEnCursoOCompleta(db: Db, personaId: string): Promise<boolean> {
  const i = await db.inscripcion.findFirst({ where: { personaId, estado: { in: ['activa', 'completada'] }, grupo: DE_VIDA_DE_SERVICIO }, select: { id: true } });
  return i !== null;
}

/** El Grupo de Vida de Servicio, o 404 GRUPO_NO_ENCONTRADO. */
export async function grupoVSOFallar(db: Db, grupoId: string) {
  const grupo = await db.grupo.findFirst({
    where: { id: grupoId, ...DE_VIDA_DE_SERVICIO },
    select: { id: true, nombre: true, sedeId: true, fechaInicio: true, estado: true, inscripcionAbierta: true, propuestaFinalizacionEn: true, propuestaFinalizacionPorId: true, finalizacionRechazadaEn: true, finalizacionRechazadaMotivo: true },
  });
  if (!grupo) throw grupoNoEncontrado();
  return grupo;
}

export function grupoNoEncontrado(): AppException {
  return new AppException('GRUPO_NO_ENCONTRADO', HttpStatus.NOT_FOUND, 'No encontramos esa edición.');
}

export function grupoNoEnCurso(): AppException {
  return new AppException('GRUPO_NO_EN_CURSO', HttpStatus.CONFLICT, 'Esa edición ya terminó: no se puede cambiar (FR-037).');
}

/**
 * FR-019, Principio V: el que pide tiene un Liderazgo vigente en ese Grupo de
 * Vida de Servicio. Si no, 404 (no se confirma que exista).
 */
export async function grupoDelLiderOFallar(db: Db, grupoId: string, personaId: string) {
  const liderazgo = await db.liderazgo.findFirst({ where: { grupoId, personaId, hasta: null, grupo: DE_VIDA_DE_SERVICIO }, select: { id: true } });
  if (!liderazgo) throw grupoNoEncontrado();
  return grupoVSOFallar(db, grupoId);
}

/** Bloquea la fila del Grupo hasta el fin de la transacción (FR-005, FR-036: carreras). */
export async function bloquearGrupo(tx: Prisma.TransactionClient, grupoId: string): Promise<void> {
  await tx.$queryRaw`SELECT "id" FROM "grupos" WHERE "id" = ${grupoId} FOR UPDATE`;
}

/** Bloquea la fila de la Inscripción. */
export async function bloquearInscripcion(tx: Prisma.TransactionClient, inscripcionId: string): Promise<void> {
  await tx.$queryRaw`SELECT "id" FROM "inscripciones" WHERE "id" = ${inscripcionId} FOR UPDATE`;
}
