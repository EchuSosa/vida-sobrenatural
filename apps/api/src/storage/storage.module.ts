import { Module } from '@nestjs/common';
import { StorageService } from './storage.service.js';
import { LocalStorageProvider } from './local-storage.provider.js';
import { ImagenPortadaService } from './imagen-portada.service.js';

@Module({
  providers: [{ provide: StorageService, useClass: LocalStorageProvider }, ImagenPortadaService],
  exports: [StorageService, ImagenPortadaService],
})
export class StorageModule {}
