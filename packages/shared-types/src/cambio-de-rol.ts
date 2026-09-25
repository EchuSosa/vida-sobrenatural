/**
 * specs/005, Historia 6 (contracts/auditoria-api.md): un elemento de
 * GET /cambios-de-rol (`Pagina<CambioDeRolListado>`). `realizadoPor` es el
 * Admin cuando `origen = 'backoffice'`, y `null` cuando
 * `origen = 'recuperacion_cli'` — el comando db:recrear-admin, corrido por
 * quien tenga acceso al servidor (la app no puede nombrarlo; la pantalla lo
 * dice así, no como una celda vacía). `nombre`/`apellido` en null si el
 * autor ya no está en el sistema.
 */
export type OrigenCambioRol = 'backoffice' | 'recuperacion_cli';
export type AccionCambioRol = 'otorgado' | 'quitado';

export interface CambioDeRolListado {
  id: string;
  personaId: string;
  rol: string;
  accion: AccionCambioRol;
  origen: OrigenCambioRol;
  realizadoPor: { id: string; nombre: string | null; apellido: string | null } | null;
  createdAt: string;
}
