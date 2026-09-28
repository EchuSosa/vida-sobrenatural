import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { SedeModule } from './sede/sede.module.js';
import { PersonaModule } from './persona/persona.module.js';
import { CambioDeRolModule } from './cambio-de-rol/cambio-de-rol.module.js';
import { AuthModule } from './auth/auth.module.js';
import { PalabraProfeticaModule } from './palabra-profetica/palabra-profetica.module.js';
import { LibroModule } from './libro/libro.module.js';
import { DiscipuladoModule } from './discipulado/discipulado.module.js';
import { SolicitudDiscipuladoModule } from './solicitud-discipulado/solicitud-discipulado.module.js';
import { DisponibilidadModule } from './disponibilidad/disponibilidad.module.js';

@Module({
  imports: [PrismaModule, AuthModule, SedeModule, PersonaModule, CambioDeRolModule, PalabraProfeticaModule, LibroModule, DiscipuladoModule, SolicitudDiscipuladoModule, DisponibilidadModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
