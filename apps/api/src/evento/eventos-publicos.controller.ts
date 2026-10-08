import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { EventosPublicosService } from './eventos-publicos.service.js';
import { paginacion } from './paginacion.js';

/**
 * spec 011 — endpoints PÚBLICOS de Eventos (sin guard a propósito: la
 * cartelera la ve cualquiera, y nunca lleva inscriptos, FR-046). Registrado
 * ANTES que `EventosGestionController` para que `/eventos/publicos` no caiga
 * en `/eventos/:id`.
 */
@ApiTags('eventos')
@Controller('eventos/publicos')
export class EventosPublicosController {
  constructor(private readonly servicio: EventosPublicosService) {}

  @Get()
  @ApiOkResponse({ description: 'FR-001 — cartelera: `Pagina<EventoPublico>`.' })
  cartelera(@Query('skip') skip?: string, @Query('take') take?: string) {
    const p = paginacion(skip, take, 12);
    return this.servicio.cartelera(p.skip, p.take);
  }

  @Get('slugs')
  @ApiOkResponse({ description: 'FR-006 — slugs para el sitemap.' })
  slugs() {
    return this.servicio.slugs();
  }

  @Get(':slug')
  @ApiOkResponse({ description: 'FR-002, FR-005 — `EventoPublico`; 404 si no existe o está eliminado (FR-043).' })
  porSlug(@Param('slug') slug: string) {
    return this.servicio.porSlug(slug);
  }
}
