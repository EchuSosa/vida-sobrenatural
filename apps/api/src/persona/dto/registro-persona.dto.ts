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
  ValidateBy,
  ValidateIf,
} from 'class-validator';
import { EstadoCivil, Genero, Profesion } from '../../generated/prisma/enums.js';
import { TELEFONO_REGEX, anioEnArgentina, congregaDesdeValido } from '@vida-sobrenatural/shared-types';

/**
 * D214: año entero entre 1900 y el año en curso (en Argentina). Código de
 * campo derivado: CONGREGADESDE_INVALIDO. Lo reusa el alta por el Admin (006).
 */
export function EsAnioCongregaDesde(): PropertyDecorator {
  return ValidateBy({
    name: 'esAnioCongregaDesde',
    validator: { validate: (valor: unknown) => congregaDesdeValido(valor, anioEnArgentina()) },
  });
}

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
  @Matches(TELEFONO_REGEX, {
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

  @ApiProperty({ example: 2019, description: 'D214: año en que empezó a venir a la iglesia.' })
  @EsAnioCongregaDesde()
  congregaDesde!: number;

  @ApiProperty()
  @IsBoolean()
  consentimientoDatos!: boolean;

  @ApiPropertyOptional({ description: 'Foto de perfil de Google (picture) — no editable por ahora.' })
  @IsOptional()
  @IsUrl()
  fotoUrl?: string;
}
