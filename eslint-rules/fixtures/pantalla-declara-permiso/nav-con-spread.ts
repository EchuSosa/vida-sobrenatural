// Fixture: NAV_BACKOFFICE deja de ser declarativo — la regla tiene que abortar, no adivinar.
const extra = [{ href: '/x', labelKey: 'x', permiso: 'x.ver' }];
export const NAV_BACKOFFICE = [{ href: '/', labelKey: 'inicio', permiso: 'inicio.ver' }, ...extra];
