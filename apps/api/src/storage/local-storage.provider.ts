import { randomUUID } from 'node:crypto';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Injectable } from '@nestjs/common';
import { StorageService } from './storage.service.js';

const EXTENSION_POR_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

/**
 * Proveedor de dev de `StorageService` (D110) — escribe en una carpeta
 * fuera del control de versiones (`STORAGE_DIR`, `.gitignore`), servida
 * como estática por `main.ts` bajo una ruta pública propia. No durable
 * hasta que exista hosting con almacenamiento persistente (D75) — ver
 * plan.md § Storage.
 */
@Injectable()
export class LocalStorageProvider extends StorageService {
  private readonly directorio = process.env.STORAGE_DIR ?? './storage/portadas';
  // D85: la URL base nunca se escribe a mano en el código — sin variable
  // propia todavía (dev-only, D75 pospuesta), cae al mismo puerto fijo
  // (D104) que ya usa el resto de la app como fallback local.
  private readonly urlPublicaBase = process.env.API_PUBLIC_URL ?? 'http://localhost:3333';

  async subir({ buffer, mimeType }: { buffer: Buffer; nombreOriginal: string; mimeType: string }) {
    await mkdir(this.directorio, { recursive: true });
    const extension = EXTENSION_POR_MIME[mimeType] ?? '';
    // Nombre generado por el sistema (FR-023) — nunca el que trae quien sube.
    const nombreArchivo = `${randomUUID()}${extension}`;
    await writeFile(join(this.directorio, nombreArchivo), buffer);

    return {
      ruta: nombreArchivo,
      url: `${this.urlPublicaBase}/archivos/portadas/${nombreArchivo}`,
    };
  }

  async eliminar(ruta: string): Promise<void> {
    // No-op si ya no existe — evita que un doble llamado (ej. un reintento
    // de red) rompa el flujo.
    await rm(join(this.directorio, ruta), { force: true });
  }
}
