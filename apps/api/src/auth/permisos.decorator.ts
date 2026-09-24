import { SetMetadata } from '@nestjs/common';
import type { Permiso } from '@vida-sobrenatural/shared-types';

export const PERMISO_KEY = 'permiso';

/** Marca un endpoint como accesible solo para los roles que el catálogo (D132) le da a este permiso. */
export const RequierePermiso = (permiso: Permiso) => SetMetadata(PERMISO_KEY, permiso);
