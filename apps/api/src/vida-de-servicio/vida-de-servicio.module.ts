import { Module, type OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { RegistroFuentesSolicitudes } from '../bandeja/registro-fuentes.js';
import { StorageModule } from '../storage/storage.module.js';
import { FuenteVidaDeServicio } from './fuente-bandeja.js';
import { MiVidaDeServicioController } from './mi-vida-de-servicio.controller.js';
import { MiVidaDeServicioService } from './mi-vida-de-servicio.service.js';
import { SolicitudesVidaDeServicioController } from './solicitudes-vs.controller.js';
import { SolicitudesVidaDeServicioService } from './solicitudes.service.js';

/**
 * spec 008 — Vida de Servicio. Lote A: la Persona (`mi-vida-de-servicio.*`)
 * y las Solicitudes (`solicitudes.*`, fuente `vida_de_servicio` de la
 * bandeja, IMPLEMENTACION §2.3). Los archivos privados van por
 * `StorageService.subirPrivado('contenidos', …)` (D168).
 */
@Module({
  imports: [StorageModule],
  controllers: [MiVidaDeServicioController, SolicitudesVidaDeServicioController],
  providers: [MiVidaDeServicioService, SolicitudesVidaDeServicioService],
})
export class VidaDeServicioModule implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fuentes: RegistroFuentesSolicitudes,
  ) {}

  onModuleInit(): void {
    this.fuentes.registrar(new FuenteVidaDeServicio(this.prisma));
  }
}
