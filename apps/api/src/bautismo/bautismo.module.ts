import { Module } from '@nestjs/common';
import { BautismoService } from './bautismo.service.js';

/**
 * spec 010 — Bautismo. Exporta `BautismoService`: lo importan `EventoModule`
 * (011) y `CaminoModule` (006) para los hooks.
 */
@Module({
  providers: [BautismoService],
  exports: [BautismoService],
})
export class BautismoModule {}
