import { Module, type OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { RegistroFuentesSolicitudes } from '../bandeja/registro-fuentes.js';
import { RegistroPendientesAdmin } from '../bandeja/registro-pendientes.js';
import { BautismoService } from './bautismo.service.js';
import { BautismoPersonaService } from './acciones-persona.js';
import { BautismoAdminService } from './acciones-admin.js';
import { BautismoExcepcionesService } from './acciones-excepciones.js';
import { BautismoMeController } from './me.controller.js';
import { BautismoController } from './bautismo.controller.js';
import { BautismoEnNombreController } from './en-nombre.controller.js';
import { FuenteBautismo } from './fuente-bandeja.js';

/**
 * spec 010 — Bautismo. Exporta `BautismoService` (los hooks): lo importan
 * `EventoModule` (011, E7) y `CaminoModule` (006, H3). Lo de cada lote vive
 * en su archivo (tasks.md, "Lotes"): `acciones-persona` + `me.controller`
 * (A), `acciones-admin` + `bautismo.controller` (B), `acciones-excepciones` +
 * `en-nombre.controller` (C). Registra su fuente de la bandeja y sus filas de
 * Pendientes del Inicio (IMPLEMENTACION §2.3 y §2.4).
 */
@Module({
  controllers: [BautismoMeController, BautismoController, BautismoEnNombreController],
  providers: [BautismoService, BautismoPersonaService, BautismoAdminService, BautismoExcepcionesService],
  exports: [BautismoService],
})
export class BautismoModule implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fuentes: RegistroFuentesSolicitudes,
    private readonly pendientes: RegistroPendientesAdmin,
  ) {}

  onModuleInit(): void {
    this.fuentes.registrar(new FuenteBautismo(this.prisma));
    // FR-029: aceptadas sin fecha, y Eventos que ya pasaron con asignadas sin confirmar.
    this.pendientes.registrar({
      clave: 'bautismo_esperando_fecha',
      enlace: '/solicitudes?tipo=bautismo&estado=aprobada',
      contar: () => this.prisma.solicitudBautismo.count({ where: { estado: 'aprobada', inscripcionEventoId: null } }),
    });
    this.pendientes.registrar({
      clave: 'bautismo_sin_confirmar',
      enlace: '/eventos?tipo=bautismo',
      contar: (ahora) =>
        this.prisma.evento.count({
          where: {
            tipo: 'bautismo',
            estado: 'publicado',
            eliminadoEn: null,
            inicio: { lte: ahora },
            inscripciones: { some: { solicitudBautismo: { estado: 'aprobada' } } },
          },
        }),
    });
  }
}
