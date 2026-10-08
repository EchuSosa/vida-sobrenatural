import { Injectable, Logger } from '@nestjs/common';
import {
  DIAS_ANTES_EVENTO_PROXIMO,
  diaCivilEnArgentina,
  estadoInscripcionDeEvento,
  hoyEnArgentina,
  instanteEnArgentina,
  sumarDias,
} from '@vida-sobrenatural/shared-types';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { NotificacionesService } from '../notificaciones/notificaciones.service.js';
import { contarOcupados } from '../evento/motor-cupo.js';

/** Hasta cuántos días adelante se miran Eventos para el recordatorio de inscripción. */
const HORIZONTE_DIAS = 61; // el CHECK de la 011 limita la anticipación a 60 días

/**
 * spec 012, lote E (T056; FR-035–FR-038, D202) — los recordatorios de
 * Eventos, una vez por día a la mañana:
 * - `evento.proximo`: el día anterior al Evento, a cada Inscripción `confirmada`.
 * - `evento.recordatorio_inscripcion`: `diasAnticipacionRecordatorio` días antes
 *   de un Evento con inscripción que todavía acepta (con lugar o con lista de
 *   espera), a las Personas activas sin inscripción vigente.
 * Una transacción por Evento: si uno falla, los demás siguen (se loguea solo
 * el `eventoId`). Correrla dos veces el mismo día no duplica: la clave del
 * catálogo es por Evento (FR-037, SC-007). Los Eventos de bautismo quedan
 * afuera: los comunica la 010 (docs/13 §5).
 */
@Injectable()
export class RecordatoriosEventosService {
  private readonly logger = new Logger('RecordatoriosEventos');

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificaciones: NotificacionesService,
  ) {}

  async correr(hoy: string = hoyEnArgentina(), ahora: Date = new Date()): Promise<{ proximos: number; inscripcion: number; fallidos: number }> {
    const r = { proximos: 0, inscripcion: 0, fallidos: 0 };
    const vigente = { estado: 'publicado' as const, eliminadoEn: null, tipo: { not: 'bautismo' as const } };
    const desde = (dias: number) => instanteEnArgentina(sumarDias(hoy, dias), '00:00');

    // FR-035: los de mañana.
    const proximos = await this.prisma.evento.findMany({
      where: { ...vigente, inicio: { gte: desde(DIAS_ANTES_EVENTO_PROXIMO), lt: desde(DIAS_ANTES_EVENTO_PROXIMO + 1) } },
      select: { id: true, nombre: true },
    });
    for (const e of proximos) {
      const resultado = await this.unEvento(e.id, async (tx) => {
        await this.notificaciones.emitir(tx, { nombre: 'evento.proximo', a: { tipo: 'evento_confirmados', eventoId: e.id }, datos: { eventoId: e.id, evento: e.nombre } });
        return true;
      });
      if (resultado === null) r.fallidos += 1;
      else r.proximos += 1;
    }

    // FR-036: los que están a `diasAnticipacionRecordatorio` días y todavía aceptan inscripciones.
    const conRecordatorio = await this.prisma.evento.findMany({
      where: { ...vigente, requiereInscripcion: true, diasAnticipacionRecordatorio: { not: null }, inicio: { gte: desde(1), lt: desde(HORIZONTE_DIAS) } },
      select: { id: true, nombre: true, slug: true, inicio: true, tipo: true, estado: true, requiereInscripcion: true, cupo: true, permiteListaEspera: true, diasAnticipacionRecordatorio: true },
    });
    for (const e of conRecordatorio) {
      const dias = e.diasAnticipacionRecordatorio!;
      if (diaCivilEnArgentina(e.inicio) !== sumarDias(hoy, dias)) continue;
      const resultado = await this.unEvento(e.id, async (tx) => {
        const estado = estadoInscripcionDeEvento(e, await contarOcupados(tx, e.id), ahora);
        if (estado !== 'abierta' && estado !== 'lista_espera') return false;
        await this.notificaciones.emitir(tx, {
          nombre: 'evento.recordatorio_inscripcion',
          a: { tipo: 'todas_sin_inscripcion', eventoId: e.id },
          datos: { eventoId: e.id, evento: e.nombre, slug: e.slug, dias },
        });
        return true;
      });
      if (resultado === null) r.fallidos += 1;
      else if (resultado) r.inscripcion += 1;
    }
    return r;
  }

  /** Lo que devolvió `fn` (true = avisó, false = no correspondía); `null` si falló (se loguea solo el id). */
  private async unEvento(eventoId: string, fn: (tx: Prisma.TransactionClient) => Promise<boolean>): Promise<boolean | null> {
    try {
      return await this.prisma.$transaction(fn);
    } catch {
      this.logger.warn({ eventoId, tipo: 'RECORDATORIO_FALLIDO' });
      return null;
    }
  }
}
