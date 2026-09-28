# Research: Vida Nueva / Discipulado

Decisiones técnicas del plan. Lo que ya decidieron el spec 005 y `docs/` no se vuelve a abrir acá:
se cita. Cada entrada dice qué se eligió, por qué y qué se descartó. **Actualizado el 2026-09-27
(segunda y tercera ronda de Echu):** #7 se reemplaza, #5 y #11 cambian, y se suman #12 a #19.

## 1. Discipulados activos de una Persona (cierra H-127) — D137

- **Decisión:** se calculan en el momento. Un discipulado activo es un `Liderazgo` con
  `hasta = null` en un `Grupo` con `estado = en_curso`. No hay contador ni flag en `Persona`.
  La consulta vive en **una** función de la API (`discipuladosActivosDe(tx, personaId)`,
  `apps/api/src/discipulado/discipulados-activos.ts`) y la usan `quitarRol` (FR-009 del 005), el
  listado de Personas (para que el panel de roles no ofrezca una quita que va a fallar, H-133) y
  la sugerencia del cruce (FR-035, #12).
- **Cómo entra en la guarda:** `puedeQuitarRol` (`packages/shared-types/src/permisos.ts`) recibe
  `discipuladosActivos` **y `propuestasPendientes`** (FR-043) como datos de `persona`, igual que
  hoy recibe `adminSembrado`. Si alguna lista no está vacía, devuelve el motivo
  `DISCIPULADOR_TIENE_DISCIPULADOS_ACTIVOS` (el código ya existe: el 005 lo dejó reservado), y la
  API lo rechaza nombrando discipulados y propuestas. El motivo que fallaba cerrado
  (`DISCIPULADOR_SIN_VERIFICACION_DE_DISCIPULADOS_ACTIVOS`) **se elimina** del catálogo.
- **Carrera:** `quitarRol` ya bloquea la fila de la Persona (H-142). **Proponer** (crea la
  `PropuestaDiscipulado`) y **aceptar** (crea el Liderazgo) bloquean **la misma fila** del
  Discipulador y verifican que siga teniendo el rol. Las tres operaciones quedan serializadas por
  la base, sin un mecanismo nuevo.
- **Descartado:** un contador `Persona.discipuladosActivos`. Confirmado por Echu el 2026-09-27.

## 2. Solicitud de Discipulado: una tabla por tipo, forma base común

- **Decisión:** modelo `SolicitudDiscipulado` propio, con la forma base de `docs/04` (`personaId`,
  `estado`, fecha, `revisadoPorId`, `creadoPorId`) más sus campos propios (`grupoId` al aprobarse,
  y sus **franjas**, #12). La bandeja genérica (FR-025) es un tipo compartido de listado
  (`SolicitudResumen`, con `tipo`) que el endpoint de Discipulado produce. La resolución queda
  específica (FR-025a).
- **Descartado:** una tabla `Solicitud` única con `tipo` y campos opcionales por tipo.
- **No duplicados (FR-001):** índice único parcial
  `UNIQUE (personaId) WHERE estado IN ('pendiente', 'propuesta')`, en SQL en la migración (H-140).
  Pasa a cubrir los dos estados abiertos.

## 3. Liderazgo con vigencia (reasignación, FR-030)

- **Decisión:** `Liderazgo` tiene `desde` y `hasta` (nullable). Una reasignación **aceptada** (#13)
  cierra el vigente (`hasta = now`, `cerradoPorId`) y abre uno nuevo en la misma transacción.
  Nunca se borra ni se sobrescribe.
- **Un solo Liderazgo vigente por Grupo:** lo sostiene el servicio, no un índice (`docs/04` prevé
  varios líderes para Vida de Servicio).
- **Acceso por registro (Principio V):** "¿es tu discipulado?" = existe un Liderazgo **vigente**
  del usuario sobre ese Grupo. Una propuesta pendiente **no** da acceso al contacto (FR-011).

## 4. Finalización y su rechazo (FR-019, FR-019a) — y el cierre con motivo

- **Decisión:** campos en `Grupo`, sin entidad aparte: `propuestaFinalizacionEn`,
  `propuestaFinalizacionPorId`, `finalizacionRechazadaEn`, `finalizacionRechazadaMotivo`,
  `cerradoEn`, `cerradoPorId` y `motivoCierre: completado | abandonado` (#15). Confirmar pasa el
  Grupo a `finalizado` con motivo `completado` y **todas** las Inscripciones `activa` a
  `completada`, en una transacción (FR-021).
- **`apto_ministerio` no se toca** (FR-022): no hay campo que activar.

## 5. Encuentro: capítulos como texto corto — y edición (FR-041)

- **Decisión:** `capitulos` texto corto obligatorio (hasta 200), `notas` opcional (hasta 2000),
  `fecha` civil (`@db.Date`). El Discipulador vigente **edita** un Encuentro propio (fecha,
  capítulos, notas y la Asistencia de cada Persona) mientras el Grupo esté `en_curso`;
  `updatedAt` registra la última edición. **No se borran** Encuentros.
- **Por qué editar y no borrar:** un Encuentro mal cargado es un error de tipeo, no un hecho que
  no ocurrió; corregirlo preserva el historial y borrarlo lo perdería (Principio III).
- **Descartado:** `Int[]` de capítulos con validación contra el total del libro.

## 6. Asistencia por Persona (FR-013, FR-013a)

- **Decisión:** al crear un Encuentro, la API crea en la misma transacción una `Asistencia` por
  cada Inscripción `activa` del Grupo (una o varias, #14). El cuerpo trae
  `asistencias: [{ inscripcionId, presente }]`, y lo que falte se toma como presente. La pantalla
  muestra una casilla "Faltó" sin marcar por Persona. `@@unique([encuentroId, inscripcionId])`.

## 7. Disponibilidad: agenda, toggle prendido, bloqueos borrables y "hoy" — reemplaza al #7 anterior

- **Decisión:** la puerta para aparecer en el cruce es la **agenda** (FR-006): `FranjaAgenda`
  (`personaId`, `diaSemana 0–6`, `inicio`/`fin` como minutos desde las 0:00, borrado lógico con
  `eliminadaEn`). `Persona.disponibleDiscipulado Boolean @default(true)`: el toggle arranca
  prendido porque quien no cargó agenda no aparece igual. `BloqueoDisponibilidad` con `desde`/`hasta`
  civiles, CHECK `hasta >= desde`, y `eliminadoEn` para el borrado de FR-040.
- **Borrado lógico, no físico:** el Discipulador ve "borrar"; el modelo pone `eliminadaEn` y toda
  consulta filtra `eliminadaEn IS NULL` (Principio III). Lo que se borra nunca vuelve a aparecer.
- **Horas como minutos enteros (`0..1440`)**, no `Time` ni strings: la coincidencia de 60 minutos
  (FR-033) es aritmética entera, sin zona horaria, y el formato 24 h lo pone la pantalla.
- **"Hoy"** es la fecha civil en `America/Argentina/Buenos_Aires`, en **un** lugar de
  `packages/shared-types` (`hoyEnArgentina()`). **Vigente** = `desde <= hoy <= hasta`.
- **Superposición** de bloqueos y de franjas: se permite. El cruce mira "alguna franja coincide" y
  "algún bloqueo vigente".
- **Máximo por Grupo:** `Persona.maxPersonasPorGrupo Int @default(1)`, con CHECK
  `1 <= x <= 6`, y `MAX_PERSONAS_POR_GRUPO_VIDA_NUEVA = 6` en `shared-types` como única fuente del
  tope (FR-045). Lo edita el propio Discipulador en Mi disponibilidad.

## 8. Solicitud en nombre de otra Persona (FR-002, D97)

- **Hallazgo:** hoy no existe en la base una Persona "sin acceso a la app" (el alta de D97 no está
  construida). El endpoint de "crear en nombre de" no exige que la Persona no tenga acceso. Deja
  `creadoPorId`, exige las franjas igual que el pedido propio, y la Solicitud es la misma.
- **Permiso:** `solicitudes.crear_en_nombre` (`admin`, `discipulador`), con `GET /personas/buscar`
  para elegirla.

## 9. Permisos nuevos (D132)

| Permiso | Roles | Para qué |
|---|---|---|
| `solicitudes.aprobar` | `admin` | Ver el cruce, proponer, retirar y rechazar (FR-003 a FR-008, FR-034 a FR-036, FR-038). |
| `solicitudes.crear_en_nombre` | `admin`, `discipulador` | FR-002. |
| `grupos.gestionar` | `admin` | Confirmar o rechazar una finalización o una baja, y proponer una reasignación (FR-019, FR-019a, FR-030, FR-042). |
| `mis_discipulados.gestionar` | `discipulador` | Aceptar o declinar propuestas, registrar y editar Encuentros, proponer la finalización o una baja (FR-009, FR-019, FR-037, FR-041, FR-042). |
| `mi_disponibilidad.gestionar` | `discipulador` | Agenda, toggle, bloqueos y máximo por Grupo (FR-015 a FR-017, FR-031, FR-040, FR-045). |

El nombre `solicitudes.aprobar` se conserva aunque el Admin ya no "apruebe" sino que proponga:
sigue siendo el permiso de resolver Solicitudes, y renombrarlo no cambia nada para nadie. Pedir
para uno mismo, editar o retirar el pedido propio y ver el propio estado (FR-001, FR-026 a FR-028,
FR-039) no llevan permiso del catálogo: son de cualquier Persona con sesión `activa`.

## 10. Dónde vive cada pantalla (D134, `docs/14-navegacion.md`)

| Pantalla | Ruta | Hoy |
|---|---|---|
| Mi camino (pedir con franjas, editar, retirar, ver estado) | `apps/web` `/mi-camino` | Placeholder |
| Bandeja de Solicitudes + cruce + proponer/retirar/rechazar | `apps/backoffice` `/solicitudes` y `/solicitudes/[id]` | Placeholder |
| Vista administrativa de discipulados + finalización + baja + reasignación | `apps/backoffice` `/grupos` y `/grupos/[id]` | Placeholder (solo `/grupos`) |
| Mis discipulados (propuestas + discipulados) + detalle | `apps/backoffice` `/mis-discipulados` y `/mis-discipulados/[id]` | Placeholder (solo la lista) |
| Mi disponibilidad (agenda, toggle, bloqueos, máximo) | `apps/backoffice` `/mi-disponibilidad` | Placeholder |
| Pendientes del Admin (FR-048) | `apps/backoffice` `/` (Inicio) | Existe, suma una tarjeta |
| Panel de roles (quitar `discipulador`) | `apps/backoffice` `/personas` | Construido en el 005, cambia el rechazo |

El cruce vive en `/solicitudes/[id]` (una ruta propia, `enMenu: false`) y no en un `Sheet`: tiene
demasiado contenido para un panel lateral y el Admin vuelve a él varias veces por Solicitud.

## 11. Menores de edad — resuelto por Echu (FR-044)

- **Decisión:** ningún umbral. La API expone, en el detalle del discipulado del Discipulador, un
  bloque `tutor: { nombre, telefono } | null`, resuelto en **un** lugar (`contactoDe(persona)` en
  la API): primero la Relación Familiar de tipo `tutor` (D112) si existe, si no los campos de texto
  `tutorNombre`/`tutorApellido`/`tutorTelefono`. Para una Persona adulta es `null`. La edad se
  calcula con `calcularEdad()` (ya existe) solo para mostrarla en la propuesta (FR-037).

## 12. El cruce y las reglas de asignación (FR-033 a FR-035, D138)

- **Decisión:** módulo `apps/api/src/discipulado/reglas-de-asignacion/`, una función pura por
  regla con la misma firma: `(solicitud, discipulador, contexto) => { cumple: boolean }`. Hoy dos
  archivos: `horario.ts` (existe una franja de la Solicitud y una de la agenda del mismo `diaSemana`
  con `min(fin) - max(inicio) >= 60`) y `genero.ts` (`persona.genero === discipulador.genero`).
  `reglas.ts` exporta la lista ordenada y `evaluar(par) => { cumpleTodas, incumple: NombreRegla[] }`.
  Agregar una regla = un archivo, una línea en la lista y su test; nada más.
- **El cruce** (`GET /discipulado/solicitudes/:id/cruce`) devuelve, para cada franja de la
  Solicitud, los disponibles (FR-006) que cumplen todas las reglas **en esa franja**; aparte, los
  disponibles que incumplen alguna, con `incumple` en claves (`'horario'`, `'genero'`), que la
  pantalla traduce con next-intl. Nunca oculta a nadie (D25).
- **Sugerido (FR-035):** entre los que cumplen todas, el de menor
  `discipuladosActivos + propuestasPendientes`; empate por apellido y nombre. Se calcula en la
  API, en la misma respuesta, para que la pantalla no reimplemente la carga.
- **Grupos con lugar (FR-045, #14):** la respuesta incluye, por Discipulador, sus Grupos `en_curso`
  con `lugar: { ocupado, maximo }` y `coincideHorario: boolean` (la Solicitud coincide con la
  intersección derivada del Grupo).
- **Descartado:** reglas configurables en base de datos (mismo argumento que D132: en una iglesia
  cambian una vez al año y un cambio necesita código igual), y un puntaje ponderado (el Admin no
  necesita un ranking, necesita ver quién puede y quién no, y por qué).

## 13. Propuesta y aceptación (FR-036 a FR-038) — entidad `PropuestaDiscipulado`

- **Decisión:** entidad propia, porque FR-038 pide **historial** (a quién, cuándo, cómo terminó).
  `PropuestaDiscipulado { tipo: nueva | reasignacion, solicitudId?, grupoId?, discipuladorId,
  grupoDestinoId?, propuestaPorId, propuestaEn, estado: pendiente | aceptada | declinada | retirada,
  respondidaEn?, motivoDeclinacion?, retiradaPor?: admin | persona }`, con CHECK de que una `nueva`
  tiene `solicitudId` y una `reasignacion` tiene `grupoId`. Índice único parcial: una sola
  `pendiente` por Solicitud y una sola por Grupo (FR-036).
- **`SolicitudDiscipulado.estado = propuesta`** es derivable de "tiene una Propuesta pendiente",
  pero se escribe igual en la Solicitud para que la bandeja filtre y ordene por estado sin un join,
  y el servicio los mantiene juntos en la misma transacción.
- **Aceptar (transacción):** bloquea la Propuesta (`FOR UPDATE`) y exige `pendiente` → bloquea la
  fila del Discipulador (D137) y exige el rol → si `tipo = nueva`: crea Grupo (o usa
  `grupoDestinoId`, verificando lugar), Inscripción `activa` y Liderazgo; Solicitud → `aprobada` con
  `grupoId`, `revisadoPorId` (el Admin que propuso), `revisadaEn`. Si `tipo = reasignacion`: cierra
  el Liderazgo vigente y abre el nuevo. Propuesta → `aceptada`.
- **Declinar:** Propuesta → `declinada` con motivo; Solicitud → `pendiente`. **Retirar** (Admin, o la
  Persona al editar/retirar su pedido, FR-039): Propuesta → `retirada` con `retiradaPor`; Solicitud
  → `pendiente`. Responder una no pendiente → 409 `PROPUESTA_NO_VIGENTE`.
- **Lo que ve el Discipulador en la propuesta:** nombre, edad (#11), franjas en común (calculadas
  con la regla de horario) y `incumple` (qué reglas no cumple, si el Admin lo eligió igual). **Sin
  contacto** hasta aceptar (FR-011).
- **Descartado:** guardar la propuesta como campos en la Solicitud (pierde el historial que FR-038
  pide) y un plazo automático de vencimiento (Echu: sin plazo; el listado muestra "hace N días").

## 14. Grupos de más de una Persona (FR-045)

- **Decisión:** ningún cambio de modelo: Grupo–Inscripción ya es uno a muchos. Se agrega
  `Persona.maxPersonasPorGrupo` (#7) y la opción `grupoDestinoId` en la Propuesta (#13). Al
  aceptar, la API vuelve a contar las Inscripciones `activa` del Grupo destino con el Grupo
  bloqueado; si ya no hay lugar, 409 `GRUPO_SIN_LUGAR` y la Propuesta queda `pendiente` para que el
  Admin la retire y proponga de nuevo.
- **Horario del Grupo, derivado:** intersección de la agenda actual del Discipulador con las
  franjas de las Solicitudes de sus Inscripciones `activa`. Se calcula en el cruce (#12) para
  marcar `coincideHorario`; no se guarda (Assumption del spec).
- **Curso:** sigue siendo `(vida_nueva, individual)`. "Individual" nombra la variante de D44, no la
  cantidad de Personas (FR-014). Queda para Echu si el nombre de D44 se revisa (cierre).

## 15. Baja de una Persona (FR-042) — `abandono`

- **Decisión:** campos en `Inscripcion`: `bajaPropuestaEn`, `bajaPropuestaPorId`,
  `bajaPropuestaMotivo`, `bajaRechazadaEn`, `bajaRechazadaMotivo`, `cerradaEn`. Confirmar pasa la
  Inscripción a `abandono` y, si el Grupo queda sin Inscripciones `activa`, lo cierra con
  `motivoCierre = abandonado` en la misma transacción. Rechazar limpia la propuesta y guarda el
  rechazo. Mismo patrón que la finalización (#4), a nivel Inscripción.
- **Nombre:** `abandono`, el valor que `docs/04` ya define para "la propia Persona decide no
  continuar" — que es el caso (dejó de ir, no contesta). `dada_de_baja` (exceso de faltas, decisión
  administrativa) queda modelado sin flujo. El pedido decía "abandonada"; es el mismo estado.
- **`cursaOCompletoVidaNueva`** (FR-001) mira solo `activa` y `completada`: una Inscripción en
  `abandono` no impide volver a pedir.

## 16. La Persona edita o retira su pedido (FR-039)

- **Decisión:** `PUT /discipulado/solicitudes/me/franjas` y `DELETE /discipulado/solicitudes/me`
  solo con la Solicitud en `pendiente` o `propuesta`. Las dos retiran la Propuesta pendiente si hay
  (`retiradaPor = persona`) y la dejan en `pendiente`; retirar pone la Solicitud en `retirada`
  (estado nuevo, para que el historial diga que fue ella y no el Admin). Una Solicitud `retirada`
  no bloquea pedir de nuevo.
- **Por qué un estado y no borrar:** Principio III, y el Admin tiene que poder ver que retiró.

## 17. Eventos para el sistema de notificaciones futuro (FR-023, FR-048)

- **Decisión:** un tipo `EventoDiscipulado` en `packages/shared-types/src/eventos-discipulado.ts`
  (unión discriminada: `nombre`, `destinatario: { tipo: 'persona' | 'discipulador' | 'admin', personaId? }`,
  `datos` con ids, nunca textos libres) y **una** función en la API,
  `emitirEventoDiscipulado(evento)` (`apps/api/src/discipulado/eventos.ts`), que hoy solo escribe un
  log estructurado sin datos personales (Principio X). Cada transición la llama después de
  confirmar la transacción. Cuando exista Notificaciones, esa función es el único enchufe.
- **Pendientes del Admin (mientras no hay envío):** `GET /discipulado/pendientes-admin` devuelve
  contadores y enlaces (propuestas declinadas, propuestas sin respuesta hace más de N días,
  finalizaciones propuestas, bajas propuestas); Inicio del backoffice los muestra en una tarjeta
  para quien tiene `solicitudes.aprobar` o `grupos.gestionar`.
- **Descartado:** una tabla de eventos. Es el sistema de Notificaciones a medias, sin usuario
  (Principio IV); los datos que un aviso necesita ya están en las filas de Solicitud, Propuesta y
  Grupo (FR-023).

## 18. Celular en el backoffice (FR-046)

- **Decisión:** las pantallas del Discipulador (`/mis-discipulados`, `/mis-discipulados/[id]`,
  `/mi-disponibilidad`) se diseñan a 360 px primero. Sus e2e corren en **dos proyectos** de
  Playwright: el de escritorio existente y uno `celular` (`devices['Pixel 7']`), los dos con `axe` en
  claro y oscuro. El proyecto `celular` corre solo los specs etiquetados `@celular`, para no
  duplicar el tiempo de toda la suite.
- **Qué cambia en `packages/ui`:** un componente nuevo, `editor-de-franjas.tsx` (día de la semana +
  hora de inicio y fin en 24 h, varias franjas, borrar), porque lo usan `apps/web` (Mi camino) y
  `apps/backoffice` (Mi disponibilidad, pedir en nombre de) — Principio XI. Etiquetas de los días
  por prop desde next-intl (H-151). Pensado para celular: selector de día y dos campos de hora, no
  una grilla (accesible con teclado, sin arrastrar). Si hace falta otro componente para pantalla
  chica (tarjetas en lugar de `TablaDatos`), también va a `packages/ui`; se decide al construir.

## 19. Contacto del tutor (FR-044)

Ver #11: una sola función `contactoDe(persona)` en la API, que devuelve `{ telefono, direccion,
tutor: { nombre, telefono } | null }`. La usa solo el detalle del Discipulador vigente (FR-011,
SC-003).
