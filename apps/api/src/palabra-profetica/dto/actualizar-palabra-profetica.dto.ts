import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

const ANIO_FUNDACION = 2010;
const ANIO_MAXIMO = new Date().getFullYear() + 1;

/** Body de PATCH /palabra-profetica/:id — cualquier subconjunto. No permite tocar `vigente` (endpoint propio). */
export class ActualizarPalabraProfeticaDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(ANIO_FUNDACION)
  @Max(ANIO_MAXIMO)
  anio?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  titulo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  texto?: string;

  @ApiPropertyOptional({ description: 'D121: opcional.' })
  @IsOptional()
  @IsString()
  youtubeUrl?: string;
}
