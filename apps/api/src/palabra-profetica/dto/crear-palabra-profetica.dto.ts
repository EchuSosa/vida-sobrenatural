import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';

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
  texto!: string;

  @ApiPropertyOptional({ description: 'D121: opcional — puede llegar después del anuncio, o no llegar nunca.' })
  @IsOptional()
  @IsString()
  youtubeUrl?: string;
}
