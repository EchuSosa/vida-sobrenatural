import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Allow } from 'class-validator';
import { ALCANCES_MANUALES, MENSAJE_AVISO_MAX, TITULO_AVISO_MAX } from '@vida-sobrenatural/shared-types';

/**
 * spec 012, T047 — cuerpos de `/notificaciones`. Las reglas de campo viven en
 * `validarNuevaNotificacion` (shared-types: las mismas en la API y en el
 * diálogo), que devuelve los códigos de H-50; acá solo se declaran los campos
 * (`@Allow`) para que el `whitelist` del ValidationPipe no los descarte.
 */
export class ContarDestinatariosDto {
  @ApiProperty({ enum: ALCANCES_MANUALES })
  @Allow()
  alcance?: unknown;

  @ApiPropertyOptional({ description: 'Id del Grupo o del Ministerio (no va con `todos`).' })
  @Allow()
  alcanceId?: unknown;
}

export class NuevaNotificacionDto extends ContarDestinatariosDto {
  @ApiProperty({ maxLength: TITULO_AVISO_MAX, description: 'Va de asunto del mail si es importante: sin datos personales.' })
  @Allow()
  titulo?: unknown;

  @ApiProperty({ maxLength: MENSAJE_AVISO_MAX })
  @Allow()
  mensaje?: unknown;

  @ApiProperty({ description: 'También por mail (FR-028).' })
  @Allow()
  importante?: unknown;
}
