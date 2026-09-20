import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

/**
 * Body de PATCH /personas/:id/activar — Flujo 7 camino A (FR-008).
 * H-29 (revisión manual, D63/D108/D112): exactamente uno de los dos
 * caminos — `tutorPersonaId` (vincula una Relación Familiar) o
 * `tutorNombre`+`tutorTelefono` (texto libre) — nunca ambos, nunca ninguno.
 * No se puede expresar "uno u otro" con decorators de class-validator solos
 * (todos quedan opcionales acá); la validación real vive en el servicio.
 */
export class ActivarPersonaDto {
  @ApiPropertyOptional({ description: 'Id de una Persona existente para vincular como tutor (D108).' })
  @IsOptional()
  @IsUUID()
  tutorPersonaId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  tutorNombre?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  tutorTelefono?: string;
}
