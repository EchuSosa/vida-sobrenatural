export type RolDeCargo = 'admin' | 'pastor' | 'discipulador' | 'lider_curso';

export type Permiso = never;

export const CATALOGO_PERMISOS: Record<Permiso, RolDeCargo[]> = {};
