import { Module, type OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { RegistroFuentesSolicitudes } from '../bandeja/registro-fuentes.js';
import { RegistroPendientesAdmin } from '../bandeja/registro-pendientes.js';
import { StorageModule } from '../storage/storage.module.js';
import { FuenteVidaDeServicio } from './fuente-bandeja.js';
import { MiVidaDeServicioController } from './mi-vida-de-servicio.controller.js';
import { MiVidaDeServicioService } from './mi-vida-de-servicio.service.js';
import { SolicitudesVidaDeServicioController } from './solicitudes-vs.controller.js';
import { SolicitudesVidaDeServicioService } from './solicitudes.service.js';
import { GruposVsController } from './grupos-vs.controller.js';
import { EdicionesService } from './ediciones.service.js';
import { MisGruposController } from './mis-grupos.controller.js';
import { MisGruposService } from './mis-grupos.service.js';
import { ContenidoService } from './contenido.service.js';
import { AsistenciaService } from './asistencia.service.js';
import { ArchivosController } from './archivos.controller.js';
import { ArchivosService } from './archivos.service.js';

/**
 * spec 008 — Vida de Servicio.
 * - Lote A, la Persona y las Solicitudes: `mi-vida-de-servicio.*`,
 *   `solicitudes.*` y la fuente `vida_de_servicio` de la bandeja (§2.3).
 * - Lote B, el Admin: `ediciones.service`, `grupos-vs.controller` y las filas
 *   de los Pendientes del Inicio (§2.4).
 * - Lote C, el Líder: `mis-grupos.*`, `contenido.service`,
 *   `asistencia.service` y los archivos privados (`archivos.*`, D168).
 * `ContenidoService` queda exportado: `marcarLiberacionesDeHoy` la llama el
 * proceso programado de la 012 (research #4).
 */
@Module({
  imports: [StorageModule],
  controllers: [MiVidaDeServicioController, SolicitudesVidaDeServicioController, GruposVsController, MisGruposController, ArchivosController],
  providers: [MiVidaDeServicioService, SolicitudesVidaDeServicioService, EdicionesService, MisGruposService, ContenidoService, AsistenciaService, ArchivosService],
  exports: [ContenidoService],
})
export class VidaDeServicioModule implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fuentes: RegistroFuentesSolicitudes,
    private readonly pendientes: RegistroPendientesAdmin,
    private readonly ediciones: EdicionesService,
  ) {}

  onModuleInit(): void {
    this.fuentes.registrar(new FuenteVidaDeServicio(this.prisma));
    // FR-039: hasta la 012, la forma en que el Admin se entera de lo que proponen los Líderes.
    this.pendientes.registrar({
      clave: 'vida_servicio_finalizaciones',
      enlace: '/grupos?curso=vida_de_servicio&pendiente=finalizacion',
      contar: () => this.ediciones.contarFinalizacionesPropuestas(),
    });
    this.pendientes.registrar({
      clave: 'vida_servicio_bajas',
      enlace: '/grupos?curso=vida_de_servicio&pendiente=baja',
      contar: () => this.ediciones.contarBajasPropuestas(),
    });
  }
}
