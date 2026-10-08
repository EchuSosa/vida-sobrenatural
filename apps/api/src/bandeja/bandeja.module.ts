import { Global, Module } from '@nestjs/common';
import { BandejaController } from './bandeja.controller.js';
import { BandejaService } from './bandeja.service.js';
import { RegistroFuentesSolicitudes } from './registro-fuentes.js';
import { RegistroPendientesAdmin } from './registro-pendientes.js';

/**
 * spec 013 (D178) — dueña de la vista `solicitudes_bandeja` y del registro de
 * fuentes, y del registro de filas de la tarjeta "Pendientes" del Inicio
 * (`RegistroPendientesAdmin`). Global: cada módulo de tipo inyecta `RegistroFuentesSolicitudes`
 * para conectarse. `BandejaController`: `GET /solicitudes` (generaliza el de
 * la 004) y `GET /solicitudes/conteo-abiertas` (013, lote 1).
 */
@Global()
@Module({
  controllers: [BandejaController],
  providers: [RegistroFuentesSolicitudes, BandejaService, RegistroPendientesAdmin],
  exports: [RegistroFuentesSolicitudes, BandejaService, RegistroPendientesAdmin],
})
export class BandejaModule {}
