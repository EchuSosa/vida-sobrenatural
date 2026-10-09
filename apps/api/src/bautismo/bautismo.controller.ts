import { Body, Controller, Get, HttpCode, Param, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { JwtNextAuthGuard } from '../auth/jwt-nextauth.guard.js';
import { PermisosGuard } from '../auth/permisos.guard.js';
import { RequierePermiso } from '../auth/permisos.decorator.js';
import type { AuthenticatedRequest } from '../auth/authenticated-request.js';
import { personaDeSesion } from '../discipulado/sesion.js';
import { BautismoAdminService } from './acciones-admin.js';
import { AceptarBautismoDto, AsignarBautismoDto, CambiarTalleBautismoDto, ConfirmarBautismosDto, RechazarBautismoDto, SeccionEventoQueryDto } from './dto/bautismo.dto.js';

/**
 * spec 010, lote B — el Admin y el Pastor. Leer: `solicitudes.ver` (Admin y
 * Pastor, FR-011). Actuar: `solicitudes.aprobar` (solo Admin). Quien actúa
 * queda registrado: sin Persona en la sesión no se hace (H-140).
 */
@ApiTags('bautismo')
@Controller('bautismo')
@UseGuards(JwtNextAuthGuard, PermisosGuard)
@ApiBearerAuth()
export class BautismoController {
  constructor(private readonly service: BautismoAdminService) {}

  @Get('solicitudes/:id')
  @RequierePermiso('solicitudes.ver')
  @ApiOkResponse({ description: 'spec 010, FR-007: el detalle de una Solicitud de Bautismo (SolicitudBautismoDetalle).' })
  detalle(@Param('id') id: string) {
    return this.service.detalle(id);
  }

  @Post('solicitudes/:id/aceptar')
  @HttpCode(200)
  @RequierePermiso('solicitudes.aprobar')
  @ApiOkResponse({ description: 'spec 010, FR-008: acepta (y, con eventoId, asigna). 409 SOLICITUD_BAUTISMO_YA_CAMBIO, EVENTO_NO_ES_DE_BAUTISMO, EVENTO_NO_DISPONIBLE_PARA_ASIGNAR.' })
  aceptar(@Param('id') id: string, @Body() dto: AceptarBautismoDto, @Req() request: AuthenticatedRequest) {
    return this.service.aceptar(id, personaDeSesion(request), dto.eventoId);
  }

  @Post('solicitudes/:id/rechazar')
  @HttpCode(200)
  @RequierePermiso('solicitudes.aprobar')
  @ApiOkResponse({ description: 'spec 010, FR-009: rechaza con motivo opcional (solo lo ve el equipo). 409 SOLICITUD_BAUTISMO_YA_CAMBIO.' })
  rechazar(@Param('id') id: string, @Body() dto: RechazarBautismoDto, @Req() request: AuthenticatedRequest) {
    return this.service.rechazar(id, personaDeSesion(request), dto.motivo);
  }

  @Put('solicitudes/:id/talle')
  @RequierePermiso('solicitudes.aprobar')
  @ApiOkResponse({ description: 'D220: corrige el talle de remera (en cualquier estado). 400 VALIDACION TALLE_REQUERIDO / TALLE_INVALIDO; 404 NO_ENCONTRADO.' })
  cambiarTalle(@Param('id') id: string, @Body() dto: CambiarTalleBautismoDto) {
    return this.service.cambiarTalle(id, dto.talleRemera);
  }

  @Post('solicitudes/:id/quitar-de-evento')
  @HttpCode(200)
  @RequierePermiso('solicitudes.aprobar')
  @ApiOkResponse({ description: 'spec 010, FR-015: la saca de su Evento futuro; vuelve a esperar fecha. 409 SOLICITUD_BAUTISMO_YA_CAMBIO.' })
  quitar(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.service.quitarDeEvento(id, personaDeSesion(request));
  }

  @Get('eventos')
  @RequierePermiso('solicitudes.ver')
  @ApiOkResponse({ description: 'spec 010, FR-012: próximos Eventos de bautismo publicados, por fecha.' })
  eventos() {
    return this.service.eventosProximos();
  }

  @Get('eventos/:eventoId')
  @RequierePermiso('solicitudes.ver')
  @ApiOkResponse({ description: 'spec 010, Historias 3 y 7: asignadas, esperando fecha (paginadas) y si se puede confirmar.' })
  seccion(@Param('eventoId') eventoId: string, @Query() q: SeccionEventoQueryDto) {
    return this.service.seccionEvento(eventoId, {
      skipAsignadas: q.skipAsignadas ?? 0,
      takeAsignadas: q.takeAsignadas ?? 200,
      skipEsperando: q.skipEsperando ?? 0,
      takeEsperando: q.takeEsperando ?? 20,
    });
  }

  @Post('eventos/:eventoId/asignar')
  @HttpCode(200)
  @RequierePermiso('solicitudes.aprobar')
  @ApiOkResponse({ description: 'spec 010, FR-012 a FR-014: asigna de a varias; parcial-tolerante ({ asignadas, noAsignadas }).' })
  asignar(@Param('eventoId') eventoId: string, @Body() dto: AsignarBautismoDto, @Req() request: AuthenticatedRequest) {
    return this.service.asignar(eventoId, dto.solicitudIds, personaDeSesion(request));
  }

  @Post('eventos/:eventoId/confirmar')
  @HttpCode(200)
  @RequierePermiso('solicitudes.aprobar')
  @ApiOkResponse({ description: 'spec 010, FR-027/FR-028: confirma quiénes se bautizaron. 409 EVENTO_TODAVIA_NO_OCURRIO; VALIDACION SOLICITUD_NO_ASIGNADA_A_ESTE_EVENTO.' })
  confirmar(@Param('eventoId') eventoId: string, @Body() dto: ConfirmarBautismosDto, @Req() request: AuthenticatedRequest) {
    return this.service.confirmar(eventoId, dto.realizadas, personaDeSesion(request));
  }
}
