import { Module } from '@nestjs/common';
import { CursoController } from './curso.controller.js';
import { CursoService } from './curso.service.js';

/**
 * spec 013, Historia 6 — catálogo de Cursos (`CURSOS_RECONOCIDOS`, D212) y
 * el resumen de Catálogos. Exporta `CursoService.exigirActivo` para quien
 * crea Grupos (FR-054).
 */
@Module({
  controllers: [CursoController],
  providers: [CursoService],
  exports: [CursoService],
})
export class CursoModule {}
