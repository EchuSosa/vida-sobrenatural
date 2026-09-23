import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AppException } from '../common/errors/app-exception.js';
import { extraerIdDeYoutube } from './youtube-url.js';
import type { CrearPalabraProfeticaDto } from './dto/crear-palabra-profetica.dto.js';
import type { ActualizarPalabraProfeticaDto } from './dto/actualizar-palabra-profetica.dto.js';

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

  /** POST /palabra-profetica — FR-010. Se crea con `vigente: false` — marcarla vigente es un paso propio (Acceptance Scenario 1, Historia 3). */
  async create(dto: CrearPalabraProfeticaDto) {
    const youtubeVideoId = this.resolverYoutubeVideoId(dto.youtubeUrl);
    return this.prisma.palabraProfetica.create({
      data: {
        anio: dto.anio,
        titulo: dto.titulo,
        texto: dto.texto,
        youtubeUrl: dto.youtubeUrl ?? null,
        youtubeVideoId,
      },
      select: PALABRA_PROFETICA_SELECT,
    });
  }

  /** PATCH /palabra-profetica/:id — FR-010/FR-011, edición parcial. No permite tocar `vigente` (ver `marcarVigente`). */
  async update(id: string, dto: ActualizarPalabraProfeticaDto) {
    const existente = await this.prisma.palabraProfetica.findUnique({ where: { id } });
    if (!existente) {
      throw new AppException('NO_ENCONTRADO', 404, 'Palabra Profética no encontrada.');
    }

    const data: {
      anio?: number;
      titulo?: string;
      texto?: string;
      youtubeUrl?: string | null;
      youtubeVideoId?: string | null;
    } = {
      anio: dto.anio,
      titulo: dto.titulo,
      texto: dto.texto,
    };
    // Sólo se toca youtubeUrl/youtubeVideoId si vino en el body — un PATCH
    // parcial que no menciona youtubeUrl no debe borrar el video existente.
    if (dto.youtubeUrl !== undefined) {
      data.youtubeUrl = dto.youtubeUrl;
      data.youtubeVideoId = this.resolverYoutubeVideoId(dto.youtubeUrl);
    }

    return this.prisma.palabraProfetica.update({
      where: { id },
      data,
      select: PALABRA_PROFETICA_SELECT,
    });
  }

  /**
   * PATCH /palabra-profetica/:id/marcar-vigente — FR-012, SC-006. Una sola
   * transacción: pone `vigente:true` en `:id` y `vigente:false` en
   * cualquier otro que lo tuviera — sin paso manual aparte sobre la
   * anterior. Si `:id` ya era la vigente, no pasa nada raro (Edge Case del
   * spec): la transacción es idempotente.
   */
  async marcarVigente(id: string) {
    const existente = await this.prisma.palabraProfetica.findUnique({ where: { id } });
    if (!existente) {
      throw new AppException('NO_ENCONTRADO', 404, 'Palabra Profética no encontrada.');
    }

    const [, actualizada] = await this.prisma.$transaction([
      this.prisma.palabraProfetica.updateMany({
        where: { vigente: true, id: { not: id } },
        data: { vigente: false },
      }),
      this.prisma.palabraProfetica.update({
        where: { id },
        data: { vigente: true },
        select: PALABRA_PROFETICA_SELECT,
      }),
    ]);
    return actualizada;
  }

  /** D121: `undefined`/vacío → `null`, sin error. Con valor, debe resolver a un id válido o rechaza (FR-011). */
  private resolverYoutubeVideoId(youtubeUrl: string | undefined): string | null {
    if (!youtubeUrl || youtubeUrl.trim() === '') return null;
    const id = extraerIdDeYoutube(youtubeUrl);
    if (!id) {
      // H-104: `errors` con el campo — antes el cliente lo mapeaba a mano
      // con un `if (e.code === 'YOUTUBE_URL_INVALIDA')` propio en vez de
      // pasar por erroresPorCampo/reemplazar como cualquier otro campo.
      throw new AppException(
        'YOUTUBE_URL_INVALIDA',
        400,
        'Esa URL no parece ser de un video de YouTube — pegá la URL completa (ej. https://www.youtube.com/watch?v=...).',
        [{ campo: 'youtubeUrl', code: 'YOUTUBE_URL_INVALIDA' }],
      );
    }
    return id;
  }
}
