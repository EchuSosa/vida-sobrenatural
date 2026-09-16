import { Module } from '@nestjs/common';
import { PersonaController } from './persona.controller.js';
import { PersonaService } from './persona.service.js';

@Module({
  controllers: [PersonaController],
  providers: [PersonaService],
  exports: [PersonaService],
})
export class PersonaModule {}
