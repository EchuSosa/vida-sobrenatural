import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ApiBearerAuth, ApiConsumes, ApiCreatedResponse, ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger';
import { LibroService } from './libro.service.js';
import { CrearLibroDto } from './dto/crear-libro.dto.js';
import { ActualizarLibroDto } from './dto/actualizar-libro.dto.js';
import { ReordenarLibrosDto } from './dto/reordenar-libros.dto.js';
import { JwtNextAuthGuard } from '../auth/jwt-nextauth.guard.js';
import { PermisosGuard } from '../auth/permisos.guard.js';
import { RequierePermiso } from '../auth/permisos.decorator.js';
import type { AuthenticatedRequest } from '../auth/authenticated-request.js';
import { rechazarEstadoPapelera } from '../common/rechazar-estado-papelera.js';

// Techo de multer — protección de memoria, no la regla de negocio (5 MB,
// PORTADA_TAMANO_EXCEDIDO): esa la valida LibroService.subirPortada contra
// el buffer real, para que el error tenga siempre nuestra forma (Problem
// Details), nunca la de un MulterError crudo.
const LIMITE_MULTER_BYTES = 20 * 1024 * 1024;

/** H-42: mismo default de paginación que Palabra Profética y pendientes-tutor. */
const LIBROS_TAKE_DEFAULT = 20;

/** Mismo criterio de `skip`/`take` para el listado público y la papelera (H-42: máximo 100). */
function paginacion(skipParam?: string, takeParam?: string) {
  return {
    skip: Math.max(0, Number(skipParam) || 0),
    take: Math.min(100, Math.max(1, Number(takeParam) || LIBROS_TAKE_DEFAULT)),
  };
}

@ApiTags('libros')
@Controller('libros')
export class LibroController {
  constructor(private readonly libroService: LibroService) {}

  /**
   * FR-007/FR-008/D117 — público a propósito (sin ningún guard): qué Libros
   * existen no es información sensible. `estado=activas` (default, lo único
   * que usa `apps/web`) y `estado=todas` (backoffice). La papelera NO sale
   * por acá — ver `findPapelera` (H-129); `estado=papelera` responde 400.
   */
  @Get()
  @ApiQuery({ name: 'estado', required: false, enum: ['activas', 'todas'] })
  @ApiQuery({ name: 'skip', required: false })
  @ApiQuery({ name: 'take', required: false })
  @ApiOkResponse({
    description:
      'Libros — público. Activos por defecto (FR-007); `estado=todas` para el backoffice (D117). Nunca devuelve eliminados: la papelera es `GET /libros/papelera`, solo Admin. `estado=papelera` responde 400.',
  })
  findAll(@Query('estado') estado?: string, @Query('skip') skipParam?: string, @Query('take') takeParam?: string) {
    rechazarEstadoPapelera(estado);
    const { skip, take } = paginacion(skipParam, takeParam);
    return this.libroService.findAll(estado === 'todas' ? 'todas' : 'activas', skip, take);
  }

  /**
   * H-129: la papelera (D119) es del Admin, y eso se hace cumplir acá, en la
   * metadata de la ruta — no con una rama sobre `?estado=` dentro de un
   * endpoint público, que ningún guard ni auditoría vería. Antes de `:id`
   * a propósito, mismo motivo que `autores` y `reordenar` (H-89/H-91).
   */
  @Get('papelera')
  @UseGuards(JwtNextAuthGuard, PermisosGuard)
  @RequierePermiso('libros.papelera.ver')
  @ApiBearerAuth()
  @ApiQuery({ name: 'skip', required: false })
  @ApiQuery({ name: 'take', required: false })
  @ApiOkResponse({ description: 'D119/H-129 — Libros eliminados (papelera), paginado. Solo Admin (`libros.papelera.ver`).' })
  findPapelera(@Query('skip') skipParam?: string, @Query('take') takeParam?: string) {
    const { skip, take } = paginacion(skipParam, takeParam);
    return this.libroService.findAll('papelera', skip, take);
  }

