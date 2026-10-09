import { Injectable } from '@nestjs/common';
import { ESTADOS_INSCRIPCION_ABIERTA, correspondeAlEvento, estadoInscripcionDeEvento, type MiInscripcionEnEvento, type MiInscripcionEvento } from '@vida-sobrenatural/shared-types';
import { PrismaService } from '../prisma/prisma.service.js';
import { AppException } from '../common/errors/app-exception.js';
import { NotificacionesService } from '../notificaciones/notificaciones.service.js';
import { conBloqueoDeEvento, contarOcupados, decidirEstadoInicial } from './motor-cupo.js';
import { aMisInscripciones, INSCRIPCION_SELECT } from './mis-inscripciones.js';
import { destinatariosDe } from './representacion.js';

/**
 * spec 011, lote B (US3) — la propia Persona se anota (FR-015 a FR-017,
 * FR-019, FR-021, FR-046) y ve su estado en la página del Evento.
 */
@Injectable()
export class InscripcionPropiaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificaciones: NotificacionesService,
  ) {}

  /** GET /eventos/:id/mi-inscripcion — su Inscripción abierta (o la última, si no hay) y los lugares en vivo. */
  async miInscripcion(eventoId: string, personaId: string): Promise<MiInscripcionEnEvento> {
    const evento = await this.prisma.evento.findFirst({
      where: { id: eventoId, eliminadoEn: null },
      select: {
        tipo: true,
        estado: true,
        requiereInscripcion: true,
        inicio: true,
        cupo: true,
        permiteListaEspera: true,
        destinatariosGenero: true,
        edadMinima: true,
        edadMaxima: true,
      },
    });
    if (!evento) throw new AppException('NO_ENCONTRADO', 404, 'Evento no encontrado.');
    const persona = await this.prisma.persona.findUnique({ where: { id: personaId }, select: { genero: true, fechaNacimiento: true } });
    const ocupados = await contarOcupados(this.prisma, eventoId);
    const abierta = await this.prisma.inscripcionEvento.findFirst({
      where: { eventoId, personaId, estado: { in: [...ESTADOS_INSCRIPCION_ABIERTA] } },
      select: INSCRIPCION_SELECT,
    });
    // Sin una abierta, la última (rechazada o cancelada) para poder decir qué pasó.
    const fila =
      abierta ??
      (await this.prisma.inscripcionEvento.findFirst({ where: { eventoId, personaId }, orderBy: { createdAt: 'desc' }, select: INSCRIPCION_SELECT }));
    const [inscripcion] = fila ? await aMisInscripciones(this.prisma, [fila]) : [null];
    return {
      inscripcion,
      lugaresDisponibles: evento.cupo === null ? null : Math.max(0, evento.cupo - ocupados),
      estadoInscripcion: estadoInscripcionDeEvento(evento, ocupados),
      corresponde: persona !== null && correspondeAlEvento(persona, destinatariosDe(evento), evento.inicio),
      respuestas: [],
    };
  }

  /** POST /eventos/:id/inscripciones/me — FR-015, con el cupo serializado por el bloqueo del Evento (FR-016). */
  async anotarme(eventoId: string, personaId: string): Promise<MiInscripcionEvento> {
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
        if (evento.tipo === 'bautismo') {
          throw new AppException('EVENTO_SOLO_INSCRIBE_ADMIN', 403, 'El bautismo se pide desde Mi camino; al Evento te anota el equipo.');
        }
        if (evento.inicio <= new Date()) throw new AppException('EVENTO_YA_EMPEZO', 409, 'El Evento ya empezó.');
        const persona = await tx.persona.findUnique({ where: { id: personaId }, select: { estado: true, genero: true, fechaNacimiento: true } });
        if (persona?.estado !== 'activa') throw new AppException('PERSONA_NO_ACTIVA', 409, 'Tu cuenta todavía no está activa.');
        // FR-061 (ampliación 2026-10-09): solo quienes están entre los destinatarios, también para la lista de espera.
        if (!correspondeAlEvento(persona, destinatariosDe(evento), evento.inicio)) {
          throw new AppException('EVENTO_NO_CORRESPONDE', 403, 'Este Evento es para otro público.');
        }
        const yaAbierta = await tx.inscripcionEvento.count({ where: { eventoId, personaId, estado: { in: [...ESTADOS_INSCRIPCION_ABIERTA] } } });
        if (yaAbierta > 0) throw new AppException('INSCRIPCION_EVENTO_YA_ABIERTA', 409, 'Ya estás anotada a este Evento.');

        const estado = decidirEstadoInicial(evento, await contarOcupados(tx, eventoId));
        const creada = await tx.inscripcionEvento.create({
          data: { eventoId, personaId, estado, enListaDesde: estado === 'lista_espera' ? new Date() : null },
          select: INSCRIPCION_SELECT,
        });
        if (estado === 'pendiente') {
          await this.notificaciones.emitir(tx, {
            nombre: 'evento.inscripcion_pendiente',
            a: { tipo: 'admin' },
            datos: { eventoId, inscripcionId: creada.id },
          });
        }
        const [mia] = await aMisInscripciones(tx, [creada]);
        return mia;
      });
    } catch (e) {
      // Dos pedidos a la vez de la misma Persona: el índice único parcial manda (FR-021).
      if (esViolacionDeUnico(e)) {
        throw new AppException('INSCRIPCION_EVENTO_YA_ABIERTA', 409, 'Ya estás anotada a este Evento.');
      }
      throw e;
    }
  }
}

/** P2002: violación de un índice único (acá, `inscripciones_evento_una_abierta`). */
export function esViolacionDeUnico(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { code?: unknown }).code === 'P2002';
}
