import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AppException } from '../common/errors/app-exception.js';
import type { CrearSedeDto } from './dto/crear-sede.dto.js';
import type { ActualizarSedeDto } from './dto/actualizar-sede.dto.js';

const SEDE_SELECT = {
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
  // D119: mismo criterio — ni la fecha de eliminación ni cuántas Personas
  // tiene son datos sensibles.
  eliminadoEn: true,
  _count: { select: { personas: true } },
} as const;

type SedeConCount = {
  id: string;
  nombre: string;
  direccion: string;
  contactoTelefono: string | null;
  contactoEmail: string | null;
  horarios: string;
  descripcionBienvenida: string | null;
  activo: boolean;
  eliminadoEn: Date | null;
  _count: { personas: number };
};

/** D119: `_count` no es la forma que expone la API — se aplana a `personasAsociadas`. */
function paraRespuesta(sede: SedeConCount) {
  const { _count, ...resto } = sede;
  return { ...resto, personasAsociadas: _count.personas };
}

@Injectable()
export class SedeService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * FR-002/FR-003 — Historia 1. `estado` por defecto es `'activas'`: el
   * comportamiento público no cambia (apps/web — Visitanos y el selector de
   * Sede del registro — nunca manda este query param). `'todas'` es lo que
   * usa el listado del backoffice para incluir las inactivas (D117, H-51).
   * `'papelera'` (D119) es la única forma de ver una Sede eliminada — ni
   * 'activas' ni 'todas' la incluyen nunca, "desaparece de todas las vistas
   * normales" es literal. `'activas'`/`'todas'` salen por `GET /sedes`,
   * público (qué Sedes existen no es información sensible); `'papelera'`
   * sale solo por `GET /sedes/papelera`, que exige `sedes.papelera.ver`
   * (Admin) en el controller — H-129: antes el público también la devolvía.
   */
  findAll(estado: 'activas' | 'todas' | 'papelera' = 'activas') {
    const where =
      estado === 'papelera'
        ? { eliminadoEn: { not: null } }
        : estado === 'todas'
          ? { eliminadoEn: null }
          : { eliminadoEn: null, activo: true };
    return this.prisma.sede
      .findMany({ where, select: SEDE_SELECT, orderBy: { nombre: 'asc' } })
      .then((sedes) => sedes.map(paraRespuesta));
  }

  /**
   * FR-004. Sin filtrar por `activo` (H-51/H-52, D117) — el detalle de una
   * Sede inactiva se tiene que poder abrir desde el backoffice. Sí filtra
   * `eliminadoEn` (D119): una Sede eliminada no tiene pantalla de detalle
   * propia — se ve y se restaura desde la papelera, no desde acá.
   */
  async findOne(id: string) {
    const sede = await this.prisma.sede.findUnique({
      where: { id },
      select: SEDE_SELECT,
    });
    if (!sede || sede.eliminadoEn) {
      throw new AppException('NO_ENCONTRADO', 404, 'Sede no encontrada.');
    }
    return paraRespuesta(sede);
  }

  /** POST /sedes — FR-010, Historia 3. Requiere rol Admin (controller). */
  async create(dto: CrearSedeDto) {
    this.validarAlMenosUnContacto(dto);
    await this.validarNombreUnicoEntreActivas(dto.nombre);

    const sede = await this.prisma.sede.create({
      data: { ...dto, activo: true },
      select: SEDE_SELECT,
    });
    return paraRespuesta(sede);
  }

  /** PATCH /sedes/:id — FR-010/FR-011, incluye el toggle de soft delete (inactivar/reactivar). */
  async update(id: string, dto: ActualizarSedeDto) {
    const existente = await this.prisma.sede.findUnique({ where: { id } });
    if (!existente || existente.eliminadoEn) {
      throw new AppException('NO_ENCONTRADO', 404, 'Sede no encontrada.');
    }

    // H-30 (revisión manual, actualización 2026-09-20): no se puede
    // desactivar la única Sede activa — la parte pública se quedaría sin
    // qué mostrar (Visitanos, registro).
    if (dto.activo === false && existente.activo) {
      await this.validarNoEsLaUnicaActiva(id);
    }

    const contactoTelefono = dto.contactoTelefono ?? existente.contactoTelefono;
    const contactoEmail = dto.contactoEmail ?? existente.contactoEmail;
    if (!contactoTelefono && !contactoEmail) {
      // H-104: `errors` en los dos campos — completar cualquiera de los dos
      // resuelve el error, así que se marcan los dos en vez de elegir uno.
      throw new AppException(
        'CONTACTO_SEDE_REQUERIDO',
        400,
        'La Sede debe tener al menos un teléfono o email de contacto.',
        [
          { campo: 'contactoTelefono', code: 'CONTACTO_SEDE_REQUERIDO' },
          { campo: 'contactoEmail', code: 'CONTACTO_SEDE_REQUERIDO' },
        ],
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

    const sede = await this.prisma.sede.update({
      where: { id },
      data: dto,
      select: SEDE_SELECT,
    });
    return paraRespuesta(sede);
  }

  /**
   * DELETE /sedes/:id — D119. Borrado lógico (Principio III, nunca físico):
   * marca `eliminadoEn`/`eliminadoPor` y la saca de todas las vistas
   * normales. Bloqueado si tiene Personas asociadas (primera de la familia
   * Curso/Ministerio/Célula/Libro — se suman cuando esas entidades
   * existan) — el motivo va en el mensaje para que la pantalla lo muestre
   * al lado del botón, nunca un botón gris sin explicación (D94).
   */
  async eliminar(id: string, eliminadoPor: string) {
    const existente = await this.prisma.sede.findUnique({
      where: { id },
      include: { _count: { select: { personas: true } } },
    });
    if (!existente || existente.eliminadoEn) {
      throw new AppException('NO_ENCONTRADO', 404, 'Sede no encontrada.');
    }
    if (existente._count.personas > 0) {
      throw new AppException(
        'SEDE_TIENE_DATOS_RELACIONADOS',
        409,
        `No se puede eliminar: tiene ${existente._count.personas} Persona(s) asociada(s). Inactivala en su lugar.`,
      );
    }
    // Mismo motivo que el guard de `update()`: eliminar la única Sede
    // activa deja a la parte pública sin qué mostrar, igual que
    // desactivarla — es, en los hechos, la misma situación.
    if (existente.activo) {
      await this.validarNoEsLaUnicaActiva(id);
    }

    const sede = await this.prisma.sede.update({
      where: { id },
      data: { eliminadoEn: new Date(), eliminadoPor },
      select: SEDE_SELECT,
    });
    return paraRespuesta(sede);
  }

  /** POST /sedes/:id/restaurar — D119, vista de papelera del Admin. */
  async restaurar(id: string) {
    const existente = await this.prisma.sede.findUnique({ where: { id } });
    if (!existente || !existente.eliminadoEn) {
      throw new AppException('NO_ENCONTRADO', 404, 'Sede no encontrada en la papelera.');
    }
    // H-51, mismo criterio que reactivar: pudo haberse creado otra Sede
    // activa con este nombre mientras esta estaba eliminada.
    if (existente.activo) {
      await this.validarNombreUnicoEntreActivas(existente.nombre, id);
    }

    const sede = await this.prisma.sede.update({
      where: { id },
      data: { eliminadoEn: null, eliminadoPor: null },
      select: SEDE_SELECT,
    });
    return paraRespuesta(sede);
  }

  private validarAlMenosUnContacto(dto: CrearSedeDto) {
    if (!dto.contactoTelefono && !dto.contactoEmail) {
      // H-104: mismo `errors` en los dos campos que el guard de update() de arriba.
      throw new AppException(
        'CONTACTO_SEDE_REQUERIDO',
        400,
        'La Sede debe tener al menos un teléfono o email de contacto.',
        [
          { campo: 'contactoTelefono', code: 'CONTACTO_SEDE_REQUERIDO' },
          { campo: 'contactoEmail', code: 'CONTACTO_SEDE_REQUERIDO' },
        ],
      );
    }
  }

  /** `nombre` único "entre Sedes activas" es una regla de negocio, no un constraint de DB (ver data-model.md). */
  private async validarNombreUnicoEntreActivas(nombre: string, excluirId?: string) {
    const duplicada = await this.prisma.sede.findFirst({
      where: { nombre, activo: true, eliminadoEn: null, ...(excluirId ? { id: { not: excluirId } } : {}) },
    });
    if (duplicada) {
      throw new AppException('SEDE_NOMBRE_DUPLICADO', 409, 'Ya existe una Sede activa con ese nombre.');
    }
  }

  private async validarNoEsLaUnicaActiva(id: string) {
    const otrasActivas = await this.prisma.sede.count({
      where: { activo: true, eliminadoEn: null, id: { not: id } },
    });
    if (otrasActivas === 0) {
      throw new AppException(
        'SEDE_UNICA_ACTIVA',
        409,
        'Es la única Sede activa — creá una Sede nueva antes de desactivar esta.',
      );
    }
  }
}
