import { Injectable } from '@nestjs/common';
import { ESTADOS_INSCRIPCION_ABIERTA, type CuandoMisInscripciones, type MiInscripcionEvento, type Pagina } from '@vida-sobrenatural/shared-types';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AppException } from '../common/errors/app-exception.js';
import { NotificacionesService } from '../notificaciones/notificaciones.service.js';
import { conBloqueoDeEvento, liberaLugar, promoverDesdeLista } from './motor-cupo.js';
import { aMisInscripciones, INSCRIPCION_SELECT } from './mis-inscripciones.js';
import { inicioDeHoyEnArgentina } from './representacion.js';

/**
 * spec 011, lote C (US4) — Mis eventos: las Inscripciones propias y
 * cancelarlas (FR-018, FR-022 a FR-024, FR-051). Una ajena responde 404.
 */
@Injectable()
export class MisEventosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificaciones: NotificacionesService,
  ) {}

  /** GET /mis-inscripciones-evento — próximas (las más cercanas primero) o pasadas (las más recientes primero). */
  async listar(personaId: string, cuando: CuandoMisInscripciones, skip: number, take: number): Promise<Pagina<MiInscripcionEvento>> {
    const hoy = inicioDeHoyEnArgentina();
    const where: Prisma.InscripcionEventoWhereInput = {
      personaId,
      evento: { eliminadoEn: null, inicio: cuando === 'proximas' ? { gte: hoy } : { lt: hoy } },
    };
    const [filas, total] = await Promise.all([
      this.prisma.inscripcionEvento.findMany({
        where,
        orderBy: [{ evento: { inicio: cuando === 'proximas' ? 'asc' : 'desc' } }, { createdAt: 'desc' }],
        skip,
        take,
        select: INSCRIPCION_SELECT,
      }),
      this.prisma.inscripcionEvento.count({ where }),
    ]);
    return { items: await aMisInscripciones(this.prisma, filas), total };
  }

  /** POST /inscripciones-evento/:id/cancelar — la propia, antes del inicio; si liberó lugar, promueve (FR-018, FR-022). */
  async cancelar(inscripcionId: string, personaId: string): Promise<MiInscripcionEvento> {
    const propia = await this.prisma.inscripcionEvento.findFirst({ where: { id: inscripcionId, personaId }, select: { eventoId: true } });
    if (!propia) throw new AppException('NO_ENCONTRADO', 404, 'Inscripción no encontrada.');
    return conBloqueoDeEvento(this.prisma, propia.eventoId, async (tx) => {
      const actual = await tx.inscripcionEvento.findUniqueOrThrow({
        where: { id: inscripcionId },
        select: { estado: true, evento: { select: { inicio: true } } },
      });
      if (!ESTADOS_INSCRIPCION_ABIERTA.includes(actual.estado)) {
        throw new AppException('INSCRIPCION_NO_ABIERTA', 409, 'La inscripción ya no está abierta.');
      }
      if (actual.evento.inicio <= new Date()) throw new AppException('EVENTO_YA_EMPEZO', 409, 'El Evento ya empezó.');
      await tx.inscripcionEvento.update({
        where: { id: inscripcionId },
        data: { estado: 'cancelada', canceladaEn: new Date(), canceladaPorId: personaId, motivoCancelacion: 'persona', enListaDesde: null },
      });
      if (liberaLugar(actual.estado)) await promoverDesdeLista(tx, propia.eventoId, (t, e) => this.notificaciones.emitir(t, e));
      const fila = await tx.inscripcionEvento.findUniqueOrThrow({ where: { id: inscripcionId }, select: INSCRIPCION_SELECT });
      const [mia] = await aMisInscripciones(tx, [fila]);
      return mia;
    });
  }
}
