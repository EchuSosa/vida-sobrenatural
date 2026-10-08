import { HttpStatus, Injectable } from '@nestjs/common';
import {
  EDAD_MINIMA_PEDIR_VIDA_DE_SERVICIO_SOLO,
  sinAccesoALaApp,
  type SolicitudVidaServicioDetalle,
  type VidaDeServicioDePersona,
} from '@vida-sobrenatural/shared-types';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AppException } from '../common/errors/app-exception.js';
import { calcularEdad } from '../persona/calcular-edad.js';
import { errorDeValidacion, normalizarMotivo } from '../discipulado/validaciones.js';
import { nombresDe } from '../discipulado/consultas.js';
import { bloquearPersona, completoEtapa } from '../camino/consultas.js';
import { NotificacionesService } from '../notificaciones/notificaciones.service.js';
import { estadoPrerrequisito } from './prerrequisito.js';
import { DE_VIDA_DE_SERVICIO, edicionesAbiertas, fechaCivil, inscripcionVSEnCursoOCompleta } from './consultas-vs.js';
import { estadoDeVidaDeServicio } from './mi-vida-de-servicio.service.js';

/**
 * spec 008, Historias 2 y 3 — la Solicitud de inscripción a Vida de Servicio
 * (contracts/persona-api.md y admin-api.md): pedir (la Persona o el Admin en
 * su nombre, FR-010 a FR-013), retirar, y resolver (FR-015 a FR-018). Cada
 * transición bloquea la fila de la Persona (y la Solicitud al resolver) y
 * emite su aviso DENTRO de la transacción (D197).
 */
