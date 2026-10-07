# Data Model: Backoffice del Admin (013)

Cambios a `apps/api/prisma/schema.prisma` y migraciones de esta spec. Todo lo demás (Persona, RelacionFamiliar,
Grupo, Inscripcion, Liderazgo, CambioDeRol, Sede, SolicitudDiscipulado) se **lee** sin cambios de forma.

## 1. `ComentarioApp` (nuevo, D102)

```prisma
enum TipoComentario {
  problema
  sugerencia
}

model ComentarioApp {
  id               String         @id @default(uuid())
  tipo             TipoComentario
  texto            String         // 1..COMENTARIO_TEXTO_MAX (2000), validado en DTO y CHECK en SQL
  aceptaContacto   Boolean        @default(false)
  // Solo sin sesión y con aceptaContacto: al menos uno de los dos (CHECK en SQL).
  contactoEmail    String?
  contactoTelefono String?        // formato de TELEFONO_REGEX (shared-types)
  paginaOrigen     String         // path relativo, sin query string (puede llevar datos), ≤ 300
  navegador        String?        // "Chrome 141 · Android", ≤ 80 (research #10)
  ultimoRequestId  String?        // ≤ 64
  app              AppOrigen      // web | backoffice
  origenHuella     String         // HMAC de la IP (007); nunca la IP

  personaId        String?        // null = sin sesión
  persona          Persona?       @relation("ComentariosDePersona", fields: [personaId], references: [id])

  revisadoEn       DateTime?
  revisadoPorId    String?
  revisadoPor      Persona?       @relation("ComentariosRevisados", fields: [revisadoPorId], references: [id])

  createdAt        DateTime       @default(now())

  @@index([revisadoEn, createdAt])   // listado "Sin revisar", más recientes primero
  @@index([origenHuella, createdAt]) // límite por origen (FR-043)
  @@index([personaId, createdAt])    // límite con sesión + FK
  @@index([revisadoPorId])           // FK
  @@map("comentarios_app")
}

enum AppOrigen {
  web
  backoffice
}
```

Reglas:
- Sin borrado (Principio III): no hay `DELETE` ni `activo`; un comentario no se "da de baja".
- `revisadoEn`/`revisadoPorId` van juntos (CHECK `(revisadoEn IS NULL) = (revisadoPorId IS NULL)`). Deshacer los pone
  en `null` a los dos.
- Con `personaId`, `contactoEmail`/`contactoTelefono` deben ser `null` (se usan los del perfil): CHECK en SQL.
- Si `AppOrigen` ya existe con otro nombre en la 007 (ej. para el origen del pedido de código), se reusa.

## 2. `Curso` (se amplía, D119)

```prisma
model Curso {
  // … campos existentes (nombre, categoria, tipo, modalidad, activo, grupos, createdAt, updatedAt)
  descripcion   String?   // ≤ CURSO_DESCRIPCION_MAX (500)
  eliminadoEn   DateTime?
  eliminadoPor  String?   // Persona.id del Admin (referencia lógica, igual que Sede)
}
```

- `@@unique([categoria, tipo])` se mantiene: un Curso eliminado sigue ocupando su combinación; el alta de una
  combinación eliminada se ofrece como **restaurar** (FR-056).
- La 008 agrega a `CategoriaCurso`/`ModalidadCurso` sus valores y `prerequisitoCategoria`; esta spec no los toca.

## 3. Vista `solicitudes_bandeja` (nueva, research #1)

Archivo fuente: `apps/api/prisma/vistas/solicitudes_bandeja.sql` (lo copia cada migración que la recrea).

| Columna | Tipo | Discipulado (004) |
|---|---|---|
| `tipo` | text | `'discipulado'` |
| `id` | text | `s.id` |
| `personaId` | text | `s."personaId"` |
| `estado` | text | `s.estado::text` |
| `abierta` | boolean | `s.estado IN ('pendiente','propuesta')` |
| `createdAt` | timestamptz | `s."createdAt"` |
| `esperaDesde` | timestamptz | `COALESCE(pr."propuestaEn", s."createdAt")` (propuesta vigente) |
| `creadoPorId` | text null | `s."creadoPorId"` |
| `revisadoPorId` | text null | `s."revisadoPorId"` |
| `revisadaEn` | timestamptz null | `s."revisadaEn"` |

