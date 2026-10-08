import { Injectable } from '@nestjs/common';
import {
  confirmaNombre,
  normalizarNombre,
  type CelulaCatalogo,
  type DatosCelula,
  type EliminadoEnPapelera,
} from '@vida-sobrenatural/shared-types';
import { PrismaService } from '../prisma/prisma.service.js';
import { AppException } from '../common/errors/app-exception.js';
import { errorDeValidacion } from '../discipulado/validaciones.js';
import { nombresDe } from '../discipulado/consultas.js';
import { erroresCelula, opcional } from './validar-catalogo.js';
import { celulasCatalogo } from './ministerio.service.js';

export interface ActualizarCelula extends Partial<DatosCelula> {
  activo?: boolean;
  confirmacionNombre?: string;
}

/**
 * spec 009, Historia 4 (T039, contracts/ministerios-api.md "Células"): las
 * áreas de un Ministerio. Nombre único dentro de su Ministerio entre las no
 * eliminadas; no se reactiva con el Ministerio inactivo (FR-029); se elimina
 * (lógico, D119) solo sin Postulaciones.
 */
@Injectable()
export class CelulaService {
  constructor(private readonly prisma: PrismaService) {}

  /** POST /ministerios/:id/celulas (FR-027): se puede preparar con el Ministerio inactivo, no eliminado. */
  async crear(ministerioId: string, dto: DatosCelula): Promise<CelulaCatalogo> {
    const ministerio = await this.prisma.ministerio.findUnique({
      where: { id: ministerioId },
      select: { eliminadoEn: true },
    });
    if (!ministerio)
      throw new AppException('NO_ENCONTRADO', 404, 'No existe ese Ministerio.');
    if (ministerio.eliminadoEn)
      throw new AppException(
        'MINISTERIO_NO_DISPONIBLE',
        409,
        'El Ministerio está en la papelera.',
      );
    const errores = erroresCelula(dto, false);
    if (
      errores.length === 0 &&
      (await this.nombreOcupado(ministerioId, dto.nombre))
    )
      errores.push({ campo: 'nombre', code: 'CELULA_NOMBRE_DUPLICADO' });
    if (errores.length > 0) throw errorDeValidacion(errores);
    const c = await this.prisma.celula.create({
      data: {
        ministerioId,
        nombre: dto.nombre.trim(),
        descripcion: opcional(dto.descripcion) ?? null,
        ofreceRolDiscipulador: dto.ofreceRolDiscipulador ?? false,
      },
      select: { id: true },
    });
    return (await celulasCatalogo(this.prisma, ministerioId, c.id))[0];
  }

  /** PATCH /celulas/:id (FR-027 a FR-029, D38). */
  async actualizar(id: string, dto: ActualizarCelula): Promise<CelulaCatalogo> {
    const existente = await this.prisma.celula.findFirst({
      where: { id, eliminadoEn: null },
      select: {
        ministerioId: true,
        nombre: true,
        activo: true,
        ministerio: { select: { activo: true } },
      },
    });
    if (!existente) throw noEncontrada();
    const errores = erroresCelula(dto, true);
    if (
      dto.nombre !== undefined &&
      errores.every((e) => e.campo !== 'nombre') &&
      (await this.nombreOcupado(existente.ministerioId, dto.nombre, id))
    ) {
      errores.push({ campo: 'nombre', code: 'CELULA_NOMBRE_DUPLICADO' });
    }
    if (errores.length > 0) throw errorDeValidacion(errores);

    if (
      dto.activo === true &&
      !existente.activo &&
      !existente.ministerio.activo
    ) {
      throw new AppException(
        'MINISTERIO_INACTIVO',
        409,
        'El Ministerio está inactivo: reactivalo antes de reactivar esta Célula.',
      );
    }
    if (dto.activo === false && existente.activo) {
      const [c] = await celulasCatalogo(
        this.prisma,
        existente.ministerioId,
        id,
      );
      if (
        (c.miembrosActivos > 0 || c.postulacionesPendientes > 0) &&
        !confirmaNombre(dto.confirmacionNombre, existente.nombre)
      ) {
        throw new AppException(
          'CONFIRMACION_NOMBRE_REQUERIDA',
          409,
          `Tiene ${c.miembrosActivos} miembro(s) y ${c.postulacionesPendientes} postulación(es) pendiente(s): escribí el nombre exacto para confirmar.`,
          undefined,
          {
            miembrosActivos: c.miembrosActivos,
            postulacionesPendientes: c.postulacionesPendientes,
          },
        );
      }
    }
    await this.prisma.celula.update({
      where: { id },
      data: {
        ...(dto.nombre !== undefined ? { nombre: dto.nombre.trim() } : {}),
        ...(dto.descripcion !== undefined
          ? { descripcion: opcional(dto.descripcion) ?? null }
          : {}),
        ...(dto.ofreceRolDiscipulador !== undefined
          ? { ofreceRolDiscipulador: dto.ofreceRolDiscipulador }
          : {}),
        ...(dto.activo !== undefined ? { activo: dto.activo } : {}),
      },
    });
    return (await celulasCatalogo(this.prisma, existente.ministerioId, id))[0];
  }

