import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';

/**
 * Body de POST /disponibilidad/me/franjas (FR-031). Acá solo el tipo: los
 * rangos y `fin > inicio` los valida el service con sus códigos propios
 * (`DIA_SEMANA_INVALIDO`, `FRANJA_FIN_ANTERIOR_AL_INICIO`), que class-validator
 * no sabe dar.
 */
export class CrearFranjaDto {
  @ApiProperty({ description: '0 = domingo … 6 = sábado.' })
  @IsInt()
  diaSemana!: number;

  @ApiProperty({ description: 'Minutos desde las 0:00 (0..1439).' })
  @IsInt()
  inicio!: number;

  @ApiProperty({ description: 'Minutos desde las 0:00 (1..1440), posterior a `inicio`.' })
  @IsInt()
  fin!: number;
}
