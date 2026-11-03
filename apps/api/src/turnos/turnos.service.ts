import { Injectable } from '@nestjs/common';
import {
  FECHAS_PARA_CONTAR_TURNOS,
  MOTIVO_CANCELACION_MAX,
  FECHAS_VISIBLES_TURNOS,
  fechasDeServicio,
  hoyEnArgentina,
  puedeIrEnArea,
  tienePermiso,
  type AreaDeTurnos,
  type FechaDeLaGrilla,
  type GrillaDeTurnos,
  type IntegranteParaTurno,
  type MiTurno,
  type TurnoAsignado,
  type TurnoEnGrilla,
} from '@vida-sobrenatural/shared-types';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AppException } from '../common/errors/app-exception.js';
import { esViolacionDeUnico } from '../ministerio/crear-postulacion.js';
import { NotificacionesService } from '../notificaciones/notificaciones.service.js';
import type { ApiJwtClaims } from '../auth/authenticated-request.js';
import { DiasDeServicioService, diaComoFecha, fechaComoDia } from './dias-de-servicio.service.js';
import { datosAvisoTurno } from './avisos-turno.js';

type Db = PrismaService | Prisma.TransactionClient;
type Ministerio = { id: string; nombre: string; cupoTurno: number };

const PERSONA = { id: true, nombre: true, apellido: true, fotoUrl: true } as const;

interface FilaIntegrante {
  personaId: string;
  celulaId: string | null;
  nombre: string;
  apellido: string;
  fotoUrl: string | null;
}

/**
 * spec 017, US2 y US3 (D252–D256): la grilla de turnos, asignar, quitar, copiar la fecha anterior,
 * publicar, y "mis turnos". Edita el líder vigente de ESE Ministerio (resuelto contra la base, como
 * "Mi ministerio", D226) o el Admin (`turnos.gestionar`); el Pastor (`turnos.ver`) solo ve (D253).
 * Los avisos van en la misma transacción que el cambio (D197).
 */
