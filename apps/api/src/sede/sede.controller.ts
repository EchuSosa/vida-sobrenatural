import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger';
import { SedeService } from './sede.service.js';
import { CrearSedeDto } from './dto/crear-sede.dto.js';
import { ActualizarSedeDto } from './dto/actualizar-sede.dto.js';
import { JwtNextAuthGuard } from '../auth/jwt-nextauth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import type { AuthenticatedRequest } from '../auth/authenticated-request.js';

@ApiTags('sedes')
@Controller('sedes')
export class SedeController {
  constructor(private readonly sedeService: SedeService) {}

  @Get()
  @ApiQuery({ name: 'estado', required: false, enum: ['activas', 'todas', 'papelera'] })
  @ApiOkResponse({
    description:
      'Sedes — activas por defecto (FR-002/FR-003); `estado=todas` incluye inactivas (D117, H-51); ' +
      '`estado=papelera` son solo las eliminadas (D119, vista del Admin).',
  })
  findAll(@Query('estado') estado?: 'activas' | 'todas' | 'papelera') {
    const valido = estado === 'todas' || estado === 'papelera' ? estado : 'activas';
    return this.sedeService.findAll(valido);
  }

  @Get(':id')
  @ApiOkResponse({ description: 'Detalle de una Sede, activa o no (FR-004, H-51/H-52) — nunca una eliminada (D119).' })
  findOne(@Param('id') id: string) {
    return this.sedeService.findOne(id);
  }

  @Post()
  @UseGuards(JwtNextAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiCreatedResponse({ description: 'FR-010/FR-011 — Historia 3, solo Admin.' })
  create(@Body() dto: CrearSedeDto) {
    return this.sedeService.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtNextAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOkResponse({ description: 'FR-010/FR-011 — incluye el toggle de inactivar/reactivar vía activo:false/true.' })
  update(@Param('id') id: string, @Body() dto: ActualizarSedeDto) {
    return this.sedeService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtNextAuthGuard, RolesGuard)
  @Roles('admin')
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
  @UseGuards(JwtNextAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOkResponse({ description: 'D119 — saca una Sede de la papelera.' })
  restaurar(@Param('id') id: string) {
    return this.sedeService.restaurar(id);
  }
}
