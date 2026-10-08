import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, ValidateIf } from 'class-validator';
import type {
  DatosCelula,
  DatosMinisterio,
} from '@vida-sobrenatural/shared-types';
import type { ActualizarMinisterio } from '../ministerio.service.js';
import type { ActualizarCelula } from '../celula.service.js';

/**
 * spec 009 (contracts/ministerios-api.md). Solo la FORMA: los obligatorios,
 * los largos y los duplicados los valida el servicio con códigos de campo
 * propios (`NOMBRE_REQUERIDO`, `DESCRIPCION_DEMASIADO_LARGA`, …, H-50).
 */
export class CrearMinisterioDto implements DatosMinisterio {
  @ApiProperty({
    description:
      'Hasta 80 caracteres, único sin distinguir mayúsculas ni tildes.',
  })
  @IsString()
  nombre!: string;

  @ApiProperty({ description: 'Hasta 600 caracteres, texto plano.' })
  @IsString()
  descripcion!: string;

  @ApiPropertyOptional({
    nullable: true,
    description: 'docs/22: la línea de la web pública, hasta 140.',
  })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  lineaPublica?: string | null;

  @ApiPropertyOptional({
    description: 'docs/22: requiere capacitación o audición.',
  })
  @IsOptional()
  @IsBoolean()
  requiereFormacion?: boolean;
}

export class ActualizarMinisterioDto implements ActualizarMinisterio {
  @ApiPropertyOptional() @IsOptional() @IsString() nombre?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() descripcion?: string;
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  lineaPublica?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() requiereFormacion?: boolean;
  @ApiPropertyOptional({ description: 'Inactivar / reactivar (D37, D117).' })
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
  @ApiPropertyOptional({
    description:
      'D38: el nombre exacto, al inactivar con miembros o pendientes.',
  })
  @IsOptional()
  @IsString()
  confirmacionNombre?: string;
}

export class CrearCelulaDto implements DatosCelula {
  @ApiProperty({
    description: 'Hasta 80 caracteres, único dentro del Ministerio.',
  })
  @IsString()
  nombre!: string;

  @ApiPropertyOptional({
    nullable: true,
    description: 'docs/22: qué se hace en esta área, hasta 400.',
  })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  descripcion?: string | null;

  @ApiPropertyOptional({
    description:
      'docs/22: al aprobar, ofrece el rol discipulador ("Discipulados Vida Nueva").',
  })
  @IsOptional()
  @IsBoolean()
  ofreceRolDiscipulador?: boolean;
}

export class ActualizarCelulaDto implements ActualizarCelula {
  @ApiPropertyOptional() @IsOptional() @IsString() nombre?: string;
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  descripcion?: string | null;
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  ofreceRolDiscipulador?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() activo?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() confirmacionNombre?: string;
}
