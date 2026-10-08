import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { JwtNextAuthGuard } from '../auth/jwt-nextauth.guard.js';
import { PermisosGuard } from '../auth/permisos.guard.js';
import { RequierePermiso } from '../auth/permisos.decorator.js';
import type { AuthenticatedRequest } from '../auth/authenticated-request.js';
import { personaDeSesion } from '../discipulado/sesion.js';
import { MotivoOpcionalDto } from './dto/solicitudes.dto.js';
import {
  AsistenciaDto,
  BajaConTipoDto,
  CambiarCronogramaDto,
  ConfirmarBajaDto,
  CrearEdicionDto,
  InscripcionAbiertaDto,
  ListarEdicionesDto,
  SumarLiderDto,
} from './dto/ediciones.dto.js';
import { EdicionesService } from './ediciones.service.js';
import { AsistenciaService } from './asistencia.service.js';
import { ContenidoService } from './contenido.service.js';
import { grupoVSOFallar } from './consultas-vs.js';
import { PrismaService } from '../prisma/prisma.service.js';

/**
 * spec 008, Historias 1, 7, 8 y 9 — las ediciones en el backoffice
 * (contracts/admin-api.md). Leer: `grupos.ver` (Admin y Pastor, D64).
 * Escribir: `grupos.gestionar` (solo Admin, FR-007).
 */
