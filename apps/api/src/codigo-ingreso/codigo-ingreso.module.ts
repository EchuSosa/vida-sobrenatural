import { Module } from '@nestjs/common';
import { CodigoIngresoController } from './codigo-ingreso.controller.js';
import { CodigoIngresoService } from './codigo-ingreso.service.js';

/**
 * spec 007 — ingreso con código por email (D140, D141). `EmailService` llega
 * del `EmailModule` global; `InternalLookupGuard`, del `AuthModule` global.
 * El throttling es propio (FR-009, por email y por origen, contado en la
 * tabla `codigos_ingreso`): research.md #5.
 */
@Module({
  controllers: [CodigoIngresoController],
  providers: [CodigoIngresoService],
})
export class CodigoIngresoModule {}
