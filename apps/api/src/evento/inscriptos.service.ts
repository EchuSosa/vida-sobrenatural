import { Injectable } from '@nestjs/common';
import {
  APROBAR_LOTE_MAX,
  ESTADOS_INSCRIPCION_ABIERTA,
  MOTIVO_RECHAZO_INSCRIPCION_MAX,
  correspondeAlEvento,
  edadCumplidaEn,
  estadoPagoDeInscripcion,
  sinAccesoALaApp,
  type EstadoInscripcionEvento,
  type InscripcionDePersona,
  type InscripcionEventoResumen,
  type Pagina,
  type RespuestaPregunta,
  type ResultadoAprobarLote,
  type ResumenPreguntaEvento,
} from '@vida-sobrenatural/shared-types';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AppException } from '../common/errors/app-exception.js';
import { NotificacionesService } from '../notificaciones/notificaciones.service.js';
import { conBloqueoDeEvento, contarOcupados, decidirEstadoInicial, liberaLugar, posicionEnLista, promoverDesdeLista } from './motor-cupo.js';
import { esViolacionDeUnico } from './inscripcion-propia.service.js';
import { destinatariosDe } from './representacion.js';
import { loQueLaAppSabe } from './datos-persona-inscripta.js';
import { guardarRespuestas, respuestasDeInscripciones, resumenDePreguntas, validarRespuestasDelEvento } from './preguntas-evento.js';

const DIA_MS = 86_400_000;

const RESUMEN_SELECT = {
  id: true,
  eventoId: true,
  estado: true,
  createdAt: true,
  creadoPorId: true,
  enListaDesde: true,
  promovidaEn: true,
  promocionVistaEn: true,
  revisadoPorId: true,
  motivoRechazo: true,
  motivoCancelacion: true,
  fueraDeDestinatarios: true,
  persona: { select: { id: true, nombre: true, apellido: true, email: true, telefono: true, fechaNacimiento: true } },
  evento: { select: { costo: true, inicio: true } },
  pagos: { select: { id: true, estado: true, createdAt: true, motivoRechazo: true } },
} as const satisfies Prisma.InscripcionEventoSelect;

type Resumen = Prisma.InscripcionEventoGetPayload<{ select: typeof RESUMEN_SELECT }>;

/**
 * spec 011, lote D (US6) — los inscriptos de un Evento desde el backoffice:
 * ver por estado (FR-025), aprobar y rechazar (FR-026), dar de baja e
 * inscribir en nombre de una Persona, también a un Evento de bautismo (FR-027,
 * FR-047), y las Inscripciones de una Persona (FR-048). Todo lo que mueve
 * cupo va con el Evento bloqueado y promueve si libera lugar.
 */
