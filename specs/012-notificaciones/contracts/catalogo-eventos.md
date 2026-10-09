# Contrato: catálogo de eventos de aviso (`CATALOGO_AVISOS`)

Vive en `packages/shared-types/src/avisos.ts`. Es la **única** lista de avisos automáticos de la
app (Principio XI): una spec que quiere avisar algo emite uno de estos eventos (contracts/emision.md);
si el que necesita no está, lo agrega acá en su PR, con sus textos y su test (FR-040).

## Forma

```ts
type Destinatario =
  | { tipo: 'persona'; personaId: string }              // la interesada
  | { tipo: 'discipulador'; personaId: string }
  | { tipo: 'admin' }                                    // sin aviso en esta tanda (FR-015)
  | { tipo: 'grupo'; grupoId: string }                   // Inscripciones `activa` del Grupo
  | { tipo: 'ministerio'; ministerioId: string }         // miembros vigentes (def. de la 009)
  | { tipo: 'evento_confirmados'; eventoId: string }     // Inscripciones a Evento `confirmada`
  | { tipo: 'todas' }                                    // Personas activas
  | { tipo: 'todas_sin_inscripcion'; eventoId: string }; // activas sin inscripción vigente al Evento

interface EntradaCatalogo<N extends NombreEventoAviso> {
  spec: '001' | '004' | '008' | '009' | '010' | '011' | 'flujo-12';
  destinatario: Destinatario['tipo'];      // el único permitido para este evento
  disparador: Disparador | null;          // null ⇔ destinatario 'admin'
  prioridad: 'normal' | 'importante';
  entidad: { tipo: string; id: (d: DatosDe<N>) => string };
  destino: (d: DatosDe<N>) => string;     // ruta de la web app, sin dominio
  clave: (d: DatosDe<N>) => string | null; // idempotencia; null = sin clave
}
```

`alcance` / `alcance_id` de la Notificación se derivan del destinatario: `persona` y
`discipulador` → `persona`; `grupo` → `grupo`; `ministerio` → `ministerio`; `evento_confirmados`
→ `evento`; `todas` y `todas_sin_inscripcion` → `todos` (este último con el `eventoId` en `params`,
`docs/04`: "recordatorio_inscripcion → alcance todos").

## Textos

- **Web** (`apps/web/src/messages/es.json`, namespace `avisos.eventos.<nombre>`): `titulo` (≤ 60
  caracteres, sin datos sensibles) y `detalle` (una oración). Pueden usar los `datos` no personales
  (`{evento}`, `{semana}`).
- **Mail** (`apps/api/src/email/mensajes/es.json`, `avisos.<nombre>`), solo si es importante:
  `asunto` (genérico, nunca el tipo de pedido sensible ni el resultado), `titulo`, `parrafos[]`,
  `boton`.
- Regla de privacidad (SC-006, test sobre todo el catálogo): ningún texto incluye nombres de
  Personas ni motivos; el **asunto** de ningún mail automático dice "bautismo", "rechaz", "baja" ni
  el resultado de un pedido.

## Eventos

`*` = clave de idempotencia. "Mi camino" = `/mi-camino`. Las rutas de 008–011 son las previstas; si
la spec dueña define otra, actualiza `destino` en su PR.

### 004 — Vida Nueva / Discipulado (construida; la conexión es tarea de esta spec)

| Nombre | Destinatario | Prioridad | Disparador | Entidad | Destino | Datos | Título (es) |
|---|---|---|---|---|---|---|---|
| `discipulado.propuesta_nueva` | discipulador | normal | `proceso_actualizado` | `propuesta_discipulado` | `/mis-discipulados` (spec 006; hasta entonces `/mi-camino`) | `propuestaId`, `solicitudId?`, `grupoId?` | Tenés un discipulado para aceptar |
| `discipulado.propuesta_aceptada` | persona | **importante** | `solicitud_actualizada` | `solicitud_discipulado` | Mi camino | `solicitudId`, `grupoId`, `discipuladorId` | Ya tenés Discipulador |
| `discipulado.solicitud_rechazada` | persona | **importante** | `solicitud_actualizada` | `solicitud_discipulado` | Mi camino | `solicitudId` | Hay novedades sobre tu pedido de Vida Nueva |
| `discipulado.finalizacion_confirmada` | persona | normal | `proceso_actualizado` | `grupo` | Mi camino | `grupoId`, `inscripcionId` | ¡Terminaste Vida Nueva! |
| `discipulado.baja_confirmada` | persona | normal | `proceso_actualizado` | `grupo` | Mi camino | `grupoId`, `inscripcionId` | Hay novedades sobre tu discipulado |
| `discipulado.propuesta_declinada` | admin | — | — | `propuesta_discipulado` | — | `propuestaId`, `solicitudId?`, `grupoId?` | (sin aviso) |
| `discipulado.propuesta_retirada` | admin | — | — | `propuesta_discipulado` | — | `propuestaId`, `retiradaPor` | (sin aviso) |
| `discipulado.reasignacion_retirada` (D219) | discipulador | normal | `proceso_actualizado` | `propuesta_discipulado` | `/mis-discipulados` | `propuestaId`, `grupoId` | Ya no hace falta que respondas la propuesta |
| `discipulado.propuesta_nueva_retirada` (D219) | discipulador | normal | `proceso_actualizado` | `propuesta_discipulado` | `/mis-discipulados` | `propuestaId`, `solicitudId` | Ya no hace falta que respondas la propuesta |
| `discipulado.finalizacion_propuesta` | admin | — | — | `grupo` | — | `grupoId` | (sin aviso) |
| `discipulado.baja_propuesta` | admin | — | — | `grupo` | — | `grupoId`, `inscripcionId` | (sin aviso) |

