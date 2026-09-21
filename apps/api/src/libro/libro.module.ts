import { Module } from '@nestjs/common';
import { LibroController } from './libro.controller.js';
import { LibroService } from './libro.service.js';
import { StorageModule } from '../storage/storage.module.js';

@Module({
  imports: [StorageModule],
  controllers: [LibroController],
  providers: [LibroService],
  exports: [LibroService],
})
export class LibroModule {}
