import { Controller, Get, Param, Req, Res, StreamableFile, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtNextAuthGuard } from '../auth/jwt-nextauth.guard.js';
import type { AuthenticatedRequest } from '../auth/authenticated-request.js';
import { ArchivosService } from './archivos.service.js';

/**
 * spec 008, FR-024: `GET /vida-de-servicio/archivos/:archivoId` — el único
 * lugar por donde sale un archivo de material (nunca una carpeta pública).
 * Cualquier sesión; el servicio decide por registro en cada pedido.
 */
@ApiTags('vida-de-servicio')
@Controller('vida-de-servicio/archivos')
@UseGuards(JwtNextAuthGuard)
@ApiBearerAuth()
export class ArchivosController {
  constructor(private readonly archivos: ArchivosService) {}

  @Get(':archivoId')
  @ApiOkResponse({ description: 'spec 008, FR-024: el archivo, con Content-Disposition inline y Cache-Control private, no-store. 404 CONTENIDO_NO_DISPONIBLE si no lo puede ver.' })
  async leer(@Param('archivoId') archivoId: string, @Req() request: AuthenticatedRequest, @Res({ passthrough: true }) res: Response): Promise<StreamableFile> {
    const archivo = await this.archivos.leer(archivoId, request.user.personaId ?? null, request.user.rol ?? []);
    res.set({
      'Content-Type': archivo.mimeType,
      'Content-Length': String(archivo.tamanioBytes),
      'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(archivo.nombre)}`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    return new StreamableFile(archivo.stream);
  }
}
