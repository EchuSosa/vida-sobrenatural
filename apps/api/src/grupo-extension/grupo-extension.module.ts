import { Module, type OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { RegistroFuentesSolicitudes } from '../bandeja/registro-fuentes.js';
import { RegistroPendientesAdmin } from '../bandeja/registro-pendientes.js';
import { GEOCODIFICADOR, crearGeocodificador } from './geocodificador.js';
import { GruposPersonaController } from './grupos-persona.controller.js';
import { GruposAdminController } from './grupos-admin.controller.js';
import { GruposExtensionService } from './grupos-extension.service.js';
import { SolicitudesGexService } from './solicitudes-gex.service.js';
import { FuenteGrupoExtension } from './fuente-bandeja.js';

/**
 * spec 014 — Grupos de Extensión (D220–D228). El controller de la persona va
 * PRIMERO: `/grupos-extension/me`, `/buscar` y `/liderados` tienen que
 * ganarle a `/grupos-extension/:id`. El geocodificador es un provider
 * (`GEOCODIFICADOR`) para que los tests lo reemplacen (D223).
 */
@Module({
  controllers: [GruposPersonaController, GruposAdminController],
  providers: [GruposExtensionService, SolicitudesGexService, { provide: GEOCODIFICADOR, useFactory: crearGeocodificador }],
})
export class GrupoExtensionModule implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fuentes: RegistroFuentesSolicitudes,
    private readonly pendientes: RegistroPendientesAdmin,
  ) {}

  onModuleInit(): void {
    this.fuentes.registrar(new FuenteGrupoExtension(this.prisma));
    // D201: el Admin no recibe avisos; ve los pedidos que esperan en el Inicio.
    this.pendientes.registrar({
      clave: 'grupo_extension_pedidos',
      enlace: '/solicitudes?tipo=grupo_extension',
      contar: () => this.prisma.solicitudGrupoExtension.count({ where: { estado: 'pendiente' } }),
    });
  }
}
