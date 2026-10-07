import { Module } from '@nestjs/common';
import { DiscipuladoModule } from '../discipulado/discipulado.module.js';
import { SolicitudDiscipuladoController } from './solicitud-discipulado.controller.js';
import { SolicitudDiscipuladoService } from './solicitud-discipulado.service.js';

/**
 * specs/004-vida-nueva-discipulado, Historias 1/2/3 (lote A): pedir, editar y
 * retirar el pedido propio, pedir en nombre de otra Persona, la bandeja, el
 * detalle, el cruce, proponer, retirar la propuesta y rechazar. Importa
 * DiscipuladoModule por el CruceService y los eventos compartidos.
 */
@Module({
  imports: [DiscipuladoModule],
  controllers: [SolicitudDiscipuladoController],
  providers: [SolicitudDiscipuladoService],
})
export class SolicitudDiscipuladoModule {}
