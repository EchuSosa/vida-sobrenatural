import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, ValidateIf } from 'class-validator';

/**
 * spec 008 (contracts/persona-api.md, admin-api.md). Solo la FORMA; las
 * reglas con código propio (EDICION_NO_DISPONIBLE, EDICION_REQUERIDA,
 * MOTIVO_DEMASIADO_LARGO) las valida el servicio.
 */
export class PedirVidaDeServicioDto {
  @ApiProperty({ nullable: true, description: 'La edición elegida; null = "para la próxima edición" (solo si no hay ninguna abierta).' })
  @ValidateIf((_, v) => v !== null)
  @IsUUID()
  grupoId!: string | null;
}

export class PedirEnNombreDto extends PedirVidaDeServicioDto {
  @ApiProperty()
  @IsUUID()
  personaId!: string;
}

export class AprobarSolicitudVsDto {
  @ApiProperty({ description: 'La edición en curso donde entra.' })
  @IsUUID()
  grupoId!: string;
}

export class MotivoOpcionalDto {
  @ApiPropertyOptional({ description: 'Opcional, hasta 500 (MOTIVO_DEMASIADO_LARGO).' })
  @IsOptional()
  @IsString()
  motivo?: string;
}
