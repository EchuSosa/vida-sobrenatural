import { Injectable, Logger } from '@nestjs/common';
import { DIAS_RECORDATORIO_TURNO, hoyEnArgentina, sumarDias } from '@vida-sobrenatural/shared-types';
import { PrismaService } from '../prisma/prisma.service.js';
import { NotificacionesService } from '../notificaciones/notificaciones.service.js';
import { diaComoFecha } from './dias-de-servicio.service.js';
import { datosAvisoTurno } from './avisos-turno.js';

/**
 * spec 017 (D256): `DIAS_RECORDATORIO_TURNO` días antes de una fecha publicada, un recordatorio a
 * cada persona con turno. Una transacción por fecha (si una falla, las demás siguen); la fecha
 * queda marcada (`recordatorioEnviadoEn`) y la clave del catálogo es por turno: correrla dos veces
 * no duplica.
 */
@Injectable()
export class RecordatoriosTurnosService {
  private readonly logger = new Logger('RecordatoriosTurnos');

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificaciones: NotificacionesService,
  ) {}

  async correr(hoy: string = hoyEnArgentina()): Promise<{ fechas: number; avisos: number; fallidas: number }> {
    const r = { fechas: 0, avisos: 0, fallidas: 0 };
    const dia = sumarDias(hoy, DIAS_RECORDATORIO_TURNO);
    const fechas = await this.prisma.fechaDeServicio.findMany({
      where: { dia: diaComoFecha(dia), estado: 'publicada', recordatorioEnviadoEn: null, ministerio: { activo: true, eliminadoEn: null } },
      select: { id: true, ministerio: { select: { id: true, nombre: true } } },
    });
    for (const f of fechas) {
      try {
        const avisos = await this.prisma.$transaction(async (tx) => {
          const marcada = await tx.fechaDeServicio.updateMany({ where: { id: f.id, recordatorioEnviadoEn: null, estado: 'publicada' }, data: { recordatorioEnviadoEn: new Date() } });
          if (marcada.count === 0) return 0;
          const turnos = await tx.turno.findMany({ where: { fechaId: f.id, estado: 'asignado' }, select: { id: true, personaId: true, celula: { select: { nombre: true } } } });
          for (const t of turnos) {
            await this.notificaciones.emitir(tx, { nombre: 'turno.recordatorio', a: { tipo: 'persona', personaId: t.personaId }, datos: datosAvisoTurno(t.id, f.ministerio, dia, t.celula?.nombre ?? null) });
          }
          return turnos.length;
        });
        r.fechas += 1;
        r.avisos += avisos;
      } catch {
        r.fallidas += 1;
        this.logger.warn({ tipo: 'RECORDATORIO_TURNO_FALLIDO', fechaId: f.id });
      }
    }
    return r;
  }
}
