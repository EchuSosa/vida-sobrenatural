import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiNoContentResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { JwtNextAuthGuard } from '../auth/jwt-nextauth.guard.js';
import { PermisosGuard } from '../auth/permisos.guard.js';
import { RequierePermiso } from '../auth/permisos.decorator.js';
import type { AuthenticatedRequest } from '../auth/authenticated-request.js';
import { AppException } from '../common/errors/app-exception.js';
import { CursoService } from './curso.service.js';
import { ActualizarCursoDto, CrearCursoDto } from './dto/curso.dto.js';

const NO_EDITABLES = ['categoria', 'tipo', 'modalidad', 'prerequisitoCategoria'] as const;

/** spec 013, Historia 6 (T070, contracts/cursos-api.md): el catálogo de Cursos. El Pastor solo lee (D64). */
@ApiTags('cursos')
@Controller()
@UseGuards(JwtNextAuthGuard, PermisosGuard)
@ApiBearerAuth()
export class CursoController {
  constructor(private readonly cursos: CursoService) {}

  @Get('catalogos/resumen')
  @RequierePermiso('catalogos.ver')
  @ApiOkResponse({ description: 'spec 013, FR-050: activos y total de cada catálogo (Sedes, Cursos).' })
  resumen() {
    return this.cursos.resumen();
  }

  @Get('cursos')
  @RequierePermiso('catalogos.ver')
  @ApiOkResponse({ description: 'spec 013, FR-051: `CursoListado[]`, activos (o todos con `incluirInactivos=true`); nunca eliminados.' })
  listar(@Query('incluirInactivos') incluirInactivos?: string) {
    return this.cursos.listar(incluirInactivos === 'true');
  }

  // Antes de `:id` (mismo motivo que la papelera de Sedes).
  @Get('cursos/papelera')
  @RequierePermiso('cursos.papelera.ver')
  @ApiOkResponse({ description: 'spec 013, FR-055: Cursos eliminados.' })
  papelera() {
    return this.cursos.papelera();
  }

  @Get('cursos/disponibles-para-alta')
  @RequierePermiso('cursos.gestionar')
  @ApiOkResponse({ description: 'spec 013, FR-056: las combinaciones de `CURSOS_RECONOCIDOS` sin Curso (o en la papelera, `restaurar: true`).' })
  disponibles() {
    return this.cursos.disponiblesParaAlta();
  }

  @Get('cursos/:id')
  @RequierePermiso('catalogos.ver')
  @ApiOkResponse({ description: 'spec 013: `CursoDetalle`; 404 si no existe o está eliminado.' })
  detalle(@Param('id') id: string) {
    return this.cursos.detalle(id);
  }

  @Post('cursos')
  @RequierePermiso('cursos.gestionar')
  @ApiCreatedResponse({ description: 'spec 013, FR-056: alta de una combinación reconocida. 409 CURSO_YA_EXISTE, 400 CURSO_NO_RECONOCIDO.' })
  crear(@Body() dto: CrearCursoDto) {
    return this.cursos.crear(dto);
  }

  @Patch('cursos/:id')
  @RequierePermiso('cursos.gestionar')
  @ApiOkResponse({ description: 'spec 013, FR-052/FR-053: nombre, descripción y activo. Categoría, tipo y modalidad no se editan (400 VALIDACION).' })
  actualizar(@Param('id') id: string, @Body() dto: ActualizarCursoDto, @Req() request: AuthenticatedRequest) {
    // `whitelist` ya los saca del DTO: se mira el cuerpo crudo para decir que no se puede, en vez de ignorarlos en silencio.
    const cuerpo = (request as unknown as { body?: Record<string, unknown> }).body ?? {};
    const prohibidos = NO_EDITABLES.filter((campo) => campo in cuerpo);
    if (prohibidos.length > 0) {
      throw new AppException('VALIDACION', 400, 'La categoría, el tipo y la modalidad de un Curso no se editan.', prohibidos.map((campo) => ({ campo, code: `${campo.toUpperCase()}_INVALIDO` })));
    }
    return this.cursos.actualizar(id, dto);
  }

  @Delete('cursos/:id')
  @HttpCode(204)
  @RequierePermiso('cursos.gestionar')
  @ApiNoContentResponse({ description: 'spec 013, D119: borrado lógico. 409 CURSO_TIENE_GRUPOS (se ofrece inactivar).' })
  async eliminar(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    await this.cursos.eliminar(id, request.user?.personaId ?? request.user?.email ?? 'desconocido');
  }

  @Post('cursos/:id/restaurar')
  @HttpCode(200)
  @RequierePermiso('cursos.gestionar')
  @ApiOkResponse({ description: 'spec 013, FR-055: vuelve de la papelera.' })
  restaurar(@Param('id') id: string) {
    return this.cursos.restaurar(id);
  }
}
