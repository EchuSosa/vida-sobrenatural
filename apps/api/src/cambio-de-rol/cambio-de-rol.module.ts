import { Module } from '@nestjs/common';
import { CambioDeRolController } from './cambio-de-rol.controller.js';
import { CambioDeRolService } from './cambio-de-rol.service.js';

@Module({
  controllers: [CambioDeRolController],
  providers: [CambioDeRolService],
  exports: [CambioDeRolService],
})
export class CambioDeRolModule {}
