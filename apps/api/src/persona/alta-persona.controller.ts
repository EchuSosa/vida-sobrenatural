import { Body, Controller, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { JwtNextAuthGuard } from '../auth/jwt-nextauth.guard.js';
import { PermisosGuard } from '../auth/permisos.guard.js';
import { RequierePermiso } from '../auth/permisos.decorator.js';
import type { AuthenticatedRequest } from '../auth/authenticated-request.js';
import { personaDeSesion } from '../discipulado/sesion.js';
import { AltaPersonaService } from './alta-persona.service.js';
import { AgregarEmailDto, AltaPersonaDto } from './dto/alta-persona.dto.js';

/**
 * spec 006, Historia 5 (contracts/personas-alta-api.md): solo el Admin
 * (`personas.alta`, `personas.editar_email`); el Discipulador y el Pastor
 * reciben 403 (FR-029). Quien da de alta queda como `altaPor` (H-140).
 */
@ApiTags('personas')
@Controller('personas')
@UseGuards(JwtNextAuthGuard, PermisosGuard)
@ApiBearerAuth()
export class AltaPersonaController {
  constructor(private readonly service: AltaPersonaService) {}

  @Post('alta')
  @RequierePermiso('personas.alta')
  @ApiCreatedResponse({ description: 'spec 006, FR-031 a FR-036: alta de una Persona adulta, email opcional. 400 VALIDACION (todos los campos), 409 EMAIL_DUPLICADO, 409 POSIBLE_DUPLICADO con `coincidencias`.' })
  alta(@Body() dto: AltaPersonaDto, @Req() request: AuthenticatedRequest) {
    return this.service.alta(dto, personaDeSesion(request));
  }

  @Patch(':id/email')
  @RequierePermiso('personas.editar_email')
  @ApiOkResponse({ description: 'spec 006, FR-037: "Agregar email" a quien no tiene. 409 EMAIL_YA_CARGADO, EMAIL_DUPLICADO.' })
  agregarEmail(@Param('id') id: string, @Body() dto: AgregarEmailDto) {
    return this.service.agregarEmail(id, dto.email);
  }
}
