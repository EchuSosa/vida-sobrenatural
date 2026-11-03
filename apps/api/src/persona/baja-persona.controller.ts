import { Body, Controller, HttpCode, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { JwtNextAuthGuard } from '../auth/jwt-nextauth.guard.js';
import { PermisosGuard } from '../auth/permisos.guard.js';
import { RequierePermiso } from '../auth/permisos.decorator.js';
import type { AuthenticatedRequest } from '../auth/authenticated-request.js';
import { personaDeSesion } from '../discipulado/sesion.js';
import { BajaPersonaService } from './baja-persona.service.js';
import { BajaPersonaDto } from './dto/baja-persona.dto.js';

/** spec 018 (D263): la persona se da de baja, o el Admin la da de baja en su nombre. */
@ApiTags('personas')
@Controller('personas')
@UseGuards(JwtNextAuthGuard)
@ApiBearerAuth()
export class BajaPersonaController {
  constructor(private readonly baja: BajaPersonaService) {}

  @Post('me/baja')
  @HttpCode(200)
  @ApiOkResponse({ description: 'spec 018: ResultadoBaja. 400 CONFIRMACION_BAJA_INVALIDA (campo confirmacion); 409 ULTIMO_ADMIN.' })
  propia(@Body() dto: BajaPersonaDto, @Req() request: AuthenticatedRequest) {
    const personaId = personaDeSesion(request);
    return this.baja.darDeBaja(personaId, personaId, { confirmacion: dto.confirmacion });
  }

  @Post(':id/baja')
  @HttpCode(200)
  @UseGuards(PermisosGuard)
  @RequierePermiso('personas.baja')
  @ApiOkResponse({ description: 'spec 018: ResultadoBaja. 400 por campo (confirmacion, motivo); 404 si no existe o ya está dada de baja; 409 ULTIMO_ADMIN.' })
  enNombre(@Param('id') id: string, @Body() dto: BajaPersonaDto, @Req() request: AuthenticatedRequest) {
    return this.baja.darDeBaja(id, personaDeSesion(request), dto);
  }
}
