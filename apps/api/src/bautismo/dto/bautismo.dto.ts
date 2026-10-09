import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { ASIGNAR_BAUTISMO_MAX } from '@vida-sobrenatural/shared-types';

/**
 * spec 010 (contracts/bautismo-api.md). Solo la FORMA; los largos con código
 * propio (`COMENTARIO_DEMASIADO_LARGO`, `MOTIVO_DEMASIADO_LARGO`) los valida el
 * servicio (mismo criterio que `discipulado.dto.ts`).
 */
export class PedirBautismoDto {
  @ApiPropertyOptional({ description: 'Opcional, hasta 500 (COMENTARIO_DEMASIADO_LARGO).' })
  @IsOptional()
  @IsString()
  comentario?: string;
}

export class CrearEnNombreBautismoDto extends PedirBautismoDto {
  @ApiProperty()
  @IsString()
  personaId!: string;
}

export class AceptarBautismoDto {
  @ApiPropertyOptional({ description: 'Si viene, la asigna a ese Evento de bautismo en la misma operación (FR-012).' })
  @IsOptional()
  @IsString()
  eventoId?: string;
}

export class RechazarBautismoDto {
  @ApiPropertyOptional({ description: 'Opcional, hasta 500 (MOTIVO_DEMASIADO_LARGO). Solo lo ve el equipo.' })
  @IsOptional()
  @IsString()
  motivo?: string;
}

export class AsignarBautismoDto {
  @ApiProperty({ type: [String], minItems: 1, maxItems: ASIGNAR_BAUTISMO_MAX })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(ASIGNAR_BAUTISMO_MAX)
  @IsString({ each: true })
  solicitudIds!: string[];
}

export class ConfirmarBautismosDto {
  @ApiProperty({ type: [String], description: 'Las que se bautizaron; las demás asignadas vuelven a esperar fecha.' })
  @IsArray()
  @ArrayMaxSize(1000)
  @IsString({ each: true })
  realizadas!: string[];
}

export class SeccionEventoQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) skipAsignadas?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) takeAsignadas?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) skipEsperando?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) takeEsperando?: number;
}
