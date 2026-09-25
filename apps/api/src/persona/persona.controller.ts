import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { PersonaService } from './persona.service.js';
import { RegistroPersonaDto } from './dto/registro-persona.dto.js';
import { ActivarPersonaDto } from './dto/activar-persona.dto.js';
import { ActualizarPreferenciasDto } from './dto/actualizar-preferencias.dto.js';
import { ActualizarPerfilDto } from './dto/actualizar-perfil.dto.js';
import { JwtNextAuthGuard } from '../auth/jwt-nextauth.guard.js';
import { InternalLookupGuard } from '../auth/internal-lookup.guard.js';
import { PermisosGuard } from '../auth/permisos.guard.js';
import { RequierePermiso } from '../auth/permisos.decorator.js';
import type { AuthenticatedRequest } from '../auth/authenticated-request.js';

/** H-42: default de paginación de GET /personas/pendientes-tutor, acotado a un máximo de 100. */
const PENDIENTES_TUTOR_TAKE_DEFAULT = 20;

/** specs/005, Historia 2: mismo criterio de paginación para GET /personas. */
const PERSONAS_TAKE_DEFAULT = 20;

@ApiTags('personas')
@Controller('personas')
export class PersonaController {
  constructor(private readonly personaService: PersonaService) {}

  @Get('by-email')
  @UseGuards(InternalLookupGuard)
  @ApiOkResponse({ description: 'Uso interno — ver contracts/auth-integration.md.' })
  findByEmail(@Query('email') email: string) {
    return this.personaService.findByEmail(email);
  }

  @Post()
  @UseGuards(JwtNextAuthGuard)
  @ApiBearerAuth()
  @ApiCreatedResponse({ description: 'Registro inicial — Historia 2 y 2b (FR-005 a FR-009, FR-013).' })
  create(@Body() dto: RegistroPersonaDto, @Req() request: AuthenticatedRequest) {
    // El email del registro es siempre el de la sesión autenticada, nunca el
    // que mande el cliente en el body (ver contracts/personas-api.md).
    if (!request.user?.email) {
      throw new BadRequestException('El token no tiene un email válido.');
    }
    return this.personaService.create(dto, request.user.email);
  }

  @Get('me')
  @UseGuards(JwtNextAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ description: 'Perfil propio — Historia 5 (specs/002-base-transversal).' })
  obtenerPerfilPropio(@Req() request: AuthenticatedRequest) {
    // Autorización por registro (Constitución Principio V): siempre la propia
    // Persona del token, nunca un :id de la URL.
    return this.personaService.obtenerPerfilPropio(request.user?.personaId ?? null);
  }

  @Patch('me')
  @UseGuards(JwtNextAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ description: 'Self-edit de Perfil — Flujo 11 (H-35, FR-028/FR-029).' })
  actualizarPerfilPropio(@Body() dto: ActualizarPerfilDto, @Req() request: AuthenticatedRequest) {
    return this.personaService.actualizarPerfilPropio(request.user?.personaId ?? null, dto);
  }

  @Patch('me/preferencias')
  @UseGuards(JwtNextAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ description: 'Cambiar temaPreferido — Historia 5, FR-027/FR-028.' })
  actualizarPreferenciasPropias(
    @Body() dto: ActualizarPreferenciasDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.personaService.actualizarPreferenciasPropias(
      request.user?.personaId ?? null,
      dto.temaPreferido,
    );
  }

  @Get('pendientes-tutor')
  @UseGuards(JwtNextAuthGuard, PermisosGuard)
  @RequierePermiso('pendientes_tutor.gestionar')
  @ApiBearerAuth()
  @ApiOkResponse({
    description:
      'Cola de casos pendiente_tutor, paginada — Historia 2b, Acceptance Scenario 3 (H-42). `buscar` filtra por nombre/apellido/teléfono (H-88). `orden` (nombre|createdAt, default createdAt) y `dir` (asc|desc, default asc) ordenan en la base (H-88 revisado).',
  })
  findPendientesTutor(
    @Query('skip') skipParam?: string,
    @Query('take') takeParam?: string,
    @Query('buscar') buscar?: string,
    @Query('orden') ordenParam?: string,
    @Query('dir') dirParam?: string,
  ) {
    const skip = Math.max(0, Number(skipParam) || 0);
    const take = Math.min(100, Math.max(1, Number(takeParam) || PENDIENTES_TUTOR_TAKE_DEFAULT));
    const orden: 'nombre' | 'createdAt' = ordenParam === 'nombre' ? 'nombre' : 'createdAt';
    const dir: 'asc' | 'desc' = dirParam === 'desc' ? 'desc' : 'asc';
    return this.personaService.findPendientesTutor(skip, take, buscar, orden, dir);
  }

  @Get()
  @UseGuards(JwtNextAuthGuard, PermisosGuard)
  @RequierePermiso('personas.ver')
  @ApiBearerAuth()
  @ApiOkResponse({
    description:
      'Listado paginado de Personas activas — specs/005, Historia 2 (FR-005). `buscar` filtra por nombre/apellido/email/teléfono; `orden` (apellido|nombre, default apellido) y `dir` (asc|desc) ordenan en la base. `soloMayores=true` excluye a los menores de edad (FR-024) — opcional, por defecto false: lo pide la pantalla de ascender roles, no es el comportamiento del endpoint.',
  })
  listarPersonas(
    @Query('skip') skipParam?: string,
    @Query('take') takeParam?: string,
    @Query('buscar') buscar?: string,
    @Query('orden') ordenParam?: string,
    @Query('dir') dirParam?: string,
    @Query('soloMayores') soloMayoresParam?: string,
  ) {
    const skip = Math.max(0, Number(skipParam) || 0);
    const take = Math.min(100, Math.max(1, Number(takeParam) || PERSONAS_TAKE_DEFAULT));
    const orden: 'apellido' | 'nombre' = ordenParam === 'nombre' ? 'nombre' : 'apellido';
    const dir: 'asc' | 'desc' = dirParam === 'desc' ? 'desc' : 'asc';
    return this.personaService.listarPersonas(skip, take, buscar, orden, dir, soloMayoresParam === 'true');
  }

  // T025: mismos roles que tenía antes (admin y discipulador) — solo
  // cambia cómo se declara (catálogo, D132), no quién puede buscar.
  @Get('buscar')
  @UseGuards(JwtNextAuthGuard, PermisosGuard)
  @RequierePermiso('personas.buscar')
  @ApiBearerAuth()
  @ApiOkResponse({ description: 'Búsqueda acotada de Personas — H-29, D108 (elegir a quién vincular como tutor).' })
  buscarPersonas(@Query('q') q: string) {
    return this.personaService.buscarPersonas(q ?? '');
  }

  @Patch(':id/activar')
  @UseGuards(JwtNextAuthGuard, PermisosGuard)
  @RequierePermiso('pendientes_tutor.gestionar')
  @ApiBearerAuth()
  @ApiOkResponse({ description: 'FR-008 — activa manualmente un pendiente_tutor (Flujo 7, camino A).' })
  activar(@Param('id') id: string, @Body() dto: ActivarPersonaDto) {
    return this.personaService.activar(id, dto);
  }

  @Patch(':id/marcar-inactiva')
  @UseGuards(JwtNextAuthGuard, PermisosGuard)
  @RequierePermiso('pendientes_tutor.gestionar')
  @ApiBearerAuth()
  @ApiOkResponse({ description: 'FR-014 — cierra un pendiente_tutor no autorizado (soft delete).' })
  marcarInactiva(@Param('id') id: string) {
    return this.personaService.marcarInactiva(id);
  }
}
