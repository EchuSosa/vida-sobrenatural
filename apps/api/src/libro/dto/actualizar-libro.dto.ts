import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

/** Body de PATCH /libros/:id — cualquier subconjunto, más el toggle de soft delete (FR-017). */
export class ActualizarLibroDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  titulo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  autor?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  anio?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  descripcion?: string;

  @ApiPropertyOptional({ description: 'FR-016.' })
  @IsOptional()
  @IsInt()
  @Min(0)
  orden?: number;

  @ApiPropertyOptional({ description: 'Inactivar/reactivar (FR-017) — soft delete de negocio, distinto de eliminar (D119).' })
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
