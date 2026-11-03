import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Allow } from 'class-validator';

/**
 * spec 017 (D250): la regla se valida con `erroresDeReglaDiaDeServicio` (shared-types), la misma
 * que usa el backoffice, por eso los campos van con `@Allow` y no con decoradores propios.
 */
export class NuevoDiaDeServicioDto {
  @ApiProperty({ enum: ['semanal', 'mensual'] }) @Allow() frecuencia!: unknown;
  @ApiProperty({ minimum: 0, maximum: 6, description: '0 = domingo' }) @Allow() diaSemana!: unknown;
  @ApiPropertyOptional({ enum: [1, 2, 3, 4, -1], description: 'Solo si es mensual; -1 = el último' }) @Allow() posicionEnMes?: unknown;
}

/** D251: cuánta gente necesita por fecha. */
export class CupoTurnoDto {
  @ApiProperty({ minimum: 1, maximum: 20 }) @Allow() cupo!: unknown;
}
