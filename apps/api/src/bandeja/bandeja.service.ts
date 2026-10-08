import { Injectable } from '@nestjs/common';
import type { ConteoAbiertas, FiltroAbiertas, OrdenBandeja, Pagina, SolicitudBandeja, TipoSolicitud } from '@vida-sobrenatural/shared-types';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { RegistroFuentesSolicitudes } from './registro-fuentes.js';

export interface FiltrosBandeja {
  filtro: FiltroAbiertas;
  tipo?: TipoSolicitud;
  /** Estados del `tipo` elegido; si vienen, reemplazan a `filtro`. */
  estados?: string[];
  personaId?: string;
  buscar?: string;
  orden: OrdenBandeja;
  dir: 'asc' | 'desc';
  skip: number;
  take: number;
}

/**
 * Lote 0 global: la consulta sobre la vista (orden, filtros, página y
 * conteo). El endpoint `GET /solicitudes` generalizado y la pantalla son de
 * la 013 (lote 1); hasta entonces la 004 sigue con el suyo.
 */
@Injectable()
export class BandejaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly registro: RegistroFuentesSolicitudes,
  ) {}

  async conteoAbiertas(): Promise<ConteoAbiertas> {
    const conectados = this.registro.conectados();
    if (conectados.length === 0) return {};
    const filas = await this.prisma.$queryRaw<{ tipo: TipoSolicitud; cantidad: number }[]>`
      SELECT "tipo", COUNT(*)::int AS "cantidad"
      FROM "solicitudes_bandeja"
      WHERE "abierta" AND "tipo" IN (${Prisma.join(conectados)})
      GROUP BY "tipo"`;
    const conteo: ConteoAbiertas = {};
    for (const tipo of conectados) conteo[tipo] = filas.find((f) => f.tipo === tipo)?.cantidad ?? 0;
    return conteo;
  }

  async listar(f: FiltrosBandeja): Promise<Pagina<SolicitudBandeja>> {
    const conectados = f.tipo ? [f.tipo].filter((t) => this.registro.fuente(t)) : this.registro.conectados();
    if (conectados.length === 0) return { items: [], total: 0 };

    const condiciones: Prisma.Sql[] = [Prisma.sql`b."tipo" IN (${Prisma.join(conectados)})`];
    if (f.estados?.length) condiciones.push(Prisma.sql`b."estado" IN (${Prisma.join(f.estados)})`);
    else if (f.filtro === 'abiertas') condiciones.push(Prisma.sql`b."abierta"`);
    else if (f.filtro === 'resueltas') condiciones.push(Prisma.sql`NOT b."abierta"`);
    if (f.personaId) condiciones.push(Prisma.sql`b."personaId" = ${f.personaId}`);
    if (f.buscar?.trim()) {
      const patron = `%${f.buscar.trim()}%`;
      condiciones.push(
        Prisma.sql`(p."nombre" ILIKE ${patron} OR p."apellido" ILIKE ${patron} OR (p."nombre" || ' ' || p."apellido") ILIKE ${patron})`,
      );
    }
    const where = Prisma.join(condiciones, ' AND ');
    const dir = f.dir === 'desc' ? Prisma.sql`DESC` : Prisma.sql`ASC`;
    const orden =
      f.orden === 'persona'
        ? Prisma.sql`p."apellido" ${dir}, p."nombre" ${dir}`
        : f.orden === 'fecha'
          ? Prisma.sql`b."createdAt" ${dir}`
          : Prisma.sql`b."esperaDesde" ${dir}`;

    const [{ total }] = await this.prisma.$queryRaw<{ total: number }[]>`
      SELECT COUNT(*)::int AS "total"
      FROM "solicitudes_bandeja" b JOIN "personas" p ON p."id" = b."personaId"
      WHERE ${where}`;
    const pagina = await this.prisma.$queryRaw<{ tipo: TipoSolicitud; id: string }[]>`
      SELECT b."tipo", b."id"
      FROM "solicitudes_bandeja" b JOIN "personas" p ON p."id" = b."personaId"
      WHERE ${where}
      ORDER BY ${orden}, b."id" ASC
      OFFSET ${f.skip} LIMIT ${f.take}`;

    // Hidratar por tipo y devolver en el orden de la página.
    const porTipo = new Map<TipoSolicitud, string[]>();
    for (const fila of pagina) porTipo.set(fila.tipo, [...(porTipo.get(fila.tipo) ?? []), fila.id]);
    const hidratadas = new Map<string, SolicitudBandeja>();
    for (const [tipo, ids] of porTipo) {
      for (const s of await this.registro.fuente(tipo)!.resumenes(ids)) hidratadas.set(`${tipo}:${s.id}`, s);
    }
    const items = pagina.map((f) => hidratadas.get(`${f.tipo}:${f.id}`)).filter((s): s is SolicitudBandeja => s !== undefined);
    return { items, total };
  }
}
