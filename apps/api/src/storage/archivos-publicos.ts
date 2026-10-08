import { join } from 'node:path';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { CARPETA_DE_AREA, PREFIJO_URL_DE_AREA, directorioBase } from './local-storage.provider.js';

/**
 * D110/FR-026 y D168: sirve como estáticas SOLO las áreas públicas
 * (`portadas` en la raíz de STORAGE_DIR, `flyers` en su carpeta). Las
 * privadas viven bajo `.privado/` y `dotfiles: 'deny'` las deja afuera aunque
 * estén dentro de la raíz servida. Una sola función para `main.ts` y para el
 * test que lo verifica.
 */
export function servirArchivosPublicos(app: NestExpressApplication): void {
  app.useStaticAssets(directorioBase(), { prefix: PREFIJO_URL_DE_AREA.portadas, dotfiles: 'deny' });
  app.useStaticAssets(join(directorioBase(), CARPETA_DE_AREA.flyers), { prefix: PREFIJO_URL_DE_AREA.flyers, dotfiles: 'deny' });
}
