import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

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
  anio!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  descripcion?: string;

  @ApiPropertyOptional({ description: 'FR-016 — posición en el listado público. Default 0 si se omite.' })
  @IsOptional()
  @IsInt()
  @Min(0)
  orden?: number;
}
