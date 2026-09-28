import { ApiProperty } from '@nestjs/swagger';
import { Allow } from 'class-validator';
import type { Franja } from '@vida-sobrenatural/shared-types';

/**
 * specs/004 (contracts/solicitudes-api.md): `{ franjas }` del pedido propio y
 * de la edición. `@Allow` y no `@IsArray`: la validación de las franjas la
 * hace el servicio (`erroresDeFranjas`) para devolver los códigos de campo del
 * contrato (FRANJAS_REQUERIDAS, FRANJA_FIN_ANTERIOR_AL_INICIO…), no el
 * `FRANJAS_INVALIDO` genérico del pipe.
 */
export class FranjasDto {
  @ApiProperty({ description: 'Al menos una: { diaSemana 0..6, inicio, fin } en minutos desde las 0:00.' })
  @Allow()
  franjas!: Franja[];
}
