import { Body, Controller, Get, HttpCode, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { RespuestaPregunta } from '@vida-sobrenatural/shared-types';
import { JwtNextAuthGuard } from '../auth/jwt-nextauth.guard.js';
import type { AuthenticatedRequest } from '../auth/authenticated-request.js';
import { InscripcionPropiaService } from './inscripcion-propia.service.js';
import { MisEventosService } from './mis-eventos.service.js';
import { LimitePedidosGuard } from './limite-pedidos.guard.js';
import { personaDeSesion } from './persona-de-sesion.js';
import { paginacion } from './paginacion.js';

/**
 * spec 011, lotes B y C — lo de la propia Persona (sesión `activa`, sin permiso
 * del catálogo: se autoriza por registro, research #14, FR-051).
 */
@ApiTags('eventos')
@ApiBearerAuth()
@Controller()
@UseGuards(JwtNextAuthGuard)
export class InscripcionPropiaController {
  constructor(
    private readonly propia: InscripcionPropiaService,
    private readonly misEventos: MisEventosService,
  ) {}

  @Get('eventos/:id/mi-inscripcion')
  @ApiOkResponse({ description: 'Estado de quien mira, para la página del Evento (research #10).' })
  miInscripcion(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.propia.miInscripcion(id, personaDeSesion(request));
  }

  @Post('eventos/:id/inscripciones/me')
  @UseGuards(LimitePedidosGuard)
  @ApiCreatedResponse({ description: 'FR-015 — anotarse: confirmada, pendiente o lista de espera; CUPO_LLENO si no hay lista. Body opcional `respuestas` (FR-065).' })
  anotarme(@Param('id') id: string, @Body('respuestas') respuestas: unknown, @Req() request: AuthenticatedRequest) {
    return this.propia.anotarme(id, personaDeSesion(request), Array.isArray(respuestas) ? (respuestas as RespuestaPregunta[]) : undefined);
  }

  @Get('mis-inscripciones-evento')
  @ApiOkResponse({ description: 'FR-023 — `Pagina<MiInscripcionEvento>`, `cuando=proximas|pasadas`.' })
  mias(@Req() request: AuthenticatedRequest, @Query('cuando') cuando?: string, @Query('skip') skip?: string, @Query('take') take?: string) {
    const p = paginacion(skip, take);
    return this.misEventos.listar(personaDeSesion(request), cuando === 'pasadas' ? 'pasadas' : 'proximas', p.skip, p.take);
  }

  @Post('inscripciones-evento/:id/cancelar')
  @HttpCode(200)
  @ApiOkResponse({ description: 'FR-022 — cancelar la propia antes del inicio; promueve desde la lista.' })
  cancelar(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.misEventos.cancelar(id, personaDeSesion(request));
  }
}
