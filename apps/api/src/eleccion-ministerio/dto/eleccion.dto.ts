import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Allow, IsBoolean, IsOptional, IsString, IsUUID } from 'class-validator';
import type { ConfirmarOpcionEleccion, GuardarEleccionLider, GuardarMiEleccion, OpcionElegida } from '@vida-sobrenatural/shared-types';

/**
 * spec 015. Las opciones y los textos los valida `validarEleccionMinisterio`
 * (shared-types) en el servicio, para que cada error llegue con su código
 * propio por campo (H-50); acá solo se declara qué campos existen.
 */
export class GuardarMiEleccionDto implements GuardarMiEleccion {
  @ApiProperty({ description: 'Pares { ministerioId, celulaId } (celulaId null si el Ministerio no tiene áreas): de 1 a 2 Ministerios, un área por Ministerio, más el paralelo.' })
  @Allow()
  opciones!: OpcionElegida[];

  @ApiPropertyOptional({ nullable: true, description: 'Hasta 500.' })
  @Allow()
  comentario?: string | null;
}

export class GuardarEleccionLiderDto implements GuardarEleccionLider {
  @ApiProperty()
  @Allow()
  opciones!: OpcionElegida[];

  @ApiPropertyOptional({ nullable: true, description: 'Notas de la charla, hasta 2000. Privadas (D240).' })
  @Allow()
  notas?: string | null;

  @ApiPropertyOptional({ description: 'Marca "Charla hecha" en el mismo paso.' })
  @IsOptional()
  @IsBoolean()
  charlaHecha?: boolean;

  @ApiPropertyOptional({ nullable: true, description: 'El `version` que se leyó (versión optimista).' })
  @IsOptional()
  @IsString()
  version?: string | null;
}

export class ConfirmarOpcionDto implements ConfirmarOpcionEleccion {
  @ApiPropertyOptional({ description: 'D241: la suma a las membresías actuales (si queda lugar).' })
  @IsOptional()
  @IsBoolean()
  sumar?: boolean;

  @ApiPropertyOptional({ description: 'D241: la membresía actual que reemplaza.' })
  @IsOptional()
  @IsUUID()
  reemplazaId?: string;

  @ApiPropertyOptional({ description: 'D173: con una sola membresía actual, la reemplaza.' })
  @IsOptional()
  @IsBoolean()
  confirmarCambio?: boolean;

  @ApiPropertyOptional({ description: 'docs/22: otorga también el rol discipulador (Discipulados Vida Nueva).' })
  @IsOptional()
  @IsBoolean()
  otorgarRolDiscipulador?: boolean;
}

export class DescartarOpcionDto {
  @ApiPropertyOptional({ description: 'Motivo interno opcional, hasta 500 (solo backoffice).' })
  @IsOptional()
  @IsString()
  motivo?: string;
}