@Injectable()
export class SolicitudesVidaDeServicioService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificaciones: NotificacionesService,
  ) {}

  /** POST /vida-de-servicio/solicitudes/me (FR-010, FR-011, FR-012). */
  async crearPropia(personaId: string, grupoId: string | null): Promise<{ solicitudId: string }> {
    return this.crear(personaId, grupoId, null);
  }

  /** POST /vida-de-servicio/solicitudes — el Admin en nombre de (FR-013, D97). Sin el límite de edad. */
  async crearEnNombre(personaId: string, grupoId: string | null, adminId: string): Promise<{ solicitudId: string }> {
    return this.crear(personaId, grupoId, adminId);
  }

  private async crear(personaId: string, grupoId: string | null, creadoPorId: string | null): Promise<{ solicitudId: string }> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        if (!(await bloquearPersona(tx, personaId))) throw new AppException('NO_ENCONTRADO', HttpStatus.NOT_FOUND, 'No existe una Persona con ese id.');
        if (creadoPorId === null) {
          const persona = await tx.persona.findUniqueOrThrow({ where: { id: personaId }, select: { fechaNacimiento: true } });
          if (calcularEdad(persona.fechaNacimiento) < EDAD_MINIMA_PEDIR_VIDA_DE_SERVICIO_SOLO) {
            throw new AppException('EDAD_INSUFICIENTE_PARA_PEDIR_SOLO', HttpStatus.UNPROCESSABLE_ENTITY, 'El pedido lo hace tu familia o la iglesia.');
          }
        }
        await exigirQuePuedePedir(tx, personaId);
        await exigirEdicionParaPedir(tx, personaId, grupoId);
        const solicitud = await tx.solicitudVidaServicio.create({ data: { personaId, grupoId, creadoPorId }, select: { id: true } });
        await this.notificaciones.emitir(tx, { nombre: 'vida_servicio.solicitud_creada', a: { tipo: 'admin' }, datos: { solicitudId: solicitud.id } });
        return { solicitudId: solicitud.id };
      });
    } catch (error) {
      // D60: el índice parcial "una pendiente por Persona" es la garantía ante una carrera.
      if (esUnicoViolado(error)) throw yaPendiente();
      throw error;
    }
  }

  /** DELETE /vida-de-servicio/solicitudes/me (FR-012). Sin aviso: el Admin lo ve en la bandeja. */
  async retirarPropia(personaId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await bloquearPersona(tx, personaId);
      const pendiente = await tx.solicitudVidaServicio.findFirst({ where: { personaId, estado: 'pendiente' }, select: { id: true } });
      if (!pendiente) throw noPendiente();
      await tx.solicitudVidaServicio.update({ where: { id: pendiente.id }, data: { estado: 'retirada' } });
    });
  }

  /** GET /vida-de-servicio/solicitudes/:id (FR-015). */
  async detalle(id: string): Promise<SolicitudVidaServicioDetalle> {
    const s = await this.prisma.solicitudVidaServicio.findUnique({
      where: { id },
      select: {
        id: true, personaId: true, estado: true, createdAt: true, grupoId: true, creadoPorId: true, revisadoPorId: true, revisadaEn: true, motivoRechazo: true,
        grupo: { select: { id: true, nombre: true, estado: true, inscripcionAbierta: true } },
        inscripcion: { select: { id: true, grupoId: true, grupo: { select: { nombre: true } } } },
      },
    });
    if (!s) throw new AppException('NO_ENCONTRADO', HttpStatus.NOT_FOUND, 'No existe esa Solicitud.');
    const [persona, prerrequisito, nombres, enCurso, cursadas] = await Promise.all([
      this.prisma.persona.findUniqueOrThrow({
        where: { id: s.personaId },
        select: { id: true, nombre: true, apellido: true, fotoUrl: true, fechaNacimiento: true, email: true, telefono: true },
      }),
      estadoPrerrequisito(this.prisma, s.personaId),
      nombresDe(this.prisma, [s.creadoPorId, s.revisadoPorId].filter((x): x is string => x !== null)),
      this.prisma.grupo.findMany({
        where: { ...DE_VIDA_DE_SERVICIO, estado: 'en_curso' },
        orderBy: [{ fechaInicio: 'asc' }, { nombre: 'asc' }],
        select: { id: true, nombre: true, fechaInicio: true, inscripcionAbierta: true },
      }),
      this.prisma.inscripcion.findMany({ where: { personaId: s.personaId, grupo: DE_VIDA_DE_SERVICIO }, select: { grupoId: true } }),
    ]);
    const yaCursadas = new Set(cursadas.map((c) => c.grupoId));
    return {
      id: s.id,
      estado: s.estado as SolicitudVidaServicioDetalle['estado'],
      createdAt: s.createdAt.toISOString(),
      persona: {
        id: persona.id,
        nombre: persona.nombre,
        apellido: persona.apellido,
        fotoUrl: persona.fotoUrl,
        edad: calcularEdad(persona.fechaNacimiento),
        email: persona.email,
        telefono: persona.telefono,
        sinAccesoALaApp: sinAccesoALaApp(persona),
      },
      prerrequisito: prerrequisito.cumple ? prerrequisito.via : null,
      edicionPedida: s.grupo ? { grupoId: s.grupo.id, nombre: s.grupo.nombre ?? '', estado: s.grupo.estado, inscripcionAbierta: s.grupo.inscripcionAbierta } : null,
      creadoPor: s.creadoPorId ? (nombres.get(s.creadoPorId) ?? null) : null,
      revisadoPor: s.revisadoPorId ? (nombres.get(s.revisadoPorId) ?? null) : null,
      revisadaEn: s.revisadaEn?.toISOString() ?? null,
      motivoRechazo: s.motivoRechazo,
      inscripcion: s.inscripcion ? { inscripcionId: s.inscripcion.id, grupoId: s.inscripcion.grupoId, nombre: s.inscripcion.grupo.nombre ?? '' } : null,
      edicionesEnCurso: enCurso.map((g) => ({
        grupoId: g.id,
        nombre: g.nombre ?? '',
        fechaInicio: g.fechaInicio ? fechaCivil(g.fechaInicio) : '',
        inscripcionAbierta: g.inscripcionAbierta,
        yaCursada: yaCursadas.has(g.id),
      })),
    };
  }

  /**
   * POST /vida-de-servicio/solicitudes/:id/aprobar (FR-016, FR-018): revalida
   * el prerrequisito y que no tenga otra Inscripción activa o completada,
   * exige una edición en curso de Vida de Servicio (con la inscripción
   * cerrada también vale: no limita al Admin, FR-006) donde no haya estado,
   * y crea la Inscripción `activa`. Todo en una transacción, con la Solicitud
   * y la Persona bloqueadas (en ese orden, igual que rechazar).
   */
  async aprobar(id: string, grupoId: string, adminId: string): Promise<SolicitudVidaServicioDetalle> {
    await this.prisma.$transaction(async (tx) => {
      const s = await bloquearSolicitudPendiente(tx, id);
      await bloquearPersona(tx, s.personaId);
      if (!(await estadoPrerrequisito(tx, s.personaId)).cumple) throw prerrequisitoNoCumplido();
      if ((await inscripcionVSEnCursoOCompleta(tx, s.personaId)) || (await completoEtapa(tx, s.personaId, 'vida_de_servicio'))) throw enCursoOCompleta();
      const grupo = await tx.grupo.findFirst({ where: { id: grupoId, ...DE_VIDA_DE_SERVICIO, estado: 'en_curso' }, select: { id: true } });
      if (!grupo) throw errorDeValidacion([{ campo: 'grupoId', code: 'EDICION_NO_DISPONIBLE' }]);
      const previa = await tx.inscripcion.findFirst({ where: { personaId: s.personaId, grupoId }, select: { id: true } });
      if (previa) throw errorDeValidacion([{ campo: 'grupoId', code: 'EDICION_YA_CURSADA' }]);
      const inscripcion = await tx.inscripcion.create({ data: { personaId: s.personaId, grupoId, solicitudVidaServicioId: id }, select: { id: true } });
      await tx.solicitudVidaServicio.update({ where: { id }, data: { estado: 'aprobada', grupoId, revisadoPorId: adminId, revisadaEn: new Date() } });
      await this.notificaciones.emitir(tx, {
        nombre: 'vida_servicio.inscripcion_aprobada',
        a: { tipo: 'persona', personaId: s.personaId },
        datos: { solicitudId: id, grupoId, inscripcionId: inscripcion.id },
      });
    });
    return this.detalle(id);
  }

  /** POST /vida-de-servicio/solicitudes/:id/rechazar (FR-017): motivo opcional que solo ve el Admin. */
  async rechazar(id: string, motivoCrudo: string | undefined, adminId: string): Promise<SolicitudVidaServicioDetalle> {
    const motivo = normalizarMotivo(motivoCrudo);
    await this.prisma.$transaction(async (tx) => {
      const s = await bloquearSolicitudPendiente(tx, id);
      await tx.solicitudVidaServicio.update({ where: { id }, data: { estado: 'rechazada', motivoRechazo: motivo, revisadoPorId: adminId, revisadaEn: new Date() } });
      await this.notificaciones.emitir(tx, { nombre: 'vida_servicio.inscripcion_rechazada', a: { tipo: 'persona', personaId: s.personaId }, datos: { solicitudId: id } });
    });
    return this.detalle(id);
  }

  /** GET /personas/:id/vida-de-servicio — la sección del perfil del backoffice (FR-013). */
  async deUnaPersona(personaId: string): Promise<VidaDeServicioDePersona> {
    const persona = await this.prisma.persona.findUnique({ where: { id: personaId }, select: { id: true } });
    if (!persona) throw new AppException('NO_ENCONTRADO', HttpStatus.NOT_FOUND, 'No existe una Persona con ese id.');
    const estado = await estadoDeVidaDeServicio(this.prisma, personaId);
    let motivo = estado.estado === 'no_cumple' ? estado.motivo : null;
    let puedePedirEnSuNombre = estado.estado === 'puede_pedir';
    // Un menor de 12 no lo pide solo, pero el Admin sí puede pedirlo por él (FR-013).
    if (estado.estado === 'lo_pide_su_tutor') {
      const prerrequisito = await estadoPrerrequisito(this.prisma, personaId);
      puedePedirEnSuNombre = prerrequisito.cumple;
      motivo = prerrequisito.cumple ? null : prerrequisito.motivo;
    }
    const edicion = estado.estado === 'en_curso' || (estado.estado === 'completada' && estado.edicion) ? (estado.edicion ?? null) : null;
    return {
      estado: estado.estado,
      motivo,
      puedePedirEnSuNombre,
      solicitudPendienteId: estado.estado === 'pendiente' ? estado.solicitudId : null,
      edicion,
      ediciones: puedePedirEnSuNombre ? await edicionesAbiertas(this.prisma, personaId) : [],
    };
  }
}

