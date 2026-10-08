import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Allow, IsBoolean, IsOptional } from 'class-validator';

/**
 * spec 006, T075 (FR-031, contracts/personas-alta-api.md). El DTO solo deja
 * pasar los campos: las reglas de los datos personales son las del registro
 * (`erroresDeDatosPersonales` de shared-types, una sola fuente) y las aplica
 * el servicio, para devolver TODOS los errores de campo juntos (H-50),
 * incluido `ALTA_MENOR_DE_EDAD`, que la fábrica de validación no podría dar.
 */
export class AltaPersonaDto {
  @ApiProperty() @Allow() apellido!: unknown;
  @ApiProperty() @Allow() nombre!: unknown;
  @ApiProperty({ enum: ['masculino', 'femenino'] }) @Allow() genero!: unknown;
  @ApiProperty({ example: '1948-03-12' }) @Allow() fechaNacimiento!: unknown;
  @ApiProperty({ example: '+54 9 221 5550101' }) @Allow() telefono!: unknown;
  @ApiProperty() @Allow() direccion!: unknown;
  @ApiProperty() @Allow() sedeId!: unknown;
  @ApiProperty() @Allow() estadoCivil!: unknown;
  @ApiProperty() @Allow() profesion!: unknown;
  @ApiPropertyOptional() @Allow() profesionDetalle?: unknown;
  @ApiProperty({ example: 2012 }) @Allow() congregaDesde!: unknown;
  @ApiPropertyOptional({ description: 'Opcional (D145): sin email, la Persona no tiene acceso a la app.' })
  @Allow()
  email?: unknown;
  @ApiPropertyOptional({ example: '30.123.456', description: 'D215: opcional; 7 u 8 dígitos, con o sin puntos. 400 DNI_INVALIDO, 409 DNI_DUPLICADO con `persona`.' })
  @Allow()
  dni?: unknown;
  @ApiProperty({ description: 'D78: la Persona dio su consentimiento en persona o por WhatsApp.' })
  @Allow()
  consentimiento!: unknown;
  @ApiPropertyOptional({ description: 'Reintento después de un 409 POSIBLE_DUPLICADO ("Es otra persona, crear igual").' })
  @IsOptional()
  @IsBoolean()
  confirmarPosibleDuplicado?: boolean;
}

/** spec 006, FR-037: "Agregar email" a quien no tiene. */
export class AgregarEmailDto {
  @ApiProperty({ example: 'rosa@ejemplo.com' })
  @Allow()
  email!: unknown;
}
