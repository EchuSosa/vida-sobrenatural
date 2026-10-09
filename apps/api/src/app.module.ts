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
import { EmailModule } from './email/email.module.js';
import { NotificacionesModule } from './notificaciones/notificaciones.module.js';
import { BandejaModule } from './bandeja/bandeja.module.js';
import { CaminoModule } from './camino/camino.module.js';
import { CodigoIngresoModule } from './codigo-ingreso/codigo-ingreso.module.js';
import { VidaDeServicioModule } from './vida-de-servicio/vida-de-servicio.module.js';
import { MinisterioModule } from './ministerio/ministerio.module.js';
import { BautismoModule } from './bautismo/bautismo.module.js';
import { EventoModule } from './evento/evento.module.js';
import { TareasProgramadasModule } from './tareas-programadas/tareas-programadas.module.js';
import { InicioModule } from './inicio/inicio.module.js';
import { ComentarioModule } from './comentario/comentario.module.js';
import { CursoModule } from './curso/curso.module.js';
import { GrupoExtensionModule } from './grupo-extension/grupo-extension.module.js';

@Module({
  imports: [PrismaModule, AuthModule, SedeModule, PersonaModule, CambioDeRolModule, PalabraProfeticaModule, LibroModule, DiscipuladoModule, SolicitudDiscipuladoModule, DisponibilidadModule,
    // Lote 0 global (specs 006–013, specs/IMPLEMENTACION.md): transversales…
    EmailModule, NotificacionesModule, BandejaModule,
    // …y uno por spec, cada uno dueño de su carpeta.
    CaminoModule, CodigoIngresoModule, VidaDeServicioModule, MinisterioModule, BautismoModule, EventoModule,
    TareasProgramadasModule, InicioModule, ComentarioModule, CursoModule,
    // spec 014 (después del lote 0: registra su propio módulo).
    GrupoExtensionModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
