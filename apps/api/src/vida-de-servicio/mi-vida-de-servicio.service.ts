import { HttpStatus, Injectable } from '@nestjs/common';
import {
  EDAD_MINIMA_PEDIR_VIDA_DE_SERVICIO_SOLO,
  estadoSemanaPersona,
  hoyEnArgentina,
  semanasVisibles,
  type CierreAnterior,
  type ContenidoParaPersona,
  type EdicionResumen,
  type EstadoInscripcion,
  type EstadoMiVidaDeServicio,
  type MiAsistencia,
  type SemanaParaPersona,
} from '@vida-sobrenatural/shared-types';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AppException } from '../common/errors/app-exception.js';
import { calcularEdad } from '../persona/calcular-edad.js';
import { completoEtapa } from '../camino/consultas.js';
import { estadoPrerrequisito } from './prerrequisito.js';
import {
  DE_VIDA_DE_SERVICIO,
  cierreCivil,
  edicionesAbiertas,
  fechaCivil,
  semanasDeUno,
  type SemanaConMaterial,
} from './consultas-vs.js';

type Db = PrismaService | Prisma.TransactionClient;

/**
 * spec 008, Historias 2 y 5 — lo que ve la Persona (contracts/persona-api.md):
 * su estado en Vida de Servicio (FR-025) y el material de las semanas que
 * tiene derecho a ver (FR-021, FR-034). Todo recortado por identidad.
 */
@Injectable()
export class MiVidaDeServicioService {
  constructor(private readonly prisma: PrismaService) {}

  /** GET /vida-de-servicio/me (FR-009, FR-025, FR-031). */
  async estado(personaId: string): Promise<EstadoMiVidaDeServicio> {
    return estadoDeVidaDeServicio(this.prisma, personaId);
  }

  /** GET /vida-de-servicio/me/semanas/:numero (FR-021, FR-034). 404 si no la puede ver, sin distinguir por qué. */
  async semana(personaId: string, numero: number): Promise<ContenidoParaPersona> {
    const hoy = hoyEnArgentina();
    const inscripciones = await this.prisma.inscripcion.findMany({
      where: { personaId, grupo: DE_VIDA_DE_SERVICIO },
      orderBy: [{ cerradaEn: { sort: 'desc', nulls: 'first' } }],
      select: { grupoId: true, estado: true, cerradaEn: true },
    });
    // La vigente, o la última cerrada (`contracts/persona-api.md`).
    const inscripcion = inscripciones.find((i) => i.estado === 'activa') ?? inscripciones[0];
    if (!inscripcion) throw contenidoNoDisponible();
    const semanas = await semanasDeUno(this.prisma, inscripcion.grupoId);
    const visible = semanasVisibles({ estado: inscripcion.estado, cerradaEn: cierreCivil(inscripcion.cerradaEn) }, semanas, hoy).find(
      (s) => s.numero === numero && estadoSemanaPersona(s.fechaLiberacion, s.conMaterial, hoy) === 'liberada',
    );
    if (!visible?.contenidoId) throw contenidoNoDisponible();
    return contenidoDe(this.prisma, visible.contenidoId);
  }
}

export function contenidoNoDisponible(): AppException {
  return new AppException('CONTENIDO_NO_DISPONIBLE', HttpStatus.NOT_FOUND, 'Ese material no está disponible.');
}

/** El material de una semana, con sus piezas vigentes en orden. */
export async function contenidoDe(db: Db, contenidoId: string): Promise<ContenidoParaPersona> {
  const c = await db.contenido.findUniqueOrThrow({
    where: { id: contenidoId },
    select: {
      titulo: true,
      texto: true,
      itemCronograma: { select: { numeroSemana: true, fechaLiberacion: true } },
      archivos: { where: { eliminadoEn: null }, orderBy: { orden: 'asc' }, select: { id: true, nombreOriginal: true, mimeType: true, tamanioBytes: true, textoAlternativo: true } },
      enlaces: { where: { eliminadoEn: null }, orderBy: { orden: 'asc' }, select: { texto: true, url: true } },
    },
  });
  return {
    numero: c.itemCronograma.numeroSemana,
    fechaLiberacion: fechaCivil(c.itemCronograma.fechaLiberacion),
    titulo: c.titulo,
    texto: c.texto,
    archivos: c.archivos.map((a) => ({ id: a.id, nombre: a.nombreOriginal, mimeType: a.mimeType, tamanioBytes: a.tamanioBytes, textoAlternativo: a.textoAlternativo })),
    enlaces: c.enlaces,
  };
}

/** Las semanas como las ve la Persona (FR-025): de una fecha futura no se dice si hay material. */
export function semanasParaPersona(semanas: readonly SemanaConMaterial[], hoy: string): SemanaParaPersona[] {
  return semanas.map((s) => {
    const estado = estadoSemanaPersona(s.fechaLiberacion, s.conMaterial, hoy);
    if (estado === 'liberada') return { numero: s.numero, fechaLiberacion: s.fechaLiberacion, estado, contenidoId: s.contenidoId!, titulo: s.titulo ?? '' };
    return { numero: s.numero, fechaLiberacion: s.fechaLiberacion, estado };
  });
}

async function edicionResumen(db: Db, grupoId: string): Promise<EdicionResumen> {
  const g = await db.grupo.findUniqueOrThrow({ where: { id: grupoId }, select: { id: true, nombre: true, fechaInicio: true, estado: true } });
  return { grupoId: g.id, nombre: g.nombre ?? '', fechaInicio: g.fechaInicio ? fechaCivil(g.fechaInicio) : '', estado: g.estado };
}

