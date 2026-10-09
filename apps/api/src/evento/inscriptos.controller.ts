import { Body, Controller, Get, HttpCode, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { EstadoInscripcionEvento } from '@vida-sobrenatural/shared-types';
import { JwtNextAuthGuard } from '../auth/jwt-nextauth.guard.js';
import { PermisosGuard } from '../auth/permisos.guard.js';
import { RequierePermiso } from '../auth/permisos.decorator.js';
import type { AuthenticatedRequest } from '../auth/authenticated-request.js';
import { InscriptosService } from './inscriptos.service.js';
import { personaDeSesion } from './persona-de-sesion.js';
import { paginacion } from './paginacion.js';

const ESTADOS: EstadoInscripcionEvento[] = ['confirmada', 'pendiente', 'lista_espera', 'rechazada', 'cancelada'];

/** spec 011, lote D — los inscriptos de un Evento (contracts/inscripciones-api.md § Admin). */
@ApiTags('eventos')
@ApiBearerAuth()
@Controller()
@UseGuards(JwtNextAuthGuard, PermisosGuard)
export class InscriptosController {
  constructor(private readonly servicio: InscriptosService) {}

  @Get('eventos/:id/inscripciones')
  @RequierePermiso('eventos.ver')
  @ApiOkResponse({ description: 'FR-025 — `Pagina<InscripcionEventoResumen>`; la lista de espera en su orden.' })
  listar(@Param('id') id: string, @Query('estado') estado?: string, @Query('buscar') buscar?: string, @Query('skip') skip?: string, @Query('take') take?: string) {
    return this.servicio.listar(id, {
      estado: ESTADOS.includes(estado as EstadoInscripcionEvento) ? (estado as EstadoInscripcionEvento) : undefined,
      buscar,
      ...paginacion(skip, take, 50),
    });
  }

  @Post('eventos/:id/inscripciones')
  @RequierePermiso('inscripciones_evento.gestionar')
  @ApiCreatedResponse({ description: 'FR-027, FR-047 — inscribir en nombre de una Persona; `forzar: true` la anota aunque no esté entre los destinatarios (FR-062).' })
  inscribir(
    @Param('id') id: string,
    @Body('personaId') personaId: string | undefined,
    @Body('forzar') forzar: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.servicio.inscribirEnNombre(id, personaId, personaDeSesion(request), { forzar: forzar === true });
  }

  @Post('eventos/:id/inscripciones/aprobar-lote')
  @HttpCode(200)
  @RequierePermiso('inscripciones_evento.gestionar')
  @ApiOkResponse({ description: 'FR-026 — `{ aprobadas, fallidas }`.' })
  aprobarLote(@Param('id') id: string, @Body('ids') ids: unknown, @Req() request: AuthenticatedRequest) {
    return this.servicio.aprobarLote(id, ids, personaDeSesion(request));
  }

  @Get('inscripciones-evento/:id')
  @RequierePermiso('eventos.ver')
  @ApiOkResponse({ description: 'Una Inscripción con su `eventoId` (la bandeja lleva al detalle del Evento).' })
  una(@Param('id') id: string) {
    return this.servicio.una(id);
  }

  @Post('inscripciones-evento/:id/aprobar')
  @HttpCode(200)
  @RequierePermiso('inscripciones_evento.gestionar')
  aprobar(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.servicio.aprobar(id, personaDeSesion(request));
  }

  @Post('inscripciones-evento/:id/rechazar')
  @HttpCode(200)
  @RequierePermiso('inscripciones_evento.gestionar')
  rechazar(@Param('id') id: string, @Body('motivo') motivo: string | undefined, @Req() request: AuthenticatedRequest) {
    return this.servicio.rechazar(id, personaDeSesion(request), motivo);
  }

  @Post('inscripciones-evento/:id/dar-de-baja')
  @HttpCode(200)
  @RequierePermiso('inscripciones_evento.gestionar')
  darDeBaja(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.servicio.darDeBaja(id, personaDeSesion(request));
  }

  @Post('inscripciones-evento/:id/promocion-vista')
  @HttpCode(200)
  @RequierePermiso('inscripciones_evento.gestionar')
  promocionVista(@Param('id') id: string) {
    return this.servicio.marcarPromocionVista(id);
  }

  @Get('personas/:id/inscripciones-evento')
  @RequierePermiso('eventos.ver')
  @ApiOkResponse({ description: 'FR-048 — las Inscripciones a Evento de una Persona.' })
  dePersona(@Param('id') id: string, @Query('skip') skip?: string, @Query('take') take?: string) {
    const p = paginacion(skip, take);
    return this.servicio.dePersona(id, p.skip, p.take);
  }
}
