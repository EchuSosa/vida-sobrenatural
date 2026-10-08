import { Module } from '@nestjs/common';
import { CursoModule } from '../curso/curso.module.js';
import { CruceService } from './cruce.service.js';
import { EventosDiscipuladoService } from './eventos.js';
import { PropuestasService } from './propuestas.service.js';
import { MisDiscipuladosService } from './mis-discipulados.service.js';
import { EncuentrosService } from './encuentros.service.js';
import { FinalizacionService } from './finalizacion.service.js';
import { BajaService } from './baja.service.js';
import { ReasignacionService } from './reasignacion.service.js';
import { GruposService } from './grupos.service.js';
import { PendientesAdminService } from './pendientes-admin.service.js';
import { MisDiscipuladosController } from './mis-discipulados.controller.js';
import { GruposController } from './grupos.controller.js';

/**
 * specs/004-vida-nueva-discipulado. El lote 0 dejó la base compartida: el
 * cruce (T011c) y los eventos (T011b), que también consume el módulo de
 * Solicitudes (lote A). El lote B suma el discipulado propiamente dicho:
 * propuestas (aceptar/declinar), Mis discipulados, Encuentros, finalización,
 * baja, reasignación, la vista de Grupos y los pendientes del Admin. Las
 * funciones de `discipulados-activos.ts` (D137) y `consultas.ts` se importan
 * directo donde hacen falta, como funciones, no como provider.
 */
@Module({
  // 013 FR-054: `CursoService.exigirActivo` al aceptar una propuesta que abre un Grupo.
  imports: [CursoModule],
  controllers: [MisDiscipuladosController, GruposController],
  providers: [
    CruceService,
    EventosDiscipuladoService,
    PropuestasService,
    MisDiscipuladosService,
    EncuentrosService,
    FinalizacionService,
    BajaService,
    ReasignacionService,
    GruposService,
    PendientesAdminService,
  ],
  exports: [CruceService, EventosDiscipuladoService],
})
export class DiscipuladoModule {}
