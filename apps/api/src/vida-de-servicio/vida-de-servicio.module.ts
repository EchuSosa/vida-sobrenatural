import { Module } from '@nestjs/common';

/**
 * spec 008 — Vida de Servicio (ediciones, cronograma, contenidos, solicitudes).
 * Lote 0 global: módulo registrado y modelos. Los archivos privados van por
 * `StorageService.subirPrivado('contenidos', …)` (D168).
 */
@Module({})
export class VidaDeServicioModule {}
