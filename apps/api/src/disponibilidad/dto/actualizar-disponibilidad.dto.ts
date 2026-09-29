import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional } from 'class-validator';

/**
 * Body de PUT /disponibilidad/me — al menos uno de los dos (lo exige el
 * service). El rango de `maxPersonasPorGrupo` también lo valida el service,
 * con `MAXIMO_POR_GRUPO_FUERA_DE_RANGO`.
 */
export class ActualizarDisponibilidadDto {
  @ApiPropertyOptional({ description: 'FR-015: el toggle. Solo lo cambia el Discipulador.' })
  @IsOptional()
  @IsBoolean()
  disponible?: boolean;

  @ApiPropertyOptional({ description: 'FR-045: 1..MAX_PERSONAS_POR_GRUPO_VIDA_NUEVA.' })
  @IsOptional()
  @IsInt()
  maxPersonasPorGrupo?: number;
}
