import { Module } from '@nestjs/common';
import { StorageService } from './storage.service.js';
import { LocalStorageProvider } from './local-storage.provider.js';
import { ImagenPortadaService } from './imagen-portada.service.js';
import { ImagenPublicaService } from './imagen-publica.service.js';

@Module({
  providers: [{ provide: StorageService, useClass: LocalStorageProvider }, ImagenPortadaService, ImagenPublicaService],
  exports: [StorageService, ImagenPortadaService, ImagenPublicaService],
})
export class StorageModule {}
