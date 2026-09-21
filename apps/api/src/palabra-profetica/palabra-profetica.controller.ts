import { Controller, Get, Query, Res } from '@nestjs/common';
import { ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { PalabraProfeticaService } from './palabra-profetica.service.js';

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
}
