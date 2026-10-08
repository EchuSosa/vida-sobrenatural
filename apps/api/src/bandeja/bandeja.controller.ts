import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { BANDEJA_PAGINA, esEstadoDeTipo, type TipoSolicitud } from '@vida-sobrenatural/shared-types';
import { JwtNextAuthGuard } from '../auth/jwt-nextauth.guard.js';
import { PermisosGuard } from '../auth/permisos.guard.js';
import { RequierePermiso } from '../auth/permisos.decorator.js';
import type { AuthenticatedRequest } from '../auth/authenticated-request.js';
import { AppException } from '../common/errors/app-exception.js';
import { BandejaService } from './bandeja.service.js';
import { ListarBandejaDto } from './dto/listar-bandeja.dto.js';

/**
 * spec 013, Historia 1 (T020, contracts/bandeja-api.md): la bandeja unificada
 * de Solicitudes. Generaliza el `GET /solicitudes` de la 004 (misma ruta); la
 * gestión de cada tipo sigue en el controller de su spec.
 */
@ApiTags('bandeja')
@Controller('solicitudes')
@UseGuards(JwtNextAuthGuard, PermisosGuard)
@ApiBearerAuth()
export class BandejaController {
  constructor(private readonly bandeja: BandejaService) {}

  @Get()
  @RequierePermiso('solicitudes.ver')
  @ApiOkResponse({
    description:
      'spec 013, FR-001–FR-005, FR-008: `Pagina<SolicitudBandeja>` de los tipos conectados. Por defecto las abiertas, sin los tipos que piden un permiso que quien pide no tiene (D216: `pago`, `pagos.verificar`), la que más espera primero. `estado` (de un tipo) reemplaza a `filtro`; sin `tipo` se lee como Discipulado (004). 400 VALIDACION con `errors[campo]`.',
  })
  listar(@Query() q: ListarBandejaDto, @Req() request: AuthenticatedRequest) {
    let tipo: TipoSolicitud | undefined = q.tipo;
    let estados: string[] | undefined;
    if (q.estado !== undefined) {
      // Compatibilidad con la 004: `estado=` sin `tipo` es siempre Discipulado.
      tipo ??= 'discipulado';
      const tipoDeEstados = tipo;
      estados = [...new Set(q.estado.split(',').map((e) => e.trim()).filter(Boolean))];
      if (estados.length === 0 || estados.some((e) => !esEstadoDeTipo(tipoDeEstados, e))) {
        throw new AppException('VALIDACION', 400, 'Uno o más campos no son válidos.', [{ campo: 'estado', code: 'ESTADO_INVALIDO' }]);
      }
    }
    return this.bandeja.listar({
      roles: request.user.rol,
      filtro: q.filtro ?? 'abiertas',
      tipo,
      estados,
      personaId: q.persona,
      buscar: q.buscar,
      orden: q.orden ?? 'espera',
      dir: q.dir ?? 'asc',
      skip: q.skip ?? 0,
      take: q.take ?? BANDEJA_PAGINA,
    });
  }

  @Get('conteo-abiertas')
  @RequierePermiso('solicitudes.ver')
  @ApiOkResponse({ description: 'spec 013, H3.5: `ConteoAbiertas` — un número por tipo conectado que quien pide puede ver (D216), 0 si no hay abiertas.' })
  conteoAbiertas(@Req() request: AuthenticatedRequest) {
    return this.bandeja.conteoAbiertas(request.user.rol);
  }
}
