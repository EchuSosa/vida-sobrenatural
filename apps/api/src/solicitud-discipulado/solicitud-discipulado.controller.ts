import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiNoContentResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { tienePermiso, type EstadoSolicitud } from '@vida-sobrenatural/shared-types';
import { JwtNextAuthGuard } from '../auth/jwt-nextauth.guard.js';
import { PermisosGuard } from '../auth/permisos.guard.js';
import { RequierePermiso } from '../auth/permisos.decorator.js';
import type { AuthenticatedRequest } from '../auth/authenticated-request.js';
import { AppException } from '../common/errors/app-exception.js';
import { SolicitudDiscipuladoService, type OrdenBandeja } from './solicitud-discipulado.service.js';
import { FranjasDto } from './dto/franjas.dto.js';
import { CrearEnNombreDto } from './dto/crear-en-nombre.dto.js';
import { ProponerDto } from './dto/proponer.dto.js';

/** H-42: default de la bandeja, acotado a 100 (mismo criterio que GET /personas/pendientes-tutor). */
const SOLICITUDES_TAKE_DEFAULT = 20;

const ESTADOS: readonly EstadoSolicitud[] = ['pendiente', 'propuesta', 'aprobada', 'rechazada', 'retirada'];
/** FR-025: por defecto, los dos estados abiertos. */
const ESTADOS_ABIERTOS: EstadoSolicitud[] = ['pendiente', 'propuesta'];

/**
 * specs/004, Historias 1, 2 y 3 (contracts/solicitudes-api.md). Rutas de la
 * Persona (`/discipulado/me`, `/discipulado/solicitudes/me`): sesión con
 * estado `activa`, sin permiso del catálogo, siempre la Persona del token
 * (Principio V). Rutas del equipo: `@RequierePermiso` contra el catálogo (D132).
 */
@ApiTags('discipulado')
@Controller()
@UseGuards(JwtNextAuthGuard, PermisosGuard)
@ApiBearerAuth()
export class SolicitudDiscipuladoController {
  constructor(private readonly service: SolicitudDiscipuladoService) {}

  // ─── La Persona ──────────────────────────────────────────────────────────

  @Get('discipulado/me')
  @ApiOkResponse({ description: 'specs/004, Historia 2 — FR-026 a FR-029, FR-044: el estado de Vida Nueva de la propia Persona (EstadoMiDiscipulado). Sin notas ni capítulos; `pendiente` y `propuesta` se ven igual.' })
  estadoPropio(@Req() request: AuthenticatedRequest) {
    return this.service.estadoPropio(personaActivaDeSesion(request));
  }

  @Post('discipulado/solicitudes/me')
  @ApiCreatedResponse({ description: 'specs/004, Historia 1 — FR-001, FR-032, FR-044: pedir Vida Nueva con al menos una franja. 409 SOLICITUD_DISCIPULADO_YA_PENDIENTE, VIDA_NUEVA_EN_CURSO_O_COMPLETADA, EDAD_INSUFICIENTE_PARA_PEDIR_SOLO.' })
  crearPropia(@Body() dto: FranjasDto, @Req() request: AuthenticatedRequest) {
    return this.service.crearPropia(personaActivaDeSesion(request), dto.franjas);
  }

  @Put('discipulado/solicitudes/me/franjas')
  @ApiOkResponse({ description: 'specs/004, FR-039: reemplaza las franjas del pedido abierto; si había una propuesta en curso, la retira y la Solicitud vuelve a pendiente. 404 si no hay pedido abierto.' })
  editarFranjas(@Body() dto: FranjasDto, @Req() request: AuthenticatedRequest) {
    return this.service.editarFranjas(personaActivaDeSesion(request), dto.franjas);
  }

  @Delete('discipulado/solicitudes/me')
  @HttpCode(204)
  @ApiNoContentResponse({ description: 'specs/004, FR-039: la Persona retira su pedido abierto (y la propuesta en curso, si hay). Puede volver a pedir.' })
  async retirar(@Req() request: AuthenticatedRequest) {
    await this.service.retirar(personaActivaDeSesion(request));
  }

  // ─── En nombre de otra Persona (FR-002) ──────────────────────────────────

  @Post('discipulado/solicitudes')
  @RequierePermiso('solicitudes.crear_en_nombre')
  @ApiCreatedResponse({ description: 'specs/004, FR-002: el Admin o un Discipulador piden Vida Nueva en nombre de otra Persona; queda creadoPorId. Sin la regla de edad de FR-044.' })
  crearEnNombreDe(@Body() dto: CrearEnNombreDto, @Req() request: AuthenticatedRequest) {
    return this.service.crearEnNombreDe(dto.personaId, dto.franjas, autorDeSesion(request));
  }

  // ─── La bandeja del Admin (FR-025, FR-038) ───────────────────────────────

