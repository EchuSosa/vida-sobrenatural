import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AppException } from '../common/errors/app-exception.js';
import type { CrearSedeDto } from './dto/crear-sede.dto.js';
import type { ActualizarSedeDto } from './dto/actualizar-sede.dto.js';

const SEDE_PUBLIC_SELECT = {
  id: true,
  nombre: true,
  direccion: true,
  contactoTelefono: true,
  contactoEmail: true,
  horarios: true,
  descripcionBienvenida: true,
} as const;

@Injectable()
export class SedeService {
  constructor(private readonly prisma: PrismaService) {}

  /** FR-002/FR-003 — Historia 1: listado público de Sedes activas. */
  findAllActive() {
    return this.prisma.sede.findMany({
      where: { activo: true },
      select: SEDE_PUBLIC_SELECT,
      orderBy: { nombre: 'asc' },
    });
  }

  /** FR-004 — detalle público de una Sede activa puntual. */
  async findOneActive(id: string) {
    const sede = await this.prisma.sede.findFirst({
      where: { id, activo: true },
      select: SEDE_PUBLIC_SELECT,
    });
    if (!sede) {
      throw new AppException('NO_ENCONTRADO', 404, 'Sede no encontrada.');
    }
    return sede;
  }

  /** POST /sedes — FR-010, Historia 3. Requiere rol Admin (controller). */
  async create(dto: CrearSedeDto) {
    this.validarAlMenosUnContacto(dto);
    await this.validarNombreUnicoEntreActivas(dto.nombre);

    return this.prisma.sede.create({
      data: { ...dto, activo: true },
      select: SEDE_PUBLIC_SELECT,
    });
  }

  /** PATCH /sedes/:id — FR-010/FR-011, incluye el toggle de soft delete. */
  async update(id: string, dto: ActualizarSedeDto) {
    const existente = await this.prisma.sede.findUnique({ where: { id } });
    if (!existente) {
      throw new AppException('NO_ENCONTRADO', 404, 'Sede no encontrada.');
    }

    const contactoTelefono = dto.contactoTelefono ?? existente.contactoTelefono;
    const contactoEmail = dto.contactoEmail ?? existente.contactoEmail;
    if (!contactoTelefono && !contactoEmail) {
      throw new AppException(
        'CONTACTO_SEDE_REQUERIDO',
        400,
        'La Sede debe tener al menos un teléfono o email de contacto.',
      );
    }

    if (dto.nombre && dto.nombre !== existente.nombre) {
      await this.validarNombreUnicoEntreActivas(dto.nombre, id);
    }

    return this.prisma.sede.update({
      where: { id },
      data: dto,
      select: SEDE_PUBLIC_SELECT,
    });
  }

  private validarAlMenosUnContacto(dto: CrearSedeDto) {
    if (!dto.contactoTelefono && !dto.contactoEmail) {
      throw new AppException(
        'CONTACTO_SEDE_REQUERIDO',
        400,
        'La Sede debe tener al menos un teléfono o email de contacto.',
      );
    }
  }

  /** `nombre` único "entre Sedes activas" es una regla de negocio, no un constraint de DB (ver data-model.md). */
  private async validarNombreUnicoEntreActivas(nombre: string, excluirId?: string) {
    const duplicada = await this.prisma.sede.findFirst({
      where: { nombre, activo: true, ...(excluirId ? { id: { not: excluirId } } : {}) },
    });
    if (duplicada) {
      throw new AppException('SEDE_NOMBRE_DUPLICADO', 409, 'Ya existe una Sede activa con ese nombre.');
    }
  }
}
