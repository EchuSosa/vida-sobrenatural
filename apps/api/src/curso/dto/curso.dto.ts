import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { CURSO_DESCRIPCION_MAX, type CategoriaCurso, type TipoCurso } from '@vida-sobrenatural/shared-types';

/** `POST /cursos` — FR-056: la combinación tiene que ser una de `CURSOS_RECONOCIDOS` (lo valida el servicio). */
export class CrearCursoDto {
  @ApiProperty({ enum: ['vida_nueva', 'vida_de_servicio'] })
  @IsIn(['vida_nueva', 'vida_de_servicio'])
  categoria!: CategoriaCurso;

  @ApiProperty({ enum: ['individual', 'grupal'] })
  @IsIn(['individual', 'grupal'])
  tipo!: TipoCurso;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  nombre!: string;

  @ApiPropertyOptional({ maxLength: CURSO_DESCRIPCION_MAX })
  @IsOptional()
  @IsString()
  @MaxLength(CURSO_DESCRIPCION_MAX)
  descripcion?: string;
}

/**
 * `PATCH /cursos/:id` — solo nombre, descripción y activo. La validación
 * global rechaza cualquier otro campo (`forbidNonWhitelisted` no está
 * prendido, así que el controller rechaza a mano categoria/tipo/modalidad).
 */
export class ActualizarCursoDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  nombre?: string;

  @ApiPropertyOptional({ maxLength: CURSO_DESCRIPCION_MAX, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(CURSO_DESCRIPCION_MAX)
  descripcion?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
