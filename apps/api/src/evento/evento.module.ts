import { Module } from '@nestjs/common';
import { BautismoModule } from '../bautismo/bautismo.module.js';
import { StorageModule } from '../storage/storage.module.js';
import { EventosPublicosController } from './eventos-publicos.controller.js';
import { EventosPublicosService } from './eventos-publicos.service.js';
import { EventosGestionController } from './eventos-gestion.controller.js';
import { EventosGestionService } from './eventos-gestion.service.js';

/**
 * spec 011 — Eventos, inscripciones y pagos. Al cancelar un Evento llama,
 * dentro de la misma transacción, a `BautismoService.liberarAsignacionesDeEvento`
 * (E7). Los comprobantes van por `StorageService.subirPrivado('comprobantes', …)`
 * (D168). Los controllers públicos van primero: sus rutas fijas
 * (`/eventos/publicos`) no pueden caer en `/eventos/:id`.
 */
@Module({
  imports: [BautismoModule, StorageModule],
  controllers: [EventosPublicosController, EventosGestionController],
  providers: [EventosPublicosService, EventosGestionService],
  exports: [EventosGestionService],
})
export class EventoModule {}