/** FR-012 y FR-008, en el orden en que se explican: ya está o ya terminó, ya pidió, no cumple. */
async function exigirQuePuedePedir(tx: Prisma.TransactionClient, personaId: string): Promise<void> {
  if ((await inscripcionVSEnCursoOCompleta(tx, personaId)) || (await completoEtapa(tx, personaId, 'vida_de_servicio'))) throw enCursoOCompleta();
  const pendiente = await tx.solicitudVidaServicio.findFirst({ where: { personaId, estado: 'pendiente' }, select: { id: true } });
  if (pendiente) throw yaPendiente();
  if (!(await estadoPrerrequisito(tx, personaId)).cumple) throw prerrequisitoNoCumplido();
}

/**
 * FR-010/FR-011: con edición, tiene que estar abierta (y no ser una donde ya
 * estuvo); sin edición ("para la próxima"), solo si no hay ninguna abierta.
 */
async function exigirEdicionParaPedir(tx: Prisma.TransactionClient, personaId: string, grupoId: string | null): Promise<void> {
  const abiertas = await edicionesAbiertas(tx, personaId);
  if (grupoId === null) {
    if (abiertas.length > 0) throw errorDeValidacion([{ campo: 'grupoId', code: 'EDICION_REQUERIDA' }]);
    return;
  }
  if (!abiertas.some((e) => e.grupoId === grupoId)) throw errorDeValidacion([{ campo: 'grupoId', code: 'EDICION_NO_DISPONIBLE' }]);
}

