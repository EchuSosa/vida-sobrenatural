import { Injectable } from '@nestjs/common';
import {
  DIAS_MAILS_FALLIDOS_VISIBLES,
  NOTIFICACIONES_POR_PAGINA,
  validarNuevaNotificacion,
  type AlcanceManual,
  type ConteoDestinatarios,
  type DestinatarioAviso,
  type MailFallido,
  type MotivoMailFallido,
  type NombreEventoAviso,
  type NotificacionManualDetalle,
  type NotificacionManualResumen,
  type NuevaNotificacionManual,
  type OpcionesAlcance,
  type Pagina,
} from '@vida-sobrenatural/shared-types';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AppException } from '../common/errors/app-exception.js';
import { resolverDestinatarios } from './destinatarios.js';
import { NotificacionesService } from './notificaciones.service.js';

type Db = PrismaService | Prisma.TransactionClient;

const SELECT_MANUAL = {
  id: true,
  titulo: true,
  mensaje: true,
  alcance: true,
  alcanceId: true,
  prioridad: true,
  createdAt: true,
  creadoPor: { select: { id: true, nombre: true, apellido: true } },
} as const;

type FilaManual = Prisma.NotificacionGetPayload<{ select: typeof SELECT_MANUAL }>;

function noDisponible(): AppException {
  return new AppException('ALCANCE_NO_DISPONIBLE', 409, 'Ese grupo o ministerio ya no está disponible.');
}

/**
 * spec 012, lote D (T047; FR-026–FR-034, contracts/notificaciones-api.md) —
 * los avisos manuales del backoffice. El "a quién" se resuelve SIEMPRE con
 * `resolverDestinatarios` (el mismo del envío automático), así el conteo
 * previo y el envío no pueden diferir (Principio XI). No hay edición ni
 * borrado (FR-033).
 */
