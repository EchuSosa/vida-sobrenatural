import { Body, Controller, Get, HttpCode, Param, Post, Put, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { tienePermiso } from '@vida-sobrenatural/shared-types';
import { JwtNextAuthGuard } from '../auth/jwt-nextauth.guard.js';
import { PermisosGuard } from '../auth/permisos.guard.js';
import { RequierePermiso } from '../auth/permisos.decorator.js';
import type { AuthenticatedRequest } from '../auth/authenticated-request.js';
import { personaDeSesion } from '../discipulado/sesion.js';
import { personaActivaDeSesion } from '../vida-de-servicio/mi-vida-de-servicio.controller.js';
import { EleccionService } from './eleccion.service.js';
import { ConfirmarOpcionDto, DescartarOpcionDto, GuardarEleccionLiderDto, GuardarMiEleccionDto } from './dto/eleccion.dto.js';

/**
 * spec 015 — lo de la persona (D239). Sin permiso del catálogo: la Persona es
 * SIEMPRE la de la sesión (D134). Va antes que el del Admin, para que
 * `/elecciones-ministerio/me` le gane a `/elecciones-ministerio/:id`.
 */
@ApiTags('elecciones-ministerio')
@Controller('elecciones-ministerio/me')
@UseGuards(JwtNextAuthGuard)
@ApiBearerAuth()
export class EleccionPersonaController {
  constructor(private readonly service: EleccionService) {}

  @Get()
  @ApiOkResponse({ description: 'spec 015: MiEleccionMinisterio (lo que la app ya sabe, el listado y su elección; nunca las notas).' })
  miEleccion(@Req() request: AuthenticatedRequest) {
    return this.service.miEleccion(personaActivaDeSesion(request));
  }

  @Get('resumen')
  @ApiOkResponse({ description: 'spec 015: ResumenMiEleccion para la card de Ministerio de Mi camino (`ninguna` si no hay nada que mostrar).' })
  resumen(@Req() request: AuthenticatedRequest) {
    return this.service.resumen(personaActivaDeSesion(request));
  }

  @Get('catalogo')
  @ApiOkResponse({ description: 'spec 015, D243: el listado para "Ya sirvo en un ministerio" (MinisterioParaElegir[]).' })
  catalogo(@Req() request: AuthenticatedRequest) {
    personaActivaDeSesion(request);
    return this.service.catalogo();
  }

  @Put()
  @ApiOkResponse({ description: 'spec 015, D239: elegir o cambiar hasta la charla. 409 ELECCION_NO_DISPONIBLE, ELECCION_YA_CHARLADA; 400 VALIDACION (opciones, comentario).' })
  guardar(@Body() dto: GuardarMiEleccionDto, @Req() request: AuthenticatedRequest) {
    return this.service.guardarMia(personaActivaDeSesion(request), dto);
  }
}

/**
 * spec 015 — el líder de Vida de Servicio (D240), en la web app: el permiso de
 * Líder de curso MÁS el Liderazgo vigente en esa edición, verificado por
 * registro (como el resto de "Mis grupos").
 */
@ApiTags('elecciones-ministerio')
@Controller('vida-de-servicio/mis-grupos/:grupoId/elecciones')
@UseGuards(JwtNextAuthGuard, PermisosGuard)
@ApiBearerAuth()
export class EleccionLiderController {
  constructor(private readonly service: EleccionService) {}

  @Get()
  @RequierePermiso('mis_grupos.ver')
  @ApiOkResponse({ description: 'spec 015: EleccionesDeMiGrupo. 404 GRUPO_NO_ENCONTRADO si no es Líder vigente.' })
  listar(@Param('grupoId') grupoId: string, @Req() request: AuthenticatedRequest) {
    return this.service.deMiGrupo(grupoId, personaActivaDeSesion(request));
  }

  @Get(':personaId')
  @RequierePermiso('mis_grupos.ver')
  @ApiOkResponse({ description: 'spec 015: DetalleEleccionLider, con las notas (D240).' })
  detalle(@Param('grupoId') grupoId: string, @Param('personaId') personaId: string, @Req() request: AuthenticatedRequest) {
    return this.service.detalleLider(grupoId, personaId, personaActivaDeSesion(request));
  }

  @Put(':personaId')
  @RequierePermiso('mis_grupos.gestionar')
  @ApiOkResponse({ description: 'spec 015, D240: carga o ajusta la elección, escribe notas y marca "Charla hecha". 409 ELECCION_CERRADA, ELECCION_DESACTUALIZADA, ELECCION_OPCIONES_RESUELTAS, GRUPO_NO_EN_CURSO; 400 VALIDACION.' })
  guardar(@Param('grupoId') grupoId: string, @Param('personaId') personaId: string, @Body() dto: GuardarEleccionLiderDto, @Req() request: AuthenticatedRequest) {
    return this.service.guardarLider(grupoId, personaId, personaActivaDeSesion(request), dto);
  }
}

/** spec 015 — el Admin confirma cada área desde la bandeja (D242); el Pastor ve sin las notas ni acciones. */
@ApiTags('elecciones-ministerio')
@Controller('elecciones-ministerio')
@UseGuards(JwtNextAuthGuard, PermisosGuard)
@ApiBearerAuth()
export class EleccionAdminController {
  constructor(private readonly service: EleccionService) {}

  @Get(':id')
  @RequierePermiso('solicitudes.ver')
  @ApiOkResponse({ description: 'spec 015: DetalleEleccionAdmin. Las notas, solo con solicitudes.aprobar (D240).' })
  detalle(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.service.detalleAdmin(id, tienePermiso(request.user?.rol ?? [], 'solicitudes.aprobar'));
  }

  @Post(':id/opciones/:opcionId/confirmar')
  @HttpCode(200)
  @RequierePermiso('solicitudes.aprobar')
  @ApiOkResponse({ description: 'spec 015, D242: crea la membresía. 409 NO_APTA_PARA_MINISTERIO, POSTULACION_REQUIERE_CONFIRMAR_CAMBIO (D241), ELECCION_SIN_CHARLA, ELECCION_CERRADA, OPCION_YA_RESUELTA, YA_ES_MIEMBRO_DEL_MINISTERIO, MINISTERIO_NO_DISPONIBLE.' })
  confirmar(@Param('id') id: string, @Param('opcionId') opcionId: string, @Body() dto: ConfirmarOpcionDto, @Req() request: AuthenticatedRequest) {
    return this.service.confirmar(id, opcionId, dto, personaDeSesion(request));
  }

  @Post(':id/opciones/:opcionId/descartar')
  @HttpCode(200)
  @RequierePermiso('solicitudes.aprobar')
  @ApiOkResponse({ description: 'spec 015, D242: "No por ahora", con motivo interno opcional.' })
  descartar(@Param('id') id: string, @Param('opcionId') opcionId: string, @Body() dto: DescartarOpcionDto, @Req() request: AuthenticatedRequest) {
    return this.service.descartar(id, opcionId, dto.motivo, personaDeSesion(request));
  }
}
