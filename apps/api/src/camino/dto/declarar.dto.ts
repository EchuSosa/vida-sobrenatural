import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Allow, IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';
import { ETAPAS_CAMINO, type ConfirmarDeclaracion, type EtapaCamino, type NuevaDeclaracion, type OpcionElegida } from '@vida-sobrenatural/shared-types';

/**
 * spec 006, FR-008/FR-009 (contracts/camino-api.md): "Ya lo hice". El DTO
 * solo declara la FORMA; el largo del comentario (`COMENTARIO_DEMASIADO_LARGO`)
 * lo valida el servicio, porque la fábrica de validación deriva el código del
 * nombre del campo (mismo criterio que `discipulado.dto.ts`).
 */
export class DeclararDto implements NuevaDeclaracion {
  @ApiProperty({ enum: ETAPAS_CAMINO })
  @IsIn(ETAPAS_CAMINO as EtapaCamino[])
  etapa!: EtapaCamino;

  @ApiPropertyOptional({ description: 'Opcional, hasta 500 caracteres (COMENTARIO_DEMASIADO_LARGO).' })
  @IsOptional()
  @IsString()
  comentario?: string;

  @ApiPropertyOptional({ description: 'spec 015, D243 — solo Ministerio (obligatorio ahí): pares { ministerioId, celulaId | null } del listado; lo valida validarEleccionMinisterio.' })
  @Allow()
  opciones?: OpcionElegida[];

  @ApiPropertyOptional({ nullable: true, description: 'spec 015, D243 — solo Ministerio: desde qué año sirve (de 1950 a este año).' })
  @Allow()
  desdeAnio?: number | null;
}

/** spec 015 (D243): confirmar un "Ya sirvo" eligiendo qué áreas, y si también hizo Vida de Servicio. */
export class ConfirmarDeclaracionDto implements ConfirmarDeclaracion {
  @ApiPropertyOptional({ type: [String], description: 'Las opciones que confirma; las demás quedan descartadas. Sin esto, todas.' })
  @IsOptional()
  @IsString({ each: true })
  opcionesConfirmadas?: string[];

  @ApiPropertyOptional({ description: 'Registra también Vida de Servicio como hecha.' })
  @IsOptional()
  @IsBoolean()
  tambienVidaDeServicio?: boolean;
}
