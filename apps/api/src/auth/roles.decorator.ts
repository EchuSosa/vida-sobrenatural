import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/** Marca un endpoint como accesible solo para alguno de estos roles (req.user.rol). */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