  /** DELETE /celulas/:id (FR-030, D119). */
  async eliminar(id: string, eliminadoPor: string): Promise<void> {
    const existente = await this.prisma.celula.findFirst({
      where: { id, eliminadoEn: null },
      select: { id: true, _count: { select: { postulaciones: true } } },
    });
    if (!existente) throw noEncontrada();
    if (existente._count.postulaciones > 0) {
      throw new AppException(
        'CELULA_TIENE_DATOS_RELACIONADOS',
        409,
        'No se puede eliminar: tiene postulaciones. Inactivala en su lugar.',
      );
    }
    await this.prisma.celula.update({
      where: { id },
      data: { eliminadoEn: new Date(), eliminadoPor },
    });
  }

  /** GET /ministerios/:id/celulas/papelera (D119). */
  async papelera(ministerioId: string): Promise<EliminadoEnPapelera[]> {
    const filas = await this.prisma.celula.findMany({
      where: { ministerioId, eliminadoEn: { not: null } },
      orderBy: { eliminadoEn: 'desc' },
      select: { id: true, nombre: true, eliminadoEn: true, eliminadoPor: true },
    });
    const nombres = await nombresDe(
      this.prisma,
      filas.flatMap((f) => (f.eliminadoPor ? [f.eliminadoPor] : [])),
    );
    return filas.map((f) => ({
      id: f.id,
      nombre: f.nombre,
      eliminadoEn: f.eliminadoEn!.toISOString(),
      eliminadoPor: f.eliminadoPor
        ? (nombres.get(f.eliminadoPor) ?? null)
        : null,
    }));
  }

  /** POST /celulas/:id/restaurar (D119). */
  async restaurar(id: string): Promise<CelulaCatalogo> {
    const existente = await this.prisma.celula.findUnique({
      where: { id },
      select: { ministerioId: true, nombre: true, eliminadoEn: true },
    });
    if (!existente || !existente.eliminadoEn)
      throw new AppException(
        'NO_ENCONTRADO',
        404,
        'Esa Célula no está en la papelera.',
      );
    if (
      await this.nombreOcupado(existente.ministerioId, existente.nombre, id)
    ) {
      throw new AppException(
        'VALIDACION',
        409,
        'Mientras estuvo en la papelera se creó otra Célula con el mismo nombre.',
        [{ campo: 'nombre', code: 'CELULA_NOMBRE_DUPLICADO' }],
      );
    }
    await this.prisma.celula.update({
      where: { id },
      data: { eliminadoEn: null, eliminadoPor: null },
    });
    return (await celulasCatalogo(this.prisma, existente.ministerioId, id))[0];
  }

  private async nombreOcupado(
    ministerioId: string,
    nombre: string,
    excepto?: string,
  ): Promise<boolean> {
    const buscado = normalizarNombre(nombre);
    const otras = await this.prisma.celula.findMany({
      where: {
        ministerioId,
        eliminadoEn: null,
        ...(excepto ? { id: { not: excepto } } : {}),
      },
      select: { nombre: true },
    });
    return otras.some((o) => normalizarNombre(o.nombre) === buscado);
  }
}

function noEncontrada() {
  return new AppException('NO_ENCONTRADO', 404, 'No existe esa Célula.');
}
