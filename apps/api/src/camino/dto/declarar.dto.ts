import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { ETAPAS_CAMINO, type EtapaCamino } from '@vida-sobrenatural/shared-types';

/**
 * spec 006, FR-008/FR-009 (contracts/camino-api.md): "Ya lo hice". El DTO
 * solo declara la FORMA; el largo del comentario (`COMENTARIO_DEMASIADO_LARGO`)
 * lo valida el servicio, porque la fábrica de validación deriva el código del
 * nombre del campo (mismo criterio que `discipulado.dto.ts`).
 */
export class DeclararDto {
  @ApiProperty({ enum: ETAPAS_CAMINO })
  @IsIn(ETAPAS_CAMINO as EtapaCamino[])
  etapa!: EtapaCamino;

  @ApiPropertyOptional({ description: 'Opcional, hasta 500 caracteres (COMENTARIO_DEMASIADO_LARGO).' })
  @IsOptional()
  @IsString()
  comentario?: string;
}
