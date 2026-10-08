import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put, Query, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ApiBearerAuth, ApiConsumes, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { FILTROS_EVENTOS, type FiltroEventos } from '@vida-sobrenatural/shared-types';
import { JwtNextAuthGuard } from '../auth/jwt-nextauth.guard.js';
import { PermisosGuard } from '../auth/permisos.guard.js';
import { RequierePermiso } from '../auth/permisos.decorator.js';
import type { AuthenticatedRequest } from '../auth/authenticated-request.js';
import { EventosGestionService } from './eventos-gestion.service.js';
import { DatosEventoDto } from './dto/datos-evento.dto.js';
import { paginacion } from './paginacion.js';

/** Techo de multer (memoria); la regla de negocio (5 MB, FLYER_TAMANO_EXCEDIDO) la aplica el servicio. */
const LIMITE_MULTER_BYTES = 20 * 1024 * 1024;

function actor(request: AuthenticatedRequest): string {
  return request.user.personaId ?? request.user.email;
}

/**
 * spec 011, lote A — gestión de Eventos (contracts/eventos-api.md § Backoffice).
 * `eventos.ver` para leer (Admin y Pastor, FR-009); `eventos.gestionar` para
 * escribir (solo Admin). Las rutas fijas van antes de `:id`.
 */
@ApiTags('eventos')
@ApiBearerAuth()
@Controller('eventos')
@UseGuards(JwtNextAuthGuard, PermisosGuard)
export class EventosGestionController {
  constructor(private readonly servicio: EventosGestionService) {}

  @Get()
  @RequierePermiso('eventos.ver')
  @ApiOkResponse({ description: 'FR-009 — `Pagina<EventoResumen>` con filtro, tipo, búsqueda y orden.' })
  listar(
    @Query('filtro') filtro?: string,
    @Query('tipo') tipo?: string,
    @Query('buscar') buscar?: string,
    @Query('orden') orden?: string,
    @Query('dir') dir?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.servicio.listar({
      filtro: FILTROS_EVENTOS.includes(filtro as FiltroEventos) ? (filtro as FiltroEventos) : 'proximos',
      tipo: tipo === 'general' || tipo === 'bautismo' ? tipo : undefined,
      buscar,
      orden: orden === 'nombre' ? 'nombre' : 'inicio',
      dir: dir === 'asc' || dir === 'desc' ? dir : undefined,
      ...paginacion(skip, take),
    });
  }

  @Get('papelera')
  @RequierePermiso('eventos.papelera.ver')
  @ApiOkResponse({ description: 'D119 — Eventos eliminados.' })
  papelera(@Query('skip') skip?: string, @Query('take') take?: string) {
    const p = paginacion(skip, take);
    return this.servicio.papelera(p.skip, p.take);
  }

  @Get('bautismo/proximos')
  @RequierePermiso('eventos.ver')
  @ApiOkResponse({ description: 'FR-048 — próximos Eventos de bautismo publicados (para la 010).' })
  bautismoProximos() {
    return this.servicio.bautismoProximos();
  }

  @Get(':id')
  @RequierePermiso('eventos.ver')
  @ApiOkResponse({ description: '`EventoDetalle`; 404 si no existe o está eliminado.' })
  detalle(@Param('id') id: string) {
    return this.servicio.detalle(id);
  }

  @Post()
  @RequierePermiso('eventos.gestionar')
  @ApiCreatedResponse({ description: 'FR-010, FR-011 — crea el Evento con su slug.' })
  crear(@Body() dto: DatosEventoDto, @Req() request: AuthenticatedRequest) {
    return this.servicio.crear(dto, actor(request));
  }

  @Patch(':id')
  @RequierePermiso('eventos.gestionar')
  @ApiOkResponse({ description: 'FR-010, FR-014, FR-018 — edita; el slug no cambia.' })
  editar(@Param('id') id: string, @Body() dto: DatosEventoDto) {
    return this.servicio.editar(id, dto);
  }

  @Put(':id/flyer')
  @RequierePermiso('eventos.gestionar')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('archivo', { storage: memoryStorage(), limits: { fileSize: LIMITE_MULTER_BYTES } }))
  @ApiOkResponse({ description: 'FR-012 — sube/reemplaza el flyer (multipart: archivo + descripcionImagen).' })
  subirFlyer(
    @Param('id') id: string,
    @UploadedFile() archivo: Express.Multer.File | undefined,
    @Body('descripcionImagen') descripcionImagen?: string,
  ) {
    return this.servicio.subirFlyer(id, {
      archivo: archivo ? { buffer: archivo.buffer, mimeType: archivo.mimetype } : undefined,
      descripcionImagen,
    });
  }

  @Delete(':id/flyer')
  @RequierePermiso('eventos.gestionar')
  @ApiOkResponse({ description: 'FR-012 — quita el flyer.' })
  quitarFlyer(@Param('id') id: string) {
    return this.servicio.quitarFlyer(id);
  }

  @Post(':id/cancelar')
  @HttpCode(200)
  @RequierePermiso('eventos.gestionar')
  @ApiOkResponse({ description: 'FR-040.' })
  cancelar(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.servicio.cancelar(id, actor(request));
  }

  @Post(':id/reactivar')
  @HttpCode(200)
  @RequierePermiso('eventos.gestionar')
  @ApiOkResponse({ description: 'FR-041.' })
  reactivar(@Param('id') id: string) {
    return this.servicio.reactivar(id);
  }

  @Post(':id/eliminar')
  @HttpCode(204)
  @RequierePermiso('eventos.gestionar')
  @ApiOkResponse({ description: 'FR-042, D119 — borrado lógico, solo sin Inscripciones.' })
  eliminar(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.servicio.eliminar(id, actor(request));
  }

  @Post(':id/restaurar')
  @HttpCode(200)
  @RequierePermiso('eventos.gestionar')
  @ApiOkResponse({ description: 'D119 — sale de la papelera.' })
  restaurar(@Param('id') id: string) {
    return this.servicio.restaurar(id);
  }
}
