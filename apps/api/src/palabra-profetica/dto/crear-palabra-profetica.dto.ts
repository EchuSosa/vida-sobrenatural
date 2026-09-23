import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { PALABRA_PROFETICA_TEXTO_MAXIMO } from '@vida-sobrenatural/shared-types';

const ANIO_FUNDACION = 2010;
const ANIO_MAXIMO = new Date().getFullYear() + 1;

/** Body de POST /palabra-profetica — FR-010. `youtubeUrl` es opcional (D121). */
export class CrearPalabraProfeticaDto {
  @ApiProperty()
  @IsInt()
  @Min(ANIO_FUNDACION)
  @Max(ANIO_MAXIMO)
  anio!: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  titulo!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  // H-117/H-93: sin límite, cualquiera podía mandar megabytes — la
  // Palabra Profética 2021 real tiene 12.409 caracteres, este límite deja
  // holgura de sobra (packages/shared-types).
  @MaxLength(PALABRA_PROFETICA_TEXTO_MAXIMO)
  texto!: string;

  @ApiPropertyOptional({ description: 'D121: opcional — puede llegar después del anuncio, o no llegar nunca.' })
  @IsOptional()
  @IsString()
  youtubeUrl?: string;
}
