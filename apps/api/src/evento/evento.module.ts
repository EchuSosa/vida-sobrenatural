import { Module } from '@nestjs/common';

/**
 * spec 011 — Eventos, inscripciones y pagos. Lote 0 global: módulo registrado
 * y modelos. Al cancelar o desactivar un Evento de bautismo llama, dentro de
 * la misma transacción, a `BautismoService.liberarAsignacionesDeEvento` (E7):
 * importar `BautismoModule` acá cuando se construya. Los comprobantes van por
 * `StorageService.subirPrivado('comprobantes', …)` (D168).
 */
@Module({})
export class EventoModule {}
