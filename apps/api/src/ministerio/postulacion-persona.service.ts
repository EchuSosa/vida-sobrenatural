import { Injectable } from '@nestjs/common';
import {
  esAptaParaMinisterio,
  type EstadoMiMinisterio,
  type MinisterioDetalleParaPersona,
  type MinisterioParaPostularse,
  type NuevaPostulacion,
} from '@vida-sobrenatural/shared-types';
import { PrismaService } from '../prisma/prisma.service.js';
import { AppException } from '../common/errors/app-exception.js';
import { NotificacionesService } from '../notificaciones/notificaciones.service.js';
import { bloquearPersona } from '../camino/consultas.js';
import { crearPostulacion } from './crear-postulacion.js';
import {
  estadoMiMinisterio,
  type PostulacionParaEstado,
} from './estado-mi-ministerio.js';

/** Ministerio y Célula "disponibles" (data-model.md): activos y no eliminados. */
export const MINISTERIO_DISPONIBLE = {
  activo: true,
  eliminadoEn: null,
} as const;
export const CELULA_DISPONIBLE = { activo: true, eliminadoEn: null } as const;

const SELECT_PARA_POSTULARSE = {
  id: true,
  nombre: true,
  descripcion: true,
  lineaPublica: true,
  requiereFormacion: true,
  celulas: {
    where: CELULA_DISPONIBLE,
    orderBy: { nombre: 'asc' },
    select: { id: true, nombre: true, descripcion: true },
  },
} as const;

/** docs/22: primero los "para empezar a servir ya", después los que requieren formación; por nombre. */
export const ORDEN_MINISTERIOS = [
  { requiereFormacion: 'asc' },
  { nombre: 'asc' },
] as const;

/**
 * spec 009, Historias 1 y 3 — lo de la Persona (contracts/postulaciones-api.md):
 * ver los Ministerios dentro de la app, postularse, retirar y el estado de su
 * card en Mi camino. La Persona es siempre la de la sesión (D134).
 */
@Injectable()
export class PostulacionPersonaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificaciones: NotificacionesService,
  ) {}

  /** GET /ministerios/me/disponibles (FR-009): el contenido completo de docs/22. */
  async disponibles(): Promise<MinisterioParaPostularse[]> {
    return this.prisma.ministerio.findMany({
      where: MINISTERIO_DISPONIBLE,
      orderBy: [...ORDEN_MINISTERIOS],
      select: SELECT_PARA_POSTULARSE,
    });
  }

  /** GET /ministerios/me/:ministerioId (FR-010): el detalle según la situación de la Persona. */
  async detalle(
    personaId: string,
    ministerioId: string,
  ): Promise<MinisterioDetalleParaPersona> {
    const [ministerio, persona, propias] = await Promise.all([
      this.prisma.ministerio.findFirst({
        where: { id: ministerioId, ...MINISTERIO_DISPONIBLE },
        select: SELECT_PARA_POSTULARSE,
      }),
      this.prisma.persona.findUniqueOrThrow({
        where: { id: personaId },
        select: { rol: true },
      }),
      this.prisma.postulacion.findMany({
        where: { personaId, estado: { in: ['pendiente', 'aprobada'] } },
        select: {
          estado: true,
          ministerioId: true,
          ministerio: { select: { nombre: true } },
        },
      }),
    ]);
    if (!ministerio)
      throw new AppException(
        'NO_ENCONTRADO',
        404,
        'Ese Ministerio no está disponible.',
      );
    const aprobada = propias.find((p) => p.estado === 'aprobada');
    const pendiente = propias.find((p) => p.estado === 'pendiente');
    if (aprobada?.ministerioId === ministerioId)
      return { ...ministerio, situacion: 'ya_es_miembro' };
    if (pendiente)
      return {
        ...ministerio,
        situacion: 'tiene_pendiente',
        pendienteA: { nombre: pendiente.ministerio.nombre },
      };
    if (!esAptaParaMinisterio(persona.rol))
      return { ...ministerio, situacion: 'no_apta' };
    return { ...ministerio, situacion: 'puede_postularse' };
  }

  /** GET /ministerios/me (FR-011): el estado de la card. */
  async estado(personaId: string): Promise<EstadoMiMinisterio> {
    const [persona, postulaciones] = await Promise.all([
      this.prisma.persona.findUniqueOrThrow({
        where: { id: personaId },
        select: { rol: true },
      }),
      this.prisma.postulacion.findMany({
        where: { personaId },
        select: {
          id: true,
          estado: true,
          motivoInactivacion: true,
          requiereFormacion: true,
          createdAt: true,
          revisadaEn: true,
          retiradaEn: true,
          inactivadaEn: true,
          ministerio: {
            select: { id: true, nombre: true, activo: true, eliminadoEn: true },
          },
          celula: {
            select: { id: true, nombre: true, activo: true, eliminadoEn: true },
          },
        },
      }),
    ]);
    const paraEstado: PostulacionParaEstado[] = postulaciones.map((p) => ({
      ...p,
      // FR-012: un Ministerio o Célula eliminados se ven como no disponibles (inactivos).
      ministerio: {
        id: p.ministerio.id,
        nombre: p.ministerio.nombre,
        activo: p.ministerio.activo && p.ministerio.eliminadoEn === null,
      },
      celula: p.celula
        ? {
            id: p.celula.id,
            nombre: p.celula.nombre,
            activo: p.celula.activo && p.celula.eliminadoEn === null,
          }
        : null,
    }));
    return estadoMiMinisterio(persona.rol, paraEstado);
  }

  /** POST /ministerios/:ministerioId/postulaciones/me (FR-001 a FR-008). */
  async crear(
    personaId: string,
    ministerioId: string,
    dto: NuevaPostulacion,
  ): Promise<EstadoMiMinisterio> {
    await crearPostulacion(
      this.prisma,
      this.notificaciones,
      personaId,
      ministerioId,
      dto,
      null,
    );
    return this.estado(personaId);
  }

  /** POST /postulaciones/me/:id/retirar (FR-006): solo la propia y pendiente; una ajena es 404 (no se revela). */
  async retirar(personaId: string, id: string): Promise<EstadoMiMinisterio> {
    await this.prisma.$transaction(async (tx) => {
      await bloquearPersona(tx, personaId);
      const p = await tx.postulacion.findFirst({
        where: { id, personaId },
        select: { estado: true },
      });
      if (!p)
        throw new AppException(
          'NO_ENCONTRADO',
          404,
          'No existe esa postulación.',
        );
      if (p.estado !== 'pendiente')
        throw new AppException(
          'POSTULACION_NO_PENDIENTE',
          409,
          'Esta postulación ya no está en revisión.',
        );
      await tx.postulacion.update({
        where: { id },
        data: { estado: 'retirada', retiradaEn: new Date() },
      });
      await this.notificaciones.emitir(tx, {
        nombre: 'ministerio.postulacion_retirada',
        a: { tipo: 'admin' },
        datos: { postulacionId: id },
      });
    });
    return this.estado(personaId);
  }
}
