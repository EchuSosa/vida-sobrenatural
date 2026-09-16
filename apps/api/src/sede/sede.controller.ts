import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { SedeService } from './sede.service.js';
import { CrearSedeDto } from './dto/crear-sede.dto.js';
import { ActualizarSedeDto } from './dto/actualizar-sede.dto.js';
import { JwtNextAuthGuard } from '../auth/jwt-nextauth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '../auth/roles.decorator.js';

@ApiTags('sedes')
@Controller('sedes')
export class SedeController {
  constructor(private readonly sedeService: SedeService) {}

  @Get()
  @ApiOkResponse({ description: 'Sedes activas (FR-002/FR-003, Historia 1).' })
  findAll() {
    return this.sedeService.findAllActive();
  }

  @Get(':id')
  @ApiOkResponse({ description: 'Detalle de una Sede activa (FR-004).' })
  findOne(@Param('id') id: string) {
    return this.sedeService.findOneActive(id);
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
  @ApiOkResponse({ description: 'FR-010/FR-011 — incluye soft delete vía activo:false.' })
  update(@Param('id') id: string, @Body() dto: ActualizarSedeDto) {
    return this.sedeService.update(id, dto);
  }
}
