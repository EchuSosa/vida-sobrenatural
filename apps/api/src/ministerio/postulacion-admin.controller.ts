import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { tienePermiso } from '@vida-sobrenatural/shared-types';
import { JwtNextAuthGuard } from '../auth/jwt-nextauth.guard.js';
import { PermisosGuard } from '../auth/permisos.guard.js';
import { RequierePermiso } from '../auth/permisos.decorator.js';
import type { AuthenticatedRequest } from '../auth/authenticated-request.js';
import { personaDeSesion } from '../discipulado/sesion.js';
import { PostulacionAdminService } from './postulacion-admin.service.js';
import {
  AprobarPostulacionDto,
  MotivoOpcionalDto,
  PostulacionEnNombreDeDto,
} from './dto/postulacion.dto.js';

/**
 * spec 009, Historias 2, 5 y 6 (T025, T048, T052; contracts/postulaciones-api.md
 * y ministerios-api.md). Revisar reusa los permisos de la bandeja
 * (`solicitudes.ver` / `solicitudes.aprobar`): el Pastor ve sin acciones ni
 * motivos internos (FR-023). Quien resuelve queda registrado: sin Persona en
 * la sesión no se hace (H-140).
 */
@ApiTags('postulaciones')
@Controller()
@UseGuards(JwtNextAuthGuard, PermisosGuard)
@ApiBearerAuth()
export class PostulacionAdminController {
  constructor(private readonly service: PostulacionAdminService) {}

  @Post('postulaciones')
  @RequierePermiso('postulaciones.crear_en_nombre')
  @ApiCreatedResponse({
    description:
      'spec 009, FR-024: postular en nombre de una Persona (mismas reglas, con creadoPorId).',
  })
  crearEnNombreDe(
    @Body() dto: PostulacionEnNombreDeDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.service.crearEnNombreDe(dto, personaDeSesion(request));
  }

  @Get('postulaciones/:id')
  @RequierePermiso('solicitudes.ver')
  @ApiOkResponse({
    description:
      'spec 009, FR-016: PostulacionDetalle; los motivos internos solo con solicitudes.aprobar.',
  })
  detalle(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.service.detalle(
      id,
      tienePermiso(request.user?.rol ?? [], 'solicitudes.aprobar'),
    );
  }

  @Post('postulaciones/:id/aprobar')
  @HttpCode(200)
  @RequierePermiso('solicitudes.aprobar')
  @ApiOkResponse({
    description:
      'spec 009, FR-017 a FR-022: aprobar. 409 POSTULACION_REQUIERE_CONFIRMAR_CAMBIO (con ministerioActual), POSTULACION_NO_PENDIENTE, MINISTERIO_NO_DISPONIBLE, PERSONA_MENOR_DE_EDAD_NO_PUEDE_TENER_ROL_DE_CARGO; 400 VALIDACION (celulaId).',
  })
  aprobar(
    @Param('id') id: string,
    @Body() dto: AprobarPostulacionDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.service.aprobar(id, dto, personaDeSesion(request));
  }

  @Post('postulaciones/:id/rechazar')
  @HttpCode(200)
  @RequierePermiso('solicitudes.aprobar')
  @ApiOkResponse({
    description:
      'spec 009, FR-019: rechazar con motivo opcional interno. 409 POSTULACION_NO_PENDIENTE.',
  })
  rechazar(
    @Param('id') id: string,
    @Body() dto: MotivoOpcionalDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.service.rechazar(id, dto.motivo, personaDeSesion(request));
  }

  @Post('postulaciones/:id/dar-de-baja')
  @HttpCode(200)
  @RequierePermiso('ministerios.gestionar')
  @ApiOkResponse({
    description:
      'spec 009, FR-025: da de baja a un miembro (motivo opcional interno). 409 POSTULACION_NO_APROBADA.',
  })
  darDeBaja(
    @Param('id') id: string,
    @Body() dto: MotivoOpcionalDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.service.darDeBaja(id, dto.motivo, personaDeSesion(request));
  }

  @Get('personas/:id/ministerio')
  @RequierePermiso('ministerios.ver')
  @ApiOkResponse({
    description:
      'spec 009: el Ministerio actual, la pendiente y el historial de una Persona (Perfil de Persona).',
  })
  deLaPersona(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.service.deLaPersona(
      id,
      tienePermiso(request.user?.rol ?? [], 'solicitudes.aprobar'),
    );
  }
}
