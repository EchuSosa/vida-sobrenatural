import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ApiBearerAuth, ApiConsumes, ApiCreatedResponse, ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger';
import { LibroService } from './libro.service.js';
import { CrearLibroDto } from './dto/crear-libro.dto.js';
import { ActualizarLibroDto } from './dto/actualizar-libro.dto.js';
import { JwtNextAuthGuard } from '../auth/jwt-nextauth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import type { AuthenticatedRequest } from '../auth/authenticated-request.js';

// Techo de multer — protección de memoria, no la regla de negocio (5 MB,
// PORTADA_TAMANO_EXCEDIDO): esa la valida LibroService.subirPortada contra
// el buffer real, para que el error tenga siempre nuestra forma (Problem
// Details), nunca la de un MulterError crudo.
const LIMITE_MULTER_BYTES = 20 * 1024 * 1024;

/** H-42: mismo default de paginación que Palabra Profética y pendientes-tutor. */
const LIBROS_TAKE_DEFAULT = 20;

@ApiTags('libros')
@Controller('libros')
export class LibroController {
  constructor(private readonly libroService: LibroService) {}

  /**
   * FR-007/FR-008/D117/D119 — `estado=activas` (default, lo único que usa
   * `apps/web`), `estado=todas` (backoffice) y `estado=papelera` (D119,
   * solo Admin/Pastor en la práctica, pero sin guard nuevo — mismo criterio
   * que `GET /sedes`: qué Libros existen no es información sensible).
   */
  @Get()
  @ApiQuery({ name: 'estado', required: false, enum: ['activas', 'todas', 'papelera'] })
  @ApiQuery({ name: 'skip', required: false })
  @ApiQuery({ name: 'take', required: false })
  @ApiOkResponse({ description: 'Libros — activos por defecto (FR-007); `estado=todas`/`estado=papelera` para el backoffice (D117, D119).' })
  findAll(
    @Query('estado') estado?: 'activas' | 'todas' | 'papelera',
    @Query('skip') skipParam?: string,
    @Query('take') takeParam?: string,
  ) {
    const valido = estado === 'todas' || estado === 'papelera' ? estado : 'activas';
    const skip = Math.max(0, Number(skipParam) || 0);
    const take = Math.min(100, Math.max(1, Number(takeParam) || LIBROS_TAKE_DEFAULT));
    return this.libroService.findAll(valido, skip, take);
  }

  @Get(':id')
  @ApiOkResponse({ description: 'Detalle de un Libro, activo o no (FR-007, mismo criterio que Sede) — nunca uno eliminado (D119).' })
  findOne(@Param('id') id: string) {
    return this.libroService.findOne(id);
  }

  @Post()
  @UseGuards(JwtNextAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiCreatedResponse({ description: 'FR-015 — solo Admin. La portada entra por su propio endpoint (FR-021).' })
  create(@Body() dto: CrearLibroDto) {
    return this.libroService.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtNextAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOkResponse({ description: 'FR-017 — incluye el toggle de inactivar/reactivar vía activo:false/true.' })
  update(@Param('id') id: string, @Body() dto: ActualizarLibroDto) {
    return this.libroService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtNextAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOkResponse({
    description: 'D119/FR-020 — borrado lógico, siempre permitido (a diferencia de Sede, hoy nada referencia a Libro).',
  })
  eliminar(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.libroService.eliminar(id, request.user.personaId ?? request.user.email);
  }

  @Post(':id/restaurar')
  @UseGuards(JwtNextAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOkResponse({ description: 'D119 — saca un Libro de la papelera.' })
  restaurar(@Param('id') id: string) {
    return this.libroService.restaurar(id);
  }

  @Post(':id/portada')
  @UseGuards(JwtNextAuthGuard, RolesGuard)
  @Roles('admin')
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
  @UseGuards(JwtNextAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOkResponse({ description: 'FR-021 — quita la portada; el libro vuelve a mostrarse con PlaceholderImagen (FR-027).' })
  eliminarPortada(@Param('id') id: string) {
    return this.libroService.eliminarPortada(id);
  }
}