async function bloquearSolicitudPendiente(tx: Prisma.TransactionClient, id: string): Promise<{ personaId: string }> {
  const filas = await tx.$queryRaw<Array<{ personaId: string; estado: string }>>`
    SELECT "personaId", "estado"::text AS "estado" FROM "solicitudes_vida_servicio" WHERE "id" = ${id} FOR UPDATE`;
  if (filas.length === 0) throw new AppException('NO_ENCONTRADO', HttpStatus.NOT_FOUND, 'No existe esa Solicitud.');
  if (filas[0].estado !== 'pendiente') throw noPendiente();
  return { personaId: filas[0].personaId };
}

function esUnicoViolado(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const e = error as { code?: unknown; meta?: { code?: unknown } };
  return e.code === 'P2002' || (e.code === 'P2010' && e.meta?.code === '23505');
}

export function prerrequisitoNoCumplido(): AppException {
  return new AppException('VIDA_SERVICIO_PRERREQUISITO_NO_CUMPLIDO', HttpStatus.UNPROCESSABLE_ENTITY, 'Para anotarte en Vida de Servicio primero tenés que haber hecho Vida Nueva.');
}

function enCursoOCompleta(): AppException {
  return new AppException('VIDA_SERVICIO_EN_CURSO_O_COMPLETADA', HttpStatus.CONFLICT, 'Ya estás haciendo Vida de Servicio o ya la terminaste.');
}

function yaPendiente(): AppException {
  return new AppException('SOLICITUD_VIDA_SERVICIO_YA_PENDIENTE', HttpStatus.CONFLICT, 'Ya hay un pedido de Vida de Servicio esperando respuesta.');
}

function noPendiente(): AppException {
  return new AppException('SOLICITUD_NO_PENDIENTE', HttpStatus.CONFLICT, 'Esa Solicitud ya no está pendiente.');
}