Ramas que suma cada spec (mismas columnas; los nombres de tabla los decide cada una):

| Tipo (`TipoSolicitud`) | Spec | `abierta` cuando |
|---|---|---|
| `vida_de_servicio` | 008 | `pendiente` |
| `postulacion` | 009 | `pendiente` |
| `bautismo` | 010 | `pendiente` |
| `inscripcion_evento` | 011 | `pendiente` |
| `pago` | 011 | `pendiente_verificacion` |

Índices: la vista usa los de cada tabla base. La 004 ya tiene `@@index([estado, createdAt])` en
`solicitudes_discipulado`; cada spec de tipo debe tener el índice equivalente en su tabla (se pide en "Cambios que
esta spec pide a otras specs" del plan).

## 4. Índice de expresión para cumpleaños

```sql
CREATE INDEX "personas_mes_nacimiento_idx" ON "personas" ((EXTRACT(MONTH FROM "fechaNacimiento")));
```

Comentario en `schema.prisma` junto a `Persona.fechaNacimiento` (Prisma no modela índices de expresión; la migración
se escribe a mano con `--create-only`).

## 5. Tipos compartidos nuevos (`packages/shared-types`)

- `bandeja.ts`: `TipoSolicitud` (movido desde `discipulado.ts`, que lo reexporta para no romper imports),
  `TIPOS_SOLICITUD`, `ESTADOS_POR_TIPO`, `ESTADOS_ABIERTOS`, `esAbierta(tipo, estado)`, `FiltroAbiertas =
  'abiertas' | 'resueltas' | 'todas'`, `OrdenBandeja = 'espera' | 'fecha' | 'persona'`, `SolicitudBandeja` (forma
  base + `extra` opcional por tipo, ej. `propuestaVigente` de Discipulado), `ConteoAbiertas = Partial<Record<
  TipoSolicitud, number>>`, `BANDEJA_PAGINA = 20`.
- `perfil-persona.ts`: `PerfilPersona`, `RelacionFamiliarVista`, `GrupoEnPerfil`, `RelacionDesde`,
  `relacionDesde(tipo, lado)`, `INVERSO_RELACION` (movido desde la API), `iniciales(nombre, apellido)`.
- `metricas.ts`: `Metricas = { personasActivas; porTiempoCongregacion: {valor, cantidad}[]; porSede: {sedeId,
  nombre, activa, cantidad}[] }`, `ORDEN_TIEMPO_CONGREGACION`.
- `cumpleanos.ts`: `Cumpleanero`, `proximoCumpleanos(fechaNacimiento, hoy)`, `esCumpleanosEn(fecha, mes, dia,
  anio)`, `CUMPLEANOS_DIAS_SEMANA = 7`, `CUMPLEANOS_PAGINA = 50`.
- `comentario.ts`: `TipoComentario`, `ComentarioNuevo`, `ComentarioResumen`, `ComentarioDetalle`,
  `COMENTARIO_TEXTO_MAX = 2000`, `COMENTARIOS_POR_HORA_SIN_SESION = 5`, `COMENTARIOS_POR_HORA_CON_SESION = 20`,
  `resumirNavegador(userAgent)` (si no depende del DOM; si sí, va a `packages/ui`).
- `curso.ts`: `CursoListado`, `CursoDetalle`, `CURSOS_RECONOCIDOS`, `CURSO_DESCRIPCION_MAX = 500`.
- `error-code.ts`: `CURSO_INACTIVO`, `CURSO_TIENE_GRUPOS`, `CURSO_NO_RECONOCIDO`, `CURSO_YA_EXISTE`,
  `CONTACTO_REQUERIDO`; `DEMASIADOS_PEDIDOS` lo trae la 007.
- `permisos.ts`: `comentarios.ver` [admin, pastor], `comentarios.gestionar` [admin], `cursos.gestionar` [admin],
  `cursos.papelera.ver` [admin], `personas.editar` [admin]; `cursos.ver` no hace falta (usa `catalogos.ver`).

## 6. Transiciones de estado

- **Comentario**: `sin revisar → revisado` (Admin) y `revisado → sin revisar` (deshacer). Idempotente.
- **Curso**: `activo ↔ inactivo` (Admin; reforzada si tiene Grupos `en_curso`); `→ eliminado` solo sin Grupos;
  `eliminado → restaurado` desde la papelera (vuelve con el `activo` que tenía).
