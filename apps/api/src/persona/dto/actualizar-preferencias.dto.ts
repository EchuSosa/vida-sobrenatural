import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { TemaPreferido } from '../../generated/prisma/enums.js';

/** Body de PATCH /personas/me/preferencias — Historia 5 (specs/002-base-transversal). */
export class ActualizarPreferenciasDto {
  @ApiProperty({ enum: TemaPreferido })
  @IsEnum(TemaPreferido)
  temaPreferido!: TemaPreferido;
}
