/**
 * D110 (contracts/portadas-storage.md, research.md Decisión 3): interfaz
 * mínima detrás de la que queda el proveedor concreto — local en dev
 * (`LocalStorageProvider`), migrable a S3-compatible después sin tocar la
 * lógica de negocio que la usa (`libro.service.ts`).
 *
 * Clase abstracta, no `interface` — NestJS necesita un token de inyección
 * real en tiempo de ejecución; una `interface` de TypeScript desaparece al
 * compilar. `storage.module.ts` provee `LocalStorageProvider` bajo este
 * token (`{ provide: StorageService, useClass: LocalStorageProvider }`).
 *
 * Sin `descargar`: las portadas se sirven por URL pública estática
 * (`main.ts`), no por un endpoint de descarga controlado — se agrega el
 * día que un archivo privado (ej. un comprobante de Pago) lo necesite
 * (Principio IV: no se construye antes de tener un consumidor real).
 */
export abstract class StorageService {
  abstract subir(args: { buffer: Buffer; nombreOriginal: string; mimeType: string }): Promise<{ ruta: string; url: string }>;
  abstract eliminar(ruta: string): Promise<void>;
}
