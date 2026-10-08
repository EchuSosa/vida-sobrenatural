import { Body, Controller, Delete, Get, Headers, HttpCode, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiHeader, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { ComentarioDetalle, ComentarioResumen, Pagina } from '@vida-sobrenatural/shared-types';
import { InternalLookupGuard } from '../auth/internal-lookup.guard.js';
import { JwtNextAuthGuard } from '../auth/jwt-nextauth.guard.js';
import { PermisosGuard } from '../auth/permisos.guard.js';
import { RequierePermiso } from '../auth/permisos.decorator.js';
import { SesionOpcionalGuard } from '../auth/sesion-opcional.guard.js';
import type { ApiJwtClaims, AuthenticatedRequest } from '../auth/authenticated-request.js';
import { AppException } from '../common/errors/app-exception.js';
import { ComentarioService } from './comentario.service.js';
import { ComentarioNuevoDto, ListarComentariosDto } from './dto/comentario.dto.js';

/**
 * spec 013, Historia 5 (T060, T061, contracts/comentarios-api.md). El envío
 * lo hace el servidor de Next de cada app (no el navegador directo), igual
 * que el código de ingreso de la 007: con `X-Internal-Secret` y la IP en
 * `X-Origen-Cliente`, así el límite por origen no se puede saltear mandando
 * otro header. La sesión es opcional: si viene el token, el comentario queda
 * a nombre de la Persona.
 */
@ApiTags('comentarios')
@Controller('comentarios')
export class ComentarioController {
  constructor(private readonly comentarios: ComentarioService) {}

  @Post()
  @HttpCode(201)
  @UseGuards(InternalLookupGuard, SesionOpcionalGuard)
  @ApiHeader({ name: 'X-Internal-Secret', required: true })
  @ApiHeader({ name: 'X-Origen-Cliente', required: true, description: 'IP del navegador, tomada por el servidor de Next. Se guarda solo su huella.' })
  @ApiCreatedResponse({
    description:
      '`{ id }`. 400 VALIDACION con errores por campo (TEXTO_INVALIDO, CONTACTO_INVALIDO en `contacto`, …); 429 DEMASIADOS_PEDIDOS con `reintentarEn` (segundos); 401 si viene un token inválido.',
  })
  crear(@Body() dto: ComentarioNuevoDto, @Headers('x-origen-cliente') origen: string | undefined, @Req() request: { user?: ApiJwtClaims }) {
    if (!origen || !origen.trim()) throw new AppException('VALIDACION', 400, 'Falta el header X-Origen-Cliente.');
    return this.comentarios.crear({ ...dto }, origen.trim(), request.user?.personaId ?? null);
  }

  @Get()
  @UseGuards(JwtNextAuthGuard, PermisosGuard)
  @RequierePermiso('comentarios.ver')
  @ApiBearerAuth()
  @ApiOkResponse({ description: '`Pagina<ComentarioResumen>`, más recientes primero. Por defecto, los sin revisar.' })
  listar(@Query() q: ListarComentariosDto): Promise<Pagina<ComentarioResumen>> {
    return this.comentarios.listar(q);
  }

  @Get('conteo-sin-revisar')
  @UseGuards(JwtNextAuthGuard, PermisosGuard)
  @RequierePermiso('comentarios.ver')
  @ApiBearerAuth()
  @ApiOkResponse({ description: '`{ total }` de comentarios sin revisar.' })
  conteo(): Promise<{ total: number }> {
    return this.comentarios.sinRevisar();
  }

  @Get(':id')
  @UseGuards(JwtNextAuthGuard, PermisosGuard)
  @RequierePermiso('comentarios.ver')
  @ApiBearerAuth()
  @ApiOkResponse({ description: '`ComentarioDetalle`. El contacto solo si aceptó que la contacten. 404 NO_ENCONTRADO.' })
  detalle(@Param('id') id: string): Promise<ComentarioDetalle> {
    return this.comentarios.detalle(id);
  }

  @Post(':id/revisado')
  @HttpCode(200)
  @UseGuards(JwtNextAuthGuard, PermisosGuard)
  @RequierePermiso('comentarios.gestionar')
  @ApiBearerAuth()
  @ApiOkResponse({ description: 'Idempotente: si ya estaba revisado, no cambia quién ni cuándo. `ComentarioResumen`.' })
  marcar(@Param('id') id: string, @Req() request: AuthenticatedRequest): Promise<ComentarioResumen> {
    const autor = request.user.personaId;
    if (!autor) throw new AppException('SIN_PERMISO', 403, 'Hace falta una Persona para marcar un comentario.');
    return this.comentarios.marcarRevisado(id, autor);
  }

  @Delete(':id/revisado')
  @HttpCode(200)
  @UseGuards(JwtNextAuthGuard, PermisosGuard)
  @RequierePermiso('comentarios.gestionar')
  @ApiBearerAuth()
  @ApiOkResponse({ description: 'Vuelve a "Sin revisar". Idempotente. `ComentarioResumen`.' })
  desmarcar(@Param('id') id: string): Promise<ComentarioResumen> {
    return this.comentarios.desmarcarRevisado(id);
  }
}
