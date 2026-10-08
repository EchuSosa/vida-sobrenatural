import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { ETAPAS_CAMINO, type EtapaCamino } from '@vida-sobrenatural/shared-types';

/**
 * spec 006, lote B (contracts/historial-admin-api.md). Solo la FORMA; los
 * largos con código propio (`MOTIVO_DEMASIADO_LARGO`, `NOTA_DEMASIADO_LARGA`)
 * los valida el servicio (mismo criterio que `discipulado.dto.ts`).
 */
export class RechazarDeclaracionDto {
  @ApiPropertyOptional({ description: 'Opcional, hasta 500 (MOTIVO_DEMASIADO_LARGO). Lo lee la Persona.' })
  @IsOptional()
  @IsString()
  motivo?: string;
}

export class RegistrarCompletitudDto {
  @ApiProperty({ enum: ETAPAS_CAMINO })
  @IsIn(ETAPAS_CAMINO as EtapaCamino[])
  etapa!: EtapaCamino;

  @ApiPropertyOptional({ description: 'Opcional, hasta 500 (NOTA_DEMASIADO_LARGA).' })
  @IsOptional()
  @IsString()
  nota?: string;
}
