import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';
import { FranjasDto } from './franjas.dto.js';

/** POST /discipulado/solicitudes — FR-002: la Persona se elige con GET /personas/buscar. */
export class CrearEnNombreDto extends FranjasDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  personaId!: string;
}
