import type { Readable } from 'node:stream';

/**
 * D110 (contracts/portadas-storage.md, research.md Decisión 3): interfaz
 * mínima detrás de la que queda el proveedor concreto — local en dev
 * (`LocalStorageProvider`), migrable a S3-compatible después sin tocar la
 * lógica de negocio que la usa.
 *
 * Clase abstracta, no `interface` — NestJS necesita un token de inyección
 * real en tiempo de ejecución; una `interface` de TypeScript desaparece al
 * compilar. `storage.module.ts` provee `LocalStorageProvider` bajo este
 * token (`{ provide: StorageService, useClass: LocalStorageProvider }`).
 *
 * Lote 0 global (D168, specs 008 y 011): **áreas**. Las públicas (`portadas`,
 * `flyers`) se sirven por URL estática (`main.ts`); las privadas
 * (`contenidos` — material de Vida de Servicio —, `comprobantes` — pagos de
 * Eventos) NUNCA: se leen con `leer()` desde un endpoint de la API que valida
 * el permiso en cada pedido (Principio V).
 */
export type AreaPublica = 'portadas' | 'flyers';
export type AreaPrivada = 'contenidos' | 'comprobantes';
export type AreaStorage = AreaPublica | AreaPrivada;

export const AREAS_PUBLICAS: readonly AreaPublica[] = ['portadas', 'flyers'];
export const AREAS_PRIVADAS: readonly AreaPrivada[] = ['contenidos', 'comprobantes'];

export interface ArchivoASubir {
  buffer: Buffer;
  nombreOriginal: string;
  mimeType: string;
}

export abstract class StorageService {
  /** Sube a un área pública (por defecto `portadas`, el uso de la 003) y devuelve su URL pública. */
  abstract subir(args: ArchivoASubir & { area?: AreaPublica }): Promise<{ ruta: string; url: string }>;
  /** Sube a un área privada: no tiene URL; se sirve con `leer` desde la API. */
  abstract subirPrivado(area: AreaPrivada, args: ArchivoASubir): Promise<{ ruta: string }>;
  /** Lee un archivo (de cualquier área) para servirlo desde un endpoint con permiso. */
  abstract leer(area: AreaStorage, ruta: string): Promise<Readable>;
  /** No-op si no existe. `area` por defecto `portadas`. */
  abstract eliminar(ruta: string, area?: AreaStorage): Promise<void>;
}
