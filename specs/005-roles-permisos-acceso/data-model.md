# Data Model: Roles, permisos y acceso al backoffice

## Persona (extensión de la entidad existente)

Ya existe (`apps/api/prisma/schema.prisma`, specs 001/002/003). Este spec le agrega un campo y
formaliza dos usos ya existentes del campo `rol`:

| Campo | Tipo | Nuevo/Existente | Notas |
|---|---|---|---|
| `rol` | `String[]` | Existente | Sin cambio de tipo. Sigue siendo acumulativo (docs/03-roles-permisos.md). Este spec formaliza que los valores `admin`/`pastor`/`discipulador`/`lider_curso` (roles de **cargo**) se escriben únicamente vía el servicio de FR-006/FR-007, y los demás valores (roles de **estado**, ej. `miembro_registrado`) únicamente vía el lugar único de FR-019. No se separan en dos columnas — D131 los distingue por *quién los otorga*, no por *dónde se guardan*. |
| `adminSembrado` | `Boolean` `@default(false)` | **Nuevo** (FR-002) | `true` únicamente para la Persona creada/actualizada por `scripts/recrear-admin.ts`. Nunca se setea desde la app en runtime. El servicio de otorgar/quitar rol y el de activar/desactivar Personas DEBEN rechazar cualquier intento de quitarle `admin` o desactivar a una Persona con este flag en `true`. |

**Validación nueva** (D133/FR-011, en el servicio de otorgar rol, no en el modelo — Prisma no
expresa "depende de otro campo calculado"): rechazar si
`calcularEdad(fechaNacimiento) < EDAD_MINIMA_ROL_DE_CARGO` y el rol solicitado es uno de cargo.
`calcularEdad()` sigue siendo la de `apps/api/src/persona/calcular-edad.ts` (reusada tal cual);
`EDAD_MINIMA_ROL_DE_CARGO` es una constante **propia** de esta regla (H-128), no la `EDAD_MINIMA`
ya existente en `persona.service.ts` — esa constante ya significa otras dos cosas ahí (umbral de
auto-registro, mayoría de edad del tutor) y sumarle esta tercera las acoplaría por coincidencia
numérica, no por motivo compartido. `EDAD_MINIMA_ROL_DE_CARGO` vive en `packages/shared-types`
(no como constante local de la API), porque FR-024 necesita el mismo umbral también del lado del
backoffice — ver research.md #7 para el detalle completo del razonamiento.

**Sin cambios de relación**: no se agrega ninguna FK nueva a `Persona` por este spec (la relación
con `CambioDeRol`, abajo, es *desde* `CambioDeRol` *hacia* `Persona`, sin campo inverso obligatorio
en `Persona` — ver Principio de simplicidad, no hace falta navegar "mis cambios de rol" desde el
lado de Persona para ningún requisito de este spec).

## Catálogo de permisos (código, no entidad de base de datos — D132)

`packages/shared-types/src/permisos.ts`:

- `RolDeCargo`: unión de los cuatro roles de cargo (`'admin' | 'pastor' | 'discipulador' | 'lider_curso'`) — el mismo vocabulario que `docs/03-roles-permisos.md` ya usa.
- `Permiso`: unión de las claves de permiso con nombre (ej. `'libros.editar'`, `'solicitudes.aprobar'`, `'palabra_profetica.editar'`, más las que resulten de migrar los 18 `@Roles` existentes y los chequeos del backoffice — el listado completo y exhaustivo de nombres de permiso se produce en `tasks.md`, no en este plan, ya que depende de auditar cada sitio actual uno por uno).
- `CATALOGO_PERMISOS: Record<Permiso, RolDeCargo[]>` — la única fuente de verdad de qué roles tienen cada permiso.
- Invariante (validado por FR-013, no por el tipo): tanto `PermisosGuard` (API) como `requerirPermiso()` (backoffice) resuelven exclusivamente contra `CATALOGO_PERMISOS` — ningún otro archivo declara una lista de roles propia para decidir acceso.

No es una entidad con ciclo de vida (no se crea/edita/borra en runtime) — cambia con un commit y
un deploy, igual que cualquier otra constante de dominio en `packages/shared-types`.

## CambioDeRol (Nuevo modelo Prisma — auditoría, Historia 6)

