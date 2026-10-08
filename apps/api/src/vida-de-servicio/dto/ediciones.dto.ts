import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';
import { TIPOS_BAJA, type TipoBaja } from '@vida-sobrenatural/shared-types';

/**
 * spec 008 (contracts/admin-api.md, lider-api.md). Solo la FORMA; las reglas
 * con código de campo propio (NOMBRE_REQUERIDO, FECHAS_NO_CRECIENTES,
 * PERSONA_SIN_ROL_LIDER, MOTIVO_DEMASIADO_LARGO…) las valida el servicio,
 * todas juntas (H-50).
 */
export class CrearEdicionDto {
  @ApiPropertyOptional() @IsOptional() @IsString() nombre?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() sedeId?: string;
  @ApiPropertyOptional({ example: '2026-10-28' }) @IsOptional() @IsString() fechaInicio?: string;
  @ApiPropertyOptional({ type: [String], description: 'Las fechas de liberación, en orden (YYYY-MM-DD).' }) @IsOptional() @IsArray() @IsString({ each: true }) semanas?: string[];
  @ApiPropertyOptional({ type: [String], description: 'Ids de Personas con lider_curso.' }) @IsOptional() @IsArray() @IsString({ each: true }) lideres?: string[];
}

export class SemanaCronogramaDto {
  @ApiProperty() @IsInt() @Min(1) @Max(52) numero!: number;
  @ApiProperty({ example: '2026-10-28' }) @IsString() fechaLiberacion!: string;
}

export class CambiarCronogramaDto {
  @ApiProperty({ type: [SemanaCronogramaDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SemanaCronogramaDto)
  semanas!: SemanaCronogramaDto[];
}

export class SumarLiderDto {
  @ApiProperty() @IsString() personaId!: string;
}

export class InscripcionAbiertaDto {
  @ApiProperty() @IsBoolean() abierta!: boolean;
}

export class ConfirmarBajaDto {
  @ApiPropertyOptional({ enum: TIPOS_BAJA, description: 'Para corregir el tipo propuesto.' }) @IsOptional() @IsIn(TIPOS_BAJA as TipoBaja[]) tipo?: TipoBaja;
}

export class BajaConTipoDto {
  @ApiProperty({ enum: TIPOS_BAJA }) @IsIn(TIPOS_BAJA as TipoBaja[]) tipo!: TipoBaja;
  @ApiPropertyOptional({ description: 'Opcional, hasta 500 (MOTIVO_DEMASIADO_LARGO).' }) @IsOptional() @IsString() comentario?: string;
}

export class AsistenciaDto {
  @ApiProperty({ type: [String], description: 'Las Inscripciones ausentes; las demás activas quedan presentes.' })
  @IsArray()
  @IsString({ each: true })
  ausentes!: string[];
}

export class ListarEdicionesDto {
  @ApiPropertyOptional({ enum: ['en_curso', 'finalizado', 'todos'] }) @IsOptional() @IsIn(['en_curso', 'finalizado', 'todos']) estado?: 'en_curso' | 'finalizado' | 'todos';
  @ApiPropertyOptional({ enum: ['finalizacion', 'baja'] }) @IsOptional() @IsIn(['finalizacion', 'baja']) pendiente?: 'finalizacion' | 'baja';
  @ApiPropertyOptional() @IsOptional() @IsString() q?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(0) skip?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) take?: number;
}
