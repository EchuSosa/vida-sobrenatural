import { Injectable } from '@nestjs/common';
import type { EventoPublico, Pagina } from '@vida-sobrenatural/shared-types';
import { PrismaService } from '../prisma/prisma.service.js';
import { AppException } from '../common/errors/app-exception.js';
import { aEventoPublico, EVENTO_SELECT, inicioDeHoyEnArgentina, totalesDeEventos } from './representacion.js';

/**
 * spec 011, lote B (US1) — la cartelera y la página pública de un Evento
 * (FR-001, FR-002, FR-005, FR-043, FR-046). Sin sesión; nunca inscriptos.
 */
@Injectable()
export class EventosPublicosService {
  constructor(private readonly prisma: PrismaService) {}

  /** FR-001: publicados, no eliminados, que empiezan hoy o después, por fecha de inicio. */
  async cartelera(skip: number, take: number): Promise<Pagina<EventoPublico>> {
    const where = { estado: 'publicado' as const, eliminadoEn: null, inicio: { gte: inicioDeHoyEnArgentina() } };
    const [filas, total] = await Promise.all([
      this.prisma.evento.findMany({ where, orderBy: [{ inicio: 'asc' }, { nombre: 'asc' }], skip, take, select: EVENTO_SELECT }),
      this.prisma.evento.count({ where }),
    ]);
    const totales = await totalesDeEventos(this.prisma, filas.map((e) => e.id));
    return { items: filas.map((e) => aEventoPublico(e, totales.get(e.id)!.ocupados)), total };
  }

  /** FR-002, FR-005: por slug, incluidos cancelados y pasados; eliminado → 404 (FR-043). */
  async porSlug(slug: string): Promise<EventoPublico> {
    const evento = await this.prisma.evento.findFirst({ where: { slug, eliminadoEn: null }, select: EVENTO_SELECT });
    if (!evento) throw new AppException('NO_ENCONTRADO', 404, 'No encontramos este Evento.');
    const totales = await totalesDeEventos(this.prisma, [evento.id]);
    return aEventoPublico(evento, totales.get(evento.id)!.ocupados);
  }

  /** Para `sitemap.ts` de la web: los slugs publicados no eliminados (FR-006). */
  async slugs(): Promise<Array<{ slug: string; updatedAt: string }>> {
    const filas = await this.prisma.evento.findMany({
      where: { estado: 'publicado', eliminadoEn: null },
      orderBy: { inicio: 'desc' },
      take: 1000,
      select: { slug: true, updatedAt: true },
    });
    return filas.map((f) => ({ slug: f.slug, updatedAt: f.updatedAt.toISOString() }));
  }
}
