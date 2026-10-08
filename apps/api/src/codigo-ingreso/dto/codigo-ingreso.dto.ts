import { ApiProperty } from '@nestjs/swagger';
import { Allow } from 'class-validator';

/**
 * spec 007 (contracts/codigo-ingreso-api.md). Los DTO solo dejan pasar los
 * campos: el formato (email hasta 254 caracteres; código de 6 dígitos sin
 * espacios ni guiones) lo valida el servicio, para devolver todos los errores
 * de campo juntos con su `code` (H-50).
 */
export class PedirCodigoDto {
  @ApiProperty({ example: 'ana@hotmail.com' })
  @Allow()
  email!: unknown;
}

export class VerificarCodigoDto {
  @ApiProperty({ example: 'ana@hotmail.com' })
  @Allow()
  email!: unknown;

  @ApiProperty({ example: '482 913', description: 'Se le quitan espacios y guiones; tienen que quedar 6 dígitos.' })
  @Allow()
  codigo!: unknown;
}
