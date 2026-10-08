import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { Allow, IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

/**
 * `POST /comentarios` (spec 013, contracts/comentarios-api.md). Igual que el
 * alta de la 006, el DTO solo deja pasar los campos: las reglas las aplica
 * `validarComentario` para devolver todos los errores de campo juntos (H-50).
 */
export class ComentarioNuevoDto {
  @ApiPropertyOptional({ enum: ['problema', 'sugerencia'] }) @Allow() tipo?: unknown;
  @ApiPropertyOptional({ description: '1 a 2000 caracteres (sin contar espacios al principio y al final).' }) @Allow() texto?: unknown;
  @ApiPropertyOptional({ default: false }) @Allow() aceptaContacto?: unknown;
  @ApiPropertyOptional({ description: 'Solo sin sesión y con aceptaContacto.' }) @Allow() contactoEmail?: unknown;
  @ApiPropertyOptional({ description: 'Solo sin sesión y con aceptaContacto. Con código de país.' }) @Allow() contactoTelefono?: unknown;
  @ApiPropertyOptional({ example: '/inicio', description: 'Path, sin query (si viene, se descarta).' }) @Allow() paginaOrigen?: unknown;
  @ApiPropertyOptional({ example: 'Chrome 141 · Android', description: 'Hasta 80 caracteres (resumirNavegador).' }) @Allow() navegador?: unknown;
  @ApiPropertyOptional({ description: 'El requestId del último error que vio la pantalla.' }) @Allow() ultimoRequestId?: unknown;
  @ApiPropertyOptional({ enum: ['web', 'backoffice'] }) @Allow() app?: unknown;
}

/** `GET /comentarios`. */
export class ListarComentariosDto {
  @ApiPropertyOptional({ enum: ['no', 'si', 'todos'], default: 'no' })
  @IsOptional()
  @IsIn(['no', 'si', 'todos'])
  revisado?: 'no' | 'si' | 'todos';

  @ApiPropertyOptional({ enum: ['problema', 'sugerencia'] })
  @IsOptional()
  @IsIn(['problema', 'sugerencia'])
  tipo?: 'problema' | 'sugerencia';

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  skip?: number;

  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  take?: number;
}
