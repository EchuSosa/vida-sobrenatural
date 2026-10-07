# Contrato: API de Bautismo

Módulo nuevo `apps/api/src/bautismo/`. Errores con Problem Details y un `code` de
`packages/shared-types/src/error-code.ts`; los de campo bajo `VALIDACION` con
`errors: [{ campo, code }]` (H-50). Permisos con `@RequierePermiso` contra `CATALOGO_PERMISOS`
(D132). Toda transición: `SELECT … FOR UPDATE`, chequeo de estado adentro de la transacción
(research #10), y `emitirEventoBautismo()` **después** del commit (`contracts/eventos-bautismo.md`).

## Códigos nuevos (`error-code.ts`)

| Código | HTTP | Cuándo | FR |
|---|---|---|---|
| `BAUTISMO_NO_HABILITADO` | 409 | Pedido propio sin Vida Nueva en curso/completada ni habilitación. | FR-002 |
| `EDAD_INSUFICIENTE_PARA_PEDIR_BAUTISMO_SOLO` | 409 | Pedido propio de menor de 12. | FR-003 |
| `SOLICITUD_BAUTISMO_YA_ABIERTA` | 409 | Ya hay una `pendiente`/`aprobada` (incluye la carrera del índice). | FR-004 |
| `PERSONA_YA_BAUTIZADA` | 409 | `estaBautizada()` es verdadero. | FR-005 |
| `SOLICITUD_BAUTISMO_YA_CAMBIO` | 409 | El estado no es el esperado por la transición. | FR-010 |
| `EVENTO_NO_ES_DE_BAUTISMO` | 409 | El Evento no tiene el discriminador de bautismo. | FR-012 |
| `EVENTO_NO_DISPONIBLE_PARA_ASIGNAR` | 409 | Evento inactivo o ya pasado. | FR-012 |
| `EVENTO_TODAVIA_NO_OCURRIO` | 409 | Confirmar un Evento futuro. | FR-028 |

De campo (bajo `VALIDACION`): `COMENTARIO_DEMASIADO_LARGO`, `MOTIVO_DEMASIADO_LARGO` (ya existe en
la 004, se reutiliza), `SOLICITUD_NO_ASIGNADA_A_ESTE_EVENTO`. Reutilizados: `NO_ENCONTRADO`,
`VALIDACION`.

## La Persona (sesión `activa`, sin permiso de catálogo)

### `GET /bautismo/me` → `EstadoCardBautismo`

Calcula los hechos (`vidaNuevaDe`, habilitación, edad con `calcularEdad()`, Solicitud abierta y
último desenlace, `estaBautizada`, Evento asignado) y devuelve `estadoCardBautismo(hechos)`. Nunca
incluye `motivoRechazo`. Incluye Solicitudes creadas en su nombre.

### `POST /bautismo/solicitudes/me` — pedir (FR-001 a FR-005)

- Cuerpo: `{ comentario?: string }`.
- 201: `EstadoCardBautismo` (`en_revision`).
- 409: `BAUTISMO_NO_HABILITADO`, `EDAD_INSUFICIENTE_PARA_PEDIR_BAUTISMO_SOLO`,
  `SOLICITUD_BAUTISMO_YA_ABIERTA`, `PERSONA_YA_BAUTIZADA` — el mismo `motivoNoPuedePedir()` que usa
  `GET /bautismo/me`.
- Sin evento de aviso (FR-025).

### `POST /bautismo/solicitudes/me/retirar` (FR-020)

- Exige `pendiente`, o `aprobada` sin Evento o con un Evento **futuro**; con un Evento ya pasado →
  409 `SOLICITUD_BAUTISMO_YA_CAMBIO` (lo resuelve el Admin al confirmar, FR-027). Si tenía
  inscripción: la cancela y pone la FK en `null`. → `retirada`.
- 200: `EstadoCardBautismo` (`puede_pedir { ultimo: 'retirada' }` o `no_habilitada`). Sin aviso.

### `POST /bautismo/solicitudes/me/no-puedo` (FR-020a)

- Exige `aprobada` con inscripción a un Evento futuro. Cancela la inscripción, FK → `null`.
- 200: `esperando_fecha`. Sin aviso a la Persona.

## El Admin y el Pastor (backoffice)

### `GET /solicitudes` (existente, ampliado — research #4)

- Lee la vista `bandeja_solicitudes`. `tipo` acepta `discipulado` | `bautismo` (ausente = todos).
  `estado` acepta los valores de los dos tipos. El filtro `abiertas` (default) es lo que espera una
  decisión: `pendiente` y `propuesta` de Discipulado y `pendiente` de Bautismo. Las de Bautismo
  `aprobada` sin fecha se trabajan desde el Evento ("Esperando fecha") y tienen su propio filtro en
  la bandeja, `esperando_fecha` (= `tipo=bautismo`, `estado=aprobada`, sin inscripción).
- `SolicitudResumen` suma `tipo: 'bautismo'` y, para ese tipo, `eventoAsignado: { id, nombre,
  fecha } | null`. Permiso `solicitudes.ver`.

### `GET /bautismo/solicitudes/:id` — detalle (FR-007)

- Permiso `solicitudes.ver`. → `SolicitudBautismoDetalle`: forma base + `comentario`,
  `motivoRechazo`, `vidaNueva: { estado: 'en_curso' | 'completada' | 'ninguna', desde?: string }`,
  `habilitacion: { en, por } | null`, `evento: EventoDeBautismoResumen | null`, `realizadaEn`.

### `POST /bautismo/solicitudes/:id/aceptar` (FR-008)

- `solicitudes.aprobar`. Exige `pendiente`. → `aprobada`, `revisadoPorId`, `revisadaEn`.
- Cuerpo opcional `{ eventoId?: string }`: si viene, asigna en la misma operación (FR-012).
- Evento `solicitud_bautismo_aceptada` (y `bautismo_fecha_asignada` si asignó).

### `POST /bautismo/solicitudes/:id/rechazar` (FR-009)

- `solicitudes.aprobar`. Cuerpo `{ motivo?: string }` (≤ 500). Exige `pendiente`. → `rechazada`.
- Evento `solicitud_bautismo_rechazada`.

### `POST /bautismo/solicitudes` — crear en nombre de (FR-022)

- `bautismo.crear_en_nombre`. Cuerpo `{ personaId, comentario? }`. Sin regla de FR-002 ni de edad;
  sí `SOLICITUD_BAUTISMO_YA_ABIERTA` y `PERSONA_YA_BAUTIZADA`. `creadoPorId` = sesión. Sin aviso.

### `PUT /personas/:id/habilitacion-bautismo` y `DELETE` igual (FR-021)

- `bautismo.habilitar`. PUT pone `bautismoHabilitadoEn = now()`, `…PorId = sesión` (idempotente);
  DELETE los pone en `null`. No toca Solicitudes. Rechaza Personas inexistentes o no `activa`
  (`NO_ENCONTRADO`).

### `GET /bautismo/eventos` — próximos Eventos de bautismo (FR-012, escenario 3.5)

- `solicitudes.ver`. Eventos de bautismo `activo` con `fecha > now()`, por fecha asc. Lista corta
  (sin paginar: son pocas fechas al año). Vacío → la pantalla ofrece "Crear un Evento de bautismo".

### `GET /bautismo/eventos/:eventoId` — la sección del Evento (Historias 3 y 7)

- `solicitudes.ver`. → `{ evento, asignadas: Pagina<FilaAsignada>, esperandoFecha:
  Pagina<FilaEsperando>, puedeConfirmar: boolean }`. `esperandoFecha` ordena por `revisadaEn` asc
  (las más antiguas primero) y pagina con `skipEsperando`/`takeEsperando`. `NO_ENCONTRADO` si no es
  de bautismo.

### `POST /bautismo/eventos/:eventoId/asignar` (FR-012 a FR-014, FR-017)

- `solicitudes.aprobar`. Cuerpo `{ solicitudIds: string[] }` (1..100).
- Valida el Evento (`EVENTO_NO_ES_DE_BAUTISMO`, `EVENTO_NO_DISPONIBLE_PARA_ASIGNAR`). Por cada
  Solicitud, en orden de id, con `FOR UPDATE`: exige `aprobada`; si ya está en otro Evento, cancela
  esa inscripción; crea la `InscripcionEvento` (`confirmada`, `creadoPorId` = sesión) con la pieza de
  la 011 que saltea cupo y aprobación para Eventos de bautismo; setea la FK.
- 200: `{ asignadas: string[], noAsignadas: { id, code }[] }`. Un evento
  `bautismo_fecha_asignada` por asignada.

### `POST /bautismo/solicitudes/:id/quitar-de-evento` (FR-015)

- `solicitudes.aprobar`. Exige `aprobada` con inscripción a un Evento futuro. Cancela la
  inscripción, FK → `null`. Evento `bautismo_fecha_quitada`.

### `POST /bautismo/eventos/:eventoId/confirmar` (FR-027, FR-028)

- `solicitudes.aprobar`. Cuerpo `{ realizadas: string[] }`. Research #9. 200:
  `{ realizadas: number, devueltasAEspera: number }`. Evento `bautismo_realizado` por realizada.

### Hook para la spec 011 — `BautismoService.liberarAsignacionesDeEvento(tx, eventoId)` (FR-016)

- No es un endpoint: lo llama la 011 **dentro** de la transacción que cancela o desactiva un Evento
  de bautismo. Pone en `null` la FK de todas las Solicitudes `aprobada` asignadas y devuelve sus
  ids; la 011 emite (después del commit) `bautismo_evento_cancelado` por cada una vía
  `emitirEventoBautismo` (o el hook lo devuelve listo para emitir).

### Hook para la spec de D144 — `BautismoService.retirarPorDeclaracion(tx, personaId)`

- Lo llama la spec de D144 dentro de la transacción que confirma una declaración "Ya me bauticé". Si
  la Persona tiene una Solicitud `pendiente` o `aprobada`, la pasa a `retirada` (cancelando su
  inscripción si tenía); si no, no hace nada. Sin aviso (la Persona recibe el de la confirmación de
  D144).

### Pendientes del Admin (FR-029)

- `GET /discipulado/pendientes-admin` (de la 004) suma `bautismo: { pendientes: number,
  esperandoFecha: number, eventosSinConfirmar: { id, nombre, fecha }[] }`. Si en el merge existe un
  endpoint general de pendientes, se suma ahí.
