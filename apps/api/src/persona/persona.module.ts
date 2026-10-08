import { Module } from '@nestjs/common';
import { PersonaController } from './persona.controller.js';
import { PersonaService } from './persona.service.js';
import { RolesController } from './roles.controller.js';
import { RolesService } from './roles.service.js';
import { RolesDeEstadoService } from './roles-de-estado.service.js';
import { PerfilPersonaController } from './perfil-persona.controller.js';
import { PerfilPersonaService } from './perfil-persona.service.js';
import { CambioDeRolModule } from '../cambio-de-rol/cambio-de-rol.module.js';

@Module({
  imports: [CambioDeRolModule],
  // PerfilPersona*: spec 013, lote 2 (perfil del backoffice).
  controllers: [PersonaController, RolesController, PerfilPersonaController],
  providers: [PersonaService, RolesService, RolesDeEstadoService, PerfilPersonaService],
  exports: [PersonaService],
})
export class PersonaModule {}
