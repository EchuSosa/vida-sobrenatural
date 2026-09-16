import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

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

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contactoTelefono?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contactoEmail?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  horarios!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  descripcionBienvenida?: string;
}
