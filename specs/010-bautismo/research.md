# Research: Bautismo (spec 010)

Cada punto: **Decisión**, **Por qué**, **Alternativas descartadas**. Lo que depende de otra spec se
marca como tal; no se especifica acá.

## #1 — Cómo se guarda "la fecha" de una Solicitud aceptada

**Decisión.** La asignación a un Evento de bautismo es una **Inscripción a Evento** (`confirmada`,
`creado_por` = el Admin) del modelo de la spec 011, y la Solicitud la referencia con
`SolicitudBautismo.inscripcionEventoId` (nullable, único). "Esperando fecha" = `aprobada` con ese
campo en `null`; "con fecha" = `aprobada` con inscripción y Evento futuro. La fecha, la hora y el
lugar **se leen siempre del Evento** (nunca se copian a la Solicitud).

**Por qué.** D147 dice que modelarlo como Evento "reusa lo que ya existe", y el Flujo 8 paso 5a ya
contempla que el Admin inscriba a una Persona. Con una inscripción real, el recordatorio
`evento_proximo` de la spec 012 le llega a la Persona sin un caso especial, y "Mis eventos" puede
listarlo. La FK desde la Solicitud evita deducir el vínculo por `personaId` (ambiguo si hubo pedidos
anteriores).

**Alternativas.** (a) `SolicitudBautismo.eventoId` directo, sin inscripción: obliga a la 012 a un
caso especial para recordatorios y a "Mis eventos" a otra consulta. (b) Solo la inscripción, sin FK:
el estado de la Solicitud quedaría deducido de una tabla de otra spec sin vínculo explícito.

**Quitar / reasignar / "No puedo ese día" / Evento cancelado:** la inscripción pasa a `cancelada`
(D69: mismo resultado, la haga quien la haga) y la FK vuelve a `null`, en la misma transacción.
**Destildado al confirmar bautismos** (#9): la FK vuelve a `null` y la inscripción **queda como
está** (el Evento ocurrió; es historial, no una baja).

## #2 — Estados propios

**Decisión.** Enum nuevo `EstadoSolicitudBautismo { pendiente, aprobada, rechazada, retirada,
realizada }`. No se reutiliza `EstadoSolicitud` de la 004.

**Por qué.** `EstadoSolicitud` incluye `propuesta`, que no existe en bautismo, y le falta
`realizada`. Reusarlo dejaría valores imposibles en el tipo. `aprobada` es el nombre de `docs/04`
(Principio II); "aceptada" es solo texto de interfaz (D147). `retirada` copia el patrón de la 004.
`realizada` es nuevo: el bautismo ocurrió (decisión nueva, ver plan).

**Alternativas.** `bautizada` como estado: describe a la Persona, no a la Solicitud. Un flag
`realizada` aparte del estado: dos campos para una sola máquina de estados.

## #3 — Una sola Solicitud abierta

**Decisión.** Índice único parcial en SQL, a mano en la migración (patrón H-140):
`CREATE UNIQUE INDEX solicitudes_bautismo_una_abierta ON solicitudes_bautismo ("personaId") WHERE
estado IN ('pendiente','aprobada')`. La violación (`P2002`) se traduce a
`SOLICITUD_BAUTISMO_YA_ABIERTA`. Más `CREATE UNIQUE INDEX … ("inscripcionEventoId") WHERE
"inscripcionEventoId" IS NOT NULL` y el CHECK `"inscripcionEventoId" IS NULL OR estado IN
('aprobada','realizada')`.

**Por qué.** Igual que `solicitudes_discipulado_una_abierta`: la garantía la da la base, no un
`findFirst` previo que dos pedidos simultáneos pasan los dos.

## #4 — La bandeja unificada con dos (o más) tablas

**Decisión.** Una **vista SQL** `bandeja_solicitudes` (`UNION ALL` de la forma base de
`solicitudes_discipulado` y `solicitudes_bautismo`: `id, tipo, personaId, estado (texto), createdAt,
revisadoPorId, creadoPorId`) creada en la migración, y `GET /solicitudes` pasa a leerla con
`$queryRaw` parametrizado (paginado, búsqueda por nombre/apellido y orden en la API, `docs/15`
listados paginados). Los datos propios de cada tipo (la propuesta vigente de Discipulado; el Evento
asignado de Bautismo) se completan después por página, con una consulta por tipo presente.

**Por qué.** Paginar y ordenar en memoria dos listados separados rompe el orden y la búsqueda en la
segunda página (`docs/15`, puntos 1–2). La vista mantiene un solo lugar donde se define la "forma
base" (D31) y es donde se suman las próximas (Vida de Servicio, Postulaciones, Inscripciones a
Evento).

