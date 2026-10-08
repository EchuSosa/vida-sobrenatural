import { Module } from '@nestjs/common';

/**
 * spec 006 — Mi camino por etapas, historial previo y Completitud Manual.
 * Lote 0 global: el módulo registrado y `consultas.ts` (`completoEtapa`,
 * `bloquearPersona`), que ya usan otras specs. La sesión de la 006 suma acá
 * `camino.controller.ts`/`camino.service.ts` (lote A) e `historial-admin.*`
 * (lote B), cada uno en su archivo.
 */
@Module({})
export class CaminoModule {}
