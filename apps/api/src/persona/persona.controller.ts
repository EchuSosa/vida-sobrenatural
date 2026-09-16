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
import { JwtNextAuthGuard } from '../auth/jwt-nextauth.guard.js';
import { InternalLookupGuard } from '../auth/internal-lookup.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import type { AuthenticatedRequest } from '../auth/authenticated-request.js';

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

  @Get('pendientes-tutor')
  @UseGuards(JwtNextAuthGuard, RolesGuard)
  @Roles('admin', 'discipulador')
  @ApiBearerAuth()
  @ApiOkResponse({ description: 'Cola de casos pendiente_tutor — Historia 2b, Acceptance Scenario 3.' })
  findPendientesTutor() {
    return this.personaService.findPendientesTutor();
  }

  @Patch(':id/activar')
  @UseGuards(JwtNextAuthGuard, RolesGuard)
  @Roles('admin', 'discipulador')
  @ApiBearerAuth()
  @ApiOkResponse({ description: 'FR-008 — activa manualmente un pendiente_tutor (Flujo 7, camino A).' })
  activar(@Param('id') id: string, @Body() dto: ActivarPersonaDto) {
    return this.personaService.activar(id, dto);
  }

  @Patch(':id/marcar-inactiva')
  @UseGuards(JwtNextAuthGuard, RolesGuard)
  @Roles('admin', 'discipulador')
  @ApiBearerAuth()
  @ApiOkResponse({ description: 'FR-014 — cierra un pendiente_tutor no autorizado (soft delete).' })
  marcarInactiva(@Param('id') id: string) {
    return this.personaService.marcarInactiva(id);
  }
}
