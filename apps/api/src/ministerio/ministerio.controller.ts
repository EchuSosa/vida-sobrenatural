import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { JwtNextAuthGuard } from '../auth/jwt-nextauth.guard.js';
import { PermisosGuard } from '../auth/permisos.guard.js';
import { RequierePermiso } from '../auth/permisos.decorator.js';
import type { AuthenticatedRequest } from '../auth/authenticated-request.js';
import { rechazarEstadoPapelera } from '../common/rechazar-estado-papelera.js';
import { personaDeSesion } from '../discipulado/sesion.js';
import { MinisterioService } from './ministerio.service.js';
import { CelulaService } from './celula.service.js';
import {
  ActualizarCelulaDto,
  ActualizarMinisterioDto,
  CrearCelulaDto,
  CrearMinisterioDto,
} from './dto/catalogo.dto.js';

const TAKE_MAX = 100;

/**
 * spec 009, Historias 4 y 7 (T038, T039; contracts/ministerios-api.md): el
 * catálogo de Ministerios y Células. `GET /ministerios/publicos` es público
 * (la web pública, FR-034); lo demás exige su permiso (D132). Las rutas
 * estáticas van antes de `:id` (y este controller se registra DESPUÉS del de
 * la Persona, que tiene `/ministerios/me…`).
 */
@ApiTags('ministerios')
@Controller()
export class MinisterioController {
  constructor(
    private readonly ministerios: MinisterioService,
    private readonly celulas: CelulaService,
  ) {}

  @Get('ministerios/publicos')
  @ApiOkResponse({
    description:
      'spec 009, FR-034 + docs/22: público. Ministerios activos con nombre y línea pública (sin áreas ni requisitos).',
  })
  publicos() {
    return this.ministerios.publicos();
  }

  @Get('ministerios')
  @UseGuards(JwtNextAuthGuard, PermisosGuard)
  @RequierePermiso('ministerios.ver')
  @ApiBearerAuth()
  @ApiQuery({ name: 'estado', required: false, enum: ['activos', 'todos'] })
  @ApiQuery({ name: 'buscar', required: false })
  @ApiOkResponse({
    description:
      'spec 009, FR-031: MinisterioCatalogo[] sin eliminados. `estado=papelera` → 400 (la papelera es su ruta).',
  })
  listar(@Query('estado') estado?: string, @Query('buscar') buscar?: string) {
    rechazarEstadoPapelera(estado);
    return this.ministerios.listar(
      estado === 'todos' ? 'todos' : 'activos',
      buscar,
    );
  }

  @Get('ministerios/papelera')
  @UseGuards(JwtNextAuthGuard, PermisosGuard)
  @RequierePermiso('ministerios.papelera.ver')
  @ApiBearerAuth()
  @ApiOkResponse({
    description:
      'spec 009, FR-030 (D119, H-129): Ministerios eliminados. Solo Admin.',
  })
  papelera() {
    return this.ministerios.papelera();
  }

  @Get('ministerios/:id')
  @UseGuards(JwtNextAuthGuard, PermisosGuard)
  @RequierePermiso('ministerios.ver')
  @ApiBearerAuth()
  @ApiOkResponse({
    description:
      'spec 009: MinisterioDetalleCatalogo, con sus Células. Un eliminado → 404.',
  })
  detalle(@Param('id') id: string) {
    return this.ministerios.detalle(id);
  }

  @Get('ministerios/:id/miembros')
  @UseGuards(JwtNextAuthGuard, PermisosGuard)
  @RequierePermiso('ministerios.ver')
  @ApiBearerAuth()
  @ApiOkResponse({
    description: 'spec 009, FR-032: Pagina<MiembroMinisterio>, por apellido.',
  })
  miembros(
    @Param('id') id: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @Query('buscar') buscar?: string,
  ) {
    return this.ministerios.miembros(
      id,
      Math.max(0, Number(skip) || 0),
      Math.min(TAKE_MAX, Math.max(1, Number(take) || 20)),
      buscar,
    );
  }

  @Get('ministerios/:id/celulas/papelera')
  @UseGuards(JwtNextAuthGuard, PermisosGuard)
  @RequierePermiso('ministerios.papelera.ver')
  @ApiBearerAuth()
  @ApiOkResponse({
    description:
      'spec 009, FR-030: Células eliminadas de un Ministerio. Solo Admin.',
  })
  papeleraCelulas(@Param('id') id: string) {
    return this.celulas.papelera(id);
  }

