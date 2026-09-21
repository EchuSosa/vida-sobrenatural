import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

const PALABRA_PROFETICA_SELECT = {
  id: true,
  anio: true,
  titulo: true,
  texto: true,
  youtubeUrl: true,
  youtubeVideoId: true,
  vigente: true,
  createdAt: true,
} as const;

@Injectable()
export class PalabraProfeticaService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * GET /palabra-profetica?vigente=true — FR-004/FR-006, subpágina pública.
   * Devuelve la única vigente, o `null` si todavía no hay ninguna (el
   * controller lo traduce a 204 — la subpágina pública renderiza su propio
   * estado vacío, no un error).
   */
  findVigente() {
    return this.prisma.palabraProfetica.findFirst({
      where: { vigente: true },
      select: PALABRA_PROFETICA_SELECT,
    });
  }

  /**
   * GET /palabra-profetica (sin filtro) — historial completo del backoffice
   * (FR-013), orden `createdAt desc`. H-42: paginado — `skip`/`take` acotado
   * por el controller, igual que `findPendientesTutor`.
   */
  async findHistorial(skip: number, take: number) {
    const [items, total] = await Promise.all([
      this.prisma.palabraProfetica.findMany({
        select: PALABRA_PROFETICA_SELECT,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.palabraProfetica.count(),
    ]);
    return { items, total };
  }
}
