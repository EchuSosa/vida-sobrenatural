import { Injectable } from '@nestjs/common';
import { estadoCardBautismo, motivoNoPuedePedir, type EstadoCardBautismo, type MotivoNoPuedePedirBautismo } from '@vida-sobrenatural/shared-types';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AppException } from '../common/errors/app-exception.js';
import { bloquearPersona } from '../camino/consultas.js';
import { bloquearSolicitudes, hechosDe } from './estado-bautismo.js';
import { SOLICITUD_TX_SELECT, esViolacionDeUnicidad, normalizarComentarioBautismo, sacarDeEvento, yaAbierta, yaCambio } from './operaciones.js';

const MENSAJE: Record<MotivoNoPuedePedirBautismo, string> = {
  PERSONA_YA_BAUTIZADA: 'Ya figurás como bautizada.',
  SOLICITUD_BAUTISMO_YA_ABIERTA: 'Ya tenés un pedido de bautismo abierto.',
  EDAD_INSUFICIENTE_PARA_PEDIR_BAUTISMO_SOLO: 'Una Persona menor de 12 años no lo pide sola: lo hace su mamá, papá o tutor con el equipo.',
  BAUTISMO_NO_HABILITADO: 'El bautismo se pide una vez que empezaste Vida Nueva.',
};

/**
 * spec 010, lote A (Historias 1 y 4; contracts/bautismo-api.md, "La
 * Persona") — la card de Bautismo de Mi camino: ver el estado, pedir,
 * retirar y "No puedo ese día". La Persona es SIEMPRE la de la sesión (D134).
 * Ninguna de estas acciones le avisa a la propia Persona (FR-025).
 */
@Injectable()
export class BautismoPersonaService {
  constructor(private readonly prisma: PrismaService) {}

  /** GET /bautismo/me (FR-019): nunca incluye el motivo de rechazo (D185). */
  async estado(personaId: string): Promise<EstadoCardBautismo> {
    const hechos = await hechosDe(this.prisma, personaId);
    if (!hechos) throw new AppException('NO_ENCONTRADO', 404, 'Esta sesión todavía no tiene una Persona asociada.');
    return estadoCardBautismo(hechos);
  }

  /**
   * POST /bautismo/solicitudes/me (FR-001 a FR-005, T018). Con la fila de la
   * Persona bloqueada; la regla es `motivoNoPuedePedir`, la misma con la que
   * la card decide qué mostrar. Dos pedidos a la vez chocan además con el
   * índice parcial (FR-004).
   */
  async pedir(personaId: string, comentarioCrudo: string | undefined): Promise<EstadoCardBautismo> {
    const comentario = normalizarComentarioBautismo(comentarioCrudo);
    try {
      await this.prisma.$transaction(async (tx) => {
        if (!(await bloquearPersona(tx, personaId))) throw new AppException('NO_ENCONTRADO', 404, 'Esta sesión todavía no tiene una Persona asociada.');
        const hechos = await hechosDe(tx, personaId);
        const motivo = hechos && motivoNoPuedePedir(hechos);
        if (motivo) throw new AppException(motivo, 409, MENSAJE[motivo]);
        await tx.solicitudBautismo.create({ data: { personaId, comentario }, select: { id: true } });
      });
    } catch (error) {
      if (esViolacionDeUnicidad(error)) throw yaAbierta();
      throw error;
    }
    return this.estado(personaId);
  }

  /**
   * POST /bautismo/solicitudes/me/retirar (FR-020, T041): pendiente, o
   * aceptada sin Evento o con un Evento que todavía no empezó. Con un Evento
   * ya pasado, no: el bautismo pudo haber ocurrido y lo resuelve el Admin al
   * confirmar (FR-027). Si tenía fecha, sale del Evento en la misma operación.
   */
  async retirar(personaId: string): Promise<EstadoCardBautismo> {
    await this.prisma.$transaction(async (tx) => {
      const solicitud = await this.abiertaBloqueada(tx, personaId);
      const evento = solicitud.inscripcionEvento;
      if (evento && evento.estado !== 'cancelada' && evento.evento.inicio <= new Date()) throw yaCambio();
      await sacarDeEvento(tx, solicitud, personaId, 'persona');
      await tx.solicitudBautismo.update({ where: { id: solicitud.id }, data: { estado: 'retirada', retiradaEn: new Date() } });
    });
    return this.estado(personaId);
  }

  /**
   * POST /bautismo/solicitudes/me/no-puedo (FR-020a): solo con un Evento
   * asignado que todavía no empezó. Sale del Evento y sigue aceptada:
   * vuelve a "esperando fecha".
   */
  async noPuedo(personaId: string): Promise<EstadoCardBautismo> {
    await this.prisma.$transaction(async (tx) => {
      const solicitud = await this.abiertaBloqueada(tx, personaId);
      const evento = solicitud.inscripcionEvento;
      if (solicitud.estado !== 'aprobada' || !evento || evento.estado === 'cancelada' || evento.evento.inicio <= new Date()) throw yaCambio();
      await sacarDeEvento(tx, solicitud, personaId, 'persona');
    });
    return this.estado(personaId);
  }

  private async abiertaBloqueada(tx: Prisma.TransactionClient, personaId: string) {
    const abierta = await tx.solicitudBautismo.findFirst({ where: { personaId, estado: { in: ['pendiente', 'aprobada'] } }, select: { id: true } });
    if (!abierta) throw yaCambio();
    await bloquearSolicitudes(tx, [abierta.id]);
    const solicitud = await tx.solicitudBautismo.findUniqueOrThrow({ where: { id: abierta.id }, select: SOLICITUD_TX_SELECT });
    if (solicitud.estado !== 'pendiente' && solicitud.estado !== 'aprobada') throw yaCambio();
    return solicitud;
  }
}
