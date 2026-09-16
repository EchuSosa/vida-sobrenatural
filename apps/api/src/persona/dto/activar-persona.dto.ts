import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

/** Body de PATCH /personas/:id/activar — Flujo 7 camino A (FR-008). */
export class ActivarPersonaDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  tutorNombre!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  tutorTelefono!: string;
}
