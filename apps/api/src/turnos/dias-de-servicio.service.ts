import { Injectable } from '@nestjs/common';
import {
  CUPO_TURNO_MAXIMO,
  FECHAS_VISIBLES_TURNOS,
  cupoTurnoValido,
  erroresDeReglaDiaDeServicio,
  fechasDeServicio,
  hoyEnArgentina,
  type DiaDeServicioVista,
  type DiasDeServicioDelMinisterio,
  type EstadoFechaDeServicio,
  type ReglaDiaDeServicio,
} from '@vida-sobrenatural/shared-types';
import { PrismaService } from '../prisma/prisma.service.js';
import { AppException } from '../common/errors/app-exception.js';
import { esViolacionDeUnico } from '../ministerio/crear-postulacion.js';
import type { Prisma } from '../generated/prisma/client.js';
import { NotificacionesService } from '../notificaciones/notificaciones.service.js';
import { datosAvisoTurno } from './avisos-turno.js';

type Db = PrismaService | Prisma.TransactionClient;

/** `AAAA-MM-DD` ↔ la columna `date` (medianoche UTC: la fecha civil, sin zona). */
export function diaComoFecha(dia: string): Date {
  return new Date(`${dia}T00:00:00.000Z`);
}
export function fechaComoDia(fecha: Date): string {
  return fecha.toISOString().slice(0, 10);
}

const DIA = /^\d{4}-\d{2}-\d{2}$/;

/**
 * spec 017, US1 (D250, D251): los días de servicio de cada Ministerio, el cupo de cada Célula (o
 * del Ministerio sin Células) y "este día no hay". Solo el Admin escribe (`turnos.gestionar`).
 */
