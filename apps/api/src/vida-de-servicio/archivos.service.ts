import { Injectable } from '@nestjs/common';
import type { Readable } from 'node:stream';
import { hoyEnArgentina, semanaVisible, tienePermiso } from '@vida-sobrenatural/shared-types';
import { PrismaService } from '../prisma/prisma.service.js';
import { StorageService } from '../storage/storage.service.js';
import { cierreCivil, fechaCivil } from './consultas-vs.js';
import { contenidoNoDisponible } from './mi-vida-de-servicio.service.js';

/**
 * spec 008, FR-024 (research #5): un archivo privado de material se entrega
 * solo si, EN ESTE PEDIDO, quien lo pide (a) tiene una Inscripción en esa
 * edición con derecho a esa semana (`semanaVisible`, la misma regla que la
 * lista de semanas, FR-034), (b) es Líder vigente de la edición, o (c) tiene
 * `grupos.ver` (Admin, Pastor). Si no, 404 `CONTENIDO_NO_DISPONIBLE`: no se
 * confirma que exista.
 */
@Injectable()
export class ArchivosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async leer(archivoId: string, personaId: string | null, roles: readonly string[]): Promise<{ stream: Readable; nombre: string; mimeType: string; tamanioBytes: number }> {
    const archivo = await this.prisma.archivoContenido.findFirst({
      where: { id: archivoId, eliminadoEn: null },
      select: {
        ruta: true, nombreOriginal: true, mimeType: true, tamanioBytes: true,
        contenido: { select: { grupoId: true, itemCronograma: { select: { fechaLiberacion: true, eliminadoEn: true } } } },
      },
    });
    if (!archivo || archivo.contenido.itemCronograma.eliminadoEn) throw contenidoNoDisponible();
    const { grupoId } = archivo.contenido;
    if (!(await this.puedeVer(grupoId, fechaCivil(archivo.contenido.itemCronograma.fechaLiberacion), personaId, roles))) throw contenidoNoDisponible();
    const stream = await this.storage.leer('contenidos', archivo.ruta).catch(() => {
      throw contenidoNoDisponible();
    });
    return { stream, nombre: archivo.nombreOriginal, mimeType: archivo.mimeType, tamanioBytes: archivo.tamanioBytes };
  }

  private async puedeVer(grupoId: string, fechaLiberacion: string, personaId: string | null, roles: readonly string[]): Promise<boolean> {
    if (tienePermiso(roles, 'grupos.ver')) return true;
    if (!personaId) return false;
    const liderazgo = await this.prisma.liderazgo.findFirst({ where: { grupoId, personaId, hasta: null }, select: { id: true } });
    if (liderazgo) return true;
    const inscripcion = await this.prisma.inscripcion.findFirst({ where: { grupoId, personaId }, select: { estado: true, cerradaEn: true } });
    if (!inscripcion) return false;
    // Hay archivo, así que la semana tiene material: solo falta la fecha y el corte por baja.
    return semanaVisible({ estado: inscripcion.estado, cerradaEn: cierreCivil(inscripcion.cerradaEn) }, { fechaLiberacion }, true, hoyEnArgentina());
  }
}