@Injectable()
export class InscriptosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificaciones: NotificacionesService,
  ) {}

  private readonly emitir = (tx: Prisma.TransactionClient, e: Parameters<NotificacionesService['emitir']>[1]) => this.notificaciones.emitir(tx, e);

  /** GET /eventos/:id/inscripciones — por estado; la lista de espera en su orden (FR-025). */
  async listar(
    eventoId: string,
    f: { estado?: EstadoInscripcionEvento; buscar?: string; skip: number; take: number; verSensibles?: boolean },
  ): Promise<Pagina<InscripcionEventoResumen>> {
    await this.eventoExistente(eventoId);
    const where: Prisma.InscripcionEventoWhereInput = { eventoId, ...(f.estado ? { estado: f.estado } : {}) };
    const buscar = f.buscar?.trim();
    if (buscar) {
      where.persona = { OR: [{ nombre: { contains: buscar, mode: 'insensitive' } }, { apellido: { contains: buscar, mode: 'insensitive' } }] };
    }
    const orderBy: Prisma.InscripcionEventoOrderByWithRelationInput[] =
      f.estado === 'lista_espera' ? [{ enListaDesde: 'asc' }, { id: 'asc' }] : [{ createdAt: 'asc' }, { id: 'asc' }];
    const [filas, total] = await Promise.all([
      this.prisma.inscripcionEvento.findMany({ where, orderBy, skip: f.skip, take: f.take, select: RESUMEN_SELECT }),
      this.prisma.inscripcionEvento.count({ where }),
    ]);
    return { items: await this.aResumenes(this.prisma, filas, f.verSensibles === true), total };
  }

  /** GET /eventos/:id/preguntas/resumen — FR-067, FR-068: sin las sensibles para quien no gestiona. */
  async resumenPreguntas(eventoId: string, verSensibles: boolean): Promise<ResumenPreguntaEvento[]> {
    await this.eventoExistente(eventoId);
    return resumenDePreguntas(this.prisma, eventoId, verSensibles);
  }

  /** POST /eventos/:id/inscripciones — FR-027, FR-047: el Admin anota a una Persona; cupo, lista y aprobación igual que siempre. */
  async inscribirEnNombre(
    eventoId: string,
    personaId: string | undefined,
    adminId: string,
    opciones: { forzar?: boolean; respuestas?: RespuestaPregunta[] } = {},
  ): Promise<InscripcionEventoResumen> {
    if (!personaId) throw new AppException('VALIDACION', 400, 'Elegí a la Persona.', [{ campo: 'personaId', code: 'PERSONA_REQUERIDA' }]);
    try {
      return await conBloqueoDeEvento(this.prisma, eventoId, async (tx) => {
        const evento = await tx.evento.findFirst({
          where: { id: eventoId, eliminadoEn: null },
          select: {
            nombre: true,
            tipo: true,
            estado: true,
            requiereInscripcion: true,
            requiereAprobacion: true,
            inicio: true,
            cupo: true,
            permiteListaEspera: true,
            destinatariosGenero: true,
            edadMinima: true,
            edadMaxima: true,
          },
        });
        if (!evento) throw new AppException('NO_ENCONTRADO', 404, 'Evento no encontrado.');
        if (evento.estado === 'cancelado') throw new AppException('EVENTO_CANCELADO', 409, 'El Evento está cancelado.');
        if (!evento.requiereInscripcion) throw new AppException('EVENTO_NO_ADMITE_INSCRIPCION', 409, 'Este Evento no necesita inscripción.');
        if (evento.inicio <= new Date()) throw new AppException('EVENTO_YA_EMPEZO', 409, 'El Evento ya empezó.');
        const persona = await tx.persona.findUnique({ where: { id: personaId }, select: { estado: true, genero: true, fechaNacimiento: true } });
        if (!persona) throw new AppException('NO_ENCONTRADO', 404, 'Persona no encontrada.');
        if (persona.estado !== 'activa') throw new AppException('PERSONA_NO_ACTIVA', 409, 'La Persona no está activa.');
        // FR-062 (ampliación 2026-10-09): fuera de los destinatarios, solo con confirmación explícita del Admin.
        const fueraDeDestinatarios = !correspondeAlEvento(persona, destinatariosDe(evento), evento.inicio);
        if (fueraDeDestinatarios && opciones.forzar !== true) {
          throw new AppException('EVENTO_NO_CORRESPONDE', 409, 'La Persona no está entre los destinatarios del Evento.');
        }
        if ((await tx.inscripcionEvento.count({ where: { eventoId, personaId, estado: { in: [...ESTADOS_INSCRIPCION_ABIERTA] } } })) > 0) {
          throw new AppException('INSCRIPCION_EVENTO_YA_ABIERTA', 409, 'La Persona ya está anotada a este Evento.');
        }
        await validarRespuestasDelEvento(tx, eventoId, opciones.respuestas);
        const estado = decidirEstadoInicial(evento, await contarOcupados(tx, eventoId));
        const creada = await tx.inscripcionEvento.create({
          data: { eventoId, personaId, estado, creadoPorId: adminId, enListaDesde: estado === 'lista_espera' ? new Date() : null, fueraDeDestinatarios },
          select: RESUMEN_SELECT,
        });
        await guardarRespuestas(tx, eventoId, creada.id, opciones.respuestas);
        await this.emitir(tx, {
          nombre: 'evento.inscripcion_creada_por_admin',
          a: { tipo: 'persona', personaId },
          datos: { inscripcionId: creada.id, eventoId, evento: evento.nombre, estado },
        });
        const [resumen] = await this.aResumenes(tx, [creada], true);
        return resumen;
      });
    } catch (e) {
      if (esViolacionDeUnico(e)) throw new AppException('INSCRIPCION_EVENTO_YA_ABIERTA', 409, 'La Persona ya está anotada a este Evento.');
      throw e;
    }
  }

  /** POST /inscripciones-evento/:id/aprobar — FR-026. */
  async aprobar(id: string, adminId: string): Promise<InscripcionEventoResumen> {
    return this.conInscripcion(id, async (tx, insc) => {
      if (insc.estado !== 'pendiente') throw new AppException('INSCRIPCION_NO_PENDIENTE', 409, 'La inscripción ya no está pendiente.');
      await tx.inscripcionEvento.update({ where: { id }, data: { estado: 'confirmada', revisadoPorId: adminId, revisadoEn: new Date() } });
      await this.emitir(tx, {
        nombre: 'evento.inscripcion_confirmada',
        a: { tipo: 'persona', personaId: insc.personaId },
        datos: { inscripcionId: id, eventoId: insc.eventoId, evento: insc.evento.nombre },
      });
    });
  }

  /** POST /inscripciones-evento/:id/rechazar — FR-026: libera el lugar y promueve. */
  async rechazar(id: string, adminId: string, motivo?: string): Promise<InscripcionEventoResumen> {
    const texto = motivo?.trim() || null;
    if (texto && texto.length > MOTIVO_RECHAZO_INSCRIPCION_MAX) {
      throw new AppException('VALIDACION', 400, 'El motivo es demasiado largo.', [{ campo: 'motivo', code: 'MOTIVO_DEMASIADO_LARGO' }]);
    }
    return this.conInscripcion(id, async (tx, insc) => {
      if (insc.estado !== 'pendiente') throw new AppException('INSCRIPCION_NO_PENDIENTE', 409, 'La inscripción ya no está pendiente.');
      await tx.inscripcionEvento.update({ where: { id }, data: { estado: 'rechazada', revisadoPorId: adminId, revisadoEn: new Date(), motivoRechazo: texto } });
      await this.emitir(tx, {
        nombre: 'evento.inscripcion_rechazada',
        a: { tipo: 'persona', personaId: insc.personaId },
        datos: { inscripcionId: id, eventoId: insc.eventoId, evento: insc.evento.nombre },
      });
      await promoverDesdeLista(tx, insc.eventoId, this.emitir);
    });
  }

  /** POST /eventos/:id/inscripciones/aprobar-lote — FR-026: cada una en su transacción; resumen. */
  async aprobarLote(eventoId: string, ids: unknown, adminId: string): Promise<ResultadoAprobarLote> {
    if (!Array.isArray(ids) || ids.length === 0 || ids.length > APROBAR_LOTE_MAX || !ids.every((x) => typeof x === 'string')) {
      throw new AppException('VALIDACION', 400, `Elegí entre 1 y ${APROBAR_LOTE_MAX} inscripciones.`, [{ campo: 'ids', code: 'IDS_INVALIDO' }]);
    }
    const resultado: ResultadoAprobarLote = { aprobadas: [], fallidas: [] };
    for (const id of ids as string[]) {
      try {
        const propia = await this.prisma.inscripcionEvento.count({ where: { id, eventoId } });
        if (!propia) throw new AppException('NO_ENCONTRADO', 404, 'Inscripción no encontrada.');
        await this.aprobar(id, adminId);
        resultado.aprobadas.push(id);
      } catch (e) {
        resultado.fallidas.push({ id, code: e instanceof AppException ? e.code : 'ERROR_INTERNO' });
      }
    }
    return resultado;
  }

  /**
   * POST /inscripciones-evento/:id/dar-de-baja — FR-027. El Admin puede
   * hacerlo también después del inicio (para cerrar las cuentas); la
   * promoción solo ocurre antes (la decide `promoverDesdeLista`).
   */
  async darDeBaja(id: string, adminId: string): Promise<InscripcionEventoResumen> {
    return this.conInscripcion(id, async (tx, insc) => {
      if (!ESTADOS_INSCRIPCION_ABIERTA.includes(insc.estado)) throw new AppException('INSCRIPCION_NO_ABIERTA', 409, 'La inscripción ya no está abierta.');
      await tx.inscripcionEvento.update({
        where: { id },
        data: { estado: 'cancelada', canceladaEn: new Date(), canceladaPorId: adminId, motivoCancelacion: 'admin', enListaDesde: null },
      });
      await this.emitir(tx, {
        nombre: 'evento.inscripcion_cancelada_por_admin',
        a: { tipo: 'persona', personaId: insc.personaId },
        datos: { inscripcionId: id, eventoId: insc.eventoId, evento: insc.evento.nombre },
      });
      if (liberaLugar(insc.estado)) await promoverDesdeLista(tx, insc.eventoId, this.emitir);
    });
  }

  /** GET /inscripciones-evento/:id — para que la bandeja lleve al Evento de la Inscripción. */
  async una(id: string, verSensibles: boolean): Promise<InscripcionEventoResumen & { eventoId: string }> {
    const fila = await this.prisma.inscripcionEvento.findFirst({ where: { id, evento: { eliminadoEn: null } }, select: RESUMEN_SELECT });
    if (!fila) throw new AppException('NO_ENCONTRADO', 404, 'Inscripción no encontrada.');
    const [resumen] = await this.aResumenes(this.prisma, [fila], verSensibles);
    return { ...resumen, eventoId: fila.eventoId };
  }

  /** POST /inscripciones-evento/:id/promocion-vista — FR-025: "Ya le avisé". */
  async marcarPromocionVista(id: string): Promise<InscripcionEventoResumen> {
    const insc = await this.prisma.inscripcionEvento.findUnique({ where: { id }, select: { id: true } });
    if (!insc) throw new AppException('NO_ENCONTRADO', 404, 'Inscripción no encontrada.');
    const fila = await this.prisma.inscripcionEvento.update({ where: { id }, data: { promocionVistaEn: new Date() }, select: RESUMEN_SELECT });
    const [resumen] = await this.aResumenes(this.prisma, [fila], true);
    return resumen;
  }

  /** GET /personas/:id/inscripciones-evento — FR-048 (para la 010 y el perfil). */
  async dePersona(personaId: string, skip: number, take: number): Promise<Pagina<InscripcionDePersona>> {
    const where: Prisma.InscripcionEventoWhereInput = { personaId, evento: { eliminadoEn: null } };
    const [filas, total] = await Promise.all([
      this.prisma.inscripcionEvento.findMany({
        where,
        orderBy: { evento: { inicio: 'desc' } },
        skip,
        take,
        select: {
          id: true,
          estado: true,
          createdAt: true,
          pagos: { select: { estado: true, createdAt: true } },
          evento: { select: { id: true, slug: true, nombre: true, tipo: true, inicio: true, estado: true, costo: true } },
        },
      }),
      this.prisma.inscripcionEvento.count({ where }),
    ]);
    return {
      items: filas.map((f) => ({
        id: f.id,
        estado: f.estado,
        createdAt: f.createdAt.toISOString(),
        estadoPago: estadoPagoDeInscripcion(f.evento.costo === null ? null : f.evento.costo.toFixed(2), f.pagos).estado,
        evento: { id: f.evento.id, slug: f.evento.slug, nombre: f.evento.nombre, tipo: f.evento.tipo, inicio: f.evento.inicio.toISOString(), estado: f.evento.estado },
      })),
      total,
    };
  }

  // --------------------------------------------------------------------------

  private async eventoExistente(eventoId: string) {
    const existe = await this.prisma.evento.count({ where: { id: eventoId, eliminadoEn: null } });
    if (!existe) throw new AppException('NO_ENCONTRADO', 404, 'Evento no encontrado.');
  }

  private async conInscripcion(
    id: string,
    fn: (
      tx: Prisma.TransactionClient,
      insc: { estado: EstadoInscripcionEvento; personaId: string; eventoId: string; evento: { nombre: string } },
    ) => Promise<void>,
  ): Promise<InscripcionEventoResumen> {
    const previa = await this.prisma.inscripcionEvento.findUnique({ where: { id }, select: { eventoId: true } });
    if (!previa) throw new AppException('NO_ENCONTRADO', 404, 'Inscripción no encontrada.');
    return conBloqueoDeEvento(this.prisma, previa.eventoId, async (tx) => {
      const insc = await tx.inscripcionEvento.findUniqueOrThrow({
        where: { id },
        select: { estado: true, personaId: true, eventoId: true, evento: { select: { nombre: true } } },
      });
      await fn(tx, insc);
      const fila = await tx.inscripcionEvento.findUniqueOrThrow({ where: { id }, select: RESUMEN_SELECT });
      const [resumen] = await this.aResumenes(tx, [fila], true);
      return resumen;
    });
  }

  /**
   * `verSensibles` (FR-068): solo quien tiene `eventos.gestionar`. Las acciones
   * de gestión (aprobar, rechazar, dar de baja…) piden
   * `inscripciones_evento.gestionar` (solo Admin), así que las devuelven completas.
   */
  private async aResumenes(db: Prisma.TransactionClient, filas: Resumen[], verSensibles: boolean): Promise<InscripcionEventoResumen[]> {
    const respuestas = await respuestasDeInscripciones(db, filas.map((f) => f.id), verSensibles);
    const sabido = await loQueLaAppSabe(db, filas.map((f) => f.persona.id));
    const ids = [...new Set(filas.flatMap((f) => [f.creadoPorId, f.revisadoPorId]).filter((x): x is string => Boolean(x)))];
    const personas = new Map(
      (await db.persona.findMany({ where: { id: { in: ids } }, select: { id: true, nombre: true, apellido: true } })).map((p) => [p.id, p]),
    );
    const ahora = Date.now();
    return Promise.all(
      filas.map(async (f) => {
        const pago = estadoPagoDeInscripcion(f.evento.costo === null ? null : f.evento.costo.toFixed(2), f.pagos);
        return {
          id: f.id,
          persona: { id: f.persona.id, nombre: f.persona.nombre, apellido: f.persona.apellido, tieneAcceso: !sinAccesoALaApp(f.persona) },
          estado: f.estado,
          createdAt: f.createdAt.toISOString(),
          creadoPor: f.creadoPorId ? (personas.get(f.creadoPorId) ?? null) : null,
          posicionEnLista: f.estado === 'lista_espera' ? await posicionEnLista(db, f) : null,
          promovidaSinVer: f.promovidaEn !== null && f.promocionVistaEn === null && ESTADOS_INSCRIPCION_ABIERTA.includes(f.estado),
          estadoPago: pago.estado,
          diasSinPago: f.estado === 'confirmada' && pago.estado === 'sin_pago' ? Math.floor((ahora - f.createdAt.getTime()) / DIA_MS) : null,
          pagoPendienteId: f.pagos.find((p) => p.estado === 'pendiente_verificacion')?.id ?? null,
          revisadoPor: f.revisadoPorId ? (personas.get(f.revisadoPorId) ?? null) : null,
          motivoRechazo: f.motivoRechazo,
          motivoCancelacion: f.motivoCancelacion,
          fueraDeDestinatarios: f.fueraDeDestinatarios,
          respuestas: respuestas.get(f.id) ?? [],
          datosPersona: {
            edad: edadCumplidaEn(f.persona.fechaNacimiento, f.evento.inicio),
            telefono: f.persona.telefono,
            ministerios: sabido.get(f.persona.id)?.ministerios ?? [],
            referente: sabido.get(f.persona.id)?.referente ?? null,
            // FR-070: lo completa la spec 014 (grupos de extensión) cuando esté en `main`.
            grupoExtension: null,
          },
        };
      }),
    );
  }
}
