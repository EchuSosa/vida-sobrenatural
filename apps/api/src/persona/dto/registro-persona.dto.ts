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

// H-30 (revisión manual, actualización 2026-09-20): NO se importa como valor
// desde @vida-sobrenatural/shared-types acá — ese paquete no tiene build
// propio (su "main" apunta directo a src/index.ts), así que un `import`
// (no `import type`) se resuelve bien bajo Jest/Next.js (bundlers/loaders
// con transform TS) pero rompe en el runtime real de apps/api (`node
// dist/main.js`, tsc puro sin bundler) con
// ERR_MODULE_NOT_FOUND — confirmado corriendo la instancia aislada.
// Mismo valor que TELEFONO_REGEX de packages/shared-types/src/persona.ts;
// si uno cambia, cambiar el otro.
const TELEFONO_REGEX = /^\+[0-9]{1,4}[0-9\s]{5,15}$/;

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
