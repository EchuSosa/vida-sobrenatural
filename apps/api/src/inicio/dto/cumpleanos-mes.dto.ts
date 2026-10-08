import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { CUMPLEANOS_PAGINA } from '@vida-sobrenatural/shared-types';

/** `GET /personas/cumpleanos` (spec 013, contracts/inicio-api.md). Fuera de rango → 400 con el error en su campo. */
export class CumpleanosMesDto {
  @ApiPropertyOptional({ minimum: 1, maximum: 12, description: 'Por defecto, el mes actual en Argentina.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  mes?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  skip?: number;

  @ApiPropertyOptional({ default: CUMPLEANOS_PAGINA, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  take?: number;
}
