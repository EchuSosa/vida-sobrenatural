import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  IsUrl,
  Matches,
  ValidateIf,
} from 'class-validator';
import { EstadoCivil, Genero, Profesion, TiempoCongregacion } from '../../generated/prisma/enums.js';

/** Formulario obligatorio de FR-006, completado luego de la autorización SSO. */
export class RegistroPersonaDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  apellido!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  nombre!: string;

  @ApiProperty({ enum: Genero })
  @IsEnum(Genero)
  genero!: Genero;

  @ApiProperty({ example: '2000-01-31' })
  @IsDateString()
  fechaNacimiento!: string;

  @ApiProperty({ example: '+54 9 221 1234567' })
  @IsString()
  @IsNotEmpty()
  // Formulario: selector de código de país + número (solo dígitos) — ver
  // apps/web/src/app/registro/page.tsx. Se valida de nuevo acá porque el
  // cliente no es de confianza.
  @Matches(/^\+[0-9]{1,4}[0-9\s]{5,15}$/, {
    message: 'telefono debe tener código de país (+...) y solo dígitos',
  })
  telefono!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  direccion!: string;

  @ApiProperty()
  @IsUUID()
  sedeId!: string;

  @ApiProperty({ enum: EstadoCivil })
  @IsEnum(EstadoCivil)
  estadoCivil!: EstadoCivil;

  @ApiProperty({ enum: Profesion })
  @IsEnum(Profesion)
  profesion!: Profesion;

  @ApiPropertyOptional({ description: 'Obligatorio cuando profesion = otro.' })
  @ValidateIf((dto) => dto.profesion === Profesion.otro)
  @IsString()
  @IsNotEmpty()
  profesionDetalle?: string;

  @ApiProperty({ enum: TiempoCongregacion })
  @IsEnum(TiempoCongregacion)
  tiempoCongregacion!: TiempoCongregacion;

  @ApiProperty()
  @IsBoolean()
  consentimientoDatos!: boolean;

  @ApiPropertyOptional({ description: 'Foto de perfil de Google (picture) — no editable por ahora.' })
  @IsOptional()
  @IsUrl()
  fotoUrl?: string;
}
