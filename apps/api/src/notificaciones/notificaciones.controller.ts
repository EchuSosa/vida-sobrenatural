import { Body, Controller, Get, HttpCode, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { JwtNextAuthGuard } from '../auth/jwt-nextauth.guard.js';
import { PermisosGuard } from '../auth/permisos.guard.js';
import { RequierePermiso } from '../auth/permisos.decorator.js';
import type { AuthenticatedRequest } from '../auth/authenticated-request.js';
import { personaDeSesion } from '../discipulado/sesion.js';
import { NotificacionesManualesService } from './notificaciones-manuales.service.js';
import { ContarDestinatariosDto, NuevaNotificacionDto } from './dto/nueva-notificacion.dto.js';

/**
 * spec 012, lote D — `/notificaciones` del backoffice (contracts/notificaciones-api.md).
 * Leer: `notificaciones.ver` (Admin y Pastor). Mandar: `notificaciones.enviar`
 * (solo Admin). No hay PATCH ni DELETE: un aviso mandado no se edita (FR-033).
 */
@ApiTags('notificaciones')
@ApiBearerAuth()
@Controller('notificaciones')
@UseGuards(JwtNextAuthGuard, PermisosGuard)
export class NotificacionesController {
  constructor(private readonly manuales: NotificacionesManualesService) {}

  @Get()
  @RequierePermiso('notificaciones.ver')
  @ApiOkResponse({ description: 'FR-026 — `Pagina<NotificacionManualResumen> & { pagina }`, solo manuales, más nuevas primero.' })
  listar(@Query('pagina') pagina?: string) {
    return this.manuales.listar(Number(pagina) || 1);
  }

  @Get('mails-fallidos')
  @RequierePermiso('notificaciones.ver')
  @ApiOkResponse({ description: 'FR-031 — `Pagina<MailFallido>`: mails de avisos automáticos que no salieron (30 días). Nunca el email.' })
  mailsFallidos(@Query('pagina') pagina?: string) {
    return this.manuales.mailsFallidos(Number(pagina) || 1);
  }

  @Get('opciones-alcance')
  @RequierePermiso('notificaciones.enviar')
  @ApiOkResponse({ description: 'FR-027 — Grupos en curso con Inscripciones activas y Ministerios activos.' })
  opcionesAlcance() {
    return this.manuales.opcionesAlcance();
  }

  @Post('destinatarios')
  @HttpCode(200)
  @RequierePermiso('notificaciones.enviar')
  @ApiOkResponse({ description: 'FR-028 — `{ personas, conEmail }`, con la misma resolución que el envío. No crea nada.' })
  contar(@Body() dto: ContarDestinatariosDto) {
    return this.manuales.contar(dto);
  }

  @Get(':id')
  @RequierePermiso('notificaciones.ver')
  @ApiOkResponse({ description: 'FR-030 — `NotificacionManualDetalle`; automática o inexistente → 404.' })
  detalle(@Param('id') id: string) {
    return this.manuales.detalle(id);
  }

  @Post()
  @RequierePermiso('notificaciones.enviar')
  @ApiCreatedResponse({ description: 'FR-027, FR-029 — crea el aviso y sus Entregas; 400 VALIDACION por campo, 409 ALCANCE_NO_DISPONIBLE / NOTIFICACION_SIN_DESTINATARIOS.' })
  crear(@Body() dto: NuevaNotificacionDto, @Req() request: AuthenticatedRequest) {
    return this.manuales.crear(personaDeSesion(request), dto);
  }
}
