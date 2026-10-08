import { Module } from '@nestjs/common';
import { ComentarioController } from './comentario.controller.js';
import { ComentarioService } from './comentario.service.js';

/**
 * spec 013 — "Contanos qué te parece" (`ComentarioApp`, Historia 5). El límite
 * de envíos es el mecanismo de la 007 (huella del origen + conteo de la última
 * hora), no @nestjs/throttler (research #9). `EmailService` es global.
 */
@Module({
  controllers: [ComentarioController],
  providers: [ComentarioService],
})
export class ComentarioModule {}
