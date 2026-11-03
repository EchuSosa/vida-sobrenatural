import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Allow } from 'class-validator';

/** spec 017, US2 (D255): asignar a un integrante en una fecha. La validación la hace el servicio (errores por campo). */
export class AsignarTurnoDto {
  @ApiProperty({ description: 'Integrante vigente del Ministerio' }) @Allow() personaId!: unknown;
  @ApiPropertyOptional({ description: 'El área (Célula); no va si el Ministerio no tiene áreas' }) @Allow() celulaId?: unknown;
}