**Riesgo de trabajo en paralelo.** Otras specs (Vida de Servicio, Ministerio, Eventos) pueden estar
haciendo lo mismo ahora. Regla para el merge: **la primera que llegue a `main` crea la vista**; las
siguientes agregan su rama del `UNION ALL` con `CREATE OR REPLACE VIEW` en su propia migración. Va
en "Cambios a docs al mergear" como nota para `docs/14`.

**Alternativas.** Tabla única de Solicitudes con columna `tipo` (es el motor genérico descartado en
D31). Dos endpoints y fusión en el backoffice (orden y paginado incorrectos).

## #5 — Habilitación por el Admin

**Decisión.** Dos campos en `Persona`: `bautismoHabilitadoEn DateTime?` y
`bautismoHabilitadoPorId String?` (FK a Persona). Deshabilitar los vuelve a `null`.

**Por qué.** Es un permiso puntual sobre la Persona, no un pedido: no tiene estados ni revisión.
"Quién y cuándo" cubre la trazabilidad de `docs/03` sin una tabla nueva (Principio IV). La
deshabilitación no se audita: la auditoría de acciones sensibles más allá de los roles sigue en
Fase 2 (D136).

**Alternativas.** Tabla `HabilitacionBautismo` con historial: sin un caso de uso que lo pida.

## #6 — Quién puede pedir: una función pura

**Decisión.** `packages/shared-types/src/bautismo.ts` exporta `estadoCardBautismo(hechos)`, función
pura que recibe los hechos (`vidaNueva: 'en_curso' | 'completada' | 'ninguna'`, `habilitada`,
`edad`, `solicitudAbierta`, `ultimoDesenlace`, `bautizada`, `eventoAsignado`) y devuelve el estado de
la card (FR-019), y `motivoNoPuedePedir(hechos)` que devuelve el código de error o `null`. La API
junta los hechos y llama a las dos; `GET /bautismo/me` y `POST /bautismo/solicitudes/me` responden
con la misma regla.

**Por qué.** Principio XI: la misma regla decide si la card muestra el botón y si la API acepta el
pedido. Una función pura se testea con una tabla de casos sin base.

