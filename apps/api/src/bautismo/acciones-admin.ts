import { Injectable } from '@nestjs/common';
import {
  ASIGNAR_BAUTISMO_MAX,
  MOTIVO_RECHAZO_BAUTISMO_MAX,
  sinAccesoALaApp,
  type AsignacionResultado,
  type ConfirmacionBautismosResultado,
  type EventoDeBautismoResumen,
  type FilaAsignada,
  type FilaEsperando,
  type SeccionBautismoEventoDatos,
  type SolicitudBautismoDetalle,
} from '@vida-sobrenatural/shared-types';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AppException } from '../common/errors/app-exception.js';
import { errorDeValidacion } from '../discipulado/validaciones.js';
import { nombresDe } from '../discipulado/consultas.js';
import { NotificacionesService } from '../notificaciones/notificaciones.service.js';
import { calcularEdad } from '../persona/calcular-edad.js';
import { EVENTO_RESUMEN_SELECT, aEventoResumen, bloquearSolicitudes, vidaNuevaDe } from './estado-bautismo.js';
import { SOLICITUD_TX_SELECT, asignarAEvento, exigirEventoAsignable, sacarDeEvento, yaCambio } from './operaciones.js';

const PERSONA_BREVE = { id: true, nombre: true, apellido: true, fotoUrl: true } as const;

/**
 * spec 010, lote B (Historias 2, 3 y 7; contracts/bautismo-api.md, "El
 * Admin y el Pastor"): el detalle, aceptar y rechazar, la sección Bautismo
 * del Evento (asignar, quitar) y confirmar los bautismos. Toda transición
 * bloquea las Solicitudes (y antes el Evento, si hay) y chequea su estado
 * adentro (FR-010); los avisos van por `emitir` dentro de la transacción.
 */