@Injectable()
export class DiasDeServicioService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificaciones: NotificacionesService,
  ) {}

  async reglasActivas(ministerioId: string, db: Db = this.prisma): Promise<DiaDeServicioVista[]> {
    const filas = await db.diaDeServicio.findMany({
      where: { ministerioId, activo: true },
      select: { id: true, frecuencia: true, diaSemana: true, posicionEnMes: true },
      orderBy: [{ frecuencia: 'asc' }, { diaSemana: 'asc' }, { posicionEnMes: 'asc' }],
    });
    return filas.map((f) => ({ id: f.id, frecuencia: f.frecuencia, diaSemana: f.diaSemana, posicionEnMes: f.posicionEnMes }));
  }

  async vista(ministerioId: string, hoy: string = hoyEnArgentina()): Promise<DiasDeServicioDelMinisterio> {
    const ministerio = await this.ministerioOFallar(ministerioId);
    const reglas = await this.reglasActivas(ministerioId);
    const celulas = await this.prisma.celula.findMany({
      where: { ministerioId, activo: true, eliminadoEn: null },
      select: { id: true, nombre: true, cupoTurno: true },
      orderBy: { nombre: 'asc' },
    });
    const dias = fechasDeServicio(reglas, FECHAS_VISIBLES_TURNOS, hoy);
    const guardadas = await this.prisma.fechaDeServicio.findMany({
      where: { ministerioId, dia: { in: dias.map(diaComoFecha) } },
      select: { dia: true, estado: true, _count: { select: { turnos: { where: { estado: 'asignado' } } } } },
    });
    const porDia = new Map(guardadas.map((g) => [fechaComoDia(g.dia), g]));
    return {
      reglas,
      cupoMinisterio: ministerio.cupoTurno,
      celulas,
      proximas: dias.map((dia) => {
        const g = porDia.get(dia);
        return { dia, estado: (g?.estado ?? 'borrador') as EstadoFechaDeServicio, turnosAsignados: g?._count.turnos ?? 0 };
      }),
    };
  }

  async agregarRegla(ministerioId: string, cuerpo: Partial<Record<keyof ReglaDiaDeServicio, unknown>>, adminId: string): Promise<DiaDeServicioVista> {
    await this.ministerioOFallar(ministerioId);
    const errores = erroresDeReglaDiaDeServicio(cuerpo);
    if (errores.length > 0) {
      const campo = { FRECUENCIA_INVALIDA: 'frecuencia', DIA_SEMANA_INVALIDO: 'diaSemana', POSICION_EN_MES_INVALIDA: 'posicionEnMes' } as const;
      throw new AppException('VALIDACION', 400, 'La regla no es válida.', errores.map((code) => ({ campo: campo[code], code })));
    }
    const regla = cuerpo as ReglaDiaDeServicio;
    try {
      const creada = await this.prisma.diaDeServicio.create({
        data: {
          ministerioId,
          frecuencia: regla.frecuencia,
          diaSemana: regla.diaSemana,
          posicionEnMes: regla.frecuencia === 'mensual' ? (regla.posicionEnMes ?? null) : null,
          creadoPorId: adminId,
        },
        select: { id: true, frecuencia: true, diaSemana: true, posicionEnMes: true },
      });
      return creada;
    } catch (error) {
      if (esViolacionDeUnico(error)) {
        throw new AppException('DIA_DE_SERVICIO_REPETIDO', 409, 'Ese día de servicio ya está cargado.', [{ campo: 'diaSemana', code: 'DIA_DE_SERVICIO_REPETIDO' }]);
      }
      throw error;
    }
  }

  async quitarRegla(ministerioId: string, reglaId: string): Promise<{ id: string }> {
    const r = await this.prisma.diaDeServicio.updateMany({ where: { id: reglaId, ministerioId, activo: true }, data: { activo: false } });
    if (r.count === 0) throw new AppException('NO_ENCONTRADO', 404, 'No existe ese día de servicio en este Ministerio.');
    return { id: reglaId };
  }

  async cupoMinisterio(ministerioId: string, cupo: unknown): Promise<{ cupo: number }> {
    await this.ministerioOFallar(ministerioId);
    const valor = this.cupoOFallar(cupo);
    await this.prisma.ministerio.update({ where: { id: ministerioId }, data: { cupoTurno: valor } });
    return { cupo: valor };
  }

  async cupoCelula(celulaId: string, cupo: unknown): Promise<{ cupo: number }> {
    const valor = this.cupoOFallar(cupo);
    const r = await this.prisma.celula.updateMany({ where: { id: celulaId, eliminadoEn: null }, data: { cupoTurno: valor } });
    if (r.count === 0) throw new AppException('NO_ENCONTRADO', 404, 'No existe esa Célula.');
    return { cupo: valor };
  }

  /** "Este día no hay" (US1-3): si la fecha estaba publicada, avisa a quien tenía turno (en la misma transacción, D197). */
  async suspender(ministerioId: string, dia: string, adminId: string, hoy: string = hoyEnArgentina()): Promise<{ dia: string; estado: EstadoFechaDeServicio; avisados: number }> {
    await this.validarDiaDeServicio(ministerioId, dia, hoy);
    const ministerio = await this.prisma.ministerio.findUniqueOrThrow({ where: { id: ministerioId }, select: { id: true, nombre: true } });
    const fecha = diaComoFecha(dia);
    const avisados = await this.prisma.$transaction(async (tx) => {
      const antes = await tx.fechaDeServicio.findUnique({ where: { ministerioId_dia: { ministerioId, dia: fecha } }, select: { estado: true } });
      const fila = await tx.fechaDeServicio.upsert({
        where: { ministerioId_dia: { ministerioId, dia: fecha } },
        create: { ministerioId, dia: fecha, estado: 'suspendida', suspendidaEn: new Date(), suspendidaPorId: adminId },
        update: { estado: 'suspendida', suspendidaEn: new Date(), suspendidaPorId: adminId },
        select: { id: true },
      });
      if (antes?.estado !== 'publicada') return 0;
      const turnos = await tx.turno.findMany({ where: { fechaId: fila.id, estado: 'asignado' }, select: { id: true, personaId: true, celula: { select: { nombre: true } } } });
      for (const t of turnos) {
        await this.notificaciones.emitir(tx, { nombre: 'turno.fecha_suspendida', a: { tipo: 'persona', personaId: t.personaId }, datos: datosAvisoTurno(t.id, ministerio, dia, t.celula?.nombre ?? null) });
      }
      return turnos.length;
    });
    return { dia, estado: 'suspendida', avisados };
  }

  /** Volver a habilitar: vuelve a como estaba (publicada si ya se había publicado; si no, borrador). */
  async habilitar(ministerioId: string, dia: string, hoy: string = hoyEnArgentina()): Promise<{ dia: string; estado: EstadoFechaDeServicio }> {
    await this.validarDiaDeServicio(ministerioId, dia, hoy);
    const fila = await this.prisma.fechaDeServicio.findUnique({
      where: { ministerioId_dia: { ministerioId, dia: diaComoFecha(dia) } },
      select: { id: true, estado: true, publicadaEn: true },
    });
    if (!fila || fila.estado !== 'suspendida') return { dia, estado: (fila?.estado ?? 'borrador') as EstadoFechaDeServicio };
    const estado: EstadoFechaDeServicio = fila.publicadaEn ? 'publicada' : 'borrador';
    await this.prisma.fechaDeServicio.update({ where: { id: fila.id }, data: { estado, suspendidaEn: null, suspendidaPorId: null } });
    return { dia, estado };
  }

  private cupoOFallar(cupo: unknown): number {
    if (!cupoTurnoValido(cupo)) {
      throw new AppException('VALIDACION', 400, `El cupo va de 1 a ${CUPO_TURNO_MAXIMO}.`, [{ campo: 'cupo', code: 'CUPO_TURNO_INVALIDO' }]);
    }
    return cupo;
  }

  /** La fecha es `AAAA-MM-DD`, no pasó y sale de una regla activa del Ministerio. */
  async validarDiaDeServicio(ministerioId: string, dia: string, hoy: string): Promise<void> {
    if (!DIA.test(dia) || Number.isNaN(diaComoFecha(dia).getTime())) {
      throw new AppException('VALIDACION', 400, 'La fecha no es válida.', [{ campo: 'dia', code: 'FECHA_INVALIDA' }]);
    }
    await this.ministerioOFallar(ministerioId);
    if (dia < hoy) throw new AppException('FECHA_YA_PASO', 409, 'Esa fecha ya pasó.');
    const reglas = await this.reglasActivas(ministerioId);
    if (!fechasDeServicio(reglas, 1, dia).includes(dia)) {
      throw new AppException('NO_ES_DIA_DE_SERVICIO', 409, 'Esa fecha no sale de ningún día de servicio del Ministerio.');
    }
  }

  private async ministerioOFallar(id: string): Promise<{ id: string; cupoTurno: number }> {
    const m = await this.prisma.ministerio.findFirst({ where: { id, eliminadoEn: null }, select: { id: true, cupoTurno: true } });
    if (!m) throw new AppException('NO_ENCONTRADO', 404, 'No existe un Ministerio con ese id.');
    return m;
  }
}
