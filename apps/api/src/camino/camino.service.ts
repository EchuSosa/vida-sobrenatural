import { Injectable } from '@nestjs/common';
import {
  COMENTARIO_DECLARACION_MAX,
  EDAD_MINIMA_PEDIR_VIDA_NUEVA_SOLO,
  ETAPAS_CAMINO,
  estadoDeEtapa,
  type CaminoDeLaPersona,
  type DeclaracionCreada,
  type EtapaCamino,
  type HechosCamino,
} from '@vida-sobrenatural/shared-types';
import { PrismaService } from '../prisma/prisma.service.js';
import { AppException } from '../common/errors/app-exception.js';
import { calcularEdad } from '../persona/calcular-edad.js';
import { errorDeValidacion } from '../discipulado/validaciones.js';
import { NotificacionesService } from '../notificaciones/notificaciones.service.js';
import { SolicitudDiscipuladoService } from '../solicitud-discipulado/solicitud-discipulado.service.js';
import { bloquearPersona, completoEtapa, etapasCompletas, ultimasDeclaraciones, vidaNuevaEnMarcha } from './consultas.js';
import { estadosPropios } from './estados-propios.js';

/**
 * spec 006, Historias 1 y 2 — lado de la Persona (contracts/camino-api.md):
 * el estado de las cuatro etapas y "Ya lo hice" (declarar y retirar). Todo
 * se recorta por identidad (D134): `personaId` sale siempre de la sesión.
 */
