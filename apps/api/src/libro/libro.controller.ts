import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger';
import { LibroService } from './libro.service.js';

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
}