Asunto del mail de los dos importantes: "Hay novedades sobre tu pedido".

### Personas — activación de cuenta (001 construida; Flujo 12 sin spec asignada)

| Nombre | Destinatario | Prioridad | Disparador | Entidad | Destino | Datos | Título |
|---|---|---|---|---|---|---|---|
| `persona.cuenta_activada` | persona | **importante** | `solicitud_actualizada` | `persona` | Mi camino | `personaId` | Ya podés usar la app de la iglesia |

Lo emite `PATCH /personas/:id/activar` (Flujo 7, existente — tarea de esta spec) y el alta de una
Persona adulta con email por el Admin (Flujo 12, D145 — tarea de la spec que lo construya). Clave
`*persona.cuenta_activada:<personaId>`. Asunto: "Ya podés entrar a la app de la iglesia". El mail
explica que puede entrar con Google o con un código por email (spec 007).

### 008 — Vida de Servicio

| Nombre | Destinatario | Prioridad | Disparador | Entidad | Destino | Datos | Título |
|---|---|---|---|---|---|---|---|
| `vida_servicio.inscripcion_aprobada` | persona | **importante** | `solicitud_actualizada` | `solicitud_vida_servicio` (nombre de la 008) | Mi camino | `solicitudId`, `grupoId` | Ya estás en Vida de Servicio |
| `vida_servicio.inscripcion_rechazada` | persona | **importante** | `solicitud_actualizada` | ídem | Mi camino | `solicitudId` | Hay novedades sobre tu pedido de Vida de Servicio |
| `vida_servicio.contenido_liberado` | grupo | normal | `contenido_liberado` | `cronograma_item` | ruta del contenido de la 008 (provisorio: Mi camino) | `grupoId`, `cronogramaItemId`, `semana` | Ya está el material de la semana {semana} |
| `vida_servicio.inscripcion_dada_de_baja` | persona | normal | `proceso_actualizado` | `inscripcion` | Mi camino | `grupoId`, `inscripcionId` | Hay novedades sobre Vida de Servicio |
| `vida_servicio.completada` | persona | normal | `proceso_actualizado` | `inscripcion` | Mi camino | `grupoId`, `inscripcionId` | ¡Terminaste Vida de Servicio! Ya podés sumarte a un Ministerio |

`contenido_liberado`: clave `*vida_servicio.contenido_liberado:<cronogramaItemId>` (se libera una
sola vez aunque se cargue antes o después de la fecha — Flujo 4 paso 8). La 008 lo emite desde
**dos** lugares: al cargar contenido de una semana ya vencida, y desde su tarea programada diaria
(en `apps/api/src/tareas-programadas/`, FR-038) para las semanas cuya fecha llega con el contenido ya
cargado. `completada`: uno por Inscripción que pasa a `completada` al confirmarse la finalización
(Flujo 4 paso 16). Asunto de los importantes: "Hay novedades sobre tu pedido".

### 009 — Ministerios

| Nombre | Destinatario | Prioridad | Disparador | Entidad | Destino | Datos | Título |
|---|---|---|---|---|---|---|---|
| `ministerio.postulacion_aprobada` | persona | **importante** | `solicitud_actualizada` | `postulacion` | Mi camino | `postulacionId`, `ministerioId`, `ministerio` (nombre) | Ya sos parte de {ministerio} |
| `ministerio.postulacion_rechazada` | persona | **importante** | `solicitud_actualizada` | `postulacion` | Mi camino | `postulacionId` | Hay novedades sobre tu postulación |
| `ministerio.apto_habilitado` | persona | **importante** | `solicitud_actualizada` | `persona` | `/ministerios` | `personaId` | Ya podés postularte a un Ministerio |
| `ministerio.interes_registrado` | admin | — | — | `persona` | — | `personaId` | (sin aviso) |

