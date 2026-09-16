import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

/** Body de PATCH /sedes/:id — cualquier subconjunto, más el toggle de soft delete. */
export class ActualizarSedeDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nombre?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  direccion?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contactoTelefono?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contactoEmail?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  horarios?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  descripcionBienvenida?: string;

  @ApiPropertyOptional({ description: 'Soft delete (Principio III) — nunca hay DELETE físico.' })
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
