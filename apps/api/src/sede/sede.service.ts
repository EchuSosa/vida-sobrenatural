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
  // H-51/D117: el backoffice necesita saber cuáles están inactivas para
  // mostrar el estado (texto + ícono) en el listado — no es un dato
  // sensible, así que se agrega al select público en vez de duplicar uno
  // aparte solo para el backoffice.
  activo: true,
} as const;

@Injectable()
export class SedeService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * FR-002/FR-003 — Historia 1. `estado` por defecto es `'activas'`: el
   * comportamiento público no cambia (apps/web — Visitanos y el selector de
   * Sede del registro — nunca manda este query param). `'todas'` es lo que
   * usa el listado del backoffice para incluir las inactivas (D117, H-51) —
   * sigue siendo un GET público, sin guard nuevo: qué Sedes existen no es
   * información sensible, a diferencia de datos de Persona.
   */
  findAll(estado: 'activas' | 'todas' = 'activas') {
    return this.prisma.sede.findMany({
      where: estado === 'todas' ? {} : { activo: true },
      select: SEDE_PUBLIC_SELECT,
      orderBy: { nombre: 'asc' },
    });
  }

  /**
   * FR-004. Sin filtrar por `activo` (H-51/H-52, D117) — el detalle de una
   * Sede inactiva se tiene que poder abrir desde el backoffice. Hoy este
   * endpoint no tiene ningún consumidor público (`sedes/[id]` es nuevo), así
   * que no hay comportamiento existente que este cambio pueda romper.
   */
  async findOne(id: string) {
    const sede = await this.prisma.sede.findUnique({
      where: { id },
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

    // H-30 (revisión manual, actualización 2026-09-20): no se puede
    // desactivar la única Sede activa — la parte pública se quedaría sin
    // qué mostrar (Visitanos, registro).
    if (dto.activo === false && existente.activo) {
      const otrasActivas = await this.prisma.sede.count({
        where: { activo: true, id: { not: id } },
      });
      if (otrasActivas === 0) {
        throw new AppException(
          'SEDE_UNICA_ACTIVA',
          409,
          'Es la única Sede activa — creá una Sede nueva antes de desactivar esta.',
        );
      }
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

    // H-51 (borde a contemplar): `validarNombreUnicoEntreActivas` solo mira
    // Sedes activas, así que reactivar una nunca lo disparaba — pero
    // mientras estuvo inactiva pudo haberse creado otra Sede activa con el
    // mismo nombre. Se chequea también al reactivar, aunque `nombre` no
    // venga en este PATCH.
    const reactivando = dto.activo === true && !existente.activo;
    if ((dto.nombre && dto.nombre !== existente.nombre) || reactivando) {
      await this.validarNombreUnicoEntreActivas(dto.nombre ?? existente.nombre, id);
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
