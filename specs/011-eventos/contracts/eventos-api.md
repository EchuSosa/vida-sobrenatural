# Contrato — Eventos (API)

Todas las respuestas de error siguen Problem Details con `code` del catálogo (Principio X). Los
errores de campo van bajo `VALIDACION` con `errors: [{ campo, code }]` (H-50). Listados con
`Pagina<T>` (`{ items, total }`, `skip`/`take`, H-42). Montos como string decimal (`"15000.00"`);
instantes en ISO 8601 UTC.

## Públicos (sin sesión, con límite de pedidos)

| Método y ruta | Qué | Respuesta |
|---|---|---|
| `GET /eventos/publicos?skip&take` | Cartelera: `publicado`, no eliminado, `inicio >= hoy 00:00 AR`, orden `inicio asc` (FR-001) | `Pagina<EventoPublico>` |
| `GET /eventos/publicos/:slug` | Página del Evento (incluye cancelados y pasados, FR-005) | `EventoPublico` · 404 `NO_ENCONTRADO` si no existe o está eliminado (FR-043) |

`EventoPublico`: `id, slug, nombre, descripcion, tipo, inicio, fin, lugar (ya resuelto con la Sede),
sede { nombre, direccion }, publicoObjetivo, imagenUrl, descripcionImagen, requiereInscripcion,
requiereAprobacion, cupo, lugaresDisponibles, costo, instruccionesPago, estado,
estadoInscripcion` (research #10). **Nunca** incluye inscriptos.

## Backoffice — gestión (`eventos.ver` para leer; `eventos.gestionar` para escribir)

| Método y ruta | Permiso | Qué |
|---|---|---|
| `GET /eventos?filtro=proximos\|pasados\|cancelados\|todos&tipo&buscar&orden&dir&skip&take` | `eventos.ver` | `Pagina<EventoResumen>` (con `ocupados`, `enEspera`, `pendientes`, `pagosAVerificar`) (FR-009) |
| `GET /eventos/:id` | `eventos.ver` | `EventoDetalle` (todo `EventoPublico` + autoría + totales) |
| `POST /eventos` | `eventos.gestionar` | crear (FR-010, FR-011) → `201 EventoDetalle` |
| `PATCH /eventos/:id` | `eventos.gestionar` | editar; con el bloqueo de research #1; promueve si sube el cupo (FR-018) |
| `PUT /eventos/:id/flyer` (multipart `archivo`, `descripcionImagen`) | `eventos.gestionar` | subir/reemplazar flyer (FR-012) |
| `DELETE /eventos/:id/flyer` | `eventos.gestionar` | quitar flyer (borra el archivo, limpia los dos campos) |
| `POST /eventos/:id/cancelar` | `eventos.gestionar` | FR-040 |
| `POST /eventos/:id/reactivar` | `eventos.gestionar` | FR-041 |
| `POST /eventos/:id/eliminar` | `eventos.gestionar` | FR-042 (borrado lógico) |
| `GET /eventos/papelera?skip&take` | `eventos.papelera.ver` | eliminados |
| `POST /eventos/:id/restaurar` | `eventos.gestionar` | sale de la papelera |
| `GET /eventos/bautismo/proximos` | `eventos.ver` | próximos Eventos de bautismo publicados (FR-048, para la 010) |

Body de `POST`/`PATCH`: `sedeId, nombre, descripcion, tipo, inicio, fin?, lugar?,
publicoObjetivo?, requiereInscripcion, requiereAprobacion, cupo?, permiteListaEspera, costo?,
instruccionesPago?, diasAnticipacionRecordatorio?`. El flyer va aparte (multipart).

### Errores

| `code` | HTTP | Cuándo |
|---|---|---|
| `VALIDACION` | 400 | campos: `NOMBRE_REQUERIDO`, `NOMBRE_DEMASIADO_LARGO`, `INICIO_REQUERIDO`, `FIN_ANTERIOR_AL_INICIO`, `CUPO_INVALIDO`, `COSTO_INVALIDO`, `INSTRUCCIONES_PAGO_REQUERIDAS`, `LISTA_ESPERA_SIN_CUPO`, `APROBACION_SIN_INSCRIPCION`, `DIAS_RECORDATORIO_FUERA_DE_RANGO`, `DESCRIPCION_IMAGEN_REQUERIDA`, `SEDE_INVALIDA`, `CONFIG_BAUTISMO_INVALIDA` |
| `FLYER_TIPO_INVALIDO` / `FLYER_TAMANO_EXCEDIDO` / `FLYER_DIMENSION_INSUFICIENTE` | 400 | FR-012 |
| `CUPO_MENOR_A_OCUPADOS` | 409 | FR-014 (el `detail` trae ocupados) |
| `LISTA_ESPERA_CON_PERSONAS` | 409 | FR-014 |
| `EVENTO_CON_INSCRIPCIONES` | 409 | apagar inscripción, cambiar tipo, eliminar (FR-014, FR-042) |
| `EVENTO_CON_PAGOS` | 409 | cambiar o quitar costo (FR-014) |
| `EVENTO_CANCELADO` | 409 | editar inscripción/cupo o cancelar un cancelado |
| `EVENTO_NO_CANCELADO` | 409 | reactivar uno publicado |
| `EVENTO_YA_PASO` | 409 | reactivar uno pasado (FR-041) |
| `NO_ENCONTRADO` | 404 | id inexistente o eliminado (salvo papelera/restaurar) |

## Backoffice web — QR (sin endpoint de API)

El QR se arma en el servidor de `apps/backoffice` con `WEB_PUBLIC_URL` + `/eventos/{slug}`
(research #8). `GET /eventos/[id]/qr.png` es una ruta de Next del backoffice (route handler) que
exige `eventos.ver` y devuelve el PNG de 1024 px con `Content-Disposition: attachment`.
