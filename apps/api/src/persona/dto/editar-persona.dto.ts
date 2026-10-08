import { ApiPropertyOptional } from '@nestjs/swagger';
import { Allow } from 'class-validator';

/**
 * `PATCH /personas/:id` (spec 013, Historia 7): cualquier subconjunto de los
 * datos del alta, más el email. Igual que el alta de la 006, el DTO solo deja
 * pasar los campos: las reglas las aplica el servicio para devolver todos los
 * errores de campo juntos (H-50).
 */
export class EditarPersonaDto {
  @ApiPropertyOptional() @Allow() apellido?: unknown;
  @ApiPropertyOptional() @Allow() nombre?: unknown;
  @ApiPropertyOptional({ enum: ['masculino', 'femenino'] }) @Allow() genero?: unknown;
  @ApiPropertyOptional({ example: '1948-03-12' }) @Allow() fechaNacimiento?: unknown;
  @ApiPropertyOptional({ example: '+54 9 221 5550101' }) @Allow() telefono?: unknown;
  @ApiPropertyOptional() @Allow() direccion?: unknown;
  @ApiPropertyOptional() @Allow() sedeId?: unknown;
  @ApiPropertyOptional() @Allow() estadoCivil?: unknown;
  @ApiPropertyOptional() @Allow() profesion?: unknown;
  @ApiPropertyOptional() @Allow() profesionDetalle?: unknown;
  @ApiPropertyOptional({ example: 2012 }) @Allow() congregaDesde?: unknown;
  @ApiPropertyOptional({ example: '30.123.456', nullable: true, description: 'D215: 7 u 8 dígitos, con o sin puntos; vacío o null lo borra. 400 DNI_INVALIDO, 409 DNI_DUPLICADO con `persona`.' }) @Allow() dni?: unknown;
  @ApiPropertyOptional({ description: 'Vacío o null: sin email (sin acceso a la app, D145).', nullable: true }) @Allow() email?: unknown;
}