@Injectable()
export class CaminoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly solicitudes: SolicitudDiscipuladoService,
    private readonly notificaciones: NotificacionesService,
  ) {}

  /**
   * GET /camino/me (FR-007, T028): junta `HechosCamino` — una consulta por
   * fuente, en paralelo — y aplica `estadoDeEtapa` de shared-types (la misma
   * regla que explica la pantalla). `vidaNueva` es EXACTAMENTE lo de
   * `GET /discipulado/me` (FR-005): se reusa `estadoPropio`, no se recalcula.
   * Nunca devuelve notas de Encuentros ni datos de otra Persona.
   */
  async estadoDeEtapas(personaId: string): Promise<CaminoDeLaPersona> {
    const persona = await this.prisma.persona.findUnique({
      where: { id: personaId },
      select: { fechaNacimiento: true, sede: { select: { nombre: true, contactoTelefono: true, whatsappSecretaria: true } } },
    });
    if (!persona) throw new AppException('NO_ENCONTRADO', 404, 'Esta sesión todavía no tiene una Persona asociada.');

    const [vidaNueva, completas, ultimaDeclaracion, propios] = await Promise.all([
      this.solicitudes.estadoPropio(personaId),
      etapasCompletas(this.prisma, personaId),
      ultimasDeclaraciones(this.prisma, personaId),
      estadosPropios(this.prisma, personaId),
    ]);
    const hechos: HechosCamino = { edad: calcularEdad(persona.fechaNacimiento), vidaNueva, completas, ultimaDeclaracion, propios };

    return {
      etapas: ETAPAS_CAMINO.map((etapa) => estadoDeEtapa(etapa, hechos)),
      vidaNueva,
      sede: persona.sede
        ? {
            nombre: persona.sede.nombre,
            telefono: persona.sede.contactoTelefono?.trim() || null,
            whatsapp: persona.sede.whatsappSecretaria,
          }
        : null,
    };
  }

  /**
   * POST /camino/me/declaraciones (FR-008 a FR-010, T040). Con la fila de la
   * Persona bloqueada (research #5) para que pedir Vida Nueva y declararla no
   * se pisen. Las reglas son las de `puedeDeclarar` (shared-types), en el
   * orden del contrato para dar el código de cada una.
   */
  async declarar(personaId: string, etapa: EtapaCamino, comentarioCrudo: string | undefined): Promise<DeclaracionCreada> {
    const comentario = normalizarComentario(comentarioCrudo);
    try {
      return await this.prisma.$transaction(async (tx) => {
        if (!(await bloquearPersona(tx, personaId))) {
          throw new AppException('NO_ENCONTRADO', 404, 'Esta sesión todavía no tiene una Persona asociada.');
        }
        const persona = await tx.persona.findUniqueOrThrow({ where: { id: personaId }, select: { fechaNacimiento: true } });
        if (calcularEdad(persona.fechaNacimiento) < EDAD_MINIMA_PEDIR_VIDA_NUEVA_SOLO) {
          throw new AppException(
            'EDAD_INSUFICIENTE_PARA_PEDIR_SOLO',
            409,
            'Una Persona menor de 12 años no lo cuenta sola: lo registra el equipo de la iglesia con su mamá, papá o tutor.',
          );
        }
        if (await completoEtapa(tx, personaId, etapa)) {
          throw new AppException('ETAPA_YA_COMPLETADA', 409, 'Esta etapa ya figura como hecha.');
        }
        const pendiente = await tx.declaracionHistorial.findFirst({ where: { personaId, etapa, estado: 'pendiente' }, select: { id: true } });
        if (pendiente) throw yaPendiente();
        if (etapa === 'vida_nueva' && (await vidaNuevaEnMarcha(tx, personaId))) {
          throw new AppException('ETAPA_EN_CURSO', 409, 'Vida Nueva está en marcha (hay un pedido abierto o un Grupo en curso).');
        }
        // Final: la misma regla que la card (`puedeDeclarar`) — con la etapa en curso o el bautismo aceptado, no.
        const propio = (await estadosPropios(tx, personaId))[etapa]?.estado;
        if (propio === 'en_curso' || propio === 'aceptada') {
          throw new AppException('ETAPA_EN_CURSO', 409, 'Esta etapa está en marcha.');
        }

        const creada = await tx.declaracionHistorial.create({
          data: { personaId, etapa, comentario },
          select: { id: true, etapa: true, createdAt: true },
        });
        // D197: dentro de la transacción; va al Admin, que lo ve en la bandeja (D201).
        await this.notificaciones.emitir(tx, {
          nombre: 'historial.declaracion_creada',
          a: { tipo: 'admin' },
          datos: { declaracionId: creada.id, etapa },
        });
        return { id: creada.id, etapa: creada.etapa, estado: 'pendiente' as const, createdAt: creada.createdAt.toISOString() };
      });
    } catch (error) {
      // FR-010: dos "Ya lo hice" simultáneos chocan con el índice parcial
      // `declaraciones_historial_una_pendiente`; el chequeo de arriba solo da
      // el mensaje en el caso común.
      if (esViolacionDeUnicidad(error)) throw yaPendiente();
      throw error;
    }
  }

  /**
   * DELETE /camino/me/declaraciones/:id (FR-011): la Persona retira la suya
   * mientras esté pendiente. Ajena o inexistente → 404 (no se revela que
   * existe); ya resuelta o retirada → 409 DECLARACION_NO_PENDIENTE.
   */
  async retirar(personaId: string, declaracionId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await bloquearPersona(tx, personaId);
      const declaracion = await tx.declaracionHistorial.findFirst({
        where: { id: declaracionId, personaId },
        select: { id: true, estado: true },
      });
      if (!declaracion) throw new AppException('NO_ENCONTRADO', 404, 'No encontramos esa declaración.');
      if (declaracion.estado !== 'pendiente') {
        throw new AppException('DECLARACION_NO_PENDIENTE', 409, 'Esa declaración ya no está pendiente.');
      }
      await tx.declaracionHistorial.update({ where: { id: declaracion.id }, data: { estado: 'retirada', retiradaEn: new Date() } });
    });
  }
}

/** FR-009: opcional, hasta 500. Vacío = sin comentario. */
export function normalizarComentario(comentario: string | undefined | null): string | null {
  const limpio = comentario?.trim() ?? '';
  if (limpio.length > COMENTARIO_DECLARACION_MAX) {
    throw errorDeValidacion([{ campo: 'comentario', code: 'COMENTARIO_DEMASIADO_LARGO' }]);
  }
  return limpio === '' ? null : limpio;
}

function yaPendiente() {
  return new AppException('DECLARACION_YA_PENDIENTE', 409, 'Ya hay una declaración de esta etapa esperando que la revise el equipo.');
}

function esViolacionDeUnicidad(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { code?: unknown }).code === 'P2002';
}
