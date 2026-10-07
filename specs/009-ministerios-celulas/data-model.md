# Data Model: Ministerios y Células (postulación)

Nombres alineados con `docs/04-dominio-entidades.md` y el diagrama ER (Principio II). Ninguna fila se
borra físicamente (Principio III). Los CHECK y los índices únicos parciales van en SQL a mano en la
migración (patrón H-140). Todo `select` explícito (H-42).

## Ministerio (`ministerios`)

| Campo | Tipo | Reglas |
|---|---|---|
| `id` | uuid | |
| `nombre` | String | Obligatorio, 1–80 (`MINISTERIO_NOMBRE_MAX`). Único entre no eliminados, normalizado (research #11) — regla del servicio. |
| `descripcion` | String | Obligatoria, 1–600 (`MINISTERIO_DESCRIPCION_MAX`), texto plano. |
| `activo` | Boolean | default `true`. Inactivar/reactivar (D37, D117). |
| `eliminadoEn` | DateTime? | D119. |
| `eliminadoPor` | String? | id lógico de la Persona (sin `@relation`, como Sede). |
| `createdAt` / `updatedAt` | DateTime | |

Relaciones: `celulas Celula[]`, `postulaciones Postulacion[]`.
Índices: `@@index([activo, eliminadoEn])`.

## Célula (`celulas`)

| Campo | Tipo | Reglas |
|---|---|---|
| `id` | uuid | |
| `ministerioId` | FK → Ministerio | Obligatorio, no cambia después de creada. |
| `nombre` | String | 1–80 (`CELULA_NOMBRE_MAX`). Único dentro del Ministerio entre no eliminadas. |
| `activo` | Boolean | default `true`. No se puede reactivar con el Ministerio inactivo (FR-029). |
| `eliminadoEn` / `eliminadoPor` | DateTime? / String? | D119. |
| `createdAt` / `updatedAt` | DateTime | |

Índices: `@@index([ministerioId])`.

**Disponible para postularse** = Célula `activo` y no eliminada, **y** su Ministerio `activo` y no
eliminado.

## Postulación (`postulaciones`)

Forma base de las Solicitudes (D31, docs/04) + campos propios.

| Campo | Tipo | Reglas |
|---|---|---|
| `id` | uuid | |
| `personaId` | String | Referencia lógica a Persona (como `SolicitudDiscipulado`). |
| `ministerioId` | FK → Ministerio | Obligatorio. |
| `celulaId` | FK → Célula? | Opcional; si está, pertenece a `ministerioId` (servicio + CHECK por trigger no: lo garantiza el servicio y un test de integración). |
| `estado` | `EstadoPostulacion` | `pendiente` (default) / `aprobada` / `rechazada` / `inactiva` / `retirada`. |
| `motivacion` | String? | ≤ 500 (`POSTULACION_TEXTO_MAX`). |
| `disponibilidad` | String? | ≤ 500. |
| `creadoPorId` | String? | `null` = la propia Persona (D97). |
| `revisadoPorId` / `revisadaEn` | String? / DateTime? | Al aprobar o rechazar. |
| `motivoRechazo` | String? | ≤ 500, solo en `rechazada`, interno. |
| `retiradaEn` | DateTime? | Solo en `retirada`. |
| `motivoInactivacion` | `MotivoInactivacionPostulacion?` | `cambio_de_ministerio` / `baja`. Solo en `inactiva`. |
| `inactivadaEn` / `inactivadaPorId` | DateTime? / String? | Solo en `inactiva`. |
| `reemplazadaPorId` | String? | Solo en `cambio_de_ministerio`: la Postulación aprobada que la reemplazó. |
| `motivoBaja` | String? | ≤ 500, solo en `baja`, interno. |
| `createdAt` / `updatedAt` | DateTime | `createdAt` es la "fecha" de la forma base. |

Índices: `@@index([personaId])`, `@@index([estado, createdAt])`, `@@index([ministerioId, estado])`,
`@@index([celulaId])`.

SQL a mano:
- `CREATE UNIQUE INDEX postulaciones_una_pendiente ON postulaciones ("personaId") WHERE estado = 'pendiente';` (FR-003)
- `CREATE UNIQUE INDEX postulaciones_una_aprobada ON postulaciones ("personaId") WHERE estado = 'aprobada';` (FR-020)
- `CHECK ((estado = 'inactiva') = ("motivoInactivacion" IS NOT NULL))`
- `CHECK (estado <> 'rechazada' OR "revisadaEn" IS NOT NULL)` y lo mismo para `aprobada`.
- `CHECK ("motivoInactivacion" IS DISTINCT FROM 'cambio_de_ministerio' OR "reemplazadaPorId" IS NOT NULL)`

### Transiciones

```text
           crear (Persona apta / Admin en nombre de)
                 │
                 ▼
            ┌─pendiente─┐
 retirar    │     │     │ rechazar (Admin, motivo opc.)
 (Persona)  ▼     │     ▼
        retirada  │  rechazada
                  │ aprobar (Admin; si tiene otra aprobada → confirmarCambio)
                  ▼
              aprobada ──── aprobar otra (cambio) ───▶ inactiva (cambio_de_ministerio)
                  └──────── dar de baja (Admin) ─────▶ inactiva (baja)
```

Ninguna transición sale de `retirada`, `rechazada` ni `inactiva`: volver a postularse crea una fila
nueva (D29, FR-005).

### Reglas al crear (en este orden, primer fallo gana)

1. Persona activa y apta (`esAptaParaMinisterio`) → si no, `NO_APTA_PARA_MINISTERIO` (409).
2. Ministerio disponible → si no, `MINISTERIO_NO_DISPONIBLE` (409; 404 si no existe o está eliminado).
3. Célula: si viene, pertenece al Ministerio y está disponible → si no, `VALIDACION` con
   `errors: [{ campo: 'celulaId', code: 'CELULA_NO_DISPONIBLE' }]`.
4. Textos ≤ 500 → `VALIDACION` con `TEXTO_DEMASIADO_LARGO` en el campo (reusar el código de largo si
   ya existe en el catálogo; si no, uno nuevo).
5. Ya es miembro de ese Ministerio → `YA_ES_MIEMBRO_DEL_MINISTERIO` (409).
6. Tiene una pendiente → `POSTULACION_YA_PENDIENTE` (409; también la violación del índice).

## Persona (sin columnas nuevas)

- `rol` suma, por `RolesDeEstadoService.otorgarRolDeEstado`, el rol de estado `miembro_ministerio` al
  aprobar (idempotente). `RolDeEstado` en `permisos.ts` pasa a
  `'miembro_registrado' | 'apto_ministerio' | 'miembro_ministerio'` (el segundo lo trae la 008).

## Tipos compartidos (`packages/shared-types/src/ministerios.ts`)

- `EstadoPostulacion`, `MotivoInactivacionPostulacion`.
- Límites: `MINISTERIO_NOMBRE_MAX = 80`, `MINISTERIO_DESCRIPCION_MAX = 600`, `CELULA_NOMBRE_MAX = 80`,
  `POSTULACION_TEXTO_MAX = 500`.
- `esAptaParaMinisterio(roles: readonly string[]): boolean`.
- `MinisterioPublico = { id, nombre, descripcion, celulas: { id, nombre }[] }`.
- `MinisterioCatalogo` (backoffice): `{ id, nombre, descripcion, activo, celulasActivas: number, miembrosActivos: number, postulacionesPendientes: number, tieneDatosRelacionados: boolean }`.
- `CelulaCatalogo`: `{ id, nombre, activo, miembrosActivos, postulacionesPendientes, tieneDatosRelacionados }`.
- `MiembroMinisterio`: `{ postulacionId, persona: PersonaBreve, celula: { id, nombre, activo } | null, desde }`.
- `PostulacionDetalle`: `SolicitudResumen & { ministerio, celula | null, motivacion, disponibilidad, personaEdad, personaContacto: { telefono, email | null }, ministerioActual: { id, nombre } | null, historial: PostulacionHistorial[], motivoRechazo (solo con permiso de aprobar) }`.
- `EstadoMiMinisterio` (lo que ve la Persona, unión discriminada — `contracts/postulaciones-api.md`).
- `TipoSolicitud` (en `discipulado.ts` hoy) se mueve a `solicitudes.ts` como `'discipulado' | 'postulacion'`,
  re-exportado desde el lugar viejo para no romper imports.
