import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, Matches, Validate, ValidateIf } from 'class-validator';
import { HORARIOS_SEDE_REGEX, TELEFONO_REGEX } from '@vida-sobrenatural/shared-types';
import { WhatsappArgentino } from './whatsapp-argentino.js';

/** Body de POST /sedes — Historia 3, FR-010. */
export class CrearSedeDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  nombre!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  direccion!: string;

  @ApiPropertyOptional({ description: 'Código de país (+...) y número — D90, H-30.' })
  @IsOptional()
  @IsString()
  @Matches(TELEFONO_REGEX, { message: 'contactoTelefono debe tener código de país (+...) y solo dígitos' })
  contactoTelefono?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contactoEmail?: string;

  @ApiProperty({ description: 'Formato acotado — H-30, ej. "Domingos 10:30 hs".' })
  @IsString()
  @IsNotEmpty()
  @Matches(HORARIOS_SEDE_REGEX)
  horarios!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  descripcionBienvenida?: string;

  @ApiPropertyOptional({ description: 'D218: celular argentino, como lo escriba el Admin; se guarda normalizado (549…). Vacío = sin WhatsApp.' })
  @IsOptional()
  @IsString()
  @ValidateIf((_objeto, valor) => valor !== '')
  @Validate(WhatsappArgentino)
  whatsappSecretaria?: string;
}