/** Las semanas que ve una Inscripción (todas si activa/completada; hasta el cierre si se dio de baja). */
async function semanasDeInscripcion(db: Db, inscripcion: { grupoId: string; estado: EstadoInscripcion; cerradaEn: Date | null }, hoy: string): Promise<SemanaParaPersona[]> {
  const semanas = await semanasDeUno(db, inscripcion.grupoId);
  return semanasParaPersona(semanasVisibles({ estado: inscripcion.estado, cerradaEn: cierreCivil(inscripcion.cerradaEn) }, semanas, hoy), hoy);
}

/** FR-031: solo la asistencia propia. */
async function miAsistencia(db: Db, inscripcionId: string): Promise<MiAsistencia> {
  const asistencias = await db.asistencia.findMany({
    where: { inscripcionId },
    orderBy: { encuentro: { fecha: 'asc' } },
    select: { presente: true, encuentro: { select: { fecha: true } } },
  });
  return {
    encuentros: asistencias.length,
    presentes: asistencias.filter((a) => a.presente).length,
    faltas: asistencias.filter((a) => !a.presente).map((a) => fechaCivil(a.encuentro.fecha)),
  };
}

/**
 * El estado de Vida de Servicio de una Persona (FR-025), en este orden:
 * completada → en curso → pedido pendiente → menor de 12 → no cumple el
 * prerrequisito (con el motivo, FR-009) → puede pedir (con lo último que
 * pasó: rechazo o baja, FR-017, FR-034; nunca motivos ni comentarios).
 * También lo usa el perfil del backoffice (FR-013).
 */
export async function estadoDeVidaDeServicio(db: Db, personaId: string): Promise<EstadoMiVidaDeServicio> {
  const hoy = hoyEnArgentina();
  const como = await completoEtapa(db, personaId, 'vida_de_servicio');
  if (como === 'sistema') {
    const completada = await db.inscripcion.findFirst({
      where: { personaId, estado: 'completada', grupo: DE_VIDA_DE_SERVICIO },
      orderBy: { cerradaEn: 'desc' },
      select: { grupoId: true, estado: true, cerradaEn: true },
    });
    if (completada) {
      return { estado: 'completada', via: 'inscripcion', edicion: await edicionResumen(db, completada.grupoId), semanas: await semanasDeInscripcion(db, completada, hoy) };
    }
  }
  if (como === 'historial') return { estado: 'completada', via: 'completitud_manual' };

  const activa = await db.inscripcion.findFirst({ where: { personaId, estado: 'activa', grupo: DE_VIDA_DE_SERVICIO }, select: { id: true, grupoId: true, estado: true, cerradaEn: true } });
  if (activa) {
    return {
      estado: 'en_curso',
      inscripcionId: activa.id,
      edicion: await edicionResumen(db, activa.grupoId),
      semanas: await semanasDeInscripcion(db, activa, hoy),
      asistencia: await miAsistencia(db, activa.id),
    };
  }

  const pendiente = await db.solicitudVidaServicio.findFirst({ where: { personaId, estado: 'pendiente' }, select: { id: true, grupoId: true, creadoPorId: true } });
  if (pendiente) {
    const edicion = pendiente.grupoId ? ((await edicionesAbiertas(db, null, pendiente.grupoId))[0] ?? null) : null;
    return { estado: 'pendiente', solicitudId: pendiente.id, edicion, creadaEnSuNombre: pendiente.creadoPorId !== null };
  }

  const persona = await db.persona.findUnique({ where: { id: personaId }, select: { fechaNacimiento: true } });
  if (persona && calcularEdad(persona.fechaNacimiento) < EDAD_MINIMA_PEDIR_VIDA_DE_SERVICIO_SOLO) return { estado: 'lo_pide_su_tutor' };

  const prerrequisito = await estadoPrerrequisito(db, personaId);
  if (!prerrequisito.cumple) return { estado: 'no_cumple', motivo: prerrequisito.motivo };

  const anterior = await cierreAnterior(db, personaId, hoy);
  return { estado: 'puede_pedir', ediciones: await edicionesAbiertas(db, personaId), ...(anterior ? { anterior } : {}) };
}

/** Lo último que cerró su camino en Vida de Servicio: una Solicitud rechazada o una baja (lo más reciente). */
async function cierreAnterior(db: Db, personaId: string, hoy: string): Promise<CierreAnterior | null> {
  const [solicitud, baja] = await Promise.all([
    db.solicitudVidaServicio.findFirst({ where: { personaId, estado: { in: ['rechazada', 'retirada', 'aprobada'] } }, orderBy: { updatedAt: 'desc' }, select: { estado: true, updatedAt: true } }),
    db.inscripcion.findFirst({
      where: { personaId, estado: { in: ['dada_de_baja', 'abandono'] }, grupo: DE_VIDA_DE_SERVICIO },
      orderBy: { cerradaEn: 'desc' },
      select: { grupoId: true, estado: true, cerradaEn: true },
    }),
  ]);
  const bajaEn = baja?.cerradaEn?.getTime() ?? -Infinity;
  if (solicitud?.estado === 'rechazada' && solicitud.updatedAt.getTime() > bajaEn) return { tipo: 'rechazada' };
  if (baja && (baja.estado === 'dada_de_baja' || baja.estado === 'abandono')) {
    if (solicitud && solicitud.estado !== 'aprobada' && solicitud.updatedAt.getTime() > bajaEn) return null;
    return { tipo: baja.estado, edicion: await edicionResumen(db, baja.grupoId), semanas: await semanasDeInscripcion(db, baja, hoy) };
  }
  return null;
}
