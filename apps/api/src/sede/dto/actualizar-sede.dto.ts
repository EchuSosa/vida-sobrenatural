import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, Matches } from 'class-validator';
import { HORARIOS_SEDE_REGEX, TELEFONO_REGEX } from './crear-sede.dto.js';

/** Body de PATCH /sedes/:id — cualquier subconjunto, más el toggle de soft delete. */
export class ActualizarSedeDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nombre?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  direccion?: string;

  @ApiPropertyOptional({ description: 'Código de país (+...) y número — D90, H-30.' })
  @IsOptional()
  @IsString()
  @Matches(TELEFONO_REGEX, { message: 'contactoTelefono debe tener código de país (+...) y solo dígitos' })
  contactoTelefono?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contactoEmail?: string;

  @ApiPropertyOptional({ description: 'Formato acotado — H-30, ej. "Domingos 10:30 hs".' })
  @IsOptional()
  @IsString()
  @Matches(HORARIOS_SEDE_REGEX)
  horarios?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  descripcionBienvenida?: string;

  @ApiPropertyOptional({ description: 'Soft delete (Principio III) — nunca hay DELETE físico.' })
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
