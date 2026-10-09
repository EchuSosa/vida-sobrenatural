import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Allow, IsIn, IsOptional, IsString, IsUUID } from 'class-validator';
import type { DatosGrupoExtension, DiaSemana } from '@vida-sobrenatural/shared-types';

/**
 * spec 014 (contracts/api.md). Los DTOs del Grupo declaran solo QUÉ campos
 * existen (`@Allow`): los tipos y las reglas los valida
 * `GruposExtensionService` con `validarDatosGrupo` (shared-types), para que
 * cada error llegue con su código propio por campo (H-50) y no con el
 * `<CAMPO>_INVALIDO` genérico de la fábrica.
 */
export class DatosGrupoExtensionDto implements DatosGrupoExtension {
  @ApiProperty() @Allow() nombre!: string;
  @ApiProperty({ type: [String], description: 'Ids de Personas activas mayores de edad (D133).' }) @Allow() lideres!: string[];
  @ApiProperty({ type: [String], description: 'lunes … domingo' }) @Allow() dias!: DiaSemana[];
  @ApiProperty({ description: '"HH:MM", en pasos de 15 minutos.' }) @Allow() horaInicio!: string;
  @ApiPropertyOptional({ nullable: true }) @Allow() cupo!: number | null;
  @ApiPropertyOptional({ nullable: true }) @Allow() edadMinima!: number | null;
  @ApiPropertyOptional({ nullable: true }) @Allow() edadMaxima!: number | null;
  @ApiProperty() @Allow() enLaIglesia!: boolean;
  @ApiPropertyOptional({ nullable: true }) @Allow() sedeId!: string | null;
  @ApiPropertyOptional({ nullable: true }) @Allow() calle!: string | null;
  @ApiPropertyOptional({ nullable: true }) @Allow() numero!: string | null;
  @ApiPropertyOptional({ nullable: true }) @Allow() entreCalle1!: string | null;
  @ApiPropertyOptional({ nullable: true }) @Allow() entreCalle2!: string | null;
  @ApiPropertyOptional({ nullable: true, description: 'Barrio o zona: lo único del lugar que se muestra antes de sumarse.' }) @Allow() zona!: string | null;
}

/** POST /grupos-extension/buscar — la dirección NO se guarda ni se loguea (D223). */
export class BuscarGruposDto {
  @ApiPropertyOptional() @Allow() direccion?: string | null;
  @ApiPropertyOptional() @Allow() latitud?: number | null;
  @ApiPropertyOptional() @Allow() longitud?: number | null;
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsIn(['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'], { each: true })
  dias?: DiaSemana[];
}

export class RechazarSolicitudGexDto {
  @ApiPropertyOptional({ description: 'Mensaje opcional para la persona, hasta 500 caracteres.' })
  @IsOptional()
  @IsString()
  mensaje?: string;
}

export class AgregarIntegranteDto {
  @ApiProperty() @IsUUID() personaId!: string;
}