  @Post('ministerios')
  @UseGuards(JwtNextAuthGuard, PermisosGuard)
  @RequierePermiso('ministerios.gestionar')
  @ApiBearerAuth()
  @ApiCreatedResponse({
    description:
      'spec 009, FR-026. 400 VALIDACION (nombre, descripcion, lineaPublica).',
  })
  crear(@Body() dto: CrearMinisterioDto) {
    return this.ministerios.crear(dto);
  }

  @Patch('ministerios/:id')
  @UseGuards(JwtNextAuthGuard, PermisosGuard)
  @RequierePermiso('ministerios.gestionar')
  @ApiBearerAuth()
  @ApiOkResponse({
    description:
      'spec 009, FR-026/FR-028: editar, inactivar o reactivar. 409 CONFIRMACION_NOMBRE_REQUERIDA (con conteos).',
  })
  actualizar(@Param('id') id: string, @Body() dto: ActualizarMinisterioDto) {
    return this.ministerios.actualizar(id, dto);
  }

  @Delete('ministerios/:id')
  @HttpCode(204)
  @UseGuards(JwtNextAuthGuard, PermisosGuard)
  @RequierePermiso('ministerios.gestionar')
  @ApiBearerAuth()
  @ApiNoContentResponse({
    description:
      'spec 009, FR-030 (D119): borrado lógico. 409 MINISTERIO_TIENE_DATOS_RELACIONADOS.',
  })
  async eliminar(
    @Param('id') id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    await this.ministerios.eliminar(id, personaDeSesion(request));
  }

  @Post('ministerios/:id/restaurar')
  @HttpCode(200)
  @UseGuards(JwtNextAuthGuard, PermisosGuard)
  @RequierePermiso('ministerios.gestionar')
  @ApiBearerAuth()
  @ApiOkResponse({
    description: 'spec 009, FR-030: saca un Ministerio de la papelera.',
  })
  restaurar(@Param('id') id: string) {
    return this.ministerios.restaurar(id);
  }

  @Post('ministerios/:id/celulas')
  @UseGuards(JwtNextAuthGuard, PermisosGuard)
  @RequierePermiso('ministerios.gestionar')
  @ApiBearerAuth()
  @ApiCreatedResponse({
    description:
      'spec 009, FR-027. 400 VALIDACION (nombre, descripcion); 409 MINISTERIO_NO_DISPONIBLE si está eliminado.',
  })
  crearCelula(@Param('id') id: string, @Body() dto: CrearCelulaDto) {
    return this.celulas.crear(id, dto);
  }

  @Patch('celulas/:id')
  @UseGuards(JwtNextAuthGuard, PermisosGuard)
  @RequierePermiso('ministerios.gestionar')
  @ApiBearerAuth()
  @ApiOkResponse({
    description:
      'spec 009, FR-027 a FR-029. 409 MINISTERIO_INACTIVO, CONFIRMACION_NOMBRE_REQUERIDA.',
  })
  actualizarCelula(@Param('id') id: string, @Body() dto: ActualizarCelulaDto) {
    return this.celulas.actualizar(id, dto);
  }

  @Delete('celulas/:id')
  @HttpCode(204)
  @UseGuards(JwtNextAuthGuard, PermisosGuard)
  @RequierePermiso('ministerios.gestionar')
  @ApiBearerAuth()
  @ApiNoContentResponse({
    description:
      'spec 009, FR-030: borrado lógico. 409 CELULA_TIENE_DATOS_RELACIONADOS.',
  })
  async eliminarCelula(
    @Param('id') id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    await this.celulas.eliminar(id, personaDeSesion(request));
  }

  @Post('celulas/:id/restaurar')
  @HttpCode(200)
  @UseGuards(JwtNextAuthGuard, PermisosGuard)
  @RequierePermiso('ministerios.gestionar')
  @ApiBearerAuth()
  @ApiOkResponse({
    description: 'spec 009, FR-030: saca una Célula de la papelera.',
  })
  restaurarCelula(@Param('id') id: string) {
    return this.celulas.restaurar(id);
  }
}
