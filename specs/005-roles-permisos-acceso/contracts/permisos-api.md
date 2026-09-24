# Contrato: catálogo de permisos (Historia 3)

No es un endpoint HTTP — es un contrato de **código compartido** (D132, ver research.md #1).

## Forma

```text
// packages/shared-types/src/permisos.ts
export type RolDeCargo = 'admin' | 'pastor' | 'discipulador' | 'lider_curso';
export type Permiso = /* unión de claves, ej. */ 'libros.editar' | 'solicitudes.aprobar' | ...;
export const CATALOGO_PERMISOS: Record<Permiso, RolDeCargo[]>;
```

## Consumidores

- **`apps/api`**: `PermisosGuard` (o `RolesGuard` extendido) resuelve `@RequierePermiso(permiso)`
  contra `CATALOGO_PERMISOS[permiso]` antes de comparar con `request.user.rol`. Si el permiso no
  existe en el catálogo (error de programación, no de datos), el Guard DEBE fallar cerrado
  (denegar, nunca "cualquier rol pasa") — mismo espíritu fail-closed del Principio V.
- **`apps/backoffice`**: `requerirPermiso(permiso)` en `auth.ts` hace la misma resolución para
  decidir si renderizar una pantalla o una acción. También se usa, sin llamar a `requerirPermiso`
  (que corta la pantalla entera), para decidir si mostrar/ocultar una acción puntual dentro de una
  pantalla ya accesible (ej. el botón "Editar" en una lista que el Pastor puede ver mode lectura).

## Garantía verificable (FR-013)

Ningún otro archivo de `apps/api` ni de `apps/backoffice` declara una lista de roles propia para
decidir autorización — se verifica en `tasks.md` con una búsqueda de `@Roles(` (debe dar cero
resultados tras la migración) y una revisión manual de los antiguos chequeos a mano del
backoffice (ej. `rol.includes('admin')` fuera de la resolución del catálogo).

## Migración de los 18 sitios existentes (FR-014)

`palabra-profetica.controller.ts` (3), `libro.controller.ts` (7), `persona.controller.ts` (4),
`sede.controller.ts` (4) — cada `@Roles('admin', 'pastor')` (o la combinación que corresponda) se
reemplaza por `@RequierePermiso('<permiso-correspondiente>')`, donde el permiso nuevo se declara
en el catálogo con exactamente esos mismos roles como valor inicial (la migración no cambia
ningún comportamiento existente, solo la fuente de la regla).
