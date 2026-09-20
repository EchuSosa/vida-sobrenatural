import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

// H-30: no se importa como valor desde @vida-sobrenatural/shared-types acá
// — ver el comentario largo en registro-persona.dto.ts (rompe en runtime
// real, `packages/shared-types` no tiene build propio). Mismos valores que
// packages/shared-types/src/sede.ts (HORARIOS_SEDE_REGEX) y
// packages/shared-types/src/persona.ts (TELEFONO_REGEX) — si uno cambia,
// cambiar los tres.
const GRUPO_HORARIO = '[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+ \\d{1,2}(?::\\d{2})? hs\\.?';
export const HORARIOS_SEDE_REGEX = new RegExp(`^${GRUPO_HORARIO}(?: y ${GRUPO_HORARIO}|, ${GRUPO_HORARIO})*$`);
export const TELEFONO_REGEX = /^\+[0-9]{1,4}[0-9\s]{5,15}$/;

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
