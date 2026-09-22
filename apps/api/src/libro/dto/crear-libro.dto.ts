import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';
import { LIBRO_ANIO_MINIMO, LIBRO_ORDEN_MAXIMO, libroAnioMaximo } from '@vida-sobrenatural/shared-types';

/** Body de POST /libros — FR-015. La portada entra por su propio endpoint (FR-021). */
export class CrearLibroDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  titulo!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  autor!: string;

  @ApiProperty()
  @IsInt()
  @Min(LIBRO_ANIO_MINIMO)
  @Max(libroAnioMaximo())
  anio!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  descripcion?: string;

  @ApiPropertyOptional({ description: 'FR-016 — posición en el listado público. Si se omite, toma el último lugar (H-89).' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(LIBRO_ORDEN_MAXIMO)
  orden?: number;
}