@Injectable()
export class NotificacionesManualesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificaciones: NotificacionesService,
  ) {}

  async listar(pagina: number): Promise<Pagina<NotificacionManualResumen> & { pagina: number }> {
    const where = { tipo: 'manual' as const };
    const total = await this.prisma.notificacion.count({ where });
    const totalPaginas = Math.max(1, Math.ceil(total / NOTIFICACIONES_POR_PAGINA));
    const valida = Math.min(Math.max(1, Math.trunc(pagina) || 1), totalPaginas);
    const filas = await this.prisma.notificacion.findMany({
      where,
      select: SELECT_MANUAL,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: (valida - 1) * NOTIFICACIONES_POR_PAGINA,
      take: NOTIFICACIONES_POR_PAGINA,
    });
    return { items: await this.resumenes(filas), total, pagina: valida };
  }

  async detalle(id: string): Promise<NotificacionManualDetalle> {
    const fila = await this.prisma.notificacion.findFirst({ where: { id, tipo: 'manual' }, select: SELECT_MANUAL });
    if (!fila) throw new AppException('NO_ENCONTRADO', 404, 'No encontramos ese aviso.');
    const [resumen] = await this.resumenes([fila]);
    let emails: NotificacionManualDetalle['emails'] = null;
    if (fila.prioridad === 'importante') {
      const porEstado = await this.prisma.entregaNotificacion.groupBy({ by: ['estado'], where: { notificacionId: id, canal: 'email' }, _count: { _all: true } });
      const cuenta = (e: string) => porEstado.find((x) => x.estado === e)?._count._all ?? 0;
      const fallidas = await this.prisma.entregaNotificacion.findMany({
        where: { notificacionId: id, canal: 'email', estado: 'fallida' },
        select: { persona: { select: { id: true, nombre: true, apellido: true } } },
        orderBy: [{ persona: { apellido: 'asc' } }, { persona: { nombre: 'asc' } }],
      });
      emails = { enviados: cuenta('enviada'), pendientes: cuenta('pendiente'), fallidos: cuenta('fallida'), personasFallidas: fallidas.map((f) => f.persona) };
    }
    return { ...resumen, mensaje: fila.mensaje ?? '', emails };
  }

  /** FR-028: el conteo previo, con la misma resolución que el envío. */
  async contar(cuerpo: { alcance?: unknown; alcanceId?: unknown }): Promise<ConteoDestinatarios> {
    const destinatario = await this.destinatarioDe(this.prisma, cuerpo);
    const personas = await resolverDestinatarios(this.prisma, destinatario);
    return { personas: personas.length, conEmail: personas.filter((p) => p.tieneEmail).length };
  }

  async opcionesAlcance(): Promise<OpcionesAlcance> {
    const [grupos, ministerios] = await Promise.all([
      this.prisma.grupo.findMany({
        where: { estado: 'en_curso', inscripciones: { some: { estado: 'activa' } } },
        select: {
          id: true,
          nombre: true,
          curso: { select: { nombre: true } },
          liderazgos: { where: { hasta: null }, select: { personaId: true }, take: 1 },
        },
        orderBy: [{ curso: { nombre: 'asc' } }, { createdAt: 'asc' }],
      }),
      this.prisma.ministerio.findMany({ where: { activo: true, eliminadoEn: null }, select: { id: true, nombre: true }, orderBy: { nombre: 'asc' } }),
    ]);
    const nombres = await this.nombresDeGrupos(grupos);
    return {
      grupos: grupos.map((g) => ({ id: g.id, nombre: nombres.get(g.id)!, curso: g.curso.nombre })),
      ministerios,
    };
  }

  /** FR-027, FR-029 — una transacción: valida, resuelve, crea la Notificación y sus Entregas; después empuja el mail. */
  async crear(autorId: string, cuerpo: Partial<Record<keyof NuevaNotificacionManual, unknown>>): Promise<NotificacionManualResumen> {
    const errores = validarNuevaNotificacion(cuerpo);
    if (errores.length > 0) throw new AppException('VALIDACION', 400, 'Revisá los datos del aviso.', errores);
    const titulo = (cuerpo.titulo as string).trim();
    const mensaje = (cuerpo.mensaje as string).trim();
    const alcance = cuerpo.alcance as AlcanceManual;
    const importante = cuerpo.importante === true;

    const id = await this.prisma.$transaction(async (tx) => {
      const destinatario = await this.destinatarioDe(tx, cuerpo);
      const personas = await resolverDestinatarios(tx, destinatario);
      if (personas.length === 0) {
        throw new AppException('NOTIFICACION_SIN_DESTINATARIOS', 409, 'No hay personas activas a quienes mandarles este aviso.');
      }
      const n = await tx.notificacion.create({
        data: {
          tipo: 'manual',
          prioridad: importante ? 'importante' : 'normal',
          alcance,
          alcanceId: alcance === 'todos' ? null : (cuerpo.alcanceId as string),
          titulo,
          mensaje,
          creadoPorId: autorId,
        },
        select: { id: true },
      });
      await this.notificaciones.crearEntregas(tx, n.id, personas, importante);
      return n.id;
    });
    if (importante) this.notificaciones.empujarEmails();
    const fila = await this.prisma.notificacion.findUniqueOrThrow({ where: { id }, select: SELECT_MANUAL });
    return (await this.resumenes([fila]))[0];
  }

  /** FR-031: los mails de avisos automáticos que no salieron, de los últimos 30 días. Nunca el email. */
  async mailsFallidos(pagina: number): Promise<Pagina<MailFallido> & { pagina: number }> {
    const desde = new Date(Date.now() - DIAS_MAILS_FALLIDOS_VISIBLES * 86_400_000);
    const where = { canal: 'email' as const, estado: 'fallida' as const, createdAt: { gte: desde }, notificacion: { tipo: 'automatica' as const } };
    const total = await this.prisma.entregaNotificacion.count({ where });
    const totalPaginas = Math.max(1, Math.ceil(total / NOTIFICACIONES_POR_PAGINA));
    const valida = Math.min(Math.max(1, Math.trunc(pagina) || 1), totalPaginas);
    const filas = await this.prisma.entregaNotificacion.findMany({
      where,
      select: {
        id: true,
        createdAt: true,
        ultimoError: true,
        persona: { select: { id: true, nombre: true, apellido: true } },
        notificacion: { select: { evento: true } },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: (valida - 1) * NOTIFICACIONES_POR_PAGINA,
      take: NOTIFICACIONES_POR_PAGINA,
    });
    return {
      items: filas.map((f) => ({
        entregaId: f.id,
        persona: f.persona,
        evento: f.notificacion.evento as NombreEventoAviso,
        fecha: f.createdAt.toISOString(),
        motivo: (['SIN_EMAIL', 'PERSONA_INACTIVA'].includes(f.ultimoError ?? '') ? f.ultimoError : 'ENVIO_FALLIDO') as MotivoMailFallido,
      })),
      total,
      pagina: valida,
    };
  }

  /** El destinatario de un alcance manual; Grupo finalizado/inexistente o Ministerio inactivo → 409 (FR-027). */
  private async destinatarioDe(db: Db, cuerpo: { alcance?: unknown; alcanceId?: unknown }): Promise<DestinatarioAviso> {
    const errores = validarNuevaNotificacion({ titulo: 'x', mensaje: 'x', alcance: cuerpo.alcance, alcanceId: cuerpo.alcanceId });
    if (errores.length > 0) throw new AppException('VALIDACION', 400, 'Elegí a quién le llega.', errores);
    const alcanceId = typeof cuerpo.alcanceId === 'string' ? cuerpo.alcanceId : '';
    switch (cuerpo.alcance as AlcanceManual) {
      case 'todos':
        return { tipo: 'todas' };
      case 'grupo': {
        const g = await db.grupo.findUnique({ where: { id: alcanceId }, select: { estado: true } });
        if (!g || g.estado !== 'en_curso') throw noDisponible();
        return { tipo: 'grupo', grupoId: alcanceId };
      }
      case 'ministerio': {
        const m = await db.ministerio.findUnique({ where: { id: alcanceId }, select: { activo: true, eliminadoEn: true } });
        if (!m || !m.activo || m.eliminadoEn) throw noDisponible();
        return { tipo: 'ministerio', ministerioId: alcanceId };
      }
    }
  }

  /** Estadísticas con `groupBy` sobre las Entregas `app`, sin traer filas. */
  private async resumenes(filas: FilaManual[]): Promise<NotificacionManualResumen[]> {
    if (filas.length === 0) return [];
    const ids = filas.map((f) => f.id);
    const [conteos, grupos, ministerios] = await Promise.all([
      this.prisma.entregaNotificacion.groupBy({
        by: ['notificacionId', 'leidaEn'],
        where: { notificacionId: { in: ids }, canal: 'app' },
        _count: { _all: true },
      }),
      this.prisma.grupo.findMany({
        where: { id: { in: filas.filter((f) => f.alcance === 'grupo' && f.alcanceId).map((f) => f.alcanceId!) } },
        select: { id: true, nombre: true, curso: { select: { nombre: true } }, liderazgos: { where: { hasta: null }, select: { personaId: true }, take: 1 } },
      }),
      this.prisma.ministerio.findMany({ where: { id: { in: filas.filter((f) => f.alcance === 'ministerio' && f.alcanceId).map((f) => f.alcanceId!) } }, select: { id: true, nombre: true } }),
    ]);
    const nombreGrupo = await this.nombresDeGrupos(grupos);
    const nombreMinisterio = new Map(ministerios.map((m) => [m.id, m.nombre]));
    return filas.map((f) => {
      const propias = conteos.filter((c) => c.notificacionId === f.id);
      const destinatarios = propias.reduce((s, c) => s + c._count._all, 0);
      const leidas = propias.filter((c) => c.leidaEn !== null).reduce((s, c) => s + c._count._all, 0);
      const alcance = f.alcance as AlcanceManual;
      return {
        id: f.id,
        titulo: f.titulo ?? '',
        alcance,
        alcanceNombre: alcance === 'grupo' ? (nombreGrupo.get(f.alcanceId!) ?? null) : alcance === 'ministerio' ? (nombreMinisterio.get(f.alcanceId!) ?? null) : null,
        importante: f.prioridad === 'importante',
        autor: f.creadoPor ?? { id: '', nombre: '', apellido: '' },
        fecha: f.createdAt.toISOString(),
        destinatarios,
        leidas,
      };
    });
  }

  /**
   * Cómo se reconoce un Grupo en el backoffice: su nombre (Vida de Servicio) o,
   * si no tiene (Vida Nueva), quién lo lidera; si nadie, el Curso. Sin textos
   * de interfaz: el backoffice arma la etiqueta con su `t()` (D84).
   */
  private async nombresDeGrupos(grupos: { id: string; nombre: string | null; curso: { nombre: string }; liderazgos: { personaId: string }[] }[]): Promise<Map<string, string>> {
    const lideres = await this.prisma.persona.findMany({
      where: { id: { in: grupos.flatMap((g) => g.liderazgos.map((l) => l.personaId)) } },
      select: { id: true, nombre: true, apellido: true },
    });
    const nombre = new Map(lideres.map((p) => [p.id, `${p.nombre} ${p.apellido}`]));
    return new Map(grupos.map((g) => [g.id, g.nombre ?? nombre.get(g.liderazgos[0]?.personaId ?? '') ?? g.curso.nombre]));
  }
}
