import { Injectable } from '@nestjs/common';
import { DIAS_PROPUESTA_SIN_RESPUESTA, type PendientesAdmin } from '@vida-sobrenatural/shared-types';
import { PrismaService } from '../prisma/prisma.service.js';

const MS_POR_DIA = 24 * 60 * 60 * 1000;

/**
 * A dónde lleva cada fila de la tarjeta. Las de Solicitudes apuntan a la
 * bandeja del lote A con su filtro de estado.
 * La bandeja acepta `?estado=pendiente` y `?estado=propuesta` (FILTROS_ESTADO en
 * apps/backoffice/src/app/solicitudes/constantes.ts).
 */
export const ENLACES_PENDIENTES = {
  propuestasDeclinadas: '/solicitudes?estado=pendiente',
  propuestasSinRespuesta: '/solicitudes?estado=propuesta',
  finalizacionesPropuestas: '/grupos?pendiente=finalizacion',
  bajasPropuestas: '/grupos?pendiente=baja',
} as const;

/**
 * specs/004, T054f (FR-048): lo que el Admin tiene que mirar, contado. No
 * dispara nada (la propuesta "sin respuesta" no vence: solo se señala).
 */
@Injectable()
export class PendientesAdminService {
  constructor(private readonly prisma: PrismaService) {}

  async pendientes(ahora: Date = new Date()): Promise<PendientesAdmin> {
    const limiteSinRespuesta = new Date(ahora.getTime() - DIAS_PROPUESTA_SIN_RESPUESTA * MS_POR_DIA);
    const [pendientes, sinRespuesta, finalizaciones, bajas] = await Promise.all([
      this.prisma.solicitudDiscipulado.findMany({ where: { estado: 'pendiente' }, select: { id: true } }),
      this.prisma.propuestaDiscipulado.count({ where: { estado: 'pendiente', propuestaEn: { lt: limiteSinRespuesta } } }),
      this.prisma.grupo.count({ where: { estado: 'en_curso', propuestaFinalizacionEn: { not: null } } }),
      this.prisma.inscripcion.count({ where: { estado: 'activa', bajaPropuestaEn: { not: null }, grupo: { estado: 'en_curso' } } }),
    ]);
    const declinadas = await this.solicitudesConUltimaDeclinada(pendientes.map((s) => s.id));
    return {
      propuestasDeclinadas: { cantidad: declinadas, enlace: ENLACES_PENDIENTES.propuestasDeclinadas },
      propuestasSinRespuesta: { cantidad: sinRespuesta, enlace: ENLACES_PENDIENTES.propuestasSinRespuesta },
      finalizacionesPropuestas: { cantidad: finalizaciones, enlace: ENLACES_PENDIENTES.finalizacionesPropuestas },
      bajasPropuestas: { cantidad: bajas, enlace: ENLACES_PENDIENTES.bajasPropuestas },
    };
  }

  /** Solicitudes `pendiente` cuya ÚLTIMA propuesta fue declinada (volvieron a la bandeja por eso). */
  private async solicitudesConUltimaDeclinada(solicitudIds: string[]): Promise<number> {
    if (solicitudIds.length === 0) return 0;
    const ultimas = await this.prisma.propuestaDiscipulado.findMany({
      where: { solicitudId: { in: solicitudIds } },
      select: { solicitudId: true, estado: true },
      orderBy: [{ solicitudId: 'asc' }, { propuestaEn: 'desc' }],
      distinct: ['solicitudId'],
    });
    return ultimas.filter((p) => p.estado === 'declinada').length;
  }
}