@Injectable()
export class TurnosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dias: DiasDeServicioService,
    private readonly notificaciones: NotificacionesService,
  ) {}

  // --- Acceso ---

  async acceso(ministerioId: string, user: ApiJwtClaims): Promise<{ ministerio: Ministerio; puedeEditar: boolean }> {
    const ministerio = await this.prisma.ministerio.findFirst({
      where: { id: ministerioId, activo: true, eliminadoEn: null },
      select: { id: true, nombre: true, cupoTurno: true },
    });
    if (!ministerio) throw new AppException('NO_ENCONTRADO', 404, 'No existe un Ministerio activo con ese id.');
    if (tienePermiso(user.rol, 'turnos.gestionar')) return { ministerio, puedeEditar: true };
    if (user.personaId && user.estado === 'activa') {
      const lider = await this.prisma.liderMinisterio.findFirst({ where: { ministerioId, personaId: user.personaId, hasta: null }, select: { id: true } });
      if (lider) return { ministerio, puedeEditar: true };
    }
    if (tienePermiso(user.rol, 'turnos.ver')) return { ministerio, puedeEditar: false };
    throw new AppException('SIN_PERMISO', 403, 'Los turnos de este Ministerio los arman sus líderes.');
  }

  private async paraEditar(ministerioId: string, user: ApiJwtClaims): Promise<Ministerio> {
    const { ministerio, puedeEditar } = await this.acceso(ministerioId, user);
    if (!puedeEditar) throw new AppException('SIN_PERMISO', 403, 'Podés ver los turnos, pero no cambiarlos.');
    return ministerio;
  }

  // --- Lectura ---

  async areas(ministerio: Ministerio, db: Db = this.prisma): Promise<AreaDeTurnos[]> {
    const celulas = await db.celula.findMany({
      where: { ministerioId: ministerio.id, activo: true, eliminadoEn: null },
      select: { id: true, nombre: true, cupoTurno: true },
      orderBy: { nombre: 'asc' },
    });
    if (celulas.length === 0) return [{ id: null, nombre: null, cupo: ministerio.cupoTurno }];
    return celulas.map((c) => ({ id: c.id, nombre: c.nombre, cupo: c.cupoTurno }));
  }

  /** Integrantes vigentes (D170: Postulación aprobada y Persona activa), con su área si sigue activa. */
  async integrantes(ministerioId: string, areas: AreaDeTurnos[], db: Db = this.prisma): Promise<Map<string, FilaIntegrante & { areaId: string | null }>> {
    const filas = await db.$queryRaw<FilaIntegrante[]>`
      SELECT pe."id" AS "personaId", p."celulaId", pe."nombre", pe."apellido", pe."fotoUrl"
        FROM "postulaciones" p
        JOIN "personas" pe ON pe."id" = p."personaId"
       WHERE p."ministerioId" = ${ministerioId} AND p."estado" = 'aprobada' AND pe."activo" = true
       ORDER BY pe."apellido", pe."nombre"`;
    const activas = new Set(areas.map((a) => a.id).filter((id): id is string => id !== null));
    return new Map(filas.map((f) => [f.personaId, { ...f, areaId: f.celulaId && activas.has(f.celulaId) ? f.celulaId : null }]));
  }

  async grilla(ministerioId: string, user: ApiJwtClaims, hoy: string = hoyEnArgentina()): Promise<GrillaDeTurnos> {
    const { ministerio, puedeEditar } = await this.acceso(ministerioId, user);
    const areas = await this.areas(ministerio);
    const integrantes = await this.integrantes(ministerioId, areas);
    const reglas = await this.dias.reglasActivas(ministerioId);
    // Las suspendidas no aparecen (US2-1): se piden de más y se cortan después.
    const candidatas = fechasDeServicio(reglas, FECHAS_VISIBLES_TURNOS * 3, hoy);
    const guardadas = await this.prisma.fechaDeServicio.findMany({
      where: { ministerioId, dia: { in: candidatas.map(diaComoFecha) } },
      select: {
        dia: true,
        estado: true,
        turnos: {
          where: { estado: { in: ['asignado', 'cancelado_por_persona'] } },
          select: { id: true, celulaId: true, estado: true, motivoCancelacion: true, persona: { select: PERSONA } },
          orderBy: { asignadoEn: 'asc' },
        },
      },
    });
    const porDia = new Map(guardadas.map((g) => [fechaComoDia(g.dia), g]));
    const dias = candidatas.filter((d) => porDia.get(d)?.estado !== 'suspendida').slice(0, FECHAS_VISIBLES_TURNOS);

    const otros = dias.length === 0 ? [] : await this.prisma.turno.findMany({
      where: {
        estado: 'asignado',
        personaId: { in: [...integrantes.keys()] },
        fecha: { dia: { in: dias.map(diaComoFecha) }, ministerioId: { not: ministerioId }, estado: { not: 'suspendida' }, ministerio: { activo: true, eliminadoEn: null } },
      },
      select: { personaId: true, fecha: { select: { dia: true, ministerio: { select: { nombre: true } } } } },
    });

    const fechas: FechaDeLaGrilla[] = dias.map((dia) => {
      const g = porDia.get(dia);
      const todos = g?.turnos ?? [];
      const turnos = todos.filter((t) => t.estado === 'asignado');
      const asignadas = new Set(turnos.map((t) => t.persona.id));
      // D257: quien avisó que no puede (y no la volvieron a sumar ese día). El motivo, solo a quien edita.
      const noPueden = todos.filter((t) => t.estado === 'cancelado_por_persona' && !asignadas.has(t.persona.id));
      return {
        dia,
        estado: g?.estado === 'publicada' ? 'publicada' : 'borrador',
        celdas: areas.map((a) => {
          const enCelda: TurnoEnGrilla[] = turnos.filter((t) => (a.id === null ? true : t.celulaId === a.id)).map((t) => ({ id: t.id, persona: t.persona }));
          const delArea = (t: { celulaId: string | null }) => (a.id === null ? true : t.celulaId === a.id);
          return {
            areaId: a.id,
            turnos: enCelda,
            faltan: Math.max(0, a.cupo - enCelda.length),
            noPueden: noPueden.filter(delArea).map((t) => ({ id: t.id, persona: t.persona, motivo: puedeEditar ? t.motivoCancelacion : null })),
          };
        }),
        enOtroMinisterio: otros.filter((o) => fechaComoDia(o.fecha.dia) === dia).map((o) => ({ personaId: o.personaId, ministerio: o.fecha.ministerio.nombre })),
      };
    });

    const veces = await this.vecesQueSirvio(ministerioId, hoy);
    const lista: IntegranteParaTurno[] = [...integrantes.values()].map((i) => ({
      persona: { id: i.personaId, nombre: i.nombre, apellido: i.apellido, fotoUrl: i.fotoUrl },
      areaId: i.areaId,
      vecesQueSirvio: veces.get(i.personaId) ?? 0,
    }));
    return { ministerio: { id: ministerio.id, nombre: ministerio.nombre }, areas, fechas, integrantes: lista, puedeEditar };
  }

  /** FR-007: en las últimas `FECHAS_PARA_CONTAR_TURNOS` fechas publicadas que ya pasaron, una sola consulta. */
  private async vecesQueSirvio(ministerioId: string, hoy: string): Promise<Map<string, number>> {
    const ultimas = await this.prisma.fechaDeServicio.findMany({
      where: { ministerioId, estado: 'publicada', dia: { lt: diaComoFecha(hoy) } },
      select: { id: true },
      orderBy: { dia: 'desc' },
      take: FECHAS_PARA_CONTAR_TURNOS,
    });
    if (ultimas.length === 0) return new Map();
    const grupos = await this.prisma.turno.groupBy({
      by: ['personaId'],
      where: { fechaId: { in: ultimas.map((u) => u.id) }, estado: 'asignado' },
      _count: { _all: true },
    });
    return new Map(grupos.map((g) => [g.personaId, g._count._all]));
  }

  // --- Escritura ---

  /** La fila de la fecha (se crea en borrador la primera vez, FR-002). Fuera de la transacción: dos a la vez no chocan. */
  private async fechaDe(ministerioId: string, dia: string): Promise<{ id: string; estado: string }> {
    const where = { ministerioId_dia: { ministerioId, dia: diaComoFecha(dia) } };
    const existente = await this.prisma.fechaDeServicio.findUnique({ where, select: { id: true, estado: true } });
    if (existente) return existente;
    try {
      return await this.prisma.fechaDeServicio.create({ data: { ministerioId, dia: diaComoFecha(dia) }, select: { id: true, estado: true } });
    } catch (error) {
      if (esViolacionDeUnico(error)) return this.prisma.fechaDeServicio.findUniqueOrThrow({ where, select: { id: true, estado: true } });
      throw error;
    }
  }

  private noSuspendida(fecha: { estado: string }): void {
    if (fecha.estado === 'suspendida') throw new AppException('FECHA_SUSPENDIDA', 409, 'Ese día no hay servicio: primero hay que volver a habilitarlo.');
  }

  async asignar(ministerioId: string, dia: string, cuerpo: { personaId?: unknown; celulaId?: unknown }, user: ApiJwtClaims, hoy: string = hoyEnArgentina()): Promise<TurnoAsignado> {
    const ministerio = await this.paraEditar(ministerioId, user);
    await this.dias.validarDiaDeServicio(ministerioId, dia, hoy);
    const areas = await this.areas(ministerio);
    const sinAreas = areas[0].id === null;
    const celulaId = typeof cuerpo.celulaId === 'string' && cuerpo.celulaId ? cuerpo.celulaId : null;
    const area = sinAreas ? (celulaId === null ? areas[0] : undefined) : areas.find((a) => a.id === celulaId);
    if (!area) throw new AppException('VALIDACION', 400, 'Elegí un área del Ministerio.', [{ campo: 'celulaId', code: 'AREA_INVALIDA' }]);
    const personaId = typeof cuerpo.personaId === 'string' ? cuerpo.personaId : '';
    const integrante = (await this.integrantes(ministerioId, areas)).get(personaId);
    if (!integrante || !puedeIrEnArea(integrante, area.id)) {
      throw new AppException('NO_ES_INTEGRANTE', 409, 'Esa persona no es integrante de esta área del Ministerio.', [{ campo: 'personaId', code: 'NO_ES_INTEGRANTE' }]);
    }
    const fecha = await this.fechaDe(ministerioId, dia);
    this.noSuspendida(fecha);
    const persona = { id: integrante.personaId, nombre: integrante.nombre, apellido: integrante.apellido, fotoUrl: integrante.fotoUrl };
    let turnoId: string;
    try {
      turnoId = await this.prisma.$transaction(async (tx) => {
        const actual = await tx.fechaDeServicio.findUniqueOrThrow({ where: { id: fecha.id }, select: { estado: true } });
        this.noSuspendida(actual);
        const turno = await tx.turno.create({ data: { fechaId: fecha.id, personaId, celulaId: area.id, asignadoPorId: user.personaId ?? personaId }, select: { id: true } });
        if (actual.estado === 'publicada') {
          await this.notificaciones.emitir(tx, { nombre: 'turno.asignado', a: { tipo: 'persona', personaId }, datos: datosAvisoTurno(turno.id, ministerio, dia, area.nombre) });
        }
        return turno.id;
      });
    } catch (error) {
      if (esViolacionDeUnico(error)) {
        throw new AppException('YA_TIENE_TURNO_ESE_DIA', 409, 'Esa persona ya tiene turno ese día en este Ministerio.', [{ campo: 'personaId', code: 'YA_TIENE_TURNO_ESE_DIA' }]);
      }
      throw error;
    }
    const otros = await this.prisma.turno.findMany({
      where: { personaId, estado: 'asignado', fecha: { dia: diaComoFecha(dia), ministerioId: { not: ministerioId }, estado: { not: 'suspendida' }, ministerio: { activo: true, eliminadoEn: null } } },
      select: { fecha: { select: { ministerio: { select: { nombre: true } } } } },
    });
    return {
      turno: { id: turnoId, persona, dia, areaId: area.id },
      advertencias: otros.map((o) => ({ code: 'TURNO_EN_OTRO_MINISTERIO' as const, ministerio: o.fecha.ministerio.nombre })),
    };
  }

  async quitar(turnoId: string, user: ApiJwtClaims, hoy: string = hoyEnArgentina()): Promise<{ id: string }> {
    const turno = await this.prisma.turno.findFirst({
      where: { id: turnoId, estado: 'asignado' },
      select: { personaId: true, celula: { select: { nombre: true } }, fecha: { select: { id: true, dia: true, ministerioId: true } } },
    });
    if (!turno) throw new AppException('NO_ENCONTRADO', 404, 'Ese turno no existe o ya no está asignado.');
    const ministerio = await this.paraEditar(turno.fecha.ministerioId, user);
    const dia = fechaComoDia(turno.fecha.dia);
    if (dia < hoy) throw new AppException('FECHA_YA_PASO', 409, 'Esa fecha ya pasó.');
    await this.prisma.$transaction(async (tx) => {
      const r = await tx.turno.updateMany({ where: { id: turnoId, estado: 'asignado' }, data: { estado: 'quitado', cerradoPorId: user.personaId, cerradoEn: new Date() } });
      if (r.count === 0) throw new AppException('NO_ENCONTRADO', 404, 'Ese turno no existe o ya no está asignado.');
      const fecha = await tx.fechaDeServicio.findUniqueOrThrow({ where: { id: turno.fecha.id }, select: { estado: true } });
      if (fecha.estado === 'publicada') {
        await this.notificaciones.emitir(tx, { nombre: 'turno.quitado', a: { tipo: 'persona', personaId: turno.personaId }, datos: datosAvisoTurno(turnoId, ministerio, dia, turno.celula?.nombre ?? null) });
      }
    });
    return { id: turnoId };
  }

  /** US2-4: los turnos de la fecha publicada anterior, de quienes siguen siendo integrantes de esa área, sin pisar nada. */
  async copiarAnterior(ministerioId: string, dia: string, user: ApiJwtClaims, hoy: string = hoyEnArgentina()): Promise<{ copiados: number }> {
    const ministerio = await this.paraEditar(ministerioId, user);
    await this.dias.validarDiaDeServicio(ministerioId, dia, hoy);
    const anterior = await this.prisma.fechaDeServicio.findFirst({
      where: { ministerioId, estado: 'publicada', dia: { lt: diaComoFecha(dia) } },
      orderBy: { dia: 'desc' },
      select: { turnos: { where: { estado: 'asignado' }, select: { personaId: true, celulaId: true }, orderBy: { asignadoEn: 'asc' } } },
    });
    if (!anterior) throw new AppException('SIN_FECHA_ANTERIOR', 409, 'Todavía no hay una fecha publicada antes de esta para copiar.');
    const areas = await this.areas(ministerio);
    const integrantes = await this.integrantes(ministerioId, areas);
    const fecha = await this.fechaDe(ministerioId, dia);
    this.noSuspendida(fecha);
    return this.prisma.$transaction(async (tx) => {
      const actual = await tx.fechaDeServicio.findUniqueOrThrow({
        where: { id: fecha.id },
        select: { estado: true, turnos: { where: { estado: 'asignado' }, select: { personaId: true } } },
      });
      this.noSuspendida(actual);
      const yaEstan = new Set(actual.turnos.map((t) => t.personaId));
      let copiados = 0;
      for (const t of anterior.turnos) {
        const area = areas.find((a) => a.id === t.celulaId);
        const integrante = integrantes.get(t.personaId);
        if (!area || !integrante || !puedeIrEnArea(integrante, area.id) || yaEstan.has(t.personaId)) continue;
        const turno = await tx.turno.create({ data: { fechaId: fecha.id, personaId: t.personaId, celulaId: area.id, asignadoPorId: user.personaId ?? t.personaId }, select: { id: true } });
        yaEstan.add(t.personaId);
        copiados += 1;
        if (actual.estado === 'publicada') {
          await this.notificaciones.emitir(tx, { nombre: 'turno.asignado', a: { tipo: 'persona', personaId: t.personaId }, datos: datosAvisoTurno(turno.id, ministerio, dia, area.nombre) });
        }
      }
      return { copiados };
    });
  }

  /** D256: publicar avisa a cada persona con turno, una sola vez (dos toques a la vez: el segundo no encuentra el borrador). */
  async publicar(ministerioId: string, dia: string, user: ApiJwtClaims, hoy: string = hoyEnArgentina()): Promise<{ dia: string; estado: 'publicada'; avisados: number }> {
    const ministerio = await this.paraEditar(ministerioId, user);
    await this.dias.validarDiaDeServicio(ministerioId, dia, hoy);
    const fecha = await this.fechaDe(ministerioId, dia);
    this.noSuspendida(fecha);
    const avisados = await this.prisma.$transaction(async (tx) => {
      const r = await tx.fechaDeServicio.updateMany({ where: { id: fecha.id, estado: 'borrador' }, data: { estado: 'publicada', publicadaEn: new Date(), publicadaPorId: user.personaId } });
      if (r.count === 0) {
        this.noSuspendida(await tx.fechaDeServicio.findUniqueOrThrow({ where: { id: fecha.id }, select: { estado: true } }));
        return 0;
      }
      const turnos = await tx.turno.findMany({ where: { fechaId: fecha.id, estado: 'asignado' }, select: { id: true, personaId: true, celula: { select: { nombre: true } } } });
      for (const t of turnos) {
        await this.notificaciones.emitir(tx, { nombre: 'turno.asignado', a: { tipo: 'persona', personaId: t.personaId }, datos: datosAvisoTurno(t.id, ministerio, dia, t.celula?.nombre ?? null) });
      }
      return turnos.length;
    });
    return { dia, estado: 'publicada', avisados };
  }

  // --- La persona (US3, US4) ---

  /**
   * D257: "No puedo ir" — la persona, en su turno publicado y futuro. El motivo (opcional) lo ven
   * solo los líderes y el Admin: nunca va a los avisos ni a los logs. Dos toques: el segundo no
   * encuentra el turno asignado y no vuelve a avisar.
   */
  async cancelar(turnoId: string, personaId: string, motivo: unknown, hoy: string = hoyEnArgentina()): Promise<{ id: string; estado: 'cancelado_por_persona' }> {
    const texto = typeof motivo === 'string' && motivo.trim() ? motivo.trim() : null;
    if (texto && texto.length > MOTIVO_CANCELACION_MAX) {
      throw new AppException('VALIDACION', 400, `El motivo puede tener hasta ${MOTIVO_CANCELACION_MAX} caracteres.`, [{ campo: 'motivo', code: 'MOTIVO_CANCELACION_LARGO' }]);
    }
    const turno = await this.prisma.turno.findFirst({
      where: { id: turnoId, personaId, fecha: { estado: 'publicada' } },
      select: { estado: true, celula: { select: { nombre: true } }, fecha: { select: { dia: true, ministerio: { select: { id: true, nombre: true } } } } },
    });
    if (!turno) throw new AppException('NO_ENCONTRADO', 404, 'No tenés ese turno.');
    const dia = fechaComoDia(turno.fecha.dia);
    if (turno.estado === 'cancelado_por_persona') return { id: turnoId, estado: 'cancelado_por_persona' };
    if (turno.estado !== 'asignado') throw new AppException('NO_ENCONTRADO', 404, 'No tenés ese turno.');
    if (dia <= hoy) throw new AppException('TURNO_YA_EMPEZO', 409, 'Ese turno ya empezó: avisale directamente a tu líder.');
    const ministerio = turno.fecha.ministerio;
    await this.prisma.$transaction(async (tx) => {
      const r = await tx.turno.updateMany({
        where: { id: turnoId, estado: 'asignado' },
        data: { estado: 'cancelado_por_persona', motivoCancelacion: texto, cerradoPorId: personaId, cerradoEn: new Date() },
      });
      if (r.count === 0) return;
      const lideres = await tx.liderMinisterio.findMany({ where: { ministerioId: ministerio.id, hasta: null, personaId: { not: personaId } }, select: { personaId: true } });
      for (const l of lideres) {
        await this.notificaciones.emitir(tx, { nombre: 'turno.no_puede', a: { tipo: 'persona', personaId: l.personaId }, datos: datosAvisoTurno(turnoId, ministerio, dia, turno.celula?.nombre ?? null) });
      }
    });
    return { id: turnoId, estado: 'cancelado_por_persona' };
  }

  async misTurnos(personaId: string, hoy: string = hoyEnArgentina()): Promise<MiTurno[]> {
    const turnos = await this.prisma.turno.findMany({
      where: { personaId, estado: 'asignado', fecha: { estado: 'publicada', dia: { gte: diaComoFecha(hoy) }, ministerio: { activo: true, eliminadoEn: null } } },
      select: { id: true, celula: { select: { nombre: true } }, fecha: { select: { dia: true, ministerio: { select: { id: true, nombre: true } } } } },
      orderBy: [{ fecha: { dia: 'asc' } }],
    });
    return turnos.map((t) => ({ id: t.id, dia: fechaComoDia(t.fecha.dia), ministerio: t.fecha.ministerio, area: t.celula?.nombre ?? null }));
  }
}
