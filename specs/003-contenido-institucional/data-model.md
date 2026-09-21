# Data Model: Contenido institucional

Alcance: dos entidades nuevas del modelo de Prisma (`apps/api/prisma/schema.prisma`), más el catálogo
de códigos de error y las constantes compartidas que este spec agrega. No se toca `Persona`, `Sede`
ni ninguna entidad de los specs 001/002.

## PalabraProfetica

| Campo | Tipo | Obligatorio | Notas |
|---|---|---|---|
| `id` | `String` (uuid) | sí | `@id @default(uuid())`. |
| `anio` | `Int` | sí | FR-010. Sin unicidad forzada por base: nada impide dos registros del mismo año (ej. corrección), la única regla real de negocio es "una sola vigente" (ver abajo). |
| `titulo` | `String` | sí | FR-010. Ej. "Palabra Profética 2026 — Fidelidad y crecimiento". |
| `texto` | `String` (`@db.Text`) | sí | FR-010. Texto libre, sin límite corto de longitud (es contenido institucional, no un campo de formulario acotado). |
| `youtubeUrl` | `String` | sí | FR-010/FR-011. Se guarda la URL cargada por el Admin (para reeditar el formulario), pero el embed público siempre se arma desde `youtubeVideoId` (abajo), nunca reparseando esta columna en cada render. |
| `youtubeVideoId` | `String` | sí | Derivado de `youtubeUrl` al guardar (`research.md` Decisión 4) — 11 caracteres. Columna propia (no un getter calculado) para que la subpágina pública arme el embed con una sola lectura, sin repetir el parseo de URL en cada request. |
| `vigente` | `Boolean` | sí, `@default(false)` | FR-004/FR-006/FR-012. Como máximo un registro con `vigente: true` a la vez — invariante de negocio (`PalabraProfeticaService`, transacción al marcar una nueva vigente), no un constraint de base (mismo criterio que "Sede única activa" en `sede.service.ts`). Índice (`@@index([vigente])`) porque la subpágina pública filtra por este campo en cada visita (H-42). |
| `createdAt` | `DateTime` | — | `@default(now())`. Con `vigente` es lo que define el orden del historial (FR-013): el más reciente primero. |
| `updatedAt` | `DateTime` | — | `@updatedAt`. |

**Validaciones** (DTO, `class-validator`):
- `anio`: entero, rango razonable (ej. `Min(2010)` — año de fundación, `Max(añoActual + 1)`).
- `titulo`, `texto`, `youtubeUrl`: no vacíos.
- `youtubeUrl`: además de no vacío, debe resolver a un `youtubeVideoId` válido (`research.md`
  Decisión 4) o el service rechaza con `YOUTUBE_URL_INVALIDA` antes de tocar la base (FR-011).

