import { Module } from '@nestjs/common';
import { LibroController } from './libro.controller.js';
import { LibroService } from './libro.service.js';

@Module({
  controllers: [LibroController],
  providers: [LibroService],
  exports: [LibroService],
})
export class LibroModule {}