  /**
   * H-91: antes de `:id` a propósito, mismo motivo que `PATCH /libros/reordenar`
   * (H-89) — si fuera después, Nest lo tomaría como un `GET /libros/:id` con id
   * literal "autores".
   */
  @Get('autores')
  @ApiOkResponse({ description: 'H-91 — autores ya cargados en Libros no eliminados, para sugerir mientras se escribe (no un catálogo cerrado).' })
  findAutores() {
    return this.libroService.findAutores();
  }

  @Get(':id')
  @ApiOkResponse({ description: 'Detalle de un Libro, activo o no (FR-007, mismo criterio que Sede) — nunca uno eliminado (D119).' })
  findOne(@Param('id') id: string) {
    return this.libroService.findOne(id);
  }

  @Post()
  @UseGuards(JwtNextAuthGuard, PermisosGuard)
  @RequierePermiso('libros.gestionar')
  @ApiBearerAuth()
  @ApiCreatedResponse({ description: 'FR-015 — solo Admin. La portada entra por su propio endpoint (FR-021).' })
  create(@Body() dto: CrearLibroDto) {
    return this.libroService.create(dto);
  }

  /**
   * H-89: antes de `:id` a propósito — si fuera después, Nest lo tomaría
   * como un `PATCH /libros/:id` con id literal "reordenar".
   */
  @Patch('reordenar')
  @UseGuards(JwtNextAuthGuard, PermisosGuard)
  @RequierePermiso('libros.gestionar')
  @ApiBearerAuth()
  @ApiOkResponse({
    description: 'FR-016 — persiste el orden nuevo completo (todos los ids del conjunto activo) en una sola transacción.',
  })
  reordenar(@Body() dto: ReordenarLibrosDto) {
    return this.libroService.reordenar(dto.ids);
  }

  @Patch(':id')
  @UseGuards(JwtNextAuthGuard, PermisosGuard)
  @RequierePermiso('libros.gestionar')
  @ApiBearerAuth()
  @ApiOkResponse({ description: 'FR-017 — incluye el toggle de inactivar/reactivar vía activo:false/true.' })
  update(@Param('id') id: string, @Body() dto: ActualizarLibroDto) {
    return this.libroService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtNextAuthGuard, PermisosGuard)
  @RequierePermiso('libros.gestionar')
  @ApiBearerAuth()
  @ApiOkResponse({
    description: 'D119/FR-020 — borrado lógico, siempre permitido (a diferencia de Sede, hoy nada referencia a Libro).',
  })
  eliminar(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.libroService.eliminar(id, request.user.personaId ?? request.user.email);
  }

  @Post(':id/restaurar')
  @UseGuards(JwtNextAuthGuard, PermisosGuard)
  @RequierePermiso('libros.gestionar')
  @ApiBearerAuth()
  @ApiOkResponse({ description: 'D119 — saca un Libro de la papelera.' })
  restaurar(@Param('id') id: string) {
    return this.libroService.restaurar(id);
  }

  @Post(':id/portada')
  @UseGuards(JwtNextAuthGuard, PermisosGuard)
  @RequierePermiso('libros.gestionar')
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('portada', { storage: memoryStorage(), limits: { fileSize: LIMITE_MULTER_BYTES } }))
  @ApiCreatedResponse({
    description: 'FR-021 a FR-026 — sube/reemplaza la portada (multipart: portada + portadaDescripcion). Endpoint privado; el archivo resultante se sirve público (D110).',
  })
  subirPortada(
    @Param('id') id: string,
    @UploadedFile() archivo: Express.Multer.File,
    @Body('portadaDescripcion') portadaDescripcion: string,
  ) {
    return this.libroService.subirPortada(id, {
      buffer: archivo.buffer,
      mimeType: archivo.mimetype,
      portadaDescripcion,
    });
  }

  @Delete(':id/portada')
  @UseGuards(JwtNextAuthGuard, PermisosGuard)
  @RequierePermiso('libros.gestionar')
  @ApiBearerAuth()
  @ApiOkResponse({ description: 'FR-021 — quita la portada; el libro vuelve a mostrarse con PlaceholderImagen (FR-027).' })
  eliminarPortada(@Param('id') id: string) {
    return this.libroService.eliminarPortada(id);
  }
}
