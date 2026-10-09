import { Injectable } from '@nestjs/common';
import type { BautismoDePersona } from '@vida-sobrenatural/shared-types';
import { PrismaService } from '../prisma/prisma.service.js';
import { AppException } from '../common/errors/app-exception.js';
import { bloquearPersona } from '../camino/consultas.js';
import { nombresDe } from '../discipulado/consultas.js';
import { calcularEdad } from '../persona/calcular-edad.js';
import { aEventoResumen, estaBautizada, solicitudAbiertaDe, vidaNuevaDe } from './estado-bautismo.js';
import { esViolacionDeUnicidad, normalizarPedidoBautismo, yaAbierta, yaBautizada } from './operaciones.js';

/**
 * spec 010, lote C (Historia 5; D97, D147): las excepciones del Admin —
 * habilitar el bautismo a alguien sin Vida Nueva y pedirlo en nombre de
 * cualquier Persona activa. Ninguna avisa (FR-025). Viven en `bautismo/`,
 * no en `persona/` (IMPLEMENTACION §3).
 */
@Injectable()
export class BautismoExcepcionesService {
  constructor(private readonly prisma: PrismaService) {}

  /** GET /bautismo/personas/:id — el bloque Bautismo del Perfil de Persona. */
  async dePersona(personaId: string): Promise<BautismoDePersona> {
    const persona = await this.prisma.persona.findUnique({
      where: { id: personaId },
      select: { estado: true, fechaNacimiento: true, bautismoHabilitadoEn: true, bautismoHabilitadoPorId: true },
    });
    if (!persona) throw new AppException('NO_ENCONTRADO', 404, 'No existe una Persona con ese id.');
    const [vidaNueva, bautizada, abierta, nombres] = await Promise.all([
      vidaNuevaDe(this.prisma, personaId),
      estaBautizada(this.prisma, personaId),
      solicitudAbiertaDe(this.prisma, personaId),
      nombresDe(this.prisma, persona.bautismoHabilitadoPorId ? [persona.bautismoHabilitadoPorId] : []),
    ]);
    const insc = abierta?.inscripcionEvento;
    return {
      activa: persona.estado === 'activa',
      edad: calcularEdad(persona.fechaNacimiento),
      vidaNueva,
      habilitacion: persona.bautismoHabilitadoEn
        ? { en: persona.bautismoHabilitadoEn.toISOString(), por: persona.bautismoHabilitadoPorId ? (nombres.get(persona.bautismoHabilitadoPorId) ?? null) : null }
        : null,
      bautizada: bautizada.si ? { en: bautizada.en } : null,
      solicitudAbierta: abierta
        ? {
            id: abierta.id,
            estado: abierta.estado as 'pendiente' | 'aprobada',
            evento: insc && insc.estado !== 'cancelada' ? aEventoResumen(insc.evento) : null,
          }
        : null,
    };
  }

  /**
   * PUT /personas/:id/habilitacion-bautismo (FR-021): idempotente — si ya
   * estaba habilitada, conserva quién y cuándo. Solo Personas activas.
   */
  async habilitar(personaId: string, actorId: string): Promise<BautismoDePersona> {
    await this.exigirActiva(personaId);
    await this.prisma.persona.updateMany({
      where: { id: personaId, bautismoHabilitadoEn: null },
      data: { bautismoHabilitadoEn: new Date(), bautismoHabilitadoPorId: actorId },
    });
    return this.dePersona(personaId);
  }

  /** DELETE /personas/:id/habilitacion-bautismo (FR-021): no toca una Solicitud ya abierta. */
  async deshabilitar(personaId: string): Promise<BautismoDePersona> {
    await this.exigirActiva(personaId);
    await this.prisma.persona.update({ where: { id: personaId }, data: { bautismoHabilitadoEn: null, bautismoHabilitadoPorId: null } });
    return this.dePersona(personaId);
  }

  /**
   * POST /bautismo/solicitudes (FR-022): en nombre de cualquier Persona
   * activa, de cualquier edad y sin la regla de Vida Nueva; sí una sola
   * abierta (FR-004) y no si ya está bautizada (FR-005). Queda quién la creó.
   */
  async crearEnNombre(personaId: string, comentarioCrudo: string | undefined, actorId: string, talleCrudo?: unknown): Promise<{ id: string }> {
    const { comentario, talleRemera } = normalizarPedidoBautismo(comentarioCrudo, talleCrudo);
    try {
      return await this.prisma.$transaction(async (tx) => {
        if (!(await bloquearPersona(tx, personaId))) throw noEncontrada();
        const persona = await tx.persona.findUniqueOrThrow({ where: { id: personaId }, select: { estado: true } });
        if (persona.estado !== 'activa') throw noEncontrada();
        if ((await estaBautizada(tx, personaId)).si) throw yaBautizada();
        if (await solicitudAbiertaDe(tx, personaId)) throw yaAbierta();
        return tx.solicitudBautismo.create({ data: { personaId, comentario, talleRemera, creadoPorId: actorId }, select: { id: true } });
      });
    } catch (error) {
      if (esViolacionDeUnicidad(error)) throw yaAbierta();
      throw error;
    }
  }

  private async exigirActiva(personaId: string): Promise<void> {
    const persona = await this.prisma.persona.findUnique({ where: { id: personaId }, select: { estado: true } });
    if (!persona || persona.estado !== 'activa') throw noEncontrada();
  }
}

function noEncontrada() {
  return new AppException('NO_ENCONTRADO', 404, 'No existe una Persona activa con ese id.');
}
