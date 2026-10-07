# Contrato: catálogo de Ministerios y Células (Historias 4 y 7)

Módulo nuevo `apps/api/src/ministerio/`. Errores con Problem Details y `code` de
`packages/shared-types/src/error-code.ts` (Principio X); errores de campo bajo `VALIDACION` con
`errors: [{ campo, code }]` (H-50). Permisos con `@RequierePermiso` contra `CATALOGO_PERMISOS` (D132).
Mismo patrón que `sede.controller.ts` (D117, D119, H-129).

## Permisos nuevos (`packages/shared-types/src/permisos.ts`)

| Permiso | Roles | Uso |
|---|---|---|
| `ministerios.ver` | `admin`, `pastor` | Listado, detalle, miembros (backoffice). |
| `ministerios.gestionar` | `admin` | Crear, editar, inactivar, reactivar, eliminar, restaurar Ministerios y Células; dar de baja a un miembro. |
| `ministerios.papelera.ver` | `admin` | Papeleras de Ministerios y de Células (D119, H-129). |
| `postulaciones.crear_en_nombre` | `admin` | Historia 5 (D97, D143: el alta en nombre es del Admin). |

Revisar Postulaciones reusa `solicitudes.ver` / `solicitudes.aprobar` (bandeja unificada).

## Públicos (sin sesión)

### `GET /ministerios/publicos`
- **200:** `MinisterioPublico[]` — solo activos y no eliminados, ordenados por nombre; Células activas
  no eliminadas por nombre. Lo usan la página pública (FR-034) y la lista de la app (FR-009).

## Backoffice

### `GET /ministerios?estado=activos|todos&buscar=`
- `ministerios.ver`. **200:** `MinisterioCatalogo[]` (sin eliminados). `estado=papelera` → 400 (igual
  que Sedes: la papelera sale por su ruta). Búsqueda por nombre normalizado. Sin paginar (catálogo chico).

### `GET /ministerios/papelera` — `ministerios.papelera.ver`. Eliminados, con `eliminadoEn` y quién.

### `GET /ministerios/:id`
- `ministerios.ver`. **200:** `MinisterioCatalogo & { celulas: CelulaCatalogo[] }` (no eliminadas). Un
  eliminado → 404 (salvo para restaurar).

### `GET /ministerios/:id/miembros?skip&take&buscar`
- `ministerios.ver`. **200:** `Pagina<MiembroMinisterio>` — Postulaciones `aprobada` del Ministerio,
  Persona activa, orden por apellido. FR-032.

### `POST /ministerios` — `ministerios.gestionar`
- **Cuerpo:** `{ nombre, descripcion }`. **201:** `MinisterioCatalogo`.
- `VALIDACION`: `nombre` (`REQUERIDO`, `DEMASIADO_LARGO`, `MINISTERIO_NOMBRE_DUPLICADO`), `descripcion`
  (`REQUERIDO`, `DEMASIADO_LARGO`). Usar los códigos de campo genéricos que ya existan; los de duplicado
  son propios.

### `PATCH /ministerios/:id` — `ministerios.gestionar`
- **Cuerpo:** `{ nombre?, descripcion?, activo?, confirmacionNombre? }`.
- `activo: false` con miembros activos o Postulaciones pendientes exige `confirmacionNombre` igual al
  nombre (comparación exacta tras `trim`) → si no, 409 `CONFIRMACION_NOMBRE_REQUERIDA` con
  `{ miembrosActivos, postulacionesPendientes }` en extensiones (D38, FR-028).
- No toca Postulaciones ni Células (edge case "inactivar con miembros").

### `DELETE /ministerios/:id` — `ministerios.gestionar`
- Borrado lógico (D119). 409 `MINISTERIO_TIENE_DATOS_RELACIONADOS` si tiene alguna Postulación (cualquier
  estado) o alguna Célula no eliminada. **204.**

### `POST /ministerios/:id/restaurar` — `ministerios.gestionar`
- Vuelve con su `activo` de antes. 409 `MINISTERIO_NOMBRE_DUPLICADO` si mientras tanto se creó otro con
  el mismo nombre.

### Células (anidadas)

- `POST /ministerios/:id/celulas` `{ nombre }` → 201 `CelulaCatalogo`. `CELULA_NOMBRE_DUPLICADO` (campo),
  409 `MINISTERIO_NO_DISPONIBLE` si el Ministerio está eliminado (inactivo sí se permite: se prepara antes
  de reactivar).
- `PATCH /celulas/:id` `{ nombre?, activo?, confirmacionNombre? }` — misma regla de confirmación;
  reactivar con el Ministerio inactivo → 409 `MINISTERIO_INACTIVO`.
- `DELETE /celulas/:id` → 409 `CELULA_TIENE_DATOS_RELACIONADOS` si tiene Postulaciones.
- `GET /ministerios/:id/celulas/papelera` (`ministerios.papelera.ver`), `POST /celulas/:id/restaurar`.

### `POST /postulaciones/:id/dar-de-baja` — `ministerios.gestionar` (Historia 6)
- **Cuerpo:** `{ motivo?: string ≤ 500 }`. Exige `aprobada` → si no, 409 `POSTULACION_NO_APROBADA`.
- **Efecto:** `inactiva`, `motivoInactivacion = 'baja'`, `inactivadaEn`, `inactivadaPorId`, `motivoBaja`.
  Emite `miembro_dado_de_baja`. **200:** `{ id, estado: 'inactiva' }`.

### `GET /personas/:id/ministerio` — `ministerios.ver`
- **200:** `{ actual: { ministerio, celula, desde } | null, historial: PostulacionHistorial[] }` — para la
  vista unificada de Persona (D61) cuando exista.

## Códigos nuevos (`error-code.ts`)

`MINISTERIO_NO_DISPONIBLE`, `MINISTERIO_INACTIVO`, `MINISTERIO_TIENE_DATOS_RELACIONADOS`,
`CELULA_TIENE_DATOS_RELACIONADOS`, `CONFIRMACION_NOMBRE_REQUERIDA` (si no existe ya uno equivalente para
Sedes: verificar y reusar), `POSTULACION_NO_APROBADA`. De campo (bajo `VALIDACION`):
`MINISTERIO_NOMBRE_DUPLICADO`, `CELULA_NOMBRE_DUPLICADO`, `CELULA_NO_DISPONIBLE`.