@Injectable()
export class BautismoAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificaciones: NotificacionesService,
  ) {}

  /** GET /bautismo/solicitudes/:id (FR-007). */
  async detalle(id: string): Promise<SolicitudBautismoDetalle> {
    const s = await this.prisma.solicitudBautismo.findUnique({
      where: { id },
      select: {
        id: true,
        estado: true,
        comentario: true,
        createdAt: true,
        creadoPorId: true,
        revisadoPorId: true,
        revisadaEn: true,
        motivoRechazo: true,
        retiradaEn: true,
        realizadaEn: true,
        persona: { select: { ...PERSONA_BREVE, fechaNacimiento: true, email: true, bautismoHabilitadoEn: true, bautismoHabilitadoPorId: true } },
        inscripcionEvento: { select: { estado: true, evento: { select: EVENTO_RESUMEN_SELECT } } },
      },
    });
    if (!s) throw new AppException('NO_ENCONTRADO', 404, 'No existe esa Solicitud de Bautismo.');
    const p = s.persona;
    const [vidaNueva, personas] = await Promise.all([
      vidaNuevaDe(this.prisma, p.id),
      nombresDe(this.prisma, [s.creadoPorId, s.revisadoPorId, p.bautismoHabilitadoPorId].filter((x): x is string => x !== null)),
    ]);
    const breve = (pid: string | null) => (pid ? (personas.get(pid) ?? null) : null);
    const insc = s.inscripcionEvento;
    return {
      id: s.id,
      estado: s.estado,
      persona: { id: p.id, nombre: p.nombre, apellido: p.apellido, fotoUrl: p.fotoUrl, edad: calcularEdad(p.fechaNacimiento), sinAccesoALaApp: sinAccesoALaApp(p) },
      comentario: s.comentario,
      createdAt: s.createdAt.toISOString(),
      creadoPor: breve(s.creadoPorId),
      revisadoPor: breve(s.revisadoPorId),
      revisadaEn: s.revisadaEn?.toISOString() ?? null,
      motivoRechazo: s.motivoRechazo,
      retiradaEn: s.retiradaEn?.toISOString() ?? null,
      realizadaEn: s.realizadaEn?.toISOString() ?? null,
      vidaNueva,
      habilitacion: p.bautismoHabilitadoEn ? { en: p.bautismoHabilitadoEn.toISOString(), por: breve(p.bautismoHabilitadoPorId) } : null,
      evento: insc && insc.estado !== 'cancelada' ? aEventoResumen(insc.evento) : null,
    };
  }

  /**
   * POST /bautismo/solicitudes/:id/aceptar (FR-008): exige `pendiente`. Con
   * `eventoId`, además la asigna en la misma operación (FR-012).
   */
  async aceptar(id: string, actorId: string, eventoId: string | undefined): Promise<SolicitudBautismoDetalle> {
    await this.prisma.$transaction(async (tx) => {
      const evento = eventoId ? { id: eventoId, ...(await exigirEventoAsignable(tx, eventoId)) } : null;
      const solicitud = await this.bloqueada(tx, id);
      if (solicitud.estado !== 'pendiente') throw yaCambio();
      await tx.solicitudBautismo.update({ where: { id }, data: { estado: 'aprobada', revisadoPorId: actorId, revisadaEn: new Date() } });
      await this.notificaciones.emitir(tx, {
        nombre: 'bautismo.solicitud_aceptada',
        a: { tipo: 'persona', personaId: solicitud.personaId },
        datos: { solicitudId: id },
      });
      if (evento) await asignarAEvento(tx, this.notificaciones, { ...solicitud, estado: 'aprobada' }, evento, actorId);
    });
    return this.detalle(id);
  }

  /** POST /bautismo/solicitudes/:id/rechazar (FR-009): motivo opcional, solo para el equipo (D185). */
  async rechazar(id: string, actorId: string, motivoCrudo: string | undefined): Promise<SolicitudBautismoDetalle> {
    const limpio = motivoCrudo?.trim() ?? '';
    if (limpio.length > MOTIVO_RECHAZO_BAUTISMO_MAX) throw errorDeValidacion([{ campo: 'motivo', code: 'MOTIVO_DEMASIADO_LARGO' }]);
    await this.prisma.$transaction(async (tx) => {
      const solicitud = await this.bloqueada(tx, id);
      if (solicitud.estado !== 'pendiente') throw yaCambio();
      await tx.solicitudBautismo.update({
        where: { id },
        data: { estado: 'rechazada', revisadoPorId: actorId, revisadaEn: new Date(), motivoRechazo: limpio === '' ? null : limpio },
      });
      await this.notificaciones.emitir(tx, {
        nombre: 'bautismo.solicitud_rechazada',
        a: { tipo: 'persona', personaId: solicitud.personaId },
        datos: { solicitudId: id },
      });
    });
    return this.detalle(id);
  }

  /** GET /bautismo/eventos (FR-012, escenario 3.5): próximos Eventos de bautismo publicados, por fecha. */
  async eventosProximos(): Promise<EventoDeBautismoResumen[]> {
    const eventos = await this.prisma.evento.findMany({
      where: { tipo: 'bautismo', estado: 'publicado', eliminadoEn: null, inicio: { gt: new Date() } },
      orderBy: [{ inicio: 'asc' }, { id: 'asc' }],
      take: 50,
      select: EVENTO_RESUMEN_SELECT,
    });
    return eventos.map(aEventoResumen);
  }

  /**
   * GET /bautismo/eventos/:eventoId (Historias 3 y 7, FR-033): las asignadas
   * y las aceptadas sin fecha (las más antiguas primero), paginadas.
   */
  async seccionEvento(
    eventoId: string,
    p: { skipAsignadas: number; takeAsignadas: number; skipEsperando: number; takeEsperando: number },
  ): Promise<SeccionBautismoEventoDatos> {
    const evento = await this.prisma.evento.findFirst({
      where: { id: eventoId, eliminadoEn: null, tipo: 'bautismo' },
      select: { ...EVENTO_RESUMEN_SELECT, estado: true },
    });
    if (!evento) throw new AppException('NO_ENCONTRADO', 404, 'No existe ese Evento de bautismo.');
    const ahora = new Date();
    const whereAsignadas: Prisma.SolicitudBautismoWhereInput = { estado: { in: ['aprobada', 'realizada'] }, inscripcionEvento: { eventoId } };
    const whereEsperando: Prisma.SolicitudBautismoWhereInput = { estado: 'aprobada', inscripcionEventoId: null };
    const [asignadas, totalAsignadas, esperando, totalEsperando, sinConfirmar] = await Promise.all([
      this.prisma.solicitudBautismo.findMany({
        where: whereAsignadas,
        orderBy: [{ persona: { apellido: 'asc' } }, { persona: { nombre: 'asc' } }, { id: 'asc' }],
        skip: p.skipAsignadas,
        take: p.takeAsignadas,
        select: { id: true, estado: true, realizadaEn: true, persona: { select: PERSONA_BREVE }, inscripcionEvento: { select: { createdAt: true } } },
      }),
      this.prisma.solicitudBautismo.count({ where: whereAsignadas }),
      this.prisma.solicitudBautismo.findMany({
        where: whereEsperando,
        orderBy: [{ revisadaEn: 'asc' }, { id: 'asc' }],
        skip: p.skipEsperando,
        take: p.takeEsperando,
        select: { id: true, revisadaEn: true, createdAt: true, persona: { select: PERSONA_BREVE } },
      }),
      this.prisma.solicitudBautismo.count({ where: whereEsperando }),
      this.prisma.solicitudBautismo.count({ where: { estado: 'aprobada', inscripcionEvento: { eventoId } } }),
    ]);
    const yaEmpezo = evento.inicio <= ahora;
    return {
      evento: { ...aEventoResumen(evento), cancelado: evento.estado === 'cancelado', yaEmpezo },
      asignadas: {
        total: totalAsignadas,
        items: asignadas.map(
          (s): FilaAsignada => ({
            solicitudId: s.id,
            persona: s.persona,
            estado: s.estado as 'aprobada' | 'realizada',
            asignadaEn: (s.inscripcionEvento?.createdAt ?? new Date(0)).toISOString(),
            realizadaEn: s.realizadaEn?.toISOString() ?? null,
          }),
        ),
      },
      esperandoFecha: {
        total: totalEsperando,
        items: esperando.map((s): FilaEsperando => ({ solicitudId: s.id, persona: s.persona, aceptadaEn: (s.revisadaEn ?? s.createdAt).toISOString() })),
      },
      puedeConfirmar: yaEmpezo && evento.estado === 'publicado' && sinConfirmar > 0,
    };
  }

  /**
   * POST /bautismo/eventos/:eventoId/asignar (FR-012 a FR-014, FR-017):
   * parcial-tolerante. El Evento se valida entero (si no es asignable, nada
   * cambia); cada Solicitud, en orden de id: la que ya no está aceptada va a
   * `noAsignadas` con su código y las demás se asignan.
   */
  async asignar(eventoId: string, solicitudIds: string[], actorId: string): Promise<AsignacionResultado> {
    const ids = [...new Set(solicitudIds)].sort();
    if (ids.length === 0 || ids.length > ASIGNAR_BAUTISMO_MAX) throw errorDeValidacion([{ campo: 'solicitudIds', code: 'SOLICITUDIDS_INVALIDO' }]);
    return this.prisma.$transaction(async (tx) => {
      const evento = { id: eventoId, ...(await exigirEventoAsignable(tx, eventoId)) };
      await bloquearSolicitudes(tx, ids);
      const solicitudes = new Map(
        (await tx.solicitudBautismo.findMany({ where: { id: { in: ids } }, select: SOLICITUD_TX_SELECT })).map((s) => [s.id, s]),
      );
      const resultado: AsignacionResultado = { asignadas: [], noAsignadas: [] };
      for (const id of ids) {
        const solicitud = solicitudes.get(id);
        if (!solicitud) {
          resultado.noAsignadas.push({ id, code: 'NO_ENCONTRADO' });
        } else if (solicitud.estado !== 'aprobada') {
          resultado.noAsignadas.push({ id, code: 'SOLICITUD_BAUTISMO_YA_CAMBIO' });
        } else {
          await asignarAEvento(tx, this.notificaciones, solicitud, evento, actorId);
          resultado.asignadas.push(id);
        }
      }
      return resultado;
    });
  }

  /**
   * POST /bautismo/solicitudes/:id/quitar-de-evento (FR-015): exige
   * `aprobada` con un Evento que todavía no empezó; vuelve a "esperando
   * fecha" y se le avisa.
   */
  async quitarDeEvento(id: string, actorId: string): Promise<SolicitudBautismoDetalle> {
    await this.prisma.$transaction(async (tx) => {
      const solicitud = await this.bloqueada(tx, id);
      const insc = solicitud.inscripcionEvento;
      if (solicitud.estado !== 'aprobada' || !insc || insc.estado === 'cancelada' || insc.evento.inicio <= new Date()) throw yaCambio();
      const eventoId = await sacarDeEvento(tx, solicitud, actorId, 'admin');
      await this.notificaciones.emitir(tx, {
        nombre: 'bautismo.fecha_quitada',
        a: { tipo: 'persona', personaId: solicitud.personaId },
        datos: { solicitudId: id, eventoId: eventoId ?? insc.eventoId },
      });
    });
    return this.detalle(id);
  }

  /**
   * POST /bautismo/eventos/:eventoId/confirmar (FR-027, FR-028; research #9):
   * solo un Evento de bautismo que ya empezó. Las tildadas → `realizada` con
   * la fecha del Evento; las asignadas `aprobada` NO tildadas vuelven a
   * "esperando fecha" (FK en `null`; su inscripción no se toca: fue). Un id
   * que no está asignado a este Evento → VALIDACION. Idempotente: repetir la
   * misma llamada no cambia nada ni vuelve a avisar.
   */
  async confirmar(eventoId: string, realizadasIds: string[], actorId: string): Promise<ConfirmacionBautismosResultado> {
    void actorId;
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "eventos" WHERE "id" = ${eventoId} FOR UPDATE`;
      const evento = await tx.evento.findFirst({ where: { id: eventoId, eliminadoEn: null }, select: { tipo: true, inicio: true } });
      if (!evento) throw new AppException('NO_ENCONTRADO', 404, 'No existe ese Evento.');
      if (evento.tipo !== 'bautismo') throw new AppException('EVENTO_NO_ES_DE_BAUTISMO', 409, 'Ese Evento no es de bautismo.');
      if (evento.inicio > new Date()) throw new AppException('EVENTO_TODAVIA_NO_OCURRIO', 409, 'El Evento todavía no ocurrió.');

      const asignadas = await tx.solicitudBautismo.findMany({
        where: { estado: { in: ['aprobada', 'realizada'] }, inscripcionEvento: { eventoId } },
        select: { id: true },
      });
      const deEsteEvento = new Set(asignadas.map((s) => s.id));
      const tildadas = new Set(realizadasIds);
      if ([...tildadas].some((id) => !deEsteEvento.has(id))) {
        throw errorDeValidacion([{ campo: 'realizadas', code: 'SOLICITUD_NO_ASIGNADA_A_ESTE_EVENTO' }]);
      }
      await bloquearSolicitudes(tx, [...deEsteEvento]);
      const solicitudes = await tx.solicitudBautismo.findMany({
        where: { id: { in: [...deEsteEvento] } },
        orderBy: { id: 'asc' },
        select: SOLICITUD_TX_SELECT,
      });
      const resultado: ConfirmacionBautismosResultado = { realizadas: 0, devueltasAEspera: 0 };
      for (const s of solicitudes) {
        if (s.estado !== 'aprobada') continue; // ya realizada: idempotente
        if (tildadas.has(s.id)) {
          await tx.solicitudBautismo.update({ where: { id: s.id }, data: { estado: 'realizada', realizadaEn: evento.inicio } });
          await this.notificaciones.emitir(tx, {
            nombre: 'bautismo.realizado',
            a: { tipo: 'persona', personaId: s.personaId },
            datos: { solicitudId: s.id, eventoId },
          });
          resultado.realizadas += 1;
        } else {
          await tx.solicitudBautismo.update({ where: { id: s.id }, data: { inscripcionEventoId: null } });
          resultado.devueltasAEspera += 1;
        }
      }
      return resultado;
    });
  }

  private async bloqueada(tx: Prisma.TransactionClient, id: string) {
    await bloquearSolicitudes(tx, [id]);
    const solicitud = await tx.solicitudBautismo.findUnique({ where: { id }, select: SOLICITUD_TX_SELECT });
    if (!solicitud) throw new AppException('NO_ENCONTRADO', 404, 'No existe esa Solicitud de Bautismo.');
    return solicitud;
  }
}
