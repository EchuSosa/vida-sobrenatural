import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AppException } from '../common/errors/app-exception.js';

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
  constructor(private readonly prisma: PrismaService) {}

  /**
   * FR-007/FR-008 (`estado=activas`, default — lo único que usa
   * `apps/web`), D117/H-51 (`estado=todas`, backoffice), D119
   * (`estado=papelera`). H-42: paginado + `select` explícito, ordenado por
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
}
