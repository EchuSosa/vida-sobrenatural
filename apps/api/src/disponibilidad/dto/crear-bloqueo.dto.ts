import { ApiProperty } from '@nestjs/swagger';
import { IsISO8601, Matches } from 'class-validator';

const FECHA_CIVIL = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Body de POST /disponibilidad/me/bloqueos (FR-016). Fechas civiles
 * `YYYY-MM-DD`, obligatorias; el orden (`hasta >= desde`, `hasta >= hoy`) lo
 * valida el service con sus códigos propios.
 */
export class CrearBloqueoDto {
  @ApiProperty({ example: '2026-10-01' })
  @Matches(FECHA_CIVIL)
  @IsISO8601({ strict: true })
  desde!: string;

  @ApiProperty({ example: '2026-10-15' })
  @Matches(FECHA_CIVIL)
  @IsISO8601({ strict: true })
  hasta!: string;
}
