import { Module, type OnModuleInit } from '@nestjs/common';
import { SolicitudDiscipuladoModule } from '../solicitud-discipulado/solicitud-discipulado.module.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { RegistroFuentesSolicitudes } from '../bandeja/registro-fuentes.js';
import { RegistroPendientesAdmin } from '../bandeja/registro-pendientes.js';
import { CaminoController } from './camino.controller.js';
import { CaminoService } from './camino.service.js';
import { HistorialAdminController } from './historial-admin.controller.js';
import { HistorialAdminService } from './historial-admin.service.js';
import { FuenteHistorial } from './fuente-bandeja.js';

/**
 * spec 006 — Mi camino por etapas, historial previo y Completitud Manual.
 * `consultas.ts` (`completoEtapa`, `bloquearPersona`…) son funciones sin DI
 * que ya usan otras specs. Lote A: lo de la Persona (`camino.*`). Lote B: lo
 * del Admin (`historial-admin.*`), la fuente `historial` de la bandeja y su
 * fila en los Pendientes del Inicio (IMPLEMENTACION §2.3 y §2.4).
 * Importa SolicitudDiscipuladoModule por `estadoPropio` (FR-005).
 */
@Module({
  imports: [SolicitudDiscipuladoModule],
  controllers: [CaminoController, HistorialAdminController],
  providers: [CaminoService, HistorialAdminService],
})
export class CaminoModule implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fuentes: RegistroFuentesSolicitudes,
    private readonly pendientes: RegistroPendientesAdmin,
  ) {}

  onModuleInit(): void {
    this.fuentes.registrar(new FuenteHistorial(this.prisma));
    // FR-012: hasta la 012, la única forma en que el Admin se entera.
    this.pendientes.registrar({
      clave: 'historial_declaraciones',
      enlace: '/solicitudes?tipo=historial',
      contar: () => this.prisma.declaracionHistorial.count({ where: { estado: 'pendiente' } }),
    });
  }
}