| Campo | Tipo | Notas |
|---|---|---|
| `id` | `String @id @default(uuid())` | |
| `personaId` | `String` | La Persona a la que se le otorgó/quitó el rol. FK a `Persona`, indexada (H-42: campo de filtro frecuente — "historial de cambios de esta Persona"). |
| `rol` | `String` | El rol de cargo afectado (`admin`/`pastor`/`discipulador`/`lider_curso`). |
| `accion` | `enum AccionCambioRol { otorgado, quitado }` | |
| `realizadoPorId` | `String` | El Admin que ejecutó la acción. FK lógica a `Persona` (mismo criterio que `Persona.altaPor` ya existente — referencia sin `@relation` de Prisma, D97) o FK real — a decidir en `tasks.md` según si hace falta hacer JOIN para mostrar el nombre del Admin en la pantalla de auditoría (Historia 6, Acceptance Scenario 3). |
| `createdAt` | `DateTime @default(now())` | Cuándo. No hay `updatedAt` — la fila nunca se edita. |

**Sin soft delete** (a diferencia de la mayoría de las entidades del dominio, Principio III): esta
tabla no representa un recurso de negocio con ciclo de vida propio, sino el registro histórico de
un evento ya ocurrido — no hay nada que "eliminar lógicamente" en un hecho pasado. Ninguna
operación de la app escribe un `UPDATE` ni un `DELETE` sobre esta tabla, solo `INSERT` (FR-023:
"sin perderse ni sobrescribirse").

**Índices** (H-42): `@@index([personaId])` (consulta "historial de esta Persona"); evaluar en
`tasks.md` si hace falta `@@index([realizadoPorId])` según si la pantalla de auditoría también
filtra "qué hizo este Admin".

## Registro de permisos por pantalla (backoffice, no es una entidad de base de datos — FR-016/FR-017)

**Revisado (no es un archivo nuevo)**: `NAV_BACKOFFICE` (`apps/backoffice/src/config/nav.ts`) ya
es este registro — mapea cada ruta real del backoffice a quién puede acceder, y ya lo consumen
tanto el sidebar (`itemsParaRoles`) como el smoke de accesibilidad
(`apps/backoffice/e2e/axe-todas-las-rutas.spec.ts`). Este spec lo **extiende**, no crea uno
paralelo (research.md #3 — la decisión original de un archivo nuevo se descartó al encontrar
este):

- `ItemNavBackoffice.roles: RolBackoffice[]` pasa a `ItemNavBackoffice.permiso: Permiso | 'cualquier-sesion'`.
- `itemsParaRoles(roles)` resuelve los roles efectivos de cada ítem vía `CATALOGO_PERMISOS[permiso]`
  antes de filtrar, en vez de leer una lista de roles declarada ahí mismo.
- Las dos rutas reales sin entrada hoy (`/libros/[id]`, `/sedes/[id]`) se agregan con
  `enMenu: false` (mismo patrón que `/sedes/papelera`).

Se consulta en dos momentos:

1. En runtime, indirectamente, vía `requerirPermiso(permiso)` que cada `page.tsx` invoca (mismo
   dato, pasado explícito, no leído de `NAV_BACKOFFICE` en runtime — ese registro es para el
   chequeo mecánico y el menú, no para que la página "descubra" su propio permiso).
2. En una regla de ESLint (`eslint-rules/pantalla-declara-permiso.mjs`, misma familia que
   `no-session-check-en-page.mjs` de H-116) que recorre cada `page.tsx` de
   `apps/backoffice/src/app/` y verifica que su ruta tiene una entrada en `NAV_BACKOFFICE` — falla
   si falta, exactamente el mecanismo que pide FR-017. No un test de Jest: `apps/backoffice` no
   tiene Jest configurado (solo Playwright e2e), y ESLint ya es el mecanismo establecido en este
   repo para este tipo de chequeo mecánico por archivo (research.md #3).

## Estados y transiciones

- **Rol de cargo** (`admin`/`pastor`/`discipulador`/`lider_curso`): dos transiciones posibles,
  `otorgado` y `quitado`, ambas manuales por un Admin (FR-006/FR-007), cada una genera una fila en
  `CambioDeRol`. La transición `quitado` sobre `discipulador` está condicionada (FR-009: rechazada
  si la Persona tiene discipulados activos a cargo — este spec no modela la entidad "discipulado
  activo" en sí, que pertenece al spec 004; el servicio de este spec consulta esa condición como
  una dependencia externa). **Mientras esa consulta no exista (spec 004 no implementado), la
  transición `quitado` sobre `discipulador` está bloqueada por completo** (H-127, fallo cerrado —
  ver el criterio general en `contracts/roles-personas-api.md`), no permitida por defecto. La
  transición `quitado` sobre `admin` está condicionada por dos reglas independientes: FR-002
  (nunca si `adminSembrado = true`) y FR-010 (nunca si quien la pide es la misma Persona objetivo).
- **Rol de estado** (`miembro_registrado`, y los que sumen features futuras): una sola transición,
  `otorgado`, escrita por el sistema (no por un Admin) a través del lugar único de FR-019 — sin
  transición `quitado` modelada por este spec (no hay ningún requisito que la pida).
