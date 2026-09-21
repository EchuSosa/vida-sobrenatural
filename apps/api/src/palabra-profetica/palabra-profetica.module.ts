import { Module } from '@nestjs/common';
import { PalabraProfeticaController } from './palabra-profetica.controller.js';
import { PalabraProfeticaService } from './palabra-profetica.service.js';

@Module({
  controllers: [PalabraProfeticaController],
  providers: [PalabraProfeticaService],
  exports: [PalabraProfeticaService],
})
export class PalabraProfeticaModule {}
