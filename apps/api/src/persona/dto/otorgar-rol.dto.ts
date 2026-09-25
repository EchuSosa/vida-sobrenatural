import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { ROLES_DE_CARGO, type RolDeCargo } from '@vida-sobrenatural/shared-types';

/** POST /personas/:id/roles — specs/005, FR-006: solo un rol de cargo (D131), nunca uno de estado. */
export class OtorgarRolDto {
  @ApiProperty({ enum: ROLES_DE_CARGO })
  @IsIn(ROLES_DE_CARGO)
  rol!: RolDeCargo;
}
