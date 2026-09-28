import { Body, Controller, Get, HttpCode, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtNextAuthGuard } from '../auth/jwt-nextauth.guard.js';
import { PermisosGuard } from '../auth/permisos.guard.js';
import { RequierePermiso } from '../auth/permisos.decorator.js';
import type { AuthenticatedRequest } from '../auth/authenticated-request.js';
import { GruposService, type FiltroPendiente } from './grupos.service.js';
import { ReasignacionService } from './reasignacion.service.js';
import { FinalizacionService } from './finalizacion.service.js';
import { BajaService } from './baja.service.js';
import { MotivoDto, ReasignarDto } from './dto/discipulado.dto.js';
import { personaDeSesion } from './sesion.js';

const TAKE_DEFAULT = 20;
const TAKE_MAXIMO = 100;
const PENDIENTES: readonly FiltroPendiente[] = ['finalizacion', 'baja', 'reasignacion'];

/**
 * specs/004, lote B — la vista administrativa de los discipulados (D134):
 * Admin y Pastor ven (`grupos.ver`, sin notas); solo el Admin actúa
 * (`grupos.gestionar`): confirma o rechaza finalizaciones y bajas, y propone
 * reasignaciones desde el cruce.
 */
@ApiTags('grupos')
@ApiBearerAuth()
@UseGuards(JwtNextAuthGuard, PermisosGuard)
@Controller('grupos/discipulados')
export class GruposController {
  constructor(
    private readonly grupos: GruposService,
    private readonly reasignacion: ReasignacionService,
    private readonly finalizacion: FinalizacionService,
    private readonly baja: BajaService,
  ) {}

  @Get()
  @RequierePermiso('grupos.ver')
  @ApiQuery({ name: 'estado', required: false, enum: ['en_curso', 'finalizado'] })
  @ApiQuery({ name: 'pendiente', required: false, enum: PENDIENTES })
  @ApiQuery({ name: 'dir', required: false, enum: ['asc', 'desc'] })
  @ApiQuery({ name: 'skip', required: false })
  @ApiQuery({ name: 'take', required: false })
  @ApiOkResponse({ description: 'Pagina<DiscipuladoResumen>, sin notas (D134). En curso por defecto, los más nuevos primero.' })
  listar(
    @Query('estado') estado?: string,
    @Query('pendiente') pendiente?: string,
    @Query('dir') dir?: string,
    @Query('skip') skipParam?: string,
    @Query('take') takeParam?: string,
  ) {
    return this.grupos.listar({
      estado: estado === 'finalizado' ? 'finalizado' : 'en_curso',
      pendiente: PENDIENTES.includes(pendiente as FiltroPendiente) ? (pendiente as FiltroPendiente) : undefined,
      dir: dir === 'asc' ? 'asc' : 'desc',
      skip: Math.max(0, Number(skipParam) || 0),
      take: Math.min(TAKE_MAXIMO, Math.max(1, Number(takeParam) || TAKE_DEFAULT)),
    });
  }

  @Get(':grupoId')
  @RequierePermiso('grupos.ver')
  @ApiOkResponse({ description: 'El discipulado con sus Encuentros (sin notas) y asistencias, el historial de Discipuladores y el horario derivado del Grupo.' })
  detalle(@Param('grupoId') grupoId: string) {
    return this.grupos.detalle(grupoId);
  }

  @Get(':grupoId/cruce')
  @RequierePermiso('grupos.gestionar')
  @ApiOkResponse({ description: 'FR-030: el cruce para reasignar, contra las franjas de todas las Personas del Grupo, sin el Discipulador vigente.' })
  cruce(@Param('grupoId') grupoId: string) {
    return this.reasignacion.cruceDeReasignacion(grupoId);
  }

  @Post(':grupoId/reasignar')
  @HttpCode(200)
  @RequierePermiso('grupos.gestionar')
  @ApiOkResponse({ description: 'FR-030: PROPONE la reasignación; el Liderazgo actual sigue hasta que el nuevo acepte.' })
  reasignar(@Param('grupoId') grupoId: string, @Body() dto: ReasignarDto, @Req() request: AuthenticatedRequest) {
    return this.reasignacion.proponer(grupoId, dto.discipuladorId, personaDeSesion(request));
  }

  @Post(':grupoId/reasignar/retirar')
  @HttpCode(200)
  @RequierePermiso('grupos.gestionar')
  @ApiOkResponse({ description: 'Retira la reasignación propuesta. 409 PROPUESTA_NO_VIGENTE.' })
  async retirarReasignacion(@Param('grupoId') grupoId: string) {
    await this.reasignacion.retirar(grupoId);
    return { ok: true };
  }

  @Post(':grupoId/finalizacion/confirmar')
  @HttpCode(200)
  @RequierePermiso('grupos.gestionar')
  @ApiOkResponse({ description: 'FR-019 a FR-021: cierra el Grupo por completado y pasa todas las Inscripciones activas a completada.' })
  async confirmarFinalizacion(@Param('grupoId') grupoId: string, @Req() request: AuthenticatedRequest) {
    await this.finalizacion.confirmar(grupoId, personaDeSesion(request));
    return { ok: true };
  }

  @Post(':grupoId/finalizacion/rechazar')
  @HttpCode(200)
  @RequierePermiso('grupos.gestionar')
  @ApiOkResponse({ description: 'FR-019a: rechaza la finalización propuesta, con motivo opcional que ve el Discipulador.' })
  async rechazarFinalizacion(@Param('grupoId') grupoId: string, @Body() dto: MotivoDto) {
    await this.finalizacion.rechazar(grupoId, dto.motivo);
    return { ok: true };
  }

  @Post(':grupoId/inscripciones/:inscripcionId/baja/confirmar')
  @HttpCode(200)
  @RequierePermiso('grupos.gestionar')
  @ApiOkResponse({ description: 'FR-042: la Inscripción pasa a abandono; si era la última activa, el Grupo se cierra por abandonado.' })
  confirmarBaja(@Param('grupoId') grupoId: string, @Param('inscripcionId') inscripcionId: string, @Req() request: AuthenticatedRequest) {
    return this.baja.confirmar(grupoId, inscripcionId, personaDeSesion(request));
  }

  @Post(':grupoId/inscripciones/:inscripcionId/baja/rechazar')
  @HttpCode(200)
  @RequierePermiso('grupos.gestionar')
  @ApiOkResponse({ description: 'FR-042: rechaza la baja propuesta, con motivo opcional que ve el Discipulador.' })
  async rechazarBaja(@Param('grupoId') grupoId: string, @Param('inscripcionId') inscripcionId: string, @Body() dto: MotivoDto) {
    await this.baja.rechazar(grupoId, inscripcionId, dto.motivo);
    return { ok: true };
  }
}
