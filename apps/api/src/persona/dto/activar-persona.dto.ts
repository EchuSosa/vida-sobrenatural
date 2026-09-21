import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID, Matches } from 'class-validator';
import { TELEFONO_REGEX } from '@vida-sobrenatural/shared-types';

/**
 * Body de PATCH /personas/:id/activar — Flujo 7 camino A (FR-008).
 * H-29 (revisión manual, D63/D108/D112): exactamente uno de los dos
 * caminos — `tutorPersonaId` (vincula una Relación Familiar) o
 * `tutorNombre`+`tutorApellido`+`tutorTelefono` (texto libre) — nunca
 * ambos, nunca ninguno. No se puede expresar "uno u otro" con decorators de
 * class-validator solos (todos quedan opcionales acá); la validación real
 * vive en el servicio. tutorApellido (H-71, revisión manual ronda 7):
 * separado de tutorNombre, igual que en el resto de la app.
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
  tutorApellido?: string;

  // H-71 (Principio XI): mismo regex que `telefono`/`contactoTelefono` —
  // antes este campo no exigía código de país, distinto del resto.
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(TELEFONO_REGEX, { message: 'tutorTelefono debe tener código de país (+...) y solo dígitos' })
  tutorTelefono?: string;
}
