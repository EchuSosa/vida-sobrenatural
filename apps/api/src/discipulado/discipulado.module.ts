import { Module } from '@nestjs/common';
import { CruceService } from './cruce.service.js';
import { EventosDiscipuladoService } from './eventos.js';

/**
 * specs/004-vida-nueva-discipulado. En el lote 0 este módulo trae solo la base
 * compartida: el cruce (T011c) y los eventos (T011b), que consumen los módulos
 * de Solicitudes y de discipulado propiamente dicho (lotes A y B). Las
 * funciones de `discipulados-activos.ts` (D137) se importan directo donde hacen
 * falta (roles.service en lote D, cruce acá), como funciones, no como provider.
 */
@Module({
  providers: [CruceService, EventosDiscipuladoService],
  exports: [CruceService, EventosDiscipuladoService],
})
export class DiscipuladoModule {}
