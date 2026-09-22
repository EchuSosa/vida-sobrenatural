import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, ArrayUnique, IsArray, IsUUID } from 'class-validator';

/**
 * Body de PATCH /libros/reordenar — H-89: el orden nuevo COMPLETO (todos
 * los ids del conjunto que se está ordenando, en su posición nueva), nunca
 * un movimiento parcial. `ArrayUnique` cubre "sin repetidos" acá mismo, en
 * la validación del DTO; "sin faltantes ni ajenos" se valida en
 * LibroService.reordenar contra el conjunto real (no alcanza con mirar
 * solo la forma del body).
 */
export class ReordenarLibrosDto {
  @ApiProperty({ type: [String], description: 'Ids de los Libros activos, en el orden nuevo completo.' })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  ids!: string[];
}
