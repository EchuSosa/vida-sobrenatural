# Contrato: `/palabra-profetica` (apps/api)

Sigue el formato de error ya establecido en `specs/002-base-transversal/contracts/errores.md`
(Problem Details, RFC 9457, con `code`/`requestId`) — no se repite acá.

## `GET /palabra-profetica`

Público (sin guard) — usado por la subpágina pública (FR-004) y por el historial del backoffice
(FR-013), con un query param que distingue el uso:

- `GET /palabra-profetica?vigente=true` → la única con `vigente: true`, o `204 No Content` si
  ninguna lo es todavía (FR-006: la subpágina pública renderiza su propio estado vacío ante ese
  `204`, no un error).
- `GET /palabra-profetica` (sin filtro, paginado) → historial completo, orden `createdAt desc`
  (FR-013). Usado solo por el backoffice; `apps/web` nunca pide este listado completo.

`select` explícito en ambos casos (H-42): nunca se traen columnas de más.

## `POST /palabra-profetica`

- Guard: `JwtNextAuthGuard` + `RolesGuard` + `@Roles('admin')` (FR-028).
- Body: `CrearPalabraProfeticaDto` — `anio`, `titulo`, `texto`, `youtubeUrl` (todos obligatorios,
  `data-model.md`).
- El service valida `youtubeUrl` y deriva `youtubeVideoId` (`research.md` Decisión 4); si no matchea
  ningún patrón reconocido, `400 YOUTUBE_URL_INVALIDA` (FR-011) — no se guarda nada.
- El registro nuevo se crea con `vigente: false` por default — marcar vigente es un paso propio (ver
  abajo), no un flag de este mismo POST, para que "crear" y "publicar" queden como dos acciones
  distinguibles en el historial (consistente con Acceptance Scenario 1 de la Historia 3: "si además
  lo marca vigente").

## `PATCH /palabra-profetica/:id`

- Guard: igual que `POST`.
- Body: `ActualizarPalabraProfeticaDto` — mismos campos que crear, todos opcionales (edición
  parcial), misma validación de `youtubeUrl` si viene incluida.
- No permite tocar `vigente` desde este endpoint — ver el siguiente.

## `PATCH /palabra-profetica/:id/marcar-vigente`

- Guard: igual que `POST`.
- Sin body.
- Dentro de una transacción de Prisma: pone `vigente: true` en `:id` y `vigente: false` en cualquier
  otro registro que lo tuviera (FR-012, SC-006 — un solo paso, sin acción manual aparte sobre la
  anterior). Si `:id` ya era la vigente, no pasa nada raro (Edge Case del spec): la transacción es
  idempotente, no duplica nada del historial.
- `404 NO_ENCONTRADO` si `:id` no existe.

## Permisos (FR-028/FR-029/FR-030)

- Admin: lee y escribe todo lo de arriba.
- Pastor/Pastora: solo los `GET` (ve el historial completo en modo lectura en el backoffice); los
  tres endpoints de escritura devuelven `403 SIN_PERMISO` si los llama.
- Cualquier otro rol: la ruta de backoffice ni siquiera aparece en su menú (`config/nav.ts`), y el
  acceso directo por URL cae en el mismo `403` de los `GET`/escrituras según corresponda — no hay un
  `GET` "público" adicional distinto del de `apps/web` descripto arriba (ese sí es sin guard).
