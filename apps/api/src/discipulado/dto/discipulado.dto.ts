import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';

/**
 * specs/004, lote B (contracts/discipulado-api.md). Los DTOs solo declaran la
 * FORMA (tipos); los límites con código propio (`MOTIVO_DEMASIADO_LARGO`,
 * `FECHA_FUTURA`, `CAPITULOS_REQUERIDO`…) los valida el servicio
 * (`validaciones.ts`), porque la fábrica de validación deriva el código del
 * nombre del campo y no podría dar esos.
 */

/** Declinar una propuesta, rechazar una finalización, proponer o rechazar una baja: motivo opcional. */
export class MotivoDto {
  @ApiPropertyOptional({ description: 'Hasta 500 caracteres (MOTIVO_DEMASIADO_LARGO).' })
  @IsOptional()
  @IsString()
  motivo?: string;
}

export class AsistenciaDto {
  @ApiProperty()
  @IsString()
  inscripcionId!: string;

  @ApiProperty()
  @IsBoolean()
  presente!: boolean;
}

/** POST (todo obligatorio salvo notas y asistencias) y PATCH (cualquier subconjunto) de un Encuentro. */
export class EncuentroDto {
  @ApiPropertyOptional({ description: 'Fecha civil YYYY-MM-DD, no futura (FECHA_FUTURA).' })
  @IsOptional()
  @IsString()
  fecha?: string;

  @ApiPropertyOptional({ description: 'Texto corto, 1 a 200 caracteres (CAPITULOS_REQUERIDO).' })
  @IsOptional()
  @IsString()
  capitulos?: string;

  @ApiPropertyOptional({ description: 'Hasta 2000 caracteres. Solo las ve el Discipulador vigente (FR-029).', nullable: true })
  @IsOptional()
  @IsString()
  notas?: string | null;

  @ApiPropertyOptional({ type: [AsistenciaDto], description: 'Las Inscripciones activas que no vengan se toman como presentes (FR-013a).' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AsistenciaDto)
  asistencias?: AsistenciaDto[];
}

export class ReasignarDto {
  @ApiProperty()
  @IsUUID()
  discipuladorId!: string;
}
