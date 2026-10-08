import { Global, Module } from '@nestjs/common';
import { NotificacionesService } from './notificaciones.service.js';
import { AvisosController } from './avisos.controller.js';
import { NotificacionesController } from './notificaciones.controller.js';
import { AvisosService } from './avisos.service.js';
import { EnvioEmailsService } from './envio-emails.service.js';

/**
 * spec 012 — dueño de `notificaciones` y `entregas_notificacion`. Global: las
 * specs 004–011 inyectan `NotificacionesService` y emiten dentro de su
 * transacción sin importar el módulo (contracts/emision.md, D197).
 */
@Global()
@Module({
  controllers: [AvisosController, NotificacionesController],
  providers: [NotificacionesService, AvisosService, EnvioEmailsService],
  exports: [NotificacionesService, EnvioEmailsService],
})
export class NotificacionesModule {}
