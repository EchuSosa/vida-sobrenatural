import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import {
  BANDEJA_PAGINA,
  BANDEJA_TAKE_MAX,
  FILTROS_ABIERTAS,
  ORDENES_BANDEJA,
  TIPOS_SOLICITUD,
  type FiltroAbiertas,
  type OrdenBandeja,
  type TipoSolicitud,
} from '@vida-sobrenatural/shared-types';

/**
 * `GET /solicitudes` (spec 013, contracts/bandeja-api.md). Lo inválido es
 * 400 `VALIDACION` con el error en su campo (`TIPO_INVALIDO`,
 * `TAKE_INVALIDO`…); que `estado` sea de su tipo lo valida el controller.
 */
export class ListarBandejaDto {
  @ApiPropertyOptional({ enum: FILTROS_ABIERTAS, default: 'abiertas' })
  @IsOptional()
  @IsIn(FILTROS_ABIERTAS)
  filtro?: FiltroAbiertas;

  @ApiPropertyOptional({ enum: TIPOS_SOLICITUD })
  @IsOptional()
  @IsIn(TIPOS_SOLICITUD)
  tipo?: TipoSolicitud;

  @ApiPropertyOptional({ description: 'Estados del tipo, separados por comas; reemplaza a `filtro`. Sin `tipo` se lee como `tipo=discipulado` (compatibilidad con la 004).' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  estado?: string;

  @ApiPropertyOptional({ description: 'Id de una Persona: solo sus Solicitudes (enlace "Ver todas" del perfil).' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  persona?: string;

  @ApiPropertyOptional({ description: 'Nombre, apellido o "nombre apellido".' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  buscar?: string;

  @ApiPropertyOptional({ enum: ORDENES_BANDEJA, default: 'espera' })
  @IsOptional()
  @IsIn(ORDENES_BANDEJA)
  orden?: OrdenBandeja;

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'asc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  dir?: 'asc' | 'desc';

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  skip?: number;

  @ApiPropertyOptional({ default: BANDEJA_PAGINA, maximum: BANDEJA_TAKE_MAX })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(BANDEJA_TAKE_MAX)
  take?: number;
}
