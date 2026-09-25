// Fixture de eslint-rules/pantalla-declara-permiso.test.mjs — un NAV_BACKOFFICE declarativo mínimo.
export const NAV_BACKOFFICE = [
  { href: '/', labelKey: 'inicio', permiso: 'inicio.ver' },
  { href: '/libros', labelKey: 'libros', permiso: 'libros.ver' },
  { href: '/libros/papelera', labelKey: 'papelera', permiso: 'libros.papelera.ver', enMenu: false },
  { href: '/sedes/[id]', labelKey: 'sedes', permiso: 'sedes.ver', enMenu: false },
  { href: '/ayuda', labelKey: 'ayuda', permiso: 'cualquier-sesion' },
] as const;
