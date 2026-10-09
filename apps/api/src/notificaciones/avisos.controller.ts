import { Controller, Get, HttpCode, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { JwtNextAuthGuard } from '../auth/jwt-nextauth.guard.js';
import type { AuthenticatedRequest } from '../auth/authenticated-request.js';
import { personaDeSesion } from '../discipulado/sesion.js';
import { AvisosService } from './avisos.service.js';

/**
 * spec 012, lote A — `/avisos` de la web app (contracts/avisos-api.md). Sesión
 * como `/personas/me`, sin permiso del catálogo: cada Persona ve solo los suyos.
 */
@ApiTags('avisos')
@ApiBearerAuth()
@Controller('avisos')
@UseGuards(JwtNextAuthGuard)
export class AvisosController {
  constructor(private readonly avisos: AvisosService) {}

  @Get()
  @ApiOkResponse({ description: 'FR-001 — `Pagina<AvisoResumen> & { pagina }`, de a 20, más nuevos primero; `pagina` fuera de rango se recorta.' })
  listar(@Req() request: AuthenticatedRequest, @Query('pagina') pagina?: string) {
    return this.avisos.listar(personaDeSesion(request), Number(pagina) || 1);
  }

  @Get('sin-leer')
  @ApiOkResponse({ description: 'FR-005 — `{ cantidad }` de avisos sin leer (contador de la barra).' })
  sinLeer(@Req() request: AuthenticatedRequest) {
    return this.avisos.sinLeer(personaDeSesion(request));
  }

  @Post('leer-todos')
  @HttpCode(200)
  @ApiOkResponse({ description: 'FR-004 — `{ marcados }`.' })
  leerTodos(@Req() request: AuthenticatedRequest) {
    return this.avisos.leerTodos(personaDeSesion(request));
  }

  @Get(':id')
  @ApiOkResponse({ description: 'FR-006 — `AvisoDetalle`; de otra Persona o inexistente → 404 NO_ENCONTRADO.' })
  detalle(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.avisos.detalle(personaDeSesion(request), id);
  }

  @Patch(':id/leido')
  @ApiOkResponse({ description: 'FR-003, FR-008 — `{ destino }`; no pisa la primera fecha de lectura.' })
  marcarLeido(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.avisos.marcarLeido(personaDeSesion(request), id);
  }
}
