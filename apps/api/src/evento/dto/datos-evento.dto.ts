import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsISO8601, IsOptional, IsString } from 'class-validator';

/**
 * Body de `POST /eventos` y `PATCH /eventos/:id` (contracts/eventos-api.md).
 * Acá solo se valida la FORMA; las reglas (obligatorios, rangos, combinaciones
 * de FR-010/FR-045) las aplica `validarConfigEvento` sobre la configuración
 * completa, con un código propio por campo (H-50). Números como `cupo` o
 * `costo` se aceptan como vienen y los valida esa función, para que el error
 * diga cómo corregir y no un genérico "inválido".
 */
export class DatosEventoDto {
  @ApiPropertyOptional() @IsOptional() @IsString() sedeId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() nombre?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() descripcion?: string;
  @ApiPropertyOptional({ enum: ['general', 'bautismo'] }) @IsOptional() @IsIn(['general', 'bautismo']) tipo?: 'general' | 'bautismo';
  @ApiPropertyOptional({ description: 'ISO 8601' }) @IsOptional() @IsISO8601() inicio?: string;
  @ApiPropertyOptional({ description: 'ISO 8601 o null' }) @IsOptional() @IsISO8601() fin?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() lugar?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() publicoObjetivo?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() requiereInscripcion?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() requiereAprobacion?: boolean;
  @ApiPropertyOptional() @IsOptional() cupo?: number | string | null;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() permiteListaEspera?: boolean;
  @ApiPropertyOptional({ description: 'Decimal como string ("15000.00")' }) @IsOptional() costo?: string | number | null;
  @ApiPropertyOptional() @IsOptional() @IsString() instruccionesPago?: string | null;
  @ApiPropertyOptional() @IsOptional() diasAnticipacionRecordatorio?: number | string | null;
}
