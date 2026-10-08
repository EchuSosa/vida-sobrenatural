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
import { EdicionPersonaController } from './edicion-persona.controller.js';
import { EdicionPersonaService } from './edicion-persona.service.js';

@Module({
  imports: [CambioDeRolModule],
  // PerfilPersona*: spec 013, lote 2 (perfil del backoffice).
  // EdicionPersona*: spec 013, lote 7 (el Admin corrige los datos).
  // spec 006 (lote D): el alta por el Admin y "Agregar email", en sus archivos.
  controllers: [PersonaController, RolesController, PerfilPersonaController, AltaPersonaController, EdicionPersonaController],
  providers: [PersonaService, RolesService, RolesDeEstadoService, PerfilPersonaService, AltaPersonaService, EdicionPersonaService],
  exports: [PersonaService],
})
export class PersonaModule {}
