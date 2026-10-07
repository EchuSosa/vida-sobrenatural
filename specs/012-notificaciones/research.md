# Research: Notificaciones — Avisos in-app y email

Cada punto: **Decisión**, **Rationale**, **Alternativas descartadas**. Los que cambian algo ya
escrito en `docs/` o en otra spec están marcados y vuelven a aparecer en `plan.md` (Decisiones
nuevas / Cambios a docs al mergear).

## 1. Emitir el aviso dentro de la transacción del cambio (enmienda el contrato de eventos de la 004)

**Decisión**: `NotificacionesService.emitir(tx, evento)` recibe el cliente de la transacción de
Prisma y escribe la Notificación y sus Entregas **dentro** de la misma transacción que el cambio de
dominio. El mail sale después, desde un proceso aparte que lee las Entregas `pendiente` (#5). Los
cinco servicios de la 004 que hoy juntan eventos y los emiten "después de confirmar"
(`propuestas`, `solicitud-discipulado`, `baja`, `finalizacion`, `reasignacion`) pasan a llamar a
`emitir(tx, …)` adentro de su `$transaction`.

**Rationale**: el contrato de la 004 decía "después del commit, nunca adentro: un evento de algo que
se deshizo sería peor que ninguno". Eso era correcto mientras emitir era solo un log. Con
persistencia, emitir después del commit abre el caso inverso —el cambio quedó y el aviso no (la API
se cae entre las dos cosas, o falla la escritura del aviso)— y una Persona cuya solicitud se resolvió
sin aviso ni mail es exactamente el problema que D96 quiere evitar. Adentro de la transacción las dos
cosas pasan o no pasan juntas (patrón *transactional outbox*), y el envío lento (SMTP) queda afuera,
así que la acción del usuario no espera al mail (D100, `docs/13`).

**Alternativas descartadas**: (a) emitir después del commit con reintento en memoria — se pierde con
un reinicio; (b) cola externa (Redis/BullMQ) — infraestructura nueva para un volumen de una iglesia
(Principio IV; la 007 también descartó Redis); (c) emitir después del commit y reconciliar con un
proceso que busque "cambios sin aviso" — cada spec tendría que saber detectar sus propios huecos.

## 2. Repartir a los destinatarios en el momento, con una sola inserción

**Decisión**: el reparto (resolver quiénes reciben y crear sus Entregas) se hace en la misma llamada
a `emitir`, con una inserción `INSERT … SELECT` por canal (o `createMany` sobre los ids
resueltos con una sola consulta). Para `todos`, la consulta es "Personas `activa` y `activo`".

**Rationale**: la iglesia tiene cientos de Personas, no cientos de miles. Una inserción de 500 filas
tarda milisegundos y cumple SC-005 (menos de 5 s para el Admin). Que el aviso exista en el mismo
instante en que se confirma el cambio es SC-001, y evita que un e2e tenga que esperar a un proceso.

**Alternativas descartadas**: reparto asíncrono (Notificación "por repartir" + proceso) — agrega un
estado más y una demora visible, sin necesidad a este volumen.

## 3. Qué se guarda: el nombre del evento y sus parámetros, no el texto

**Decisión**: una Notificación automática guarda `evento` (la clave del catálogo, ej.
`discipulado.propuesta_aceptada`) y `params` (JSON con ids y datos no personales que el texto
necesita: nombre del Evento, número de semana, `slug`). **No** guarda `titulo` ni `mensaje`:
- la web app arma el texto del aviso con `next-intl` (`avisos.eventos.<evento>.titulo|detalle`),
  en el idioma de la Persona;
- la API arma el mail con su catálogo de mensajes (`apps/api/src/email/mensajes/es.json`, el que
  creó la 007), en el `idioma_preferido` del destinatario.
El **`disparador`** de `docs/04` (`contenido_liberado`, `solicitud_actualizada`, …) es una propiedad
de cada entrada del catálogo y se deriva de `evento`; no se guarda (Principio XI: un solo lugar).
`titulo`, `mensaje` y `creado_por` existen solo en las manuales. `evento` es `String` en la base y un
tipo cerrado en TypeScript: sumar un evento nuevo no exige migración (SC-009). **(Cambia `docs/04`.)**

**Rationale**: `docs/16` exige que el texto se arme en el idioma de cada destinatario (D84); guardar
texto ya armado lo congela en un idioma y en una redacción, y obligaría a migrar datos para corregir
un texto. Guardar solo ids y datos no personales cumple también Principio X (FR-013).

**Alternativas descartadas**: (a) guardar el texto armado en `es` — rompe D84 y FR-013; (b) que la
API devuelva el texto del aviso ya armado — duplicaría en la API los textos de interfaz, que el
Principio IX pone en `next-intl`; (c) enum de Postgres para `evento` — una migración por cada evento
nuevo de cada spec.

**Nota sobre dos catálogos de texto**: el aviso (web) y el mail (API) dicen cosas distintas (el
mail es más largo y lleva botón), así que no es una copia de la misma regla; un test (FR-040) verifica
que cada evento del catálogo tenga sus claves en los dos archivos (y las del mail solo si es
importante).

## 4. Un catálogo compartido de eventos, con la parte que necesita la base solo en la API

**Decisión**: `packages/shared-types/src/avisos.ts` define:
- `EventoAviso` — unión discriminada por `nombre` con `a: Destinatario` y `datos` tipados por
  evento (generaliza `EventoDiscipulado`, que pasa a ser el subconjunto `discipulado.*`);
- `Destinatario` — `persona`, `discipulador`, `admin`, `grupo` (inscriptos activos), `ministerio`
  (miembros vigentes), `evento_confirmados`, `todas`, `todas_sin_inscripcion` (a un Evento);
- `CATALOGO_AVISOS: Record<NombreEventoAviso, EntradaCatalogo>` con `disparador`, `prioridad`,
  `destinatario` permitido, `entidad` (`tipo` + cómo sacar el id de `datos`), `destino(datos) → ruta
  de la web app` y `clave(datos) → string | null` (idempotencia).
La API tiene el único `resolverDestinatarios(tx, destinatario)` (necesita la base). La web usa
`destino` para el enlace y la API para el botón del mail: misma función, un solo lugar.

**Rationale**: Principio XI y el patrón que ya funciona con `CATALOGO_PERMISOS` (D132). Que el tipo
sea cerrado hace que un evento sin entrada no compile (escenario US6-6).

## 5. Envío de mails: un proceso que toma Entregas pendientes, con reintentos

**Decisión**: `EnvioEmailsService.procesarPendientes(lote = 20)`:
1. Toma hasta 20 Entregas `canal = email`, `estado = pendiente`, `proximo_intento_en <= ahora`,
   con `SELECT … FOR UPDATE SKIP LOCKED` dentro de una transacción corta, y les corre
   `proximo_intento_en` 10 minutos adelante como "reserva" (si el proceso muere, se retoman solas).
2. Por cada una, lee el email vigente y el `idioma_preferido` de la Persona (FR-025), arma el mail
   con `plantillaAviso(...)` y llama a `EmailService.enviar` (spec 007).
3. Éxito → `enviada`, `enviada_en`. Falla → `intentos + 1`, `ultimo_error` = tipo de error, y
   `proximo_intento_en` según `ESPERAS_REINTENTO_EMAIL = [1 min, 10 min, 1 h, 6 h]`; al quinto
   intento fallido → `fallida`.
Lo dispara: (a) `@Interval` cada 30 s (`@nestjs/schedule`, ya previsto en `docs/10`), y (b) un
"empujón" no bloqueante después de que una transacción que emitió algo importante confirma
(`setImmediate`), para que el mail del caso común salga en segundos (SC-001).

**Rationale**: `SKIP LOCKED` evita que dos instancias o dos corridas manden el mismo mail (FR-023)
sin infraestructura nueva. Cinco intentos en ~7 horas cubren caídas del proveedor y topes por hora;
el tope diario de un plan gratuito puede no alcanzar (Pregunta 5 de la spec): por eso las fallidas se
muestran al Admin (FR-030, FR-031).

**Alternativas descartadas**: cola en memoria (se pierde con un reinicio); BullMQ/Redis (Principio
IV); mandar el mail dentro de la request (bloquea la acción del usuario y la transacción).

## 6. Plantilla del mail: función de TypeScript, como la de la 007

**Decisión**: `apps/api/src/email/plantillas/aviso.ts` →
`plantillaAviso({ asunto, titulo, parrafos, textoBoton, url, idioma }) → { asunto, html, texto }`,
con los colores de `COLORES_EMAIL` (spec 007), tabla de una columna, estilos en línea, ancho máximo
480 px, `lang`, logo por URL absoluta de la web app (`${WEB_URL}/marca/logo-email.png`, imagen
pública que agrega este spec), botón de al menos 44 px de alto y pie con el porqué del mail (FR-021).
Los textos por evento vienen de `mensajes/es.json` bajo `avisos.<evento>`.

**Rationale**: la 007 eligió funciones puras sin React Email (Principio IV) y dejó dicho que si los
avisos necesitaban más se cambiaba detrás de la misma función: no hace falta; un aviso es un título,
uno o dos párrafos y un botón.

## 7. Procesos programados en un único módulo

**Decisión**: `apps/api/src/tareas-programadas/` registra `ScheduleModule.forRoot()` una sola vez y
contiene las tareas: el envío de mails (#5, cada 30 s) y los recordatorios de Eventos (cron diario a
las 08:00 `America/Argentina/Buenos_Aires`). Cada tarea es un método público de un servicio
(`RecordatoriosEventosService.correr(hoy)`) que el cron solo invoca: los tests y un script
(`pnpm --filter api run tareas:correr recordatorios`) lo llaman directo. Variable
`TAREAS_PROGRAMADAS=false` las apaga (tests de integración y e2e, que las corren a mano). La
liberación de contenido de la 008 se suma a este módulo (FR-038). "Hoy" sale de
`hoyEnArgentina()` (spec 004, `packages/shared-types/src/disponibilidad.ts`).

**Rationale**: `docs/10` ya nombra `@nestjs/schedule` para estas tres cosas. Correr a mano es lo que
hace testeable una tarea programada y lo que permite reintentar si un día no corrió.

## 8. Recordatorios: qué Eventos y a quién (depende de la 011)

**Decisión**:
- `evento.proximo`: Eventos activos cuya fecha (civil, Argentina) es mañana; a Inscripciones
  `confirmada`. Clave `evento.proximo:<eventoId>`.
- `evento.recordatorio_inscripcion`: Eventos activos con `requiere_inscripcion`,
  `dias_anticipacion_recordatorio` no nulo, `fecha - hoy = dias_anticipacion_recordatorio`, y que
  aceptan inscripciones (hay cupo, no hay cupo, o hay lista de espera). Destinatarias: Personas
  activas sin Inscripción a ese Evento en estado `confirmada`, `pendiente` o `lista_espera`. Clave
  `evento.recordatorio_inscripcion:<eventoId>`.
Los nombres exactos de campos y estados son los que fije la 011; si difieren, se ajusta la consulta,
no el catálogo.

**Rationale**: Assumptions de la spec (Preguntas 3 y 4). La clave de idempotencia por Evento hace que
correr el proceso dos veces, o reiniciar la API, no duplique (SC-007).

## 9. Abrir un aviso: un enlace real que marca leído y redirige

**Decisión**: cada aviso de la lista es un `<a href="/avisos/{entregaId}/ir">`. Esa ruta de la web
app (Route Handler de Next) llama a `PATCH /avisos/{id}/leido` con la sesión y responde `303` al
`destino` que devuelve la API (o a `/avisos/{id}` si es manual). Si la API falla, redirige igual al
destino (marcar leído no puede bloquear llegar).

**Rationale**: `docs/14` y `docs/15` piden enlaces reales (abrir en pestaña nueva, funciona sin JS,
lector de pantalla los anuncia como enlaces); un `onClick` que primero hace un `fetch` y después
`router.push` no cumple. Que la API devuelva el destino (calculado con `CATALOGO_AVISOS.destino`)
evita que la web reconstruya la ruta con datos que podrían no estar en la lista.

## 10. Contador de sin leer en la barra

**Decisión**: el layout `(app)` de la web pide `GET /avisos/sin-leer` (sin caché) en cada
navegación y se lo pasa a `nav-app-bar.tsx`, que muestra el número (o "99+") junto al ícono con un
`<span class="sr-only">` "{n} avisos sin leer". Si la consulta falla, no muestra número (nunca uno
inventado, US1-7). Índice parcial `WHERE canal = 'app' AND leida_en IS NULL` sobre `persona_id` para
que cueste lo mismo con 10 o 10.000 avisos.

**Alternativas descartadas**: websockets / SSE / consulta periódica — tiempo real no pedido
(Assumption), y una conexión abierta por celular para un número.

## 11. Permisos

**Decisión**: en `CATALOGO_PERMISOS` (D132): `notificaciones.ver` ya existe (`admin`, `pastor`);
se agrega `notificaciones.enviar: ['admin']`. Los endpoints `/avisos/*` no usan permiso de catálogo:
exigen sesión (igual que `/personas/me`) y filtran por `personaId` de la sesión (Principio V, por
registro).

## 12. Mapeo de los eventos de la 004

| Evento 004 (hoy) | Nombre nuevo | A quién | Prioridad | Disparador |
|---|---|---|---|---|
| `propuesta_nueva` | `discipulado.propuesta_nueva` | Discipulador | normal | `proceso_actualizado` |
| `propuesta_aceptada` | `discipulado.propuesta_aceptada` | Persona | importante | `solicitud_actualizada` |
| `propuesta_declinada` | `discipulado.propuesta_declinada` | Admin (sin aviso) | — | — |
| `propuesta_retirada` | `discipulado.propuesta_retirada` | Admin (sin aviso) | — | — |
| `solicitud_rechazada` | `discipulado.solicitud_rechazada` | Persona | importante | `solicitud_actualizada` |
| `finalizacion_propuesta` | `discipulado.finalizacion_propuesta` | Admin (sin aviso) | — | — |
| `finalizacion_confirmada` | `discipulado.finalizacion_confirmada` | Persona | normal | `proceso_actualizado` |
| `baja_propuesta` | `discipulado.baja_propuesta` | Admin (sin aviso) | — | — |
| `baja_confirmada` | `discipulado.baja_confirmada` | Persona | normal | `proceso_actualizado` |

Los eventos al Admin siguen pasando por `emitir` (se loguean igual que hoy) pero su entrada del
catálogo tiene `destinatario: 'admin'` y el reparto no crea nada (FR-015). Así, si Echu decide que el
Admin también reciba avisos (Pregunta 2), es cambiar el catálogo, no las transiciones.

**`proceso_actualizado`** es un disparador nuevo (no está en `docs/04`): cambios del proceso de una
Persona que ella no pidió (terminó, la dieron de baja) y avisos a quien tiene que actuar (el
Discipulador). Sin él, esos eventos de la 004 no tendrían dónde caer. **(Cambia `docs/04`.)**

## 13. Quién conecta los eventos de 008–011

**Decisión**: esta spec escribe el catálogo completo (contracts/catalogo-eventos.md), sus textos y
sus tests de catálogo. La **llamada** a `emitir` en cada transición la hace quien llegue segundo:
- si la spec dueña de la transición ya está en `main` cuando se implementa la 012, la conexión es
  una tarea de la 012 (lote F);
- si la 012 se mergea antes, la spec dueña la hace en su propia tarea, contra el catálogo ya
  existente; si necesita un evento que no está, lo agrega al catálogo en su PR.
La única tarea programada que es de la 012 aunque la entidad sea de la 011 es la de recordatorios
(D49, FR-035/036).

**Rationale**: las cinco specs se escriben en paralelo; que el catálogo sea de una sola (esta) evita
cinco versiones de "cómo se avisa" (Principio XI), y que la llamada viva junto a la transición es lo
que hace que no se olvide (un test de cada transición lo verifica, como hace hoy la 004).

## 14. Pantallas: patrones existentes

- **Avisos** (web): lista con `Paginacion` de `packages/ui` (enlaces en la URL, `?pagina=`),
  `EstadoVacio`, esqueleto en `loading.tsx`, `error.tsx`. Acción secundaria "Marcar todos como
  leídos" con `Button` + `useEnvio`. Sin `TablaDatos` (es una lista de tarjetas, no una tabla).
- **Aviso completo** (`/avisos/[id]`): título (h1), fecha, mensaje con `white-space: pre-line`,
  "Volver a Avisos" (miga de pan, `docs/15`).
- **Notificaciones** (backoffice): `TablaDatos` + `Paginacion` + alta en modal (`docs/15`
  §Backoffice), con el mismo diálogo que usa el alta de Sedes (`AlertDialog` de `packages/ui`,
  `apps/backoffice/src/app/sedes/sedes-cliente.tsx`) con el formulario adentro, `useValidacionCampos` + `ResumenErrores` (H-50), el
  conteo de destinatarios se pide al cambiar alcance (debounce 300 ms) y una confirmación final
  dentro del mismo diálogo. Detalle en `/notificaciones/[id]`. Sección "Mails que no salieron" en la
  misma pantalla del listado, debajo.
- Colores solo de tokens (D118); "Sin leer" con ícono `Circle` relleno + texto; "Importante" con
  ícono `Mail` + texto.
