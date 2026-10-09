import { Injectable } from '@nestjs/common';
import { DIAS_BORRADO_RESPUESTAS_SENSIBLES } from '@vida-sobrenatural/shared-types';
import { PrismaService } from '../prisma/prisma.service.js';

const DIA_MS = 86_400_000;

/**
 * spec 011, ampliación 2026-10-09 (FR-069, D222) — borra las respuestas a
 * preguntas marcadas como "dato sensible" de los Eventos que terminaron hace
 * más de 30 días (el fin, o el inicio si no tiene fin; también los
 * cancelados). Marca el Evento con `respuestasSensiblesBorradasEn` para no
 * volver a mirarlo. Idempotente. Nunca loguea respuestas: solo cantidades.
 */
@Injectable()
export class BorradoRespuestasSensiblesService {
  constructor(private readonly prisma: PrismaService) {}

  async correr(ahora: Date = new Date()): Promise<{ eventos: number; respuestas: number }> {
    const limite = new Date(ahora.getTime() - DIAS_BORRADO_RESPUESTAS_SENSIBLES * DIA_MS);
    const vencidos = await this.prisma.evento.findMany({
      where: {
        respuestasSensiblesBorradasEn: null,
        OR: [{ fin: { lt: limite } }, { fin: null, inicio: { lt: limite } }],
        preguntas: { some: { sensible: true } },
      },
      select: { id: true },
    });
    let respuestas = 0;
    for (const { id } of vencidos) {
      const borradas = await this.prisma.$transaction(async (tx) => {
        const r = await tx.respuestaPreguntaEvento.deleteMany({ where: { pregunta: { eventoId: id, sensible: true } } });
        await tx.evento.update({ where: { id }, data: { respuestasSensiblesBorradasEn: ahora } });
        return r.count;
      });
      respuestas += borradas;
    }
    return { eventos: vencidos.length, respuestas };
  }
}
