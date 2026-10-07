# Contrato: Persona — Mi camino → Vida de Servicio (`apps/web`)

Todos exigen sesión (`JwtNextAuthGuard`) y se recortan por identidad: no hay permiso de rol (research
#15). Errores en Problem Details con `code` de `error-code.ts`; los de campo bajo `VALIDACION` con
`errors: [{ campo, code }]`. Tipos en `packages/shared-types/src/vida-de-servicio.ts`.

## `GET /vida-de-servicio/me` → `EstadoMiVidaDeServicio`

```ts
type EstadoMiVidaDeServicio =
  | { estado: 'no_cumple'; motivo: 'sin_vida_nueva' | 'vida_nueva_en_curso' | 'declaracion_en_revision' }
  | { estado: 'lo_pide_su_tutor' }                                    // menor de 12 (edge case de la spec)
  | { estado: 'puede_pedir'; ediciones: EdicionAbierta[]; anterior?: CierreAnterior }
  | { estado: 'pendiente'; solicitudId: string; edicion: EdicionAbierta | null; creadaEnSuNombre: boolean }
  | { estado: 'en_curso'; inscripcionId: string; edicion: EdicionResumen; semanas: SemanaParaPersona[];
      asistencia: MiAsistencia }
  | { estado: 'completada'; via: 'inscripcion' | 'completitud_manual'; edicion?: EdicionResumen;
      semanas?: SemanaParaPersona[] };

type EdicionAbierta = { grupoId; nombre; sede: string | null /* solo si hay más de una Sede activa */;
  fechaInicio: string; diaLiberacion: 0..6 /* día de la semana de la primera liberación */ };
type CierreAnterior = { tipo: 'rechazada' } | { tipo: 'dada_de_baja' | 'abandono'; edicion: EdicionResumen;
  semanas: SemanaParaPersona[] /* las visibles, FR-034 */ };
type SemanaParaPersona =
  | { numero; fechaLiberacion; estado: 'liberada'; contenidoId; titulo }
  | { numero; fechaLiberacion; estado: 'proxima' }          // fecha futura (con o sin material: no se dice)
  | { numero; fechaLiberacion; estado: 'sin_material' };    // fecha alcanzada, nada cargado
type MiAsistencia = { encuentros: number; presentes: number; faltas: string[] /* fechas */ };
```

`puede_pedir` incluye `anterior` cuando la última Solicitud fue rechazada o la última Inscripción se
cerró por baja/abandono (FR-017, FR-034). Nunca incluye motivos de rechazo ni comentarios de baja.

## `POST /vida-de-servicio/solicitudes/me` `{ grupoId: string | null }` → `201 { solicitudId }`

- `422 VIDA_SERVICIO_PRERREQUISITO_NO_CUMPLIDO` (FR-008).
- `409 SOLICITUD_VIDA_SERVICIO_YA_PENDIENTE` (FR-012, D60).
- `409 VIDA_SERVICIO_EN_CURSO_O_COMPLETADA` (FR-012).
- `422 EDAD_INSUFICIENTE_PARA_PEDIR_SOLO` (ya existe, 004) — menor de 12.
- `VALIDACION` con `{ campo: 'grupoId', code: 'EDICION_NO_DISPONIBLE' }` si el Grupo no existe, no es
  de Vida de Servicio, no está en curso o tiene la inscripción cerrada. `grupoId: null` solo se acepta
  si no hay ninguna edición abierta (`EDICION_REQUERIDA` si hay).

Emite `solicitud_creada`.

## `DELETE /vida-de-servicio/solicitudes/me` → `204`

Retira la `pendiente` (FR-012). `409 SOLICITUD_NO_PENDIENTE` si no hay. Sin evento al Admin (se ve en
la bandeja).

## `GET /vida-de-servicio/me/semanas/:numero` → `ContenidoParaPersona`

```ts
type ContenidoParaPersona = { numero; fechaLiberacion; titulo; texto: string | null;
  archivos: { id; nombre; mimeType; tamanioBytes; textoAlternativo: string | null }[];
  enlaces: { texto; url }[] };
```

Solo si la semana es visible para su Inscripción vigente o la última cerrada (`semanasVisibles`,
FR-021, FR-034). Si no: `404 CONTENIDO_NO_DISPONIBLE` (no se distingue "no existe" de "no podés",
para no filtrar qué hay cargado antes de la fecha).

## `GET /vida-de-servicio/archivos/:archivoId` → binario

Para cualquier sesión. Autoriza si (a) es una semana visible para la Persona (misma función), (b) es
Líder vigente del Grupo, o (c) tiene `grupos.ver`. Si no: `404 CONTENIDO_NO_DISPONIBLE`.
`Content-Type` el guardado, `Content-Disposition: inline; filename*=…`, `Cache-Control: private,
no-store`, `X-Content-Type-Options: nosniff`. Lo usan también el Líder y el backoffice.
