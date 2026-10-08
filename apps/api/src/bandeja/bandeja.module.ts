import { Global, Module } from '@nestjs/common';
import { BandejaService } from './bandeja.service.js';
import { RegistroFuentesSolicitudes } from './registro-fuentes.js';
import { RegistroPendientesAdmin } from './registro-pendientes.js';

/**
 * spec 013 (D178) — dueña de la vista `solicitudes_bandeja` y del registro de
 * fuentes, y del registro de filas de la tarjeta "Pendientes" del Inicio
 * (`RegistroPendientesAdmin`). Global: cada módulo de tipo inyecta `RegistroFuentesSolicitudes`
 * para conectarse. El controller (`GET /solicitudes` generalizado,
 * `GET /solicitudes/conteo-abiertas`) lo suma la 013 en su lote 1.
 */
@Global()
@Module({
  providers: [RegistroFuentesSolicitudes, BandejaService, RegistroPendientesAdmin],
  exports: [RegistroFuentesSolicitudes, BandejaService, RegistroPendientesAdmin],
})
export class BandejaModule {}
