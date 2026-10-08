import { Injectable } from '@nestjs/common';
import {
  CUMPLEANOS_DIAS_SEMANA,
  CUMPLEANOS_PAGINA,
  cumpleanosEsteAnio,
  esBisiesto,
  hoyEnArgentina,
  proximoCumpleanos,
  sumarDias,
  type Cumpleanero,
  type CumpleanosSemana,
  type Pagina,
} from '@vida-sobrenatural/shared-types';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

const ACTIVAS = Prisma.sql`p."estado" = 'activa' AND p."activo"`;
const SELECT_PERSONA = { id: true, nombre: true, apellido: true, fotoUrl: true, telefono: true, fechaNacimiento: true } as const;

type PersonaConFecha = { id: string; nombre: string; apellido: string; fotoUrl: string | null; telefono: string; fechaNacimiento: Date };

/**
 * spec 013, Historia 4 (T050): los cumpleaños de las Personas activas
 * (`estado = activa`, `activo = true`, FR-030). El mes se filtra con el índice
 * de expresión `personas_mes_nacimiento_idx`; "hoy" es `hoyEnArgentina`
 * (FR-033) y el 29/2 cae el 28 en un año no bisiesto (FR-032).
 */
@Injectable()
export class CumpleanosService {
  constructor(private readonly prisma: PrismaService) {}

  /** `GET /personas/cumpleanos?mes=` — del año en curso, por día y apellido, de a 50. */
  async delMes(mes: number, skip: number, take: number, ahora: Date = new Date()): Promise<Pagina<Cumpleanero>> {
    const hoy = hoyEnArgentina(ahora);
    // El día en que se festeja ESTE año: un 29/2 ordena como 28 si el año no es bisiesto.
    const diaFestejo = esBisiesto(Number(hoy.slice(0, 4)))
      ? Prisma.sql`EXTRACT(DAY FROM p."fechaNacimiento")`
      : Prisma.sql`LEAST(EXTRACT(DAY FROM p."fechaNacimiento"), CASE WHEN ${mes} = 2 THEN 28 ELSE 31 END)`;
    const donde = Prisma.sql`${ACTIVAS} AND EXTRACT(MONTH FROM p."fechaNacimiento") = ${mes}`;
    const [[{ total }], ids] = await Promise.all([
      this.prisma.$queryRaw<{ total: number }[]>`SELECT COUNT(*)::int AS "total" FROM "personas" p WHERE ${donde}`,
      this.prisma.$queryRaw<{ id: string }[]>`
        SELECT p."id" FROM "personas" p WHERE ${donde}
        ORDER BY ${diaFestejo}, p."apellido", p."nombre", p."id"
        OFFSET ${skip} LIMIT ${take}`,
    ]);
    const personas = await this.personas(ids.map((f) => f.id));
    return { items: personas.map((p) => cumpleanero(p, cumpleanosEsteAnio(fechaCivil(p), hoy))), total };
  }

  /** `GET /inicio/cumpleanos-semana` — hoy y los próximos 7 días, cruzando fin de mes y de año (FR-031). */
  async deLaSemana(ahora: Date = new Date()): Promise<CumpleanosSemana> {
    const hoy = hoyEnArgentina(ahora);
    const hasta = sumarDias(hoy, CUMPLEANOS_DIAS_SEMANA);
    const meses = [...new Set([hoy, hasta].map((f) => Number(f.slice(5, 7))))];
    const candidatas = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT p."id" FROM "personas" p
      WHERE ${ACTIVAS} AND EXTRACT(MONTH FROM p."fechaNacimiento") IN (${Prisma.join(meses)})`;
    const filas = (await this.personas(candidatas.map((c) => c.id)))
      .map((p) => cumpleanero(p, proximoCumpleanos(fechaCivil(p), hoy)))
      .filter((c) => c.fecha <= hasta)
      .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.persona.apellido.localeCompare(b.persona.apellido, 'es') || a.persona.nombre.localeCompare(b.persona.nombre, 'es'));
    return { items: filas.slice(0, CUMPLEANOS_PAGINA), hayMas: filas.length > CUMPLEANOS_PAGINA };
  }

  /** Las Personas en el orden de `ids`. */
  private async personas(ids: string[]): Promise<PersonaConFecha[]> {
    if (ids.length === 0) return [];
    const filas = await this.prisma.persona.findMany({ where: { id: { in: ids } }, select: SELECT_PERSONA });
    const porId = new Map(filas.map((f) => [f.id, f]));
    return ids.map((id) => porId.get(id)).filter((p): p is PersonaConFecha => p !== undefined);
  }
}

function fechaCivil(p: PersonaConFecha): string {
  return p.fechaNacimiento.toISOString().slice(0, 10);
}

function cumpleanero(p: PersonaConFecha, f: Omit<Cumpleanero, 'persona' | 'telefono'>): Cumpleanero {
  return { persona: { id: p.id, nombre: p.nombre, apellido: p.apellido, fotoUrl: p.fotoUrl }, telefono: p.telefono, ...f };
}
