import { Body, Controller, Get, HttpCode, Param, Post, Query, Req, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Response } from 'express';
import { ApiBearerAuth, ApiConsumes, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { tienePermiso } from '@vida-sobrenatural/shared-types';
import { JwtNextAuthGuard } from '../auth/jwt-nextauth.guard.js';
import { PermisosGuard } from '../auth/permisos.guard.js';
import { RequierePermiso } from '../auth/permisos.decorator.js';
import type { AuthenticatedRequest } from '../auth/authenticated-request.js';
import { PagosPersonaService } from './pagos-persona.service.js';
import { PagosAdminService } from './pagos-admin.service.js';
import { LimitePedidosGuard } from './limite-pedidos.guard.js';
import { personaDeSesion } from './persona-de-sesion.js';
import { paginacion } from './paginacion.js';

/** Techo de multer (memoria); la regla (5 MB) la aplica `prepararComprobante`. */
const LIMITE_MULTER_BYTES = 20 * 1024 * 1024;
type CamposPago = { monto?: string; medio?: string; fechaPago?: string };

/** spec 011, lotes C y D — Pagos (contracts/pagos-api.md). */
@ApiTags('pagos')
@ApiBearerAuth()
@Controller()
@UseGuards(JwtNextAuthGuard)
export class PagosController {
  constructor(
    private readonly persona: PagosPersonaService,
    private readonly admin: PagosAdminService,
  ) {}

  @Post('inscripciones-evento/:id/pagos')
  @UseGuards(LimitePedidosGuard)
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('comprobante', { storage: memoryStorage(), limits: { fileSize: LIMITE_MULTER_BYTES } }))
  @ApiCreatedResponse({ description: 'FR-030, FR-031 — la Persona registra su Pago (monto, medio, fechaPago, comprobante).' })
  registrar(@Param('id') id: string, @Req() request: AuthenticatedRequest, @Body() campos: CamposPago, @UploadedFile() archivo?: Express.Multer.File) {
    return this.persona.registrar(id, personaDeSesion(request), campos, archivo?.buffer);
  }

  @Post('inscripciones-evento/:id/pagos/en-nombre')
  @UseGuards(PermisosGuard)
  @RequierePermiso('pagos.verificar')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('comprobante', { storage: memoryStorage(), limits: { fileSize: LIMITE_MULTER_BYTES } }))
  @ApiCreatedResponse({ description: 'FR-036 — el Admin registra un Pago en nombre de la Persona: nace verificado, comprobante opcional.' })
  enNombre(@Param('id') id: string, @Req() request: AuthenticatedRequest, @Body() campos: CamposPago, @UploadedFile() archivo?: Express.Multer.File) {
    return this.admin.registrarEnNombre(id, personaDeSesion(request), campos, archivo?.buffer);
  }

  @Get('pagos')
  @UseGuards(PermisosGuard)
  @RequierePermiso('pagos.verificar')
  @ApiOkResponse({ description: '`Pagina<PagoEnBandeja>`, por estado y Evento.' })
  listar(@Query('estado') estado?: string, @Query('eventoId') eventoId?: string, @Query('skip') skip?: string, @Query('take') take?: string) {
    const p = paginacion(skip, take);
    return this.admin.listar({ estado: estado === 'verificado' || estado === 'rechazado' ? estado : 'pendiente_verificacion', eventoId, ...p });
  }

  @Get('pagos/:id')
  @UseGuards(PermisosGuard)
  @RequierePermiso('pagos.verificar')
  @ApiOkResponse({ description: '`PagoEnBandeja` (detalle de la bandeja).' })
  detalle(@Param('id') id: string) {
    return this.admin.detalle(id);
  }

  @Get('pagos/:id/comprobante')
  @ApiOkResponse({ description: 'FR-032 — el comprobante; la dueña o `pagos.verificar`, si no 404.' })
  async comprobante(@Param('id') id: string, @Req() request: AuthenticatedRequest, @Res() res: Response) {
    const archivo = await this.persona.comprobante(id, {
      personaId: request.user.personaId,
      puedeVerificar: tienePermiso(request.user.rol, 'pagos.verificar'),
    });
    res.setHeader('Content-Type', archivo.mime);
    res.setHeader('Content-Disposition', `inline; filename="${archivo.nombre}"`);
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    archivo.stream.pipe(res);
  }

  @Post('pagos/:id/verificar')
  @HttpCode(200)
  @UseGuards(PermisosGuard)
  @RequierePermiso('pagos.verificar')
  @ApiOkResponse({ description: 'FR-033.' })
  verificar(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.admin.verificar(id, personaDeSesion(request));
  }

  @Post('pagos/:id/rechazar')
  @HttpCode(200)
  @UseGuards(PermisosGuard)
  @RequierePermiso('pagos.verificar')
  @ApiOkResponse({ description: 'FR-035 — rechaza, cancela la Inscripción y promueve desde la lista.' })
  rechazar(@Param('id') id: string, @Req() request: AuthenticatedRequest, @Body('motivo') motivo?: string) {
    return this.admin.rechazar(id, personaDeSesion(request), motivo);
  }
}