`apto_habilitado`: el Admin resuelve el "Quiero servir en un Ministerio" de Flujo 5 pasos 1–3. Si la
009 modela ese interés como Solicitud, su entidad es esa Solicitud. Alcance `ministerio` para avisos
**manuales** usa la definición de "miembro vigente" de la 009 (Postulación `aprobada`, no
`inactiva`).

### 010 — Bautismo (D147)

| Nombre | Destinatario | Prioridad | Disparador | Entidad | Destino | Datos | Título |
|---|---|---|---|---|---|---|---|
| `bautismo.solicitud_aceptada` | persona | **importante** | `solicitud_actualizada` | `solicitud_bautismo` | Mi camino | `solicitudId` | Recibimos tu pedido: te avisamos la próxima fecha |
| `bautismo.solicitud_rechazada` | persona | **importante** | `solicitud_actualizada` | `solicitud_bautismo` | Mi camino | `solicitudId` | Hay novedades sobre tu pedido |
| `bautismo.fecha_asignada` | persona | **importante** | `solicitud_actualizada` | `evento` | `/mis-eventos` | `solicitudId`, `eventoId`, `evento`, `fecha` | Ya tenés fecha: {fecha} |

Asunto de los tres: "Hay novedades sobre tu pedido" (el asunto **no** dice "bautismo", `docs/13`
§5). `fecha_asignada`: clave `*bautismo.fecha_asignada:<solicitudId>:<eventoId>`.

### 011 — Eventos

| Nombre | Destinatario | Prioridad | Disparador | Entidad | Destino | Datos | Título |
|---|---|---|---|---|---|---|---|
| `evento.inscripcion_confirmada` | persona | **importante** | `solicitud_actualizada` | `inscripcion_evento` | `/mis-eventos` | `inscripcionId`, `eventoId`, `evento` | Te confirmamos el lugar en {evento} |
| `evento.inscripcion_rechazada` | persona | **importante** | `solicitud_actualizada` | `inscripcion_evento` | `/mis-eventos` | `inscripcionId`, `eventoId`, `evento` | Hay novedades sobre {evento} |
| `evento.inscripcion_cancelada_por_admin` | persona | **importante** | `solicitud_actualizada` | `inscripcion_evento` | `/mis-eventos` | `inscripcionId`, `eventoId`, `evento` | Hay novedades sobre {evento} |
| `evento.lista_espera_promovida` | persona | **importante** | `solicitud_actualizada` | `inscripcion_evento` | `/mis-eventos` | `inscripcionId`, `eventoId`, `evento`, `estadoNuevo` (`confirmada`/`pendiente`) | Conseguiste lugar en {evento} |
| `evento.pago_verificado` | persona | **importante** | `solicitud_actualizada` | `pago` | `/mis-eventos` | `pagoId`, `inscripcionId`, `eventoId`, `evento` | Recibimos tu pago para {evento} |
| `evento.pago_rechazado` | persona | **importante** | `solicitud_actualizada` | `pago` | `/mis-eventos` | `pagoId`, `inscripcionId`, `eventoId`, `evento` | Hay novedades sobre tu pago para {evento} |
| `evento.proximo` | evento_confirmados | normal | `evento_proximo` | `evento` | `/mis-eventos` | `eventoId`, `evento` | Mañana es {evento} |
| `evento.recordatorio_inscripcion` | todas_sin_inscripcion | normal | `recordatorio_inscripcion` | `evento` | `/eventos/{slug}` | `eventoId`, `evento`, `slug`, `dias` | Faltan {dias} días para {evento}: ¿te anotás? |

- `inscripcion_confirmada` es solo la que confirma el **Admin** (pendiente → confirmada); la que
  queda confirmada sola al anotarse no avisa (la Persona lo acaba de ver). `inscripcion_cancelada_por_admin`
  solo cuando cancela el Admin (D69); la que cancela la propia Persona no avisa.
- `pago_rechazado`: D148 — el lugar se libera; si eso promueve a alguien de la lista de espera, esa
  otra Persona recibe su propio `lista_espera_promovida`.
- `proximo` y `recordatorio_inscripcion` los emite la **tarea programada de esta spec**
  (research #7, #8), con claves `*evento.proximo:<eventoId>` y
  `*evento.recordatorio_inscripcion:<eventoId>`.
- Asunto de los importantes: "Hay novedades sobre tu inscripción" (pagos: "Hay novedades sobre tu
  pago").
