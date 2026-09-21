/**
 * Forma genérica de una respuesta paginada — H-42 (revisión manual, revisión
 * de código, Restricción Técnica "acceso a datos"). Reutilizable por
 * cualquier listado que pagine (el primero es GET /personas/pendientes-tutor).
 */
export interface Pagina<T> {
  items: T[];
  total: number;
}
