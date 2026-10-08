import { Module } from '@nestjs/common';
import { SolicitudDiscipuladoModule } from '../solicitud-discipulado/solicitud-discipulado.module.js';
import { CaminoController } from './camino.controller.js';
import { CaminoService } from './camino.service.js';

/**
 * spec 006 — Mi camino por etapas, historial previo y Completitud Manual.
 * `consultas.ts` (`completoEtapa`, `bloquearPersona`…) son funciones sin DI
 * que ya usan otras specs. Lote A: lo de la Persona (`camino.controller`/
 * `camino.service`). Lote B suma `historial-admin.*` en su propio archivo.
 * Importa SolicitudDiscipuladoModule por `estadoPropio` (FR-005).
 */
@Module({
  imports: [SolicitudDiscipuladoModule],
  controllers: [CaminoController],
  providers: [CaminoService],
})
export class CaminoModule {}
