# Contrato — Inscripciones a Evento (API)

Convenciones de `eventos-api.md`. Toda operación que crea o mueve una Inscripción corre con el
bloqueo de la fila del Evento (research #1) y llama a `promoverDesdeLista` antes del commit cuando
libera lugar (research #3). Los sucesos se emiten después del commit (`eventos-dominio.md`).

## La propia Persona (sesión con Persona `activa`; autorización por registro)

| Método y ruta | Qué | Respuesta |
|---|---|---|
| `GET /eventos/:id/mi-inscripcion` | estado de quien mira para la isla de la página (research #10): su Inscripción abierta (si hay), su lugar en la lista, `estadoPago`, y `lugaresDisponibles` en vivo | `{ inscripcion: MiInscripcionEvento \| null, lugaresDisponibles, estadoInscripcion }` |
| `POST /eventos/:id/inscripciones/me` | anotarse (FR-015) | `201 MiInscripcionEvento` |
| `GET /mis-inscripciones-evento?cuando=proximas\|pasadas&skip&take` | Mis eventos (FR-023) | `Pagina<MiInscripcionEvento>` |
| `POST /inscripciones-evento/:id/cancelar` | cancelar la propia (FR-022) | `MiInscripcionEvento` |

`MiInscripcionEvento`: `id, estado, createdAt, posicionEnLista (solo lista_espera), motivoRechazo,
motivoCancelacion, estadoPago, ultimoPago { estado, monto, medio, fechaPago, motivoRechazo,
tieneComprobante }, evento: EventoPublico (resumido)`. Una Inscripción ajena responde
`404 NO_ENCONTRADO` (no se revela que existe).

## Admin (`inscripciones_evento.gestionar`; `eventos.ver` para leer)

| Método y ruta | Permiso | Qué |
|---|---|---|
| `GET /eventos/:id/inscripciones?estado&buscar&skip&take` | `eventos.ver` | `Pagina<InscripcionEventoResumen>`; `lista_espera` ordenada por `enListaDesde` (FR-025) |
| `POST /eventos/:id/inscripciones` `{ personaId }` | `inscripciones_evento.gestionar` | inscribir en nombre (FR-027, FR-047); `creadoPorId` = Admin |
| `POST /inscripciones-evento/:id/aprobar` | `inscripciones_evento.gestionar` | FR-026 |
| `POST /inscripciones-evento/:id/rechazar` `{ motivo? }` | `inscripciones_evento.gestionar` | FR-026 → promover |
| `POST /eventos/:id/inscripciones/aprobar-lote` `{ ids: string[] }` (≤ 50) | `inscripciones_evento.gestionar` | FR-026: cada una en su propia transacción; responde `{ aprobadas: string[], fallidas: [{ id, code }] }` |
| `POST /inscripciones-evento/:id/dar-de-baja` | `inscripciones_evento.gestionar` | FR-027 (`motivoCancelacion = admin`) → promover |
| `POST /inscripciones-evento/:id/promocion-vista` | `inscripciones_evento.gestionar` | marca "ya le avisé" (FR-025) |
| `GET /personas/:id/inscripciones-evento?skip&take` | `eventos.ver` | historial de una Persona (FR-048, para la 010 y la vista unificada D61) |

`InscripcionEventoResumen`: `id, persona { id, nombre, apellido, tieneAcceso }, estado, createdAt,
creadoPor, posicionEnLista, promovidaSinVer, estadoPago, diasSinPago (confirmadas en Evento con
costo sin Pago verificado ni pendiente), revisadoPor, motivoRechazo, motivoCancelacion`.

## Errores

| `code` | HTTP | Cuándo |
|---|---|---|
| `CUPO_LLENO` | 409 | lleno sin lista de espera (FR-015, FR-047) |
| `EVENTO_NO_ADMITE_INSCRIPCION` | 409 | `requiereInscripcion = false` |
| `EVENTO_CANCELADO` | 409 | Evento cancelado |
| `EVENTO_YA_EMPEZO` | 409 | `now() >= inicio` para la Persona (FR-019) |
| `EVENTO_SOLO_INSCRIBE_ADMIN` | 403 | auto-inscripción a un Evento de bautismo (FR-046) |
| `INSCRIPCION_EVENTO_YA_ABIERTA` | 409 | ya tiene una abierta (FR-021; también por el índice único) |
| `PERSONA_NO_ACTIVA` | 409 | la Persona no está `activa` (FR-015, FR-027) |
| `INSCRIPCION_NO_PENDIENTE` | 409 | aprobar/rechazar algo que no está `pendiente` |
| `INSCRIPCION_NO_ABIERTA` | 409 | cancelar/dar de baja una rechazada o cancelada |
| `SESION_SIN_PERSONA` | 403 | sesión sin Persona (ya existe) |
| `NO_ENCONTRADO` | 404 | id inexistente o ajeno |

## Reglas (resumen ejecutable)

1. `decidirEstadoInicial(evento, ocupados)` (función pura en la API, con test unit):
   sin cupo o `ocupados < cupo` → `requiereAprobacion ? pendiente : confirmada`; lleno →
   `permiteListaEspera ? lista_espera : CUPO_LLENO`. Bautismo: nunca lista ni aprobación.
2. `liberaLugar(estadoAnterior)` = `confirmada | pendiente`.
3. `promoverDesdeLista(tx, eventoId)`: no hace nada si el Evento está cancelado o ya empezó; si no,
   mientras `cupo == null || ocupados < cupo`, toma la primera de la lista.
