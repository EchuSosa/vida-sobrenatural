import { Module } from '@nestjs/common';
import { BautismoModule } from '../bautismo/bautismo.module.js';
import { StorageModule } from '../storage/storage.module.js';
import { EventosPublicosController } from './eventos-publicos.controller.js';
import { EventosPublicosService } from './eventos-publicos.service.js';
import { EventosGestionController } from './eventos-gestion.controller.js';
import { EventosGestionService } from './eventos-gestion.service.js';
import { InscripcionPropiaController } from './inscripcion-propia.controller.js';
import { InscripcionPropiaService } from './inscripcion-propia.service.js';
import { MisEventosService } from './mis-eventos.service.js';
import { LimitePedidosGuard } from './limite-pedidos.guard.js';
import { PagosController } from './pagos.controller.js';
import { PagosPersonaService } from './pagos-persona.service.js';
import { PagosAdminService } from './pagos-admin.service.js';
import { InscriptosController } from './inscriptos.controller.js';
import { InscriptosService } from './inscriptos.service.js';
import { EventosConsultasService } from './eventos-consultas.service.js';
import { FuenteBandejaInscripcionEvento, FuenteBandejaPago } from './fuentes-bandeja.js';

/**
 * spec 011 — Eventos, inscripciones y pagos. Al cancelar un Evento llama,
 * dentro de la misma transacción, a `BautismoService.liberarAsignacionesDeEvento`
 * (E7). Los comprobantes van por `StorageService.subirPrivado('comprobantes', …)`
 * (D168). Los controllers públicos van primero: sus rutas fijas
 * (`/eventos/publicos`) no pueden caer en `/eventos/:id`.
 */
@Module({
  imports: [BautismoModule, StorageModule],
  controllers: [EventosPublicosController, InscripcionPropiaController, PagosController, InscriptosController, EventosGestionController],
  providers: [EventosPublicosService, EventosGestionService, InscripcionPropiaService, MisEventosService, LimitePedidosGuard, PagosPersonaService, PagosAdminService, InscriptosService, EventosConsultasService, FuenteBandejaInscripcionEvento, FuenteBandejaPago],
  exports: [EventosGestionService, EventosConsultasService, InscriptosService],
})
export class EventoModule {}
