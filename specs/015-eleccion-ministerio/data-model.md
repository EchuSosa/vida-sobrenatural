# Data Model — spec 015

## Cambios

### `postulaciones` (entrega 1, D241)

- Se borra el índice `postulaciones_una_aprobada` (una aprobada fuera del carril en paralelo).
- Queda `postulaciones_una_aprobada_en_paralelo` (D217).
- Nuevo: `postulaciones_aprobada_por_ministerio` — único `(personaId, ministerioId) WHERE estado =
  'aprobada'`.
- El máximo de 2 fuera del carril en paralelo lo garantiza el servicio con la Persona bloqueada
  (`bloquearPersona`), que es el mismo candado que usan todas las aprobaciones.

### `grupos` (entrega 2)

- `eleccionAbierta Boolean @default(false)` — solo tiene sentido en una edición de Vida de Servicio
  (lo valida el servicio, como `inscripcionAbierta`).

## Nuevas (entrega 2)

### `EleccionMinisterio` → `elecciones_ministerio`

| Campo | Tipo | Notas |
|---|---|---|
| id | uuid | |
| inscripcionId | uuid, único | La Inscripción de Vida de Servicio |
| personaId | uuid | Para consultar sin pasar por la Inscripción |
| grupoId | uuid | La edición |
| estado | `EstadoEleccionMinisterio` | `borrador`, `charla_hecha`, `resuelta`, `cancelada` |
| comentario | text? | De la persona, ≤ 500 |
| notas | text? | De la charla, ≤ 2000. **Privadas** (D240) |
| notasPorId / notasEn | uuid? / timestamp? | Último que escribió las notas |
| charlaPorId / charlaEn | uuid? / timestamp? | Quién marcó "Charla hecha" |
| cargadaPorId | uuid? | Si la cargó el líder por la persona (D97) |
| editadaPorId | uuid? | Último que cambió las opciones |
| createdAt / updatedAt | timestamp | `updatedAt` sirve de versión optimista |

CHECKs: `estado = 'charla_hecha' → charlaEn IS NOT NULL`; longitudes.

### `OpcionEleccionMinisterio` → `opciones_eleccion_ministerio`

| Campo | Tipo | Notas |
|---|---|---|
| id | uuid | |
| eleccionId | uuid | |
| ministerioId | uuid | |
| celulaId | uuid | El área (un área por Ministerio) |
| enParalelo | bool | Copia de `Celula.ofreceRolDiscipulador` (D217) |
| resultado | `ResultadoOpcionEleccion` | `pendiente`, `confirmada`, `descartada` |
| postulacionId | uuid? | La membresía creada al confirmar |
| motivoDescarte | text? | Solo backoffice, ≤ 500 |
| resueltaPorId / resueltaEn | uuid? / timestamp? | |

Únicos: `(eleccionId, ministerioId)`. El máximo de 2 no en paralelo + 1 en paralelo lo valida
`validarEleccionMinisterio`.

## Nuevas (entrega 3)

### `OpcionDeclaracionMinisterio` → `opciones_declaracion_ministerio`

El mismo shape que `OpcionEleccionMinisterio`, pero colgado de `DeclaracionHistorial` (etapa
`ministerio`). `DeclaracionHistorial.desdeAnio Int?`.
