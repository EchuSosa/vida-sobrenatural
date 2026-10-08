import { Module } from '@nestjs/common';
import { PersonaController } from './persona.controller.js';
import { PersonaService } from './persona.service.js';
import { RolesController } from './roles.controller.js';
import { RolesService } from './roles.service.js';
import { RolesDeEstadoService } from './roles-de-estado.service.js';
import { PerfilPersonaController } from './perfil-persona.controller.js';
import { PerfilPersonaService } from './perfil-persona.service.js';
import { CambioDeRolModule } from '../cambio-de-rol/cambio-de-rol.module.js';
import { AltaPersonaController } from './alta-persona.controller.js';
import { AltaPersonaService } from './alta-persona.service.js';

@Module({
  imports: [CambioDeRolModule],
  // PerfilPersona*: spec 013, lote 2 (perfil del backoffice).
  // spec 006 (lote D): el alta por el Admin y "Agregar email", en sus archivos.
  controllers: [PersonaController, RolesController, PerfilPersonaController, AltaPersonaController],
  providers: [PersonaService, RolesService, RolesDeEstadoService, PerfilPersonaService, AltaPersonaService],
  exports: [PersonaService],
})
export class PersonaModule {}
