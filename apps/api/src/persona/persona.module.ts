import { Module } from '@nestjs/common';
import { PersonaController } from './persona.controller.js';
import { PersonaService } from './persona.service.js';
import { RolesController } from './roles.controller.js';
import { RolesService } from './roles.service.js';
import { RolesDeEstadoService } from './roles-de-estado.service.js';
import { CambioDeRolModule } from '../cambio-de-rol/cambio-de-rol.module.js';

@Module({
  imports: [CambioDeRolModule],
  controllers: [PersonaController, RolesController],
  providers: [PersonaService, RolesService, RolesDeEstadoService],
  exports: [PersonaService],
})
export class PersonaModule {}
