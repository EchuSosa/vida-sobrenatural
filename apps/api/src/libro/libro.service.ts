import { Injectable } from '@nestjs/common';
import { MIME_TIPOS_PORTADA_PERMITIDOS, PORTADA_TAMANO_MAXIMO_BYTES } from '@vida-sobrenatural/shared-types';
import { PrismaService } from '../prisma/prisma.service.js';
import { AppException } from '../common/errors/app-exception.js';
import { StorageService } from '../storage/storage.service.js';
import { ImagenPortadaService } from '../storage/imagen-portada.service.js';
import type { CrearLibroDto } from './dto/crear-libro.dto.js';
import type { ActualizarLibroDto } from './dto/actualizar-libro.dto.js';

const LIBRO_SELECT = {
  id: true,
  titulo: true,
  autor: true,
  anio: true,
  descripcion: true,
  orden: true,
  portadaUrl: true,
  portadaDescripcion: true,
  // H-51/D117: el backoffice necesita saber cuáles están inactivos para
  // mostrar el estado (texto + ícono) en el listado — no es un dato
  // sensible, así que se agrega al select público en vez de duplicar uno
  // aparte solo para el backoffice (mismo criterio que Sede).
  activo: true,
  eliminadoEn: true,
} as const;

@Injectable()
export class LibroService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
    private readonly imagenPortadaService: ImagenPortadaService,
  ) {}

  /**
   * FR-007/FR-008 (`estado=activas`, default — lo único que usa
   * `apps/web`), D117/H-51 (`estado=todas`, backoffice), D119
   * (`'papelera'`, que llega solo desde `GET /libros/papelera`, protegido —
   * H-129). H-42: paginado + `select` explícito, ordenado por
   * `orden` (define la posición en el listado público, FR-016).
   */
  async findAll(estado: 'activas' | 'todas' | 'papelera', skip: number, take: number) {
    const where =
      estado === 'papelera'
        ? { eliminadoEn: { not: null } }
        : estado === 'todas'
          ? { eliminadoEn: null }
          : { eliminadoEn: null, activo: true };
    const [items, total] = await Promise.all([
      this.prisma.libro.findMany({
        where,
        select: LIBRO_SELECT,
        orderBy: { orden: 'asc' },
        skip,
        take,
      }),
      this.prisma.libro.count({ where }),
    ]);
    return { items, total };
  }

  /**
   * FR-007. Sin filtrar por `activo` (mismo criterio que Sede, H-51/H-52) —
   * el detalle de un Libro inactivo se tiene que poder abrir desde el
   * backoffice. Sí filtra `eliminadoEn` (D119): uno eliminado no tiene
   * pantalla de detalle propia — se ve y se restaura desde la papelera.
   */
  async findOne(id: string) {
    const libro = await this.prisma.libro.findUnique({ where: { id }, select: LIBRO_SELECT });
    if (!libro || libro.eliminadoEn) {
      throw new AppException('NO_ENCONTRADO', 404, 'Libro no encontrado.');
    }
    return libro;
  }

  /**
   * GET /libros/autores — H-91. Autores ya cargados, para sugerir mientras
   * se escribe (no un catálogo cerrado: sigue siendo texto libre, el CRUD
   * de Autores queda explícitamente fuera de alcance con 9 libros). Incluye
   * los de Libros inactivos (siguen siendo un autor válido para sugerir);
   * excluye solo los eliminados (D119) — esos ya no representan datos
   * vigentes.
   */
  async findAutores(): Promise<string[]> {
    const filas = await this.prisma.libro.findMany({
      where: { eliminadoEn: null },
      select: { autor: true },
      distinct: ['autor'],
      orderBy: { autor: 'asc' },
    });
    return filas.map((fila) => fila.autor);
  }

  /**
   * POST /libros — FR-015. La portada no entra acá (FR-021, endpoint propio).
   * H-89: sin `orden` explícito, va al último lugar (máximo actual + 1) en
   * vez de 0 — con todos los registros en 0 el desempate lo decidía la
   * base, que es lo mismo que no tener orden.
   */
  async create(dto: CrearLibroDto) {
    const orden = dto.orden ?? (await this.siguienteOrden());
    return this.prisma.libro.create({
      data: {
        titulo: dto.titulo,
        autor: dto.autor,
        anio: dto.anio,
        descripcion: dto.descripcion,
        orden,
      },
      select: LIBRO_SELECT,
    });
  }

  private async siguienteOrden(): Promise<number> {
    const { _max } = await this.prisma.libro.aggregate({ _max: { orden: true } });
    return (_max.orden ?? -1) + 1;
  }

  /**
   * PATCH /libros/reordenar — H-89. Recibe el orden nuevo COMPLETO (todos
   * los ids del conjunto, en su posición nueva) y lo persiste en una sola
   * transacción: mover un libro del puesto 9 al 1 cambia nueve registros, y
   * si se corta a la mitad (un PATCH por fila, o la conexión se cae a
   * mitad de camino) queda un orden inconsistente — la única portada
   * correcta es que todos los cambios entren juntos o ninguno entre.
   *
   * El conjunto que se reordena es el de Libros activos y no eliminados
   * (D119) — el mismo que ve la web pública (FR-016) y el único que el
   * backoffice deja reordenar (con un filtro/búsqueda o "Todos" aplicado,
   * el frontend ni muestra la acción: reordenar un listado que no es la
   * posición real no tendría sentido). Se valida acá también, no solo en
   * el cliente: los `ids` recibidos tienen que ser EXACTAMENTE ese
   * conjunto — ni de menos, ni de más, ni ajenos.
   */
  async reordenar(ids: string[]) {
    const actuales = await this.prisma.libro.findMany({
      where: { eliminadoEn: null, activo: true },
      select: { id: true },
    });
    const idsActuales = new Set(actuales.map((libro) => libro.id));
    const idsNuevos = new Set(ids);
    const mismoConjunto = idsActuales.size === idsNuevos.size && [...idsActuales].every((id) => idsNuevos.has(id));
    if (!mismoConjunto) {
      throw new AppException(
        'LIBRO_ORDEN_CONJUNTO_INVALIDO',
        400,
        'El orden nuevo no coincide con los Libros activos actuales — puede que la lista haya cambiado mientras reordenabas.',
      );
    }

    await this.prisma.$transaction(ids.map((id, indice) => this.prisma.libro.update({ where: { id }, data: { orden: indice } })));

    return this.findAll('activas', 0, ids.length);
  }

  /** PATCH /libros/:id — FR-017, incluye el toggle de inactivar/reactivar vía activo:true/false. */
  async update(id: string, dto: ActualizarLibroDto) {
    const existente = await this.prisma.libro.findUnique({ where: { id } });
    if (!existente || existente.eliminadoEn) {
      throw new AppException('NO_ENCONTRADO', 404, 'Libro no encontrado.');
    }
    return this.prisma.libro.update({ where: { id }, data: dto, select: LIBRO_SELECT });
  }

  /**
   * DELETE /libros/:id — FR-019/FR-020, D119. Borrado lógico, **siempre
   * permitido**: a diferencia de Sede, hoy ninguna entidad referencia a
   * Libro — sin chequeo de "datos relacionados" (condición del estado
   * actual del modelo, no una regla permanente — ver FR-020 en spec.md).
   * No borra el archivo de portada: sigue sirviéndose mientras el libro
   * esté en la papelera, por si se restaura.
   */
  async eliminar(id: string, eliminadoPor: string) {
    const existente = await this.prisma.libro.findUnique({ where: { id } });
    if (!existente || existente.eliminadoEn) {
      throw new AppException('NO_ENCONTRADO', 404, 'Libro no encontrado.');
    }
    return this.prisma.libro.update({
      where: { id },
      data: { eliminadoEn: new Date(), eliminadoPor },
      select: LIBRO_SELECT,
    });
  }

  /** POST /libros/:id/restaurar — D119, vista de papelera del Admin. */
  async restaurar(id: string) {
    const existente = await this.prisma.libro.findUnique({ where: { id } });
    if (!existente || !existente.eliminadoEn) {
      throw new AppException('NO_ENCONTRADO', 404, 'Libro no encontrado en la papelera.');
    }
    return this.prisma.libro.update({
      where: { id },
      data: { eliminadoEn: null, eliminadoPor: null },
      select: LIBRO_SELECT,
    });
  }

  /**
   * POST /libros/:id/portada — FR-021 a FR-026. El controller ya validó
   * tipo/tamaño con `multer` (primera barrera) — acá va la segunda
   * validación explícita (defensa en profundidad, research.md Decisión 2),
   * más la exigencia de texto alternativo (FR-025) antes de procesar nada.
   * Reemplazar borra el archivo anterior en la misma operación (Acceptance
   * Scenario 4 de la Historia 4) — nunca queda un huérfano servido.
   */
  async subirPortada(
    id: string,
    args: { buffer: Buffer; mimeType: string; portadaDescripcion: string },
  ) {
    const existente = await this.prisma.libro.findUnique({ where: { id } });
    if (!existente || existente.eliminadoEn) {
      throw new AppException('NO_ENCONTRADO', 404, 'Libro no encontrado.');
    }
    if (!MIME_TIPOS_PORTADA_PERMITIDOS.includes(args.mimeType as (typeof MIME_TIPOS_PORTADA_PERMITIDOS)[number])) {
      throw new AppException('PORTADA_TIPO_INVALIDO', 400, 'La portada tiene que ser JPG, PNG o WebP.');
    }
    if (args.buffer.length > PORTADA_TAMANO_MAXIMO_BYTES) {
      throw new AppException('PORTADA_TAMANO_EXCEDIDO', 400, 'La portada pesa más del máximo permitido (5 MB).');
    }
    if (!args.portadaDescripcion || args.portadaDescripcion.trim() === '') {
      throw new AppException(
        'LIBRO_TEXTO_ALTERNATIVO_REQUERIDO',
        400,
        'Completá el texto alternativo de la portada antes de subirla.',
      );
    }

    const procesada = await this.imagenPortadaService.procesar(args.buffer);
    const subida = await this.storageService.subir({
      buffer: procesada.buffer,
      nombreOriginal: 'portada',
      mimeType: procesada.mimeType,
    });

    if (existente.portadaUrl) {
      await this.storageService.eliminar(this.extraerRutaDePortada(existente.portadaUrl));
    }

    return this.prisma.libro.update({
      where: { id },
      data: { portadaUrl: subida.url, portadaDescripcion: args.portadaDescripcion },
      select: LIBRO_SELECT,
    });
  }

  /** DELETE /libros/:id/portada — FR-021. El libro vuelve a mostrarse con PlaceholderImagen (FR-027). */
  async eliminarPortada(id: string) {
    const existente = await this.prisma.libro.findUnique({ where: { id } });
    if (!existente || existente.eliminadoEn) {
      throw new AppException('NO_ENCONTRADO', 404, 'Libro no encontrado.');
    }
    if (existente.portadaUrl) {
      await this.storageService.eliminar(this.extraerRutaDePortada(existente.portadaUrl));
    }
    return this.prisma.libro.update({
      where: { id },
      data: { portadaUrl: null, portadaDescripcion: null },
      select: LIBRO_SELECT,
    });
  }

  /** `portadaUrl` guarda la URL pública completa (StorageService.subir) — `StorageService.eliminar` necesita sólo el nombre de archivo. */
  private extraerRutaDePortada(portadaUrl: string): string {
    return portadaUrl.substring(portadaUrl.lastIndexOf('/') + 1);
  }
}