  @Get('solicitudes')
  @RequierePermiso('solicitudes.ver')
  @ApiOkResponse({ description: 'specs/004, FR-025: la bandeja genérica, paginada. `estado` (lista separada por comas, por defecto pendiente,propuesta), `tipo` (hoy solo discipulado), `orden` (fecha|persona|espera), `dir`, `skip`, `take`.' })
  listar(
    @Query('estado') estadoParam?: string,
    @Query('tipo') tipo?: string,
    @Query('orden') ordenParam?: string,
    @Query('dir') dirParam?: string,
    @Query('skip') skipParam?: string,
    @Query('take') takeParam?: string,
  ) {
    const skip = Math.max(0, Number(skipParam) || 0);
    const take = Math.min(100, Math.max(1, Number(takeParam) || SOLICITUDES_TAKE_DEFAULT));
    // FR-025: el filtro por tipo existe en la estructura; con un solo tipo conectado, otro tipo no trae nada.
    if (tipo && tipo !== 'discipulado') return { items: [], total: 0 };
    const pedidos = (estadoParam ?? '').split(',').filter((e): e is EstadoSolicitud => ESTADOS.includes(e as EstadoSolicitud));
    const orden: OrdenBandeja = ordenParam === 'persona' || ordenParam === 'espera' ? ordenParam : 'fecha';
    const dir: 'asc' | 'desc' = dirParam === 'desc' ? 'desc' : 'asc';
    return this.service.listar(pedidos.length > 0 ? pedidos : ESTADOS_ABIERTOS, orden, dir, skip, take);
  }

  @Get('discipulado/solicitudes/:id')
  @RequierePermiso('solicitudes.ver')
  @ApiOkResponse({ description: 'specs/004, FR-038: el detalle con las franjas; el historial de propuestas solo con solicitudes.aprobar (el Pastor no ve motivos de declinación).' })
  detalle(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.service.detalle(id, tienePermiso(request.user?.rol ?? [], 'solicitudes.aprobar'));
  }

  @Get('discipulado/solicitudes/:id/cruce')
  @RequierePermiso('solicitudes.aprobar')
  @ApiOkResponse({ description: 'specs/004, FR-034/FR-035/FR-045/FR-007: el cruce por franja de la Persona, con los que no coinciden y el sugerido.' })
  cruce(@Param('id') id: string) {
    return this.service.cruce(id);
  }

  @Post('discipulado/solicitudes/:id/proponer')
  @HttpCode(200)
  @RequierePermiso('solicitudes.aprobar')
  @ApiOkResponse({ description: 'specs/004, FR-003/FR-036: propone un Discipulador; la Solicitud pasa a propuesta, sin Grupo ni Liderazgo. 409 SOLICITUD_NO_PENDIENTE, DISCIPULADOR_NO_DISPONIBLE, GRUPO_SIN_LUGAR, VIDA_NUEVA_EN_CURSO_O_COMPLETADA.' })
  proponer(@Param('id') id: string, @Body() dto: ProponerDto, @Req() request: AuthenticatedRequest) {
    return this.service.proponer(id, dto.discipuladorId, dto.grupoDestinoId, autorDeSesion(request));
  }

  @Post('discipulado/solicitudes/:id/retirar-propuesta')
  @HttpCode(200)
  @RequierePermiso('solicitudes.aprobar')
  @ApiOkResponse({ description: 'specs/004, FR-036: retira la propuesta sin respuesta; la Solicitud vuelve a pendiente. 409 SOLICITUD_NO_PROPUESTA.' })
  retirarPropuesta(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    autorDeSesion(request);
    return this.service.retirarPropuesta(id);
  }

  @Post('discipulado/solicitudes/:id/rechazar')
  @HttpCode(200)
  @RequierePermiso('solicitudes.aprobar')
  @ApiOkResponse({ description: 'specs/004, FR-008: rechaza una Solicitud pendiente; no crea nada y la Persona puede volver a pedir. 409 SOLICITUD_NO_PENDIENTE.' })
  rechazar(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.service.rechazar(id, autorDeSesion(request));
  }
}

/** Las rutas de la Persona exigen una sesión `activa` con Persona (un `pendiente_tutor` todavía no usa la app). */
function personaActivaDeSesion(request: AuthenticatedRequest): string {
  const personaId = request.user?.personaId;
  if (!personaId) throw new AppException('NO_ENCONTRADO', 404, 'Esta sesión todavía no tiene una Persona asociada.');
  if (request.user.estado !== 'activa') throw new AppException('SIN_PERMISO', 403, 'Tu cuenta todavía no está activa.');
  return personaId;
}

/** H-140: quien propone, rechaza o pide en nombre de otra queda registrado; sin Persona en la sesión no se hace. */
function autorDeSesion(request: AuthenticatedRequest): string {
  const personaId = request.user?.personaId;
  if (!personaId) {
    throw new AppException('SESION_SIN_PERSONA', 403, 'La sesión no tiene una Persona asociada: el sistema no puede registrar quién hace el cambio, así que no lo hace.');
  }
  return personaId;
}
