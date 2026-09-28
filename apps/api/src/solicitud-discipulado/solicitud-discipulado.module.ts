import { Module } from '@nestjs/common';
import { DiscipuladoModule } from '../discipulado/discipulado.module.js';

/**
 * specs/004-vida-nueva-discipulado, Historias 1/2/3 (lote A). En el lote 0
 * queda vacío y registrado; el controller y el service (pedir, editar/retirar,
 * bandeja, cruce, proponer) los agrega el lote A. Importa DiscipuladoModule
 * para usar el CruceService compartido.
 */
@Module({
  imports: [DiscipuladoModule],
})
export class SolicitudDiscipuladoModule {}
