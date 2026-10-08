import { Module, type OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { RegistroFuentesSolicitudes } from '../bandeja/registro-fuentes.js';
import { RegistroPendientesAdmin } from '../bandeja/registro-pendientes.js';
import { RolesDeEstadoService } from '../persona/roles-de-estado.service.js';
import { PostulacionPersonaController } from './postulacion-persona.controller.js';
import { PostulacionPersonaService } from './postulacion-persona.service.js';
import { PostulacionAdminController } from './postulacion-admin.controller.js';
import { PostulacionAdminService } from './postulacion-admin.service.js';
import { MinisterioController } from './ministerio.controller.js';
import { MinisterioService } from './ministerio.service.js';
import { CelulaService } from './celula.service.js';
import { FuentePostulacion } from './fuente-bandeja.js';

/**
 * spec 009 — Ministerios, Células y Postulaciones. `miembros.ts`
 * (`miembrosActivosDe`) lo lee el resolvedor de destinatarios de avisos (012).
 * El controller de la Persona va PRIMERO: sus rutas `/ministerios/me…` tienen
 * que ganarle a `/ministerios/:id` del catálogo. `RolesDeEstadoService` es el
 * lugar único de roles de estado (005, FR-019): se provee acá porque
 * PersonaModule no lo exporta y su módulo no es de esta spec.
 * Registra la fuente `postulacion` de la bandeja y su fila en los Pendientes
 * del Inicio (FR-015, FR-041; IMPLEMENTACION §2.3 y §2.4).
 */
@Module({
  controllers: [
    PostulacionPersonaController,
    PostulacionAdminController,
    MinisterioController,
  ],
  providers: [
    PostulacionPersonaService,
    PostulacionAdminService,
    MinisterioService,
    CelulaService,
    RolesDeEstadoService,
  ],
})
export class MinisterioModule implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fuentes: RegistroFuentesSolicitudes,
    private readonly pendientes: RegistroPendientesAdmin,
  ) {}

  onModuleInit(): void {
    this.fuentes.registrar(new FuentePostulacion(this.prisma));
    // FR-041: hasta la 012, la forma en que el Admin se entera.
    this.pendientes.registrar({
      clave: 'ministerio_postulaciones',
      enlace: '/solicitudes?tipo=postulacion',
      contar: () =>
        this.prisma.postulacion.count({ where: { estado: 'pendiente' } }),
    });
  }
}
