import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger';
import { SedeService } from './sede.service.js';
import { CrearSedeDto } from './dto/crear-sede.dto.js';
import { ActualizarSedeDto } from './dto/actualizar-sede.dto.js';
import { JwtNextAuthGuard } from '../auth/jwt-nextauth.guard.js';
import { PermisosGuard } from '../auth/permisos.guard.js';
import { RequierePermiso } from '../auth/permisos.decorator.js';
import type { AuthenticatedRequest } from '../auth/authenticated-request.js';
import { rechazarEstadoPapelera } from '../common/rechazar-estado-papelera.js';

@ApiTags('sedes')
@Controller('sedes')
export class SedeController {
  constructor(private readonly sedeService: SedeService) {}

  /**
   * Público a propósito (sin ningún guard): el catálogo de Sedes lo ve
   * cualquiera. La papelera NO sale por acá — ver `findPapelera`.
   */
  @Get()
  @ApiQuery({ name: 'estado', required: false, enum: ['activas', 'todas'] })
  @ApiOkResponse({
    description:
      'Sedes — público. Activas por defecto (FR-002/FR-003); `estado=todas` incluye inactivas (D117, H-51). ' +
      'Nunca devuelve eliminadas: la papelera es `GET /sedes/papelera`, solo Admin. `estado=papelera` responde 400.',
  })
  findAll(@Query('estado') estado?: string) {
    rechazarEstadoPapelera(estado);
    return this.sedeService.findAll(estado === 'todas' ? 'todas' : 'activas');
  }

  /**
   * H-129: la papelera (D119) es del Admin, y eso se hace cumplir acá, en la
   * metadata de la ruta — no con una rama sobre `?estado=` dentro de un
   * endpoint público, que ningún guard ni auditoría vería. Antes de `:id`
   * a propósito (mismo motivo que `PATCH /libros/reordenar`, H-89).
   */
  @Get('papelera')
  @UseGuards(JwtNextAuthGuard, PermisosGuard)
  @RequierePermiso('sedes.papelera.ver')
  @ApiBearerAuth()
  @ApiOkResponse({ description: 'D119/H-129 — Sedes eliminadas (papelera). Solo Admin (`sedes.papelera.ver`).' })
  findPapelera() {
    return this.sedeService.findAll('papelera');
  }

  @Get(':id')
  @ApiOkResponse({ description: 'Detalle de una Sede, activa o no (FR-004, H-51/H-52) — nunca una eliminada (D119).' })
  findOne(@Param('id') id: string) {
    return this.sedeService.findOne(id);
  }

  @Post()
  @UseGuards(JwtNextAuthGuard, PermisosGuard)
  @RequierePermiso('sedes.gestionar')
  @ApiBearerAuth()
  @ApiCreatedResponse({ description: 'FR-010/FR-011 — Historia 3, solo Admin.' })
  create(@Body() dto: CrearSedeDto) {
    return this.sedeService.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtNextAuthGuard, PermisosGuard)
  @RequierePermiso('sedes.gestionar')
  @ApiBearerAuth()
  @ApiOkResponse({ description: 'FR-010/FR-011 — incluye el toggle de inactivar/reactivar vía activo:false/true.' })
  update(@Param('id') id: string, @Body() dto: ActualizarSedeDto) {
    return this.sedeService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtNextAuthGuard, PermisosGuard)
  @RequierePermiso('sedes.gestionar')
  @ApiBearerAuth()
  @ApiOkResponse({
    description:
      'D119 — borrado lógico, distinto de inactivar: saca la Sede de todas las vistas normales. ' +
      'Bloqueado (SEDE_TIENE_DATOS_RELACIONADOS) si tiene Personas asociadas.',
  })
  eliminar(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.sedeService.eliminar(id, request.user.personaId ?? request.user.email);
  }

  @Post(':id/restaurar')
  @UseGuards(JwtNextAuthGuard, PermisosGuard)
  @RequierePermiso('sedes.gestionar')
  @ApiBearerAuth()
  @ApiOkResponse({ description: 'D119 — saca una Sede de la papelera.' })
  restaurar(@Param('id') id: string) {
    return this.sedeService.restaurar(id);
  }
}
