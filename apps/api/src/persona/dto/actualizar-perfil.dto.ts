import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsNotEmpty, Matches, ValidateIf } from 'class-validator';
import { EstadoCivil, Profesion } from '../../generated/prisma/enums.js';
import { TELEFONO_REGEX } from '@vida-sobrenatural/shared-types';

/**
 * Body de PATCH /personas/me — H-35 (revisión manual, Flujo 11, FR-028/FR-029).
 * Cualquier subconjunto de estos 4 campos; nunca `fechaNacimiento` ni
 * `email` (FR-029, esos dos requieren un Admin).
 */
export class ActualizarPerfilDto {
  @ApiPropertyOptional({ example: '+54 9 221 1234567' })
  @IsOptional()
  @IsString()
  @Matches(TELEFONO_REGEX, { message: 'telefono debe tener código de país (+...) y solo dígitos' })
  telefono?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  direccion?: string;

  @ApiPropertyOptional({ enum: EstadoCivil })
  @IsOptional()
  @IsEnum(EstadoCivil)
  estadoCivil?: EstadoCivil;

  @ApiPropertyOptional({ enum: Profesion })
  @IsOptional()
  @IsEnum(Profesion)
  profesion?: Profesion;

  @ApiPropertyOptional({ description: 'Obligatorio cuando profesion = otro (en esta misma petición).' })
  @ValidateIf((dto) => dto.profesion === Profesion.otro)
  @IsString()
  @IsNotEmpty()
  profesionDetalle?: string;
}
