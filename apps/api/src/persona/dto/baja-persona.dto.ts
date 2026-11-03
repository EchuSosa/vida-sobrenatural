import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Allow } from 'class-validator';

/** spec 018: la palabra BAJA (validada en el servicio, error por campo) y el motivo interno del Admin. */
export class BajaPersonaDto {
  @ApiProperty({ example: 'BAJA' }) @Allow() confirmacion!: unknown;
  @ApiPropertyOptional({ maxLength: 200, description: 'Solo el Admin; no va a logs ni a avisos' }) @Allow() motivo?: unknown;
}
