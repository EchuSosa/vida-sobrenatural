import { Module } from '@nestjs/common';
import { PersonaController } from './persona.controller.js';
import { PersonaService } from './persona.service.js';
import { RolesController } from './roles.controller.js';
import { RolesService } from './roles.service.js';

@Module({
  controllers: [PersonaController, RolesController],
  providers: [PersonaService, RolesService],
  exports: [PersonaService],
})
export class PersonaModule {}
