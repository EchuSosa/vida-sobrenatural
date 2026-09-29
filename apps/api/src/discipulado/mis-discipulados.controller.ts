import { Body, Controller, ForbiddenException, Get, HttpCode, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { tienePermiso } from '@vida-sobrenatural/shared-types';
import { JwtNextAuthGuard } from '../auth/jwt-nextauth.guard.js';
import { PermisosGuard } from '../auth/permisos.guard.js';
import { RequierePermiso } from '../auth/permisos.decorator.js';
import type { AuthenticatedRequest } from '../auth/authenticated-request.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { PropuestasService } from './propuestas.service.js';
import { MisDiscipuladosService } from './mis-discipulados.service.js';
import { EncuentrosService } from './encuentros.service.js';
import { FinalizacionService } from './finalizacion.service.js';
import { BajaService } from './baja.service.js';
import { PendientesAdminService } from './pendientes-admin.service.js';
import { EncuentroDto, MotivoDto } from './dto/discipulado.dto.js';
import { personaDeSesion } from './sesion.js';

/**
 * specs/004, lote B — el escritorio del Discipulador (D134, celular primero,
 * FR-046) y los pendientes del Admin. Todo sale de la sesión; el servicio
 * decide si el discipulado es de quien pide (Principio V: si no, 404).
 */
@ApiTags('discipulado')
@ApiBearerAuth()
@UseGuards(JwtNextAuthGuard, PermisosGuard)
@Controller('discipulado')
export class MisDiscipuladosController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly propuestas: PropuestasService,
    private readonly misDiscipulados: MisDiscipuladosService,
    private readonly encuentros: EncuentrosService,
    private readonly finalizacion: FinalizacionService,
    private readonly baja: BajaService,
    private readonly pendientesAdmin: PendientesAdminService,
  ) {}

  @Get('mis-discipulados')
  @RequierePermiso('mis_discipulados.ver')
  @ApiOkResponse({ description: 'FR-037/FR-047: propuestas pendientes (sin contacto) primero, los discipulados que lidera, y si tiene agenda.' })
  async mios(@Req() request: AuthenticatedRequest) {
    const personaId = personaDeSesion(request);
    const [propuestas, discipulados, franja] = await Promise.all([
      this.propuestas.misPropuestas(personaId),
      this.misDiscipulados.misDiscipulados(personaId),
      this.prisma.franjaAgenda.findFirst({ where: { personaId, eliminadaEn: null }, select: { id: true } }),
    ]);
    return { propuestas, discipulados, tieneAgenda: franja !== null };
  }

  @Get('mis-discipulados/:grupoId')
  @RequierePermiso('mis_discipulados.ver')
  @ApiOkResponse({ description: 'FR-011: el detalle con contacto (y el del tutor si es menor, FR-044) y los Encuentros con notas. 404 si no tiene el Liderazgo vigente.' })
  detalle(@Param('grupoId') grupoId: string, @Req() request: AuthenticatedRequest) {
    return this.misDiscipulados.miDiscipulado(personaDeSesion(request), grupoId);
  }

  @Post('mis-discipulados/:grupoId/encuentros')
  @RequierePermiso('mis_discipulados.gestionar')
  @ApiCreatedResponse({ description: 'FR-009/FR-013/FR-013a: registra un Encuentro con una Asistencia por Persona activa (presentes por defecto).' })
  registrarEncuentro(@Param('grupoId') grupoId: string, @Body() dto: EncuentroDto, @Req() request: AuthenticatedRequest) {
    return this.encuentros.registrar(personaDeSesion(request), grupoId, dto);
  }

  @Patch('mis-discipulados/:grupoId/encuentros/:encuentroId')
  @RequierePermiso('mis_discipulados.gestionar')
  @ApiOkResponse({ description: 'FR-041: edita un Encuentro (sin borrado). 409 DISCIPULADO_NO_EN_CURSO si el Grupo ya cerró.' })
  editarEncuentro(
    @Param('grupoId') grupoId: string,
    @Param('encuentroId') encuentroId: string,
    @Body() dto: EncuentroDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.encuentros.editar(personaDeSesion(request), grupoId, encuentroId, dto);
  }

  @Post('mis-discipulados/:grupoId/finalizacion/proponer')
  @HttpCode(200)
  @RequierePermiso('mis_discipulados.gestionar')
  @ApiOkResponse({ description: 'FR-019: propone terminar el discipulado. 409 FINALIZACION_YA_PROPUESTA / DISCIPULADO_NO_EN_CURSO.' })
  async proponerFinalizacion(@Param('grupoId') grupoId: string, @Req() request: AuthenticatedRequest) {
    await this.finalizacion.proponer(personaDeSesion(request), grupoId);
    return { ok: true };
  }

  @Post('mis-discipulados/:grupoId/inscripciones/:inscripcionId/baja/proponer')
  @HttpCode(200)
  @RequierePermiso('mis_discipulados.gestionar')
  @ApiOkResponse({ description: 'FR-042: propone la baja de una Persona del Grupo, con motivo opcional. 409 BAJA_YA_PROPUESTA / DISCIPULADO_NO_EN_CURSO.' })
  async proponerBaja(
    @Param('grupoId') grupoId: string,
    @Param('inscripcionId') inscripcionId: string,
    @Body() dto: MotivoDto,
    @Req() request: AuthenticatedRequest,
  ) {
    await this.baja.proponer(personaDeSesion(request), grupoId, inscripcionId, dto.motivo);
    return { ok: true };
  }

  @Post('propuestas/:propuestaId/aceptar')
  @HttpCode(200)
  @RequierePermiso('mis_discipulados.gestionar')
  @ApiOkResponse({ description: 'FR-037/FR-004/FR-030: acepta la propuesta — crea (o suma a) el Grupo, o toma el Grupo si es una reasignación. Ajena → 404.' })
  aceptar(@Param('propuestaId') propuestaId: string, @Req() request: AuthenticatedRequest) {
    return this.propuestas.aceptar(propuestaId, personaDeSesion(request));
  }

  @Post('propuestas/:propuestaId/declinar')
  @HttpCode(200)
  @RequierePermiso('mis_discipulados.gestionar')
  @ApiOkResponse({ description: 'FR-037: declina con motivo opcional (solo lo ve el Admin); la Solicitud vuelve a pendiente.' })
  async declinar(@Param('propuestaId') propuestaId: string, @Body() dto: MotivoDto, @Req() request: AuthenticatedRequest) {
    await this.propuestas.declinar(propuestaId, personaDeSesion(request), dto.motivo);
    return { ok: true };
  }

  /**
   * FR-048: `solicitudes.aprobar` O `grupos.gestionar`. `@RequierePermiso`
   * toma uno solo, así que el "o" se resuelve acá, contra el mismo catálogo
   * (D132) — nunca contra un rol literal.
   */
  @Get('pendientes-admin')
  @ApiOkResponse({ description: 'FR-048: contadores de lo que el Admin tiene pendiente, con el enlace a cada listado.' })
  pendientes(@Req() request: AuthenticatedRequest) {
    const roles = request.user?.rol ?? [];
    if (!tienePermiso(roles, 'solicitudes.aprobar') && !tienePermiso(roles, 'grupos.gestionar')) {
      throw new ForbiddenException('Requiere el permiso: solicitudes.aprobar o grupos.gestionar.');
    }
    return this.pendientesAdmin.pendientes();
  }
}
