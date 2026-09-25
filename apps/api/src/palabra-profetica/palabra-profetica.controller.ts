import { Body, Controller, Get, Param, Patch, Post, Query, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { PalabraProfeticaService } from './palabra-profetica.service.js';
import { CrearPalabraProfeticaDto } from './dto/crear-palabra-profetica.dto.js';
import { ActualizarPalabraProfeticaDto } from './dto/actualizar-palabra-profetica.dto.js';
import { JwtNextAuthGuard } from '../auth/jwt-nextauth.guard.js';
import { PermisosGuard } from '../auth/permisos.guard.js';
import { RequierePermiso } from '../auth/permisos.decorator.js';

/** H-42: default de paginación del historial, acotado a un máximo de 100 (mismo criterio que pendientes-tutor). */
const HISTORIAL_TAKE_DEFAULT = 20;

@ApiTags('palabra-profetica')
@Controller('palabra-profetica')
export class PalabraProfeticaController {
  constructor(private readonly palabraProfeticaService: PalabraProfeticaService) {}

  /**
   * FR-004/FR-006 — `?vigente=true` es lo único que usa `apps/web`: la
   * única con `vigente:true`, o 204 si todavía no hay ninguna (la
   * subpágina pública renderiza su propio estado vacío, no un error — nunca
   * un body `null` con 200, que obligaría a cada consumidor a chequearlo a
   * mano). Sin ese filtro, historial paginado (FR-013) para el backoffice —
   * público sin guard: qué Palabra Profética existe no es información
   * sensible, mismo criterio que `GET /sedes`.
   */
  @Get()
  @ApiQuery({ name: 'vigente', required: false, enum: ['true'] })
  @ApiQuery({ name: 'skip', required: false })
  @ApiQuery({ name: 'take', required: false })
  @ApiOkResponse({ description: 'FR-004/FR-006/FR-013 — vigente=true o historial paginado.' })
  async findAll(
    @Res({ passthrough: true }) res: Response,
    @Query('vigente') vigenteParam?: string,
    @Query('skip') skipParam?: string,
    @Query('take') takeParam?: string,
  ) {
    if (vigenteParam === 'true') {
      const vigente = await this.palabraProfeticaService.findVigente();
      if (!vigente) {
        res.status(204);
        return;
      }
      return vigente;
    }
    const skip = Math.max(0, Number(skipParam) || 0);
    const take = Math.min(100, Math.max(1, Number(takeParam) || HISTORIAL_TAKE_DEFAULT));
    return this.palabraProfeticaService.findHistorial(skip, take);
  }

  /** D129: Admin y Pastor, las dos — la Palabra Profética la escribe un pastor, no debería depender de pedirle a quien administra el sistema que apriete guardar. */
  @Post()
  @UseGuards(JwtNextAuthGuard, PermisosGuard)
  @RequierePermiso('palabra_profetica.editar')
  @ApiBearerAuth()
  @ApiCreatedResponse({ description: 'FR-010 — Historia 3, Admin o Pastor (D129). youtubeUrl es opcional (D121).' })
  create(@Body() dto: CrearPalabraProfeticaDto) {
    return this.palabraProfeticaService.create(dto);
  }

  /** D129: Admin y Pastor, las dos. */
  @Patch(':id')
  @UseGuards(JwtNextAuthGuard, PermisosGuard)
  @RequierePermiso('palabra_profetica.editar')
  @ApiBearerAuth()
  @ApiOkResponse({ description: 'FR-010/FR-011 — edición parcial (Admin o Pastor, D129), no toca `vigente` (ver /marcar-vigente).' })
  update(@Param('id') id: string, @Body() dto: ActualizarPalabraProfeticaDto) {
    return this.palabraProfeticaService.update(id, dto);
  }

  /**
   * D129: Admin y Pastor, las dos — se evaluó y se descartó dejar esto
   * solo en Admin (separar "escribir" de "publicar"); acá el pastor que
   * escribe la palabra del año es quien decide cuál rige.
   */
  @Patch(':id/marcar-vigente')
  @UseGuards(JwtNextAuthGuard, PermisosGuard)
  @RequierePermiso('palabra_profetica.editar')
  @ApiBearerAuth()
  @ApiOkResponse({ description: 'FR-012, SC-006 — desmarca la anterior en la misma transacción, sin paso manual aparte.' })
  marcarVigente(@Param('id') id: string) {
    return this.palabraProfeticaService.marcarVigente(id);
  }
}
