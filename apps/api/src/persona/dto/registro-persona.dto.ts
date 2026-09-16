import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsEnum, IsNotEmpty, IsString, IsUUID } from 'class-validator';
import { EstadoCivil, Genero, TiempoCongregacion } from '../../generated/prisma/enums.js';

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

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
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

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  profesion!: string;

  @ApiProperty({ enum: TiempoCongregacion })
  @IsEnum(TiempoCongregacion)
  tiempoCongregacion!: TiempoCongregacion;

  @ApiProperty()
  @IsBoolean()
  consentimientoDatos!: boolean;
}
