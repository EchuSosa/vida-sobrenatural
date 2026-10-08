import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  ValidateIf,
} from 'class-validator';
import type {
  AprobarPostulacion,
  NuevaPostulacion,
  PostulacionEnNombreDe,
} from '@vida-sobrenatural/shared-types';

/**
 * spec 009 (contracts/postulaciones-api.md). Los DTOs declaran solo la FORMA:
 * los largos (`TEXTO_DEMASIADO_LARGO`, `POSTULACION_TEXTO_MAX`) y la Célula
 * (`CELULA_NO_DISPONIBLE`) los valida `validarNuevaPostulacion`, porque la
 * fábrica de validación deriva el código del nombre del campo (mismo criterio
 * que `declarar.dto.ts` de la 006).
 */
export class NuevaPostulacionDto implements NuevaPostulacion {
  @ApiPropertyOptional({
    nullable: true,
    description: 'Célula elegida; null o ausente = "No tengo preferencia".',
  })
  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== '')
  @IsString()
  celulaId?: string | null;

  @ApiPropertyOptional({ description: 'Opcional, hasta 500 caracteres.' })
  @IsOptional()
  @IsString()
  motivacion?: string;

  @ApiPropertyOptional({ description: 'Opcional, hasta 500 caracteres.' })
  @IsOptional()
  @IsString()
  disponibilidad?: string;
}

export class PostulacionEnNombreDeDto
  extends NuevaPostulacionDto
  implements PostulacionEnNombreDe
{
  @ApiProperty()
  @IsUUID()
  personaId!: string;

  @ApiProperty()
  @IsUUID()
  ministerioId!: string;
}

export class AprobarPostulacionDto implements AprobarPostulacion {
  @ApiPropertyOptional({
    description:
      'D173: confirma el cambio si la Persona ya pertenece a otro Ministerio.',
  })
  @IsOptional()
  @IsBoolean()
  confirmarCambio?: boolean;

  @ApiPropertyOptional({
    description:
      'docs/22: otorga también el rol discipulador (solo en un área que lo ofrece).',
  })
  @IsOptional()
  @IsBoolean()
  otorgarRolDiscipulador?: boolean;
}

/** Rechazar y dar de baja: motivo opcional ≤ 500 (`MOTIVO_DEMASIADO_LARGO`, lo valida el servicio). */
export class MotivoOpcionalDto {
  @ApiPropertyOptional({
    description:
      'Opcional, hasta 500 caracteres. Interno: solo lo ve el backoffice.',
  })
  @IsOptional()
  @IsString()
  motivo?: string;
}
