import { Module, type OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { RegistroFuentesSolicitudes } from '../bandeja/registro-fuentes.js';
import { RegistroPendientesAdmin } from '../bandeja/registro-pendientes.js';
import { RolesDeEstadoService } from '../persona/roles-de-estado.service.js';
import { EleccionAdminController, EleccionLiderController, EleccionPersonaController } from './eleccion.controller.js';
import { EleccionService } from './eleccion.service.js';
import { FuenteEleccionMinisterio } from './fuente-bandeja.js';

/**
 * spec 015 — Elección de ministerio (D239–D242). El controller de la persona
 * va PRIMERO (`/elecciones-ministerio/me` le gana a `/:id`). Registra la
 * fuente `eleccion_ministerio` de la bandeja y su fila en los Pendientes del
 * Inicio (D201: el Admin no recibe avisos).
 */
@Module({
  controllers: [EleccionPersonaController, EleccionLiderController, EleccionAdminController],
  providers: [EleccionService, RolesDeEstadoService],
})
export class EleccionMinisterioModule implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fuentes: RegistroFuentesSolicitudes,
    private readonly pendientes: RegistroPendientesAdmin,
  ) {}

  onModuleInit(): void {
    this.fuentes.registrar(new FuenteEleccionMinisterio(this.prisma));
    this.pendientes.registrar({
      clave: 'eleccion_ministerio_charladas',
      enlace: '/solicitudes?tipo=eleccion_ministerio',
      contar: () => this.prisma.eleccionMinisterio.count({ where: { estado: 'charla_hecha' } }),
    });
  }
}
