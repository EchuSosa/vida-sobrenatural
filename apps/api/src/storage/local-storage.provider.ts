import { randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { access, mkdir, rm, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import type { Readable } from 'node:stream';
import { Injectable } from '@nestjs/common';
import { AppException } from '../common/errors/app-exception.js';
import { StorageService, type AreaPrivada, type AreaPublica, type AreaStorage, type ArchivoASubir } from './storage.service.js';

const EXTENSION_POR_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'application/pdf': '.pdf',
};

/**
 * Carpeta de cada área bajo `STORAGE_DIR` (D168). `portadas` queda en la raíz,
 * como antes (no cambia ninguna URL ya guardada). Las privadas viven bajo
 * `.privado/`: `main.ts` sirve la raíz como estática con `dotfiles: 'deny'`,
 * así que nada que empiece con punto se sirve nunca (lo prueba
 * test/integration/storage-areas.integration-spec.ts).
 */
export const CARPETA_DE_AREA: Record<AreaStorage, string> = {
  portadas: '',
  flyers: 'flyers',
  contenidos: join('.privado', 'contenidos'),
  comprobantes: join('.privado', 'comprobantes'),
};

/** Prefijo de URL pública de cada área pública (lo sirve main.ts). */
export const PREFIJO_URL_DE_AREA: Record<AreaPublica, string> = {
  portadas: '/archivos/portadas/',
  flyers: '/archivos/flyers/',
};

export function directorioBase(): string {
  return process.env.STORAGE_DIR ?? './storage/portadas';
}

/**
 * Proveedor de dev de `StorageService` (D110) — escribe en una carpeta
 * fuera del control de versiones (`STORAGE_DIR`, `.gitignore`). No durable
 * hasta que exista hosting con almacenamiento persistente (D75).
 */
@Injectable()
export class LocalStorageProvider extends StorageService {
  // D85: la URL base nunca se escribe a mano en el código — sin variable
  // propia todavía (dev-only, D75 pospuesta), cae al mismo puerto fijo
  // (D104) que ya usa el resto de la app como fallback local.
  private readonly urlPublicaBase = process.env.API_PUBLIC_URL ?? 'http://localhost:3333';

  private directorio(area: AreaStorage): string {
    return join(directorioBase(), CARPETA_DE_AREA[area]);
  }

  private async escribir(area: AreaStorage, { buffer, mimeType }: ArchivoASubir): Promise<string> {
    const directorio = this.directorio(area);
    await mkdir(directorio, { recursive: true });
    // Nombre generado por el sistema (FR-023) — nunca el que trae quien sube.
    const nombreArchivo = `${randomUUID()}${EXTENSION_POR_MIME[mimeType] ?? ''}`;
    await writeFile(join(directorio, nombreArchivo), buffer);
    return nombreArchivo;
  }

  async subir(args: ArchivoASubir & { area?: AreaPublica }) {
    const area = args.area ?? 'portadas';
    const ruta = await this.escribir(area, args);
    return { ruta, url: `${this.urlPublicaBase}${PREFIJO_URL_DE_AREA[area]}${ruta}` };
  }

  async subirPrivado(area: AreaPrivada, args: ArchivoASubir) {
    return { ruta: await this.escribir(area, args) };
  }

  async leer(area: AreaStorage, ruta: string): Promise<Readable> {
    // La ruta la generó el sistema; `basename` impide cualquier `../`.
    const archivo = join(this.directorio(area), basename(ruta));
    try {
      await access(archivo);
    } catch {
      throw new AppException('NO_ENCONTRADO', 404, 'No encontramos ese archivo.');
    }
    return createReadStream(archivo);
  }

  async eliminar(ruta: string, area: AreaStorage = 'portadas'): Promise<void> {
    // No-op si ya no existe — evita que un doble llamado (ej. un reintento
    // de red) rompa el flujo.
    await rm(join(this.directorio(area), basename(ruta)), { force: true });
  }
}