**Transición de estado**: solo `vigente`, y solo en una dirección observable por el usuario —
`PATCH /palabra-profetica/:id/marcar-vigente` pone `true` en el registro indicado y `false` en
cualquier otro que lo tuviera, dentro de la misma transacción de Prisma (FR-012, SC-006: "sin ningún
paso manual adicional"). No existe un endpoint para "desmarcar" vigente sin marcar otra — el estado
"ninguna vigente" solo ocurre naturalmente cuando todavía no se cargó ninguna (estado inicial, FR-006)
o si se decide algo, editar directamente en el registro (no expuesto explícitamente en el spec; no
se implementa por no tener acceptance scenario que lo pida — YAGNI).

**Sin borrado**: a diferencia de `Libro`, `PalabraProfetica` no tiene `activo` ni
`eliminadoEn`/`eliminadoPor` — el spec es explícito (FR-013: "MUST conservar toda Palabra Profética
anterior, nunca se borra al reemplazarla") y la Constitution Check de `plan.md` ya deja registrado
por qué esto no es una excepción al Principio III (nunca se elimina, ni física ni lógicamente — no
hay nada que "soft-deletear").

## Libro

| Campo | Tipo | Obligatorio | Notas |
|---|---|---|---|
| `id` | `String` (uuid) | sí | `@id @default(uuid())`. |
| `titulo` | `String` | sí | FR-015. Sin límite corto — Edge Case explícito: un título larguísimo debe verse completo sin romper el layout (verificado en e2e con el dato hostil del seed-demo, FR-032). |
| `autor` | `String` | sí | FR-015. Acepta tildes/ñ (Edge Case, FR-032). |
| `anio` | `Int` | sí | FR-015. |
| `descripcion` | `String?` (`@db.Text`) | no | FR-015. Puede faltar (dato hostil del seed-demo, FR-032). |
| `orden` | `Int` | sí, `@default(0)` | FR-016. Define la posición en el listado público (FR-007); editable libremente por el Admin, sin unicidad forzada entre libros (dos libros pueden compartir `orden`; el criterio de desempate en ese caso —ej. por `createdAt`— se resuelve al implementar el listado, no es una regla de negocio nueva). Índice (`@@index([orden])`) porque el listado público ordena por este campo en cada visita (H-42). |
| `portadaUrl` | `String?` | no, junto con `portadaDescripcion` | FR-015/FR-021. Ruta pública del archivo procesado (`research.md` Decisión 3), no la URL externa que subió el Admin — el archivo ya pasó por `StorageService`. |
| `portadaDescripcion` | `String?` | condicional | FR-025: obligatorio si y solo si `portadaUrl` no es null — validado en el service (no expresable como constraint de Prisma), error `LIBRO_TEXTO_ALTERNATIVO_REQUERIDO` si se intenta guardar una portada sin este texto. |
| `activo` | `Boolean` | sí, `@default(true)` | Estado de negocio (Principio III) — inactivar/reactivar (FR-017), independiente de `eliminadoEn` (mismo criterio que `Sede`, D119). |
| `eliminadoEn` | `DateTime?` | no | D119, FR-019. Borrado lógico, saca el registro de toda vista normal (backoffice y web pública) sin importar el valor de `activo`. |
| `eliminadoPor` | `String?` | no | D119. Referencia lógica al id de la Persona que eliminó, sin `@relation` de Prisma (mismo criterio que `Sede.eliminadoPor`/`Persona.altaPor`). |
| `createdAt` | `DateTime` | — | `@default(now())`. |
| `updatedAt` | `DateTime` | — | `@updatedAt`. |

**Validaciones** (DTO):
- `titulo`, `autor`: no vacíos.
- `anio`: entero, rango razonable.
- `orden`: entero, `>= 0`.
- `descripcion`: opcional, sin mínimo.
- Portada: no es un campo del DTO de crear/actualizar — entra por un endpoint propio
  (`POST /libros/:id/portada`, multipart/form-data), validado contra
  `MIME_TIPOS_PORTADA_PERMITIDOS`/`PORTADA_TAMANO_MAXIMO_BYTES` de `packages/shared-types` antes de
  procesar (FR-022) — `PORTADA_TIPO_INVALIDO`/`PORTADA_TAMANO_EXCEDIDO` si falla.
- `portadaDescripcion` va en el mismo request que la subida de portada (no puede subirse una portada
  sin su texto alternativo, FR-025) — nunca un campo suelto del DTO principal de Libro.

**Transiciones de estado** (dos ejes independientes, igual que `Sede` D119):
1. `activo: true ⇄ false` — inactivar/reactivar (FR-017), reversible, visible en el backoffice con
   filtro "Todas" mientras esté en ese estado (Acceptance Scenario 5 de la Historia 4).
2. `eliminadoEn: null → timestamp` — eliminar (FR-019), vía `DELETE /libros/:id`, **permitido sin
   chequeo de dependientes mientras el modelo actual no tenga ninguno** (FR-020 — a diferencia de
   Sede, hoy ninguna entidad referencia a Libro) y reversible solo vía `POST /libros/:id/restaurar`
   (vuelve `eliminadoEn`/`eliminadoPor` a `null`, sin tocar `activo`).

**Sin `LIBRO_TIENE_DATOS_RELACIONADOS` todavía**: no existe ese código en el catálogo de errores de
este spec — sería uno sin ningún caso que lo dispare hoy (FR-020, Constitution Check de `plan.md`,
Principio IV). Es una condición del estado actual del modelo, no una decisión definitiva: el backlog
de Ventas de Ediciones VS (`docs/08-roadmap-producto.md`, "Registro de ventas presenciales") agrega
una entidad Venta que sí referenciaría a Libro; esa spec futura sumaría `LIBRO_TIENE_DATOS_RELACIONADOS`
y el mismo chequeo de bloqueo que ya usa `sede.service.ts`, sin que este spec necesite reabrirse.

## Catálogo de códigos de error (`ErrorCode`) — valores nuevos de este spec

Se agregan a la unión existente en `packages/shared-types/src/error-code.ts` (no se reinterpreta
ningún valor existente, Principio X):

| Código | Origen | Status HTTP típico |
|---|---|---|
| `YOUTUBE_URL_INVALIDA` | `PalabraProfetica` — FR-011, la URL cargada no resuelve a un id de YouTube reconocible | 400 |
| `PORTADA_TIPO_INVALIDO` | `Libro` — FR-022, el archivo subido no es JPG/PNG/WebP | 400 |
| `PORTADA_TAMANO_EXCEDIDO` | `Libro` — FR-022, el archivo supera `PORTADA_TAMANO_MAXIMO_BYTES` | 400 |
| `LIBRO_TEXTO_ALTERNATIVO_REQUERIDO` | `Libro` — FR-025, se intentó guardar una portada sin `portadaDescripcion` | 400 |

Cada uno recibe su título en `apps/api/src/common/errors/all-exceptions.filter.ts` (`TITULOS`, ya
exhaustivo por tipo — TS obliga a completarlo) y su traducción en
`apps/backoffice/src/messages/es.json` (namespace `errors`, único lugar donde estos cuatro códigos
son alcanzables — ninguno lo dispara una pantalla de `apps/web`).

## Constantes compartidas (`packages/shared-types/src/portada.ts`)

No son una entidad de base de datos — ver `research.md` Decisión 5 para el detalle:

- `MIME_TIPOS_PORTADA_PERMITIDOS`: `['image/jpeg', 'image/png', 'image/webp']`.
- `PORTADA_TAMANO_MAXIMO_BYTES`: `5 * 1024 * 1024`.
- `PORTADA_ASPECTO`: `{ ancho: 2, alto: 3 }` — usado tanto por `imagen-portada.service.ts` (recorte
  al procesar, FR-024) como por `PlaceholderImagen` (`aspecto: 'portada'`, ya coincide con 2:3 sin
  cambios) para que el mismo valor no diverja entre el procesamiento real y el placeholder visual.

## Marca (Historia 5) — sin entidades

Los archivos de marca (documentados en `docs/marca/README.md`, movidos a
`packages/ui/src/assets/marca/`) y sus tamaños derivados (favicon, ícono de PWA, marca de agua,
logotipo) son archivos estáticos, sin persistencia en la base de datos — no agregan tablas, columnas
ni códigos de error nuevos. Su único registro en este documento es esta nota; el detalle de dónde
viven y cómo se derivan está en `research.md` (Decisiones 7-9) y en el árbol de `plan.md`.