@ApiTags('vida-de-servicio')
@Controller('grupos/vida-de-servicio')
@UseGuards(JwtNextAuthGuard, PermisosGuard)
@ApiBearerAuth()
export class GruposVsController {
  constructor(
    private readonly ediciones: EdicionesService,
    private readonly asistencia: AsistenciaService,
    private readonly contenido: ContenidoService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  @RequierePermiso('grupos.ver')
  @ApiOkResponse({ description: 'spec 008, FR-038: Pagina<EdicionAdminResumen>; estado y pendiente filtran.' })
  listar(@Query() q: ListarEdicionesDto) {
    return this.ediciones.listar(q);
  }

  @Post()
  @RequierePermiso('grupos.gestionar')
  @ApiCreatedResponse({ description: 'spec 008, FR-002/FR-003: { grupoId }. 400 VALIDACION con los campos.' })
  crear(@Body() dto: CrearEdicionDto) {
    return this.ediciones.crear(dto);
  }

  @Get(':grupoId')
  @RequierePermiso('grupos.ver')
  @ApiOkResponse({ description: 'spec 008, FR-038: EdicionAdminDetalle. 404 GRUPO_NO_ENCONTRADO.' })
  detalle(@Param('grupoId') grupoId: string) {
    return this.ediciones.detalle(grupoId);
  }

  @Put(':grupoId/cronograma')
  @RequierePermiso('grupos.gestionar')
  @ApiOkResponse({ description: 'spec 008, FR-004. 409 SEMANA_LIBERADA_NO_EDITABLE, SEMANA_CON_MATERIAL, GRUPO_NO_EN_CURSO; 400 VALIDACION.' })
  cronograma(@Param('grupoId') grupoId: string, @Body() dto: CambiarCronogramaDto) {
    return this.ediciones.cambiarCronograma(grupoId, dto.semanas);
  }

  @Post(':grupoId/lideres')
  @HttpCode(200)
  @RequierePermiso('grupos.gestionar')
  @ApiOkResponse({ description: 'spec 008, FR-005. 409 YA_ES_LIDER; 400 VALIDACION (PERSONA_SIN_ROL_LIDER).' })
  sumarLider(@Param('grupoId') grupoId: string, @Body() dto: SumarLiderDto) {
    return this.ediciones.sumarLider(grupoId, dto.personaId);
  }

  @Delete(':grupoId/lideres/:personaId')
  @RequierePermiso('grupos.gestionar')
  @ApiOkResponse({ description: 'spec 008, FR-005: cierra el Liderazgo. 409 ULTIMO_LIDER.' })
  sacarLider(@Param('grupoId') grupoId: string, @Param('personaId') personaId: string, @Req() request: AuthenticatedRequest) {
    return this.ediciones.sacarLider(grupoId, personaId, personaDeSesion(request));
  }

  @Put(':grupoId/inscripcion-abierta')
  @RequierePermiso('grupos.gestionar')
  @ApiOkResponse({ description: 'spec 008, FR-006.' })
  inscripcionAbierta(@Param('grupoId') grupoId: string, @Body() dto: InscripcionAbiertaDto) {
    return this.ediciones.abrirInscripcion(grupoId, dto.abierta);
  }

  @Get(':grupoId/asistencia/:fecha')
  @RequierePermiso('grupos.ver')
  @ApiOkResponse({ description: 'spec 008, FR-027: AsistenciaDelDia.' })
  async asistenciaDelDia(@Param('grupoId') grupoId: string, @Param('fecha') fecha: string) {
    return this.asistencia.delDia(grupoId, fecha);
  }

  @Put(':grupoId/asistencia/:fecha')
  @RequierePermiso('grupos.gestionar')
  @ApiOkResponse({ description: 'spec 008, FR-027 (Admin): igual que el Líder.' })
  tomarAsistencia(@Param('grupoId') grupoId: string, @Param('fecha') fecha: string, @Body() dto: AsistenciaDto, @Req() request: AuthenticatedRequest) {
    return this.asistencia.guardar(grupoId, fecha, dto.ausentes, personaDeSesion(request));
  }

  @Get(':grupoId/semanas/:numero')
  @RequierePermiso('grupos.ver')
  @ApiOkResponse({ description: 'spec 008, FR-038: ContenidoParaLider en lectura.' })
  async semana(@Param('grupoId') grupoId: string, @Param('numero', ParseIntPipe) numero: number) {
    await grupoVSOFallar(this.prisma, grupoId);
    return this.contenido.paraLider(grupoId, numero);
  }

  @Post(':grupoId/inscripciones/:inscripcionId/baja/confirmar')
  @HttpCode(200)
  @RequierePermiso('grupos.gestionar')
  @ApiOkResponse({ description: 'spec 008, FR-033. 409 BAJA_NO_PROPUESTA.' })
  confirmarBaja(@Param('grupoId') grupoId: string, @Param('inscripcionId') inscripcionId: string, @Body() dto: ConfirmarBajaDto) {
    return this.ediciones.confirmarBaja(grupoId, inscripcionId, dto.tipo);
  }

  @Post(':grupoId/inscripciones/:inscripcionId/baja/rechazar')
  @HttpCode(200)
  @RequierePermiso('grupos.gestionar')
  @ApiOkResponse({ description: 'spec 008, FR-033. 409 BAJA_NO_PROPUESTA.' })
  rechazarBaja(@Param('grupoId') grupoId: string, @Param('inscripcionId') inscripcionId: string, @Body() dto: MotivoOpcionalDto) {
    return this.ediciones.rechazarBaja(grupoId, inscripcionId, dto.motivo);
  }

  @Post(':grupoId/inscripciones/:inscripcionId/baja')
  @HttpCode(200)
  @RequierePermiso('grupos.gestionar')
  @ApiOkResponse({ description: 'spec 008, FR-033: baja directa. 409 INSCRIPCION_NO_ACTIVA.' })
  bajaDirecta(@Param('grupoId') grupoId: string, @Param('inscripcionId') inscripcionId: string, @Body() dto: BajaConTipoDto) {
    return this.ediciones.bajaDirecta(grupoId, inscripcionId, dto.tipo, dto.comentario);
  }

  @Post(':grupoId/finalizacion/confirmar')
  @HttpCode(200)
  @RequierePermiso('grupos.gestionar')
  @ApiOkResponse({ description: 'spec 008, FR-036. 409 FINALIZACION_NO_PROPUESTA, BAJAS_PROPUESTAS_SIN_RESOLVER (con `bajas`).' })
  confirmarFinalizacion(@Param('grupoId') grupoId: string, @Req() request: AuthenticatedRequest) {
    return this.ediciones.confirmarFinalizacion(grupoId, personaDeSesion(request));
  }

  @Post(':grupoId/finalizacion/rechazar')
  @HttpCode(200)
  @RequierePermiso('grupos.gestionar')
  @ApiOkResponse({ description: 'spec 008, FR-035. 409 FINALIZACION_NO_PROPUESTA.' })
  rechazarFinalizacion(@Param('grupoId') grupoId: string, @Body() dto: MotivoOpcionalDto) {
    return this.ediciones.rechazarFinalizacion(grupoId, dto.motivo);
  }
}
