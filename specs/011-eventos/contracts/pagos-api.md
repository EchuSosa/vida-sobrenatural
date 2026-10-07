# Contrato — Pagos (API)

Convenciones de `eventos-api.md`. Ningún pago se procesa: se registra uno que ocurrió afuera (D67).

## La propia Persona

| Método y ruta | Qué |
|---|---|
| `POST /inscripciones-evento/:id/pagos` (multipart: `monto`, `medio`, `fechaPago`, `comprobante`) | registrar su Pago (FR-030, FR-031) → `201 PagoResumen` en `pendiente_verificacion` |
| `GET /pagos/:id/comprobante` | ver su comprobante (FR-032) |

## Admin (`pagos.verificar`)

| Método y ruta | Qué |
|---|---|
| `GET /pagos?estado=pendiente_verificacion&eventoId&skip&take` | listado (alimenta la fuente `pago` de la bandeja, research #12) |
| `GET /pagos/:id/comprobante` | ver cualquier comprobante (FR-032) |
| `POST /pagos/:id/verificar` | FR-033 |
| `POST /pagos/:id/rechazar` `{ motivo }` | FR-035: Pago `rechazado` + Inscripción `cancelada (pago_rechazado)` + promoción, en una transacción con el bloqueo del Evento |
| `POST /inscripciones-evento/:id/pagos/en-nombre` (multipart, `comprobante` opcional) | FR-036: nace `verificado`, `creadoPorId` y `verificadoPorId` = Admin |

`PagoResumen`: `id, inscripcionEventoId, monto, medio, fechaPago, estado, tieneComprobante,
comprobanteMime, creadoPor, verificadoPor, revisadoEn, motivoRechazo, createdAt`. Para la bandeja,
`PagoEnBandeja` suma `persona` y `evento { id, nombre, inicio }`.

## `GET /pagos/:id/comprobante`

- Autoriza **en cada pedido**: dueña de la Inscripción del Pago, o permiso `pagos.verificar`.
  Cualquier otro caso → `404 NO_ENCONTRADO` (no `403`, para no revelar que existe).
- Lee con `StorageService.leer('comprobantes', ruta)` y responde el stream con
  `Content-Type` = `comprobanteMime`, `Content-Disposition: inline; filename="comprobante.<ext>"`,
  `Cache-Control: private, no-store`, `X-Content-Type-Options: nosniff`.
- Las apps lo piden con el token de sesión desde su servidor (route handler propio de cada app que
  reenvía el stream), nunca con una URL pública ni un link directo a la API sin autenticar.

## Errores

| `code` | HTTP | Cuándo |
|---|---|---|
| `VALIDACION` | 400 | `MONTO_INVALIDO`, `MEDIO_INVALIDO`, `FECHA_PAGO_FUTURA`, `COMPROBANTE_REQUERIDO`, `MOTIVO_REQUERIDO`, `MOTIVO_DEMASIADO_LARGO` |
| `COMPROBANTE_TIPO_INVALIDO` | 400 | no es JPG/PNG/WebP/PDF por su firma (FR-031) |
| `COMPROBANTE_TAMANO_EXCEDIDO` | 400 | > 5 MB |
| `EVENTO_SIN_COSTO` | 409 | la Inscripción es de un Evento sin costo |
| `INSCRIPCION_NO_CONFIRMADA` | 409 | pagar una que no está `confirmada` (pendiente, en lista, cancelada) |
| `PAGO_PENDIENTE_EXISTENTE` | 409 | ya hay uno `pendiente_verificacion` (FR-030; también por índice único) |
| `PAGO_NO_PENDIENTE` | 409 | verificar/rechazar uno ya resuelto |
| `NO_ENCONTRADO` | 404 | id inexistente o ajeno |
