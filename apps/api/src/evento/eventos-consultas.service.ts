import { Injectable } from '@nestjs/common';
import { diaCivilEnArgentina, estadoInscripcionDeEvento, instanteEnArgentina } from '@vida-sobrenatural/shared-types';
import { PrismaService } from '../prisma/prisma.service.js';
import { contarOcupados } from './motor-cupo.js';

/**
 * spec 011, T080 (contracts/eventos-dominio.md) — las consultas que la 012
 * usa para los recordatorios programados (FR-050, D49, D73). Esta spec no
 * manda avisos: deja los datos y quiénes los reciben.
 */
@Injectable()
export class EventosConsultasService {
  constructor(private readonly prisma: PrismaService) {}

  /** `evento_proximo`: las Personas con Inscripción `confirmada` de un Evento publicado y no eliminado. */
  async destinatariosEventoProximo(eventoId: string): Promise<string[]> {
    const filas = await this.prisma.inscripcionEvento.findMany({
      where: { eventoId, estado: 'confirmada', evento: { estado: 'publicado', eliminadoEn: null } },
      select: { personaId: true },
    });
    return filas.map((f) => f.personaId);
  }

  /**
   * `recordatorio_inscripcion`: los Eventos generales con inscripción cuyo
   * `inicio - diasAnticipacionRecordatorio` cae `hoy` en Argentina, publicados,
   * no eliminados y con inscripción todavía abierta (no `cupo_completo`).
   */
  async eventosParaRecordatorioInscripcion(hoy: Date = new Date()): Promise<Array<{ eventoId: string; slug: string; nombre: string; dias: number }>> {
    const diaHoy = diaCivilEnArgentina(hoy);
    const candidatos = await this.prisma.evento.findMany({
      where: {
        tipo: 'general',
        estado: 'publicado',
        eliminadoEn: null,
        requiereInscripcion: true,
        diasAnticipacionRecordatorio: { not: null },
        inicio: { gt: instanteEnArgentina(diaHoy, '00:00') },
      },
      select: { id: true, slug: true, nombre: true, tipo: true, estado: true, requiereInscripcion: true, inicio: true, cupo: true, permiteListaEspera: true, diasAnticipacionRecordatorio: true },
    });
    const resultado: Array<{ eventoId: string; slug: string; nombre: string; dias: number }> = [];
    for (const e of candidatos) {
      const dias = e.diasAnticipacionRecordatorio!;
      const [a, m, d] = diaCivilEnArgentina(e.inicio).split('-').map(Number);
      const diaDelRecordatorio = new Date(Date.UTC(a, m - 1, d - dias)).toISOString().slice(0, 10);
      if (diaDelRecordatorio !== diaHoy) continue;
      if (estadoInscripcionDeEvento(e, await contarOcupados(this.prisma, e.id), hoy) === 'cupo_completo') continue;
      resultado.push({ eventoId: e.id, slug: e.slug, nombre: e.nombre, dias });
    }
    return resultado;
  }
}
