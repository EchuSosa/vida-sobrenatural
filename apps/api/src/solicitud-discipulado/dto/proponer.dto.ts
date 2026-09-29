import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

/** POST /discipulado/solicitudes/:id/proponer — FR-036, FR-045. */
export class ProponerDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  discipuladorId!: string;

  @ApiPropertyOptional({ description: 'Sumar la Persona a este Grupo en curso del Discipulador en vez de abrir uno (FR-045).' })
  @IsOptional()
  @IsString()
  grupoDestinoId?: string;
}
