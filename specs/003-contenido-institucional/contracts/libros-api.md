# Contrato: `/libros` (apps/api)

Mismo formato de error que `palabra-profetica-api.md`. Endpoints modelados directamente sobre
`SedeController` (FR-018) — ver `apps/api/src/sede/sede.controller.ts` como referencia de forma.

## `GET /libros`

Público (sin guard) — usado tanto por la subpágina pública (FR-007, solo activos y no eliminados) y
por el listado del backoffice (todas las variantes vía `estado`).

- `?estado=activas` (default, y el único caso que usa `apps/web`): `activo: true`, `eliminadoEn:
  null`, orden `orden asc`.
- `?estado=todas` (backoffice, D117/H-51): incluye inactivos, sigue excluyendo eliminados.
- `?estado=papelera` (backoffice, D119): solo `eliminadoEn: not null`.

Paginado (H-42) en las tres variantes; `select` explícito, sin relaciones (`Libro` no tiene
relaciones salientes que un listado necesite, `data-model.md`).

- `204 No Content` si `?estado=activas` no devuelve ningún libro (FR-008: la subpágina pública
  renderiza su estado vacío, no un error).

## `GET /libros/:id`

Público — detalle de un libro, activo o no (mismo criterio que `Sede`, D117/H-52), nunca uno
eliminado (`404 NO_ENCONTRADO` si `eliminadoEn` no es `null` — D119).

## `POST /libros`

- Guard: Admin (FR-028).
- Body: `CrearLibroDto` — `titulo`, `autor`, `anio` obligatorios; `descripcion`, `orden` opcionales
  (`data-model.md`). Sin portada en este mismo request — la portada entra por su propio endpoint
  (abajo), después de que el libro ya existe con un `id`.

## `PATCH /libros/:id`

- Guard: Admin.
- Body: `ActualizarLibroDto` — mismos campos que crear (todos opcionales) más el toggle
  `activo: true|false` (inactivar/reactivar, FR-017, mismo criterio que `Sede.update`).

## `POST /libros/:id/portada`

- Guard: Admin.
- `multipart/form-data`: campo de archivo (`portada`) + campo de texto (`portadaDescripcion`,
  obligatorio en este mismo request — FR-025, no puede subirse un archivo sin su texto alternativo).
- `FileInterceptor('portada')` con `multer` en memoria (`research.md` Decisión 2); límites de
  `multer` (tamaño) como primera barrera, segunda validación explícita del service contra
  `MIME_TIPOS_PORTADA_PERMITIDOS`/`PORTADA_TAMANO_MAXIMO_BYTES` de `packages/shared-types`.
  - `400 PORTADA_TIPO_INVALIDO` si el tipo real del archivo (no la extensión ni el `Content-Type`
    declarado) no está en la lista permitida.
  - `400 PORTADA_TAMANO_EXCEDIDO` si supera el máximo.
  - `400 LIBRO_TEXTO_ALTERNATIVO_REQUERIDO` si falta `portadaDescripcion`.
- Si pasa validación: `imagen-portada.service.ts` redimensiona/recomprime/recorta a 2:3 (FR-023/024,
  `research.md` Decisión 1), `StorageService.subir()` guarda el resultado con nombre generado por el
  sistema (FR-023), y el service actualiza `portadaUrl`/`portadaDescripcion` del libro. Si el libro
  ya tenía una portada previa, el archivo anterior se elimina de `StorageService` en la misma
  operación (Acceptance Scenario 4 de la Historia 4: "la anterior deja de servirse") — no queda un
  archivo huérfano servido públicamente.
- Cancelar el formulario antes de completar el alta (Edge Case del spec, "no queda un archivo
  huérfano... sin un libro que lo referencie"): resuelto porque este endpoint exige que `:id` ya
  exista (el libro se crea primero, sin portada, por `POST /libros`) — no hay forma de subir un
  archivo que no quede asociado a un libro real desde el primer momento.

## `DELETE /libros/:id/portada`

- Guard: Admin.
- Quita la portada (`portadaUrl`/`portadaDescripcion` → `null`), elimina el archivo de
  `StorageService`, el libro vuelve a mostrarse con `PlaceholderImagen aspecto="portada"` (FR-027).

## `DELETE /libros/:id`

- Guard: Admin.
- Borrado lógico (D119): `eliminadoEn`/`eliminadoPor` (de `request.user`), sin chequeo de
  dependientes mientras el modelo actual no tenga ninguno (FR-020, a diferencia de
  `DELETE /sedes/:id`, que sí bloquea con `SEDE_TIENE_DATOS_RELACIONADOS`). Si una spec futura suma
  una entidad que referencia a Libro (ej. Ventas de Ediciones VS, `docs/08-roadmap-producto.md`),
  este endpoint pasa a bloquear del mismo modo que `DELETE /sedes/:id` — no es una garantía
  permanente de este contrato.
- No elimina el archivo de portada de `StorageService` en este paso — la portada sigue sirviéndose
  mientras el libro esté en la papelera (se puede restaurar); se elimina recién si además se llama
  `DELETE /libros/:id/portada` o si en una spec futura se agrega un borrado físico definitivo desde
  la papelera (fuera de alcance de este spec, no hay acceptance scenario que lo pida).

## `POST /libros/:id/restaurar`

- Guard: Admin.
- Mismo criterio que `POST /sedes/:id/restaurar`: `eliminadoEn`/`eliminadoPor` → `null`, sin tocar
  `activo` (D119).

## Permisos (FR-028/FR-029/FR-030)

- Admin: lee y escribe todo lo de arriba, incluida la papelera.
- Pastor/Pastora: `GET` (todas las variantes, incluida `?estado=papelera`) en modo lectura; todo
  endpoint de escritura (`POST`/`PATCH`/`DELETE`/`.../restaurar`/`.../portada`) devuelve
  `403 SIN_PERMISO`.
- Cualquier otro rol: sin la sección en su menú; acceso directo por URL cae en `403`.
