import { Body, Controller, Delete, Get, Param, Post, Put, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { JwtNextAuthGuard } from '../auth/jwt-nextauth.guard.js';
import { PermisosGuard } from '../auth/permisos.guard.js';
import { RequierePermiso } from '../auth/permisos.decorator.js';
import type { AuthenticatedRequest } from '../auth/authenticated-request.js';
import { AppException } from '../common/errors/app-exception.js';
import { DisponibilidadService } from './disponibilidad.service.js';
import { CrearFranjaDto } from './dto/crear-franja.dto.js';
import { CrearBloqueoDto } from './dto/crear-bloqueo.dto.js';
import { ActualizarDisponibilidadDto } from './dto/actualizar-disponibilidad.dto.js';

/**
 * specs/004, Historia 4 — contracts/disponibilidad-api.md. Todo es del propio
 * Discipulador (D134): ningún endpoint recibe un `personaId`.
 */
@ApiTags('disponibilidad')
@ApiBearerAuth()
@Controller('disponibilidad/me')
@UseGuards(JwtNextAuthGuard, PermisosGuard)
export class DisponibilidadController {
  constructor(private readonly disponibilidadService: DisponibilidadService) {}

  /** Mismo criterio que roles.controller (H-140): sin Persona en la sesión no hay "me". */
  private personaDeSesion(request: AuthenticatedRequest): string {
    const personaId = request.user?.personaId;
    if (!personaId) {
      throw new AppException('SESION_SIN_PERSONA', 403, 'La sesión no tiene una Persona asociada.');
    }
    return personaId;
  }

  @Get()
  @RequierePermiso('mi_disponibilidad.ver')
  @ApiOkResponse({ description: 'MiDisponibilidad: franjas y bloqueos vivos (los vencidos no), toggle, máximo y si aparece en el cruce (FR-006).' })
  obtener(@Req() request: AuthenticatedRequest) {
    return this.disponibilidadService.obtener(this.personaDeSesion(request));
  }

  @Put()
  @RequierePermiso('mi_disponibilidad.gestionar')
  @ApiOkResponse({ description: 'FR-015/FR-045: toggle y máximo por Grupo. Idempotente; no toca discipulados ni propuestas (FR-018).' })
  actualizar(@Req() request: AuthenticatedRequest, @Body() dto: ActualizarDisponibilidadDto) {
    return this.disponibilidadService.actualizar(this.personaDeSesion(request), dto);
  }

  @Post('franjas')
  @RequierePermiso('mi_disponibilidad.gestionar')
  @ApiCreatedResponse({ description: 'FR-031: agrega una franja a la agenda. Superposiciones permitidas.' })
  agregarFranja(@Req() request: AuthenticatedRequest, @Body() dto: CrearFranjaDto) {
    return this.disponibilidadService.agregarFranja(this.personaDeSesion(request), dto);
  }

  @Delete('franjas/:id')
  @RequierePermiso('mi_disponibilidad.gestionar')
  @ApiOkResponse({ description: 'Borrado lógico de una franja propia; 404 si es ajena o ya estaba borrada.' })
  borrarFranja(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.disponibilidadService.borrarFranja(this.personaDeSesion(request), id);
  }

  @Post('bloqueos')
  @RequierePermiso('mi_disponibilidad.gestionar')
  @ApiCreatedResponse({ description: 'FR-016/FR-017: agrega un período de no disponibilidad. Superposiciones permitidas.' })
  agregarBloqueo(@Req() request: AuthenticatedRequest, @Body() dto: CrearBloqueoDto) {
    return this.disponibilidadService.agregarBloqueo(this.personaDeSesion(request), dto);
  }

  @Put('bloqueos/:id')
  @RequierePermiso('mi_disponibilidad.gestionar')
  @ApiOkResponse({ description: 'FR-040 (H-R12): cambia desde/hasta de un período propio, con las validaciones de crear; 404 si es ajeno o ya estaba borrado.' })
  editarBloqueo(@Req() request: AuthenticatedRequest, @Param('id') id: string, @Body() dto: CrearBloqueoDto) {
    return this.disponibilidadService.editarBloqueo(this.personaDeSesion(request), id, dto);
  }

  @Delete('bloqueos/:id')
  @RequierePermiso('mi_disponibilidad.gestionar')
  @ApiOkResponse({ description: 'FR-040: borrado lógico de un período propio; 404 si es ajeno o ya estaba borrado.' })
  borrarBloqueo(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.disponibilidadService.borrarBloqueo(this.personaDeSesion(request), id);
  }
}
