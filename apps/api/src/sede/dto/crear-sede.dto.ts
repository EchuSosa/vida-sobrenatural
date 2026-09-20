import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';
import { HORARIOS_SEDE_REGEX, TELEFONO_REGEX } from '@vida-sobrenatural/shared-types';

/** Body de POST /sedes — Historia 3, FR-010. */
export class CrearSedeDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  nombre!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  direccion!: string;

  @ApiPropertyOptional({ description: 'Código de país (+...) y número — D90, H-30.' })
  @IsOptional()
  @IsString()
  @Matches(TELEFONO_REGEX, { message: 'contactoTelefono debe tener código de país (+...) y solo dígitos' })
  contactoTelefono?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contactoEmail?: string;

  @ApiProperty({ description: 'Formato acotado — H-30, ej. "Domingos 10:30 hs".' })
  @IsString()
  @IsNotEmpty()
  @Matches(HORARIOS_SEDE_REGEX)
  horarios!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  descripcionBienvenida?: string;
}