**"Vida Nueva completada"** incluye la etapa confirmada por D144 (Completitud Manual). Mientras la
spec de D144 no esté mergeada, el puerto que la consulta devuelve `false` (ver #7).

## #7 — "¿Está bautizada?" en un solo lugar, y el puerto hacia D144

**Decisión.** `apps/api/src/bautismo/estado-bautismo.ts` exporta `estaBautizada(tx, personaId)` y
`vidaNuevaDe(tx, personaId)`. Cada una consulta la fuente propia (Solicitud `realizada`; Inscripción
de Vida Nueva `activa` / `completada`) **y** un puerto `HistorialPrevio` con dos métodos
(`bautismoDeclaradoConfirmado`, `vidaNuevaDeclaradaConfirmada`) cuya implementación por defecto
devuelve `false`. La spec que implemente D144 reemplaza esa implementación; no toca nada más.

**Por qué.** FR-030. Sin el puerto, cada pantalla preguntaría por su cuenta a la entidad de D144.

## #8 — Avisos: la costura hacia la spec 012

**Decisión.** Mismo patrón que la 004 (`contracts/eventos.md` de la 004): tipo
`EventoBautismo` en `packages/shared-types/src/eventos-bautismo.ts` y
`emitirEventoBautismo(evento)` en `apps/api/src/bautismo/eventos.ts`, llamado **después** de
confirmar la transacción, que hoy escribe un log estructurado solo con ids. Si la 012 llega antes a
`main` con un emisor general, esta función pasa a delegar en él (una línea); el contrato de eventos
(`contracts/eventos-bautismo.md`) no cambia.

**Por qué.** D149 y la 012 deciden el envío; esta spec garantiza que no falte ningún evento y que
ninguno lleve datos sensibles (`docs/13` punto 5, FR-024). Un test afirma que cada transición emite
el suyo.

## #9 — Confirmar bautismos

**Decisión.** `POST /bautismo/eventos/:eventoId/confirmar` con `{ realizadas: string[] }` (ids de
Solicitud). En una transacción: el Evento tiene que ser de bautismo y pasado; toda Solicitud asignada
a ese Evento que esté en la lista pasa a `realizada` (`realizadaEn = Evento.fecha`), y las que no,
vuelven a `aprobada` sin inscripción. Ids que no están asignados a ese Evento → `VALIDACION`.
Idempotente si se repite con la misma lista sobre lo ya confirmado.

**Por qué.** Es la Historia 7 (Pregunta 1). Todo tildado por defecto lo resuelve la pantalla.

## #10 — Concurrencia

**Decisión.** Cada transición toma `SELECT … FOR UPDATE` de la Solicitud (o de las Solicitudes, en
orden de id para no generar deadlocks en la asignación múltiple) y verifica el estado esperado
adentro de la transacción; si no coincide, `SOLICITUD_BAUTISMO_YA_CAMBIO` (409). La asignación
múltiple devuelve `{ asignadas: id[], noAsignadas: { id, code }[] }` (FR-014).

## #11 — "Futuro" y "pasado" de un Evento

**Decisión.** Se compara el instante del Evento (`Evento.fecha`, con hora, de la 011) contra
`now()` del servidor. Asignar exige `fecha > now()` y `activo`; confirmar exige `fecha <= now()`. La
card muestra fecha y hora en Argentina con `formatearDiaEnArgentina` y su par de hora (la que ya use
la 011).

**Dependencia.** Si la 011 modela la fecha del Evento como fecha civil sin hora, "futuro" pasa a ser
`fecha >= hoyEnArgentina()` y "pasado" `fecha < hoyEnArgentina()`. Ver `contracts/dependencia-evento.md`.

## #12 — Permisos (D132)

**Decisión.** Se reutiliza `solicitudes.ver` (admin, pastor) para la bandeja y el detalle, y
`solicitudes.aprobar` (admin) para aceptar, rechazar, asignar, quitar y confirmar — son decisiones
sobre Solicitudes. Se agregan `bautismo.habilitar: ['admin']` y `bautismo.crear_en_nombre:
['admin']` (no se reutiliza `solicitudes.crear_en_nombre`, que incluye al Discipulador para Vida
Nueva, D143). Lo de la Persona (`/bautismo/me`) va con sesión `activa`, sin permiso de catálogo, como
`/discipulado/me`.

## #13 — Edad mínima para pedir sola

**Decisión.** Constante propia `EDAD_MINIMA_PEDIR_BAUTISMO_SOLO = 12` en `packages/shared-types`
(no reutilizar la de Vida Nueva, H-128: si una cambia, la otra no tiene por qué). Pregunta 2.

## #14 — La card en Mi camino sin pisar a otras specs

**Decisión.** La card vive en su archivo (`apps/web/src/app/(app)/mi-camino/tarjeta-bautismo.tsx`) y
`page.tsx` solo suma un `apiFetch('/bautismo/me')` y una línea de JSX. Recibe una prop opcional
`accionYaLoHice?: ReactNode` para la acción de D144 (FR-020b).

**Por qué.** Otras specs paralelas (Vida de Servicio, Ministerio, D144) también tocan `page.tsx`;
cuanto menos se toque, menos conflictos al mergear.

## #15 — Proyecto `celular` en `apps/web`

**Decisión.** `apps/web/playwright.config.ts` suma el proyecto `celular` (`devices['Pixel 7']`,
`grep: /@celular/`), igual que el backoffice. Si otra spec lo agrega primero, se toma el suyo.

**Por qué.** FR-032 / D150: la card se usa desde el celular y hoy ningún e2e de `apps/web` corre en
ese viewport.
