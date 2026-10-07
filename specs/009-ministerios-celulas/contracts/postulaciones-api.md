# Contrato: Postulaciones (Historias 1, 2, 3 y 5)

Módulo `apps/api/src/ministerio/` (servicio `PostulacionService`). Mismas convenciones que
`ministerios-api.md`.

## La Persona (sesión con `estado = activa`, sin permiso del catálogo — pantallas `mi-*`, D134)

### `GET /ministerios/me` — estado de la card (FR-011)

`EstadoMiMinisterio`, unión discriminada:

```ts
type Membresia = { postulacionId; ministerio: { id; nombre; activo }; celula: { id; nombre; activo } | null; desde: string };
type PendienteVista = { postulacionId; ministerio: { id; nombre }; celula: { id; nombre } | null; createdAt: string };
type UltimoDesenlace =
  | { tipo: 'rechazada'; ministerio: { nombre }; en: string }
  | { tipo: 'retirada'; ministerio: { nombre }; en: string }
  | { tipo: 'baja'; ministerio: { nombre }; en: string };

type EstadoMiMinisterio =
  | { estado: 'no_apta' }
  | { estado: 'puede_postularse'; ultimo?: UltimoDesenlace }
  | { estado: 'pendiente'; pendiente: PendienteVista }
  | { estado: 'miembro'; membresia: Membresia; pendiente: PendienteVista | null };
```

Precedencia: `aprobada` → `miembro` (con la `pendiente` a otro, si hay); si no, `pendiente` → `pendiente`;
si no, apta → `puede_postularse` con el desenlace más reciente (rechazada, retirada o inactiva por
`baja`; una inactiva por `cambio_de_ministerio` no es un desenlace que mostrar); si no, `no_apta`.
Nunca incluye `motivoRechazo` ni `motivoBaja` (FR-014). Incluye Postulaciones creadas en su nombre.

### `GET /ministerios/me/:ministerioId` — detalle para la app (FR-010)

- **200:** `MinisterioPublico & { situacion: 'puede_postularse' | 'ya_es_miembro' | 'tiene_pendiente' | 'no_apta', pendienteA?: { nombre } }`.
- 404 si no está disponible (inactivo o eliminado): la lista de la app no lo ofrece.

### `POST /ministerios/:ministerioId/postulaciones/me` — postularse (FR-001 a FR-008)

- **Cuerpo:** `{ celulaId?: string | null, motivacion?: string, disponibilidad?: string }` (vacíos → null).
- Reglas en el orden de `data-model.md`.
- **201:** `EstadoMiMinisterio` actualizado (la card se refresca sin otra ida).
- **409:** `NO_APTA_PARA_MINISTERIO`, `MINISTERIO_NO_DISPONIBLE`, `YA_ES_MIEMBRO_DEL_MINISTERIO`,
  `POSTULACION_YA_PENDIENTE` (incluida la violación del índice `postulaciones_una_pendiente`).
- **400 `VALIDACION`:** `celulaId` → `CELULA_NO_DISPONIBLE`; `motivacion`/`disponibilidad` → largo.
- Emite `postulacion_creada`.

### `POST /postulaciones/me/:id/retirar` — retirar (FR-006)

- Exige que sea suya y `pendiente` → si no, 409 `POSTULACION_NO_PENDIENTE` (404 si no es suya — no se
  revela que existe).
- **200:** `EstadoMiMinisterio`. Emite `postulacion_retirada`.

## El Admin

### Bandeja: `GET /solicitudes` (se mueve a `apps/api/src/bandeja/`, research #7)

- Mismos parámetros que hoy (`estado`, `orden`, `dir`, `skip`, `take`, `buscar`) más `tipo` (lista
  separada por comas de `TipoSolicitud`; por defecto todos).
- `estado` se traduce por fuente: el filtro "abiertas" de la bandeja = discipulado `pendiente|propuesta`
  + postulación `pendiente`; "resueltas" = discipulado `aprobada|rechazada|retirada` + postulación
  `aprobada|rechazada|retirada|inactiva`. Cada fuente declara su traducción.
- **200:** `Pagina<SolicitudResumen>` con `tipo`. Para `postulacion`, `propuestaVigente = null` y suma
  `resumenTipo: { ministerio: string, celula: string | null }` (opcional en el tipo base, nulo para
  discipulado) para la columna "Detalle".
- `solicitudes.ver`.

### `GET /postulaciones/:id` — detalle (FR-016)

- `solicitudes.ver`. **200:** `PostulacionDetalle`. `motivoRechazo` y `motivoBaja` del historial solo si la
  sesión tiene `solicitudes.aprobar` (el Pastor no los ve, igual que los motivos de declinación en la 004).

### `POST /postulaciones/:id/aprobar` — aprobar (FR-017, FR-018, FR-020 a FR-022)

- `solicitudes.aprobar`. **Cuerpo:** `{ confirmarCambio?: boolean }`.
- **Transacción:** bloquea la fila de la Persona (`FOR UPDATE`); relee la Postulación (debe seguir
  `pendiente`, si no 409 `POSTULACION_NO_PENDIENTE` con el estado actual); verifica Ministerio y Célula
  disponibles (si no, 409 `MINISTERIO_NO_DISPONIBLE` / `CELULA_NO_DISPONIBLE`); busca otra `aprobada`:
  - si hay y `confirmarCambio !== true` → 409 `POSTULACION_REQUIERE_CONFIRMAR_CAMBIO` con
    `ministerioActual: { id, nombre }` en extensiones;
  - si hay y confirma → la anterior a `inactiva` (`cambio_de_ministerio`, `reemplazadaPorId`).
  Luego la nueva a `aprobada` (`revisadoPorId`, `revisadaEn`) y `otorgarRolDeEstado(personaId,
  'miembro_ministerio', tx)`. Violación de `postulaciones_una_aprobada` → 409 `POSTULACION_NO_PENDIENTE`
  (carrera perdida), nunca 500.
- **200:** `PostulacionDetalle`. Emite `postulacion_aprobada` (y `postulacion_inactivada_por_cambio`
  dentro de los mismos datos, ver `eventos.md`).

### `POST /postulaciones/:id/rechazar` — rechazar (FR-019)

- `solicitudes.aprobar`. **Cuerpo:** `{ motivo?: string ≤ 500 }`. Exige `pendiente`.
- **200:** `PostulacionDetalle`. Emite `postulacion_rechazada`.

### `POST /postulaciones` — en nombre de otra Persona (FR-024)

- `postulaciones.crear_en_nombre`. **Cuerpo:** `{ personaId, ministerioId, celulaId?, motivacion?, disponibilidad? }`.
- Mismas reglas que la de la Persona; `creadoPorId` = la sesión. **201:** `PostulacionDetalle`.
- Buscar la Persona reusa `GET /personas/buscar` (`personas.buscar`).

## Códigos nuevos

`NO_APTA_PARA_MINISTERIO`, `YA_ES_MIEMBRO_DEL_MINISTERIO`, `POSTULACION_YA_PENDIENTE`,
`POSTULACION_NO_PENDIENTE`, `POSTULACION_REQUIERE_CONFIRMAR_CAMBIO` (más los de `ministerios-api.md`).
Cada uno con su traducción en `errors` de los dos `es.json`, diciendo qué hacer.
