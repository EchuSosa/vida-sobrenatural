import { Body, Controller, Get, HttpCode, Param, ParseIntPipe, Post, Put, Req, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ApiBearerAuth, ApiConsumes, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { ARCHIVOS_POR_SEMANA_MAX } from '@vida-sobrenatural/shared-types';
import { JwtNextAuthGuard } from '../auth/jwt-nextauth.guard.js';
import { PermisosGuard } from '../auth/permisos.guard.js';
import { RequierePermiso } from '../auth/permisos.decorator.js';
import type { AuthenticatedRequest } from '../auth/authenticated-request.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { personaActivaDeSesion } from './mi-vida-de-servicio.controller.js';
import { AsistenciaDto, BajaConTipoDto } from './dto/ediciones.dto.js';
import { MisGruposService } from './mis-grupos.service.js';
import { ContenidoService, type DatosMaterial } from './contenido.service.js';
import { AsistenciaService } from './asistencia.service.js';
import { grupoDelLiderOFallar } from './consultas-vs.js';

/**
 * Multer acepta un poco más que el límite (FR-023) para que el archivo
 * grande llegue al servicio y el error sea de CAMPO, con el límite dicho
 * (`ARCHIVO_DEMASIADO_GRANDE`), no un 413 crudo. Igual que las portadas.
 */
const LIMITE_MULTER_BYTES = 20 * 1024 * 1024;

/**
 * spec 008 — el Líder de curso en la web app (contracts/lider-api.md, D142).
 * `mis_grupos.ver` / `mis_grupos.gestionar` (lider_curso) MÁS el Liderazgo
 * vigente en ese Grupo, verificado por registro (FR-019, Principio V).
 */
@ApiTags('vida-de-servicio')
@Controller('vida-de-servicio/mis-grupos')
@UseGuards(JwtNextAuthGuard, PermisosGuard)
@ApiBearerAuth()
export class MisGruposController {
  constructor(
    private readonly misGrupos: MisGruposService,
    private readonly contenido: ContenidoService,
    private readonly asistencia: AsistenciaService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  @RequierePermiso('mis_grupos.ver')
  @ApiOkResponse({ description: 'spec 008, FR-019: MiGrupoResumen[] (solo Liderazgos vigentes del que pide).' })
  listar(@Req() request: AuthenticatedRequest) {
    return this.misGrupos.listar(personaActivaDeSesion(request));
  }

  @Get(':grupoId')
  @RequierePermiso('mis_grupos.ver')
  @ApiOkResponse({ description: 'spec 008: MiGrupoDetalle. 404 GRUPO_NO_ENCONTRADO si no es Líder vigente.' })
  detalle(@Param('grupoId') grupoId: string, @Req() request: AuthenticatedRequest) {
    return this.misGrupos.detalle(grupoId, personaActivaDeSesion(request));
  }

  @Get(':grupoId/semanas/:numero')
  @RequierePermiso('mis_grupos.ver')
  @ApiOkResponse({ description: 'spec 008: ContenidoParaLider.' })
  async semana(@Param('grupoId') grupoId: string, @Param('numero', ParseIntPipe) numero: number, @Req() request: AuthenticatedRequest) {
    await grupoDelLiderOFallar(this.prisma, grupoId, personaActivaDeSesion(request));
    return this.contenido.paraLider(grupoId, numero);
  }

  @Put(':grupoId/semanas/:numero')
  @RequierePermiso('mis_grupos.gestionar')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FilesInterceptor('archivosNuevos', ARCHIVOS_POR_SEMANA_MAX * 2, { storage: memoryStorage(), limits: { fileSize: LIMITE_MULTER_BYTES } }))
  @ApiOkResponse({ description: 'spec 008, FR-020 a FR-023: crea o reemplaza el material. 400 VALIDACION por campo; 404 SEMANA_NO_ENCONTRADA; 409 GRUPO_NO_EN_CURSO.' })
  async guardarMaterial(
    @Param('grupoId') grupoId: string,
    @Param('numero', ParseIntPipe) numero: number,
    @Body() datos: DatosMaterial,
    @UploadedFiles() archivos: Express.Multer.File[] | undefined,
    @Req() request: AuthenticatedRequest,
  ) {
    const personaId = personaActivaDeSesion(request);
    await grupoDelLiderOFallar(this.prisma, grupoId, personaId);
    return this.contenido.guardar(grupoId, numero, personaId, datos, archivos ?? []);
  }

  @Get(':grupoId/asistencia/:fecha')
  @RequierePermiso('mis_grupos.ver')
  @ApiOkResponse({ description: 'spec 008, FR-027: AsistenciaDelDia (hoy por defecto en la pantalla).' })
  async asistenciaDelDia(@Param('grupoId') grupoId: string, @Param('fecha') fecha: string, @Req() request: AuthenticatedRequest) {
    await grupoDelLiderOFallar(this.prisma, grupoId, personaActivaDeSesion(request));
    return this.asistencia.delDia(grupoId, fecha);
  }

  @Put(':grupoId/asistencia/:fecha')
  @RequierePermiso('mis_grupos.gestionar')
  @ApiOkResponse({ description: 'spec 008, FR-027/FR-028: upsert idempotente. 400 VALIDACION (fecha: FECHA_FUTURA, FECHA_ANTERIOR_AL_INICIO; ausentes: INSCRIPCION_AJENA); 409 GRUPO_NO_EN_CURSO.' })
  async tomarAsistencia(@Param('grupoId') grupoId: string, @Param('fecha') fecha: string, @Body() dto: AsistenciaDto, @Req() request: AuthenticatedRequest) {
    const personaId = personaActivaDeSesion(request);
    await grupoDelLiderOFallar(this.prisma, grupoId, personaId);
    return this.asistencia.guardar(grupoId, fecha, dto.ausentes, personaId);
  }

  @Post(':grupoId/inscripciones/:inscripcionId/baja/proponer')
  @HttpCode(200)
  @RequierePermiso('mis_grupos.gestionar')
  @ApiOkResponse({ description: 'spec 008, FR-032. 409 INSCRIPCION_NO_ACTIVA, BAJA_YA_PROPUESTA; 400 VALIDACION (comentario).' })
  proponerBaja(@Param('grupoId') grupoId: string, @Param('inscripcionId') inscripcionId: string, @Body() dto: BajaConTipoDto, @Req() request: AuthenticatedRequest) {
    return this.misGrupos.proponerBaja(grupoId, inscripcionId, personaActivaDeSesion(request), dto.tipo, dto.comentario);
  }

  @Post(':grupoId/finalizacion/proponer')
  @HttpCode(200)
  @RequierePermiso('mis_grupos.gestionar')
  @ApiOkResponse({ description: 'spec 008, FR-035. 409 FINALIZACION_YA_PROPUESTA, FINALIZACION_ANTES_DE_TIEMPO (con `desde`).' })
  proponerFinalizacion(@Param('grupoId') grupoId: string, @Req() request: AuthenticatedRequest) {
    return this.misGrupos.proponerFinalizacion(grupoId, personaActivaDeSesion(request));
  }
}
