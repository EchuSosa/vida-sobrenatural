# Research: Vida de Servicio

Decisiones de diseño de la 008. Cada una: decisión, porqué y alternativas descartadas. Lo que es
decisión de producto nueva se repite, resumido, en `plan.md` → "Decisiones nuevas (se numeran al
mergear)".

## 1. Reusar Grupo, Inscripción, Liderazgo, Encuentro y Asistencia de la 004

**Decisión**: Vida de Servicio no tiene modelos propios para el vínculo Persona–Grupo, el liderazgo
ni la asistencia: usa los de la 004, que ya están pensados para cualquier Grupo (`docs/04`: "mecanismo
común a Vida Nueva y Vida de Servicio"; D44, D45). Se agrega lo que solo Vida de Servicio tiene:
Cronograma (items), Contenido, la Solicitud de inscripción y unos pocos campos en Grupo.

**Porqué**: Principio XI (una sola fuente de verdad) y lo que `docs/04` ya decidió. La finalización
(D39), las bajas (D43) y la regla de faltas son las mismas; duplicarlas en tablas paralelas es la
forma de H-33 aplicada al dominio.

**Alternativas**: tablas `InscripcionServicio`/`GrupoServicio` propias — descartado: rompe la
consulta del prerrequisito (que necesita mirar Inscripciones de cualquier Curso por categoría) y la
vista unificada de la Persona.

**Consecuencias en lo que dejó la 004** (cambios aditivos, ver `data-model.md`):
- `Inscripcion.solicitudId` hoy es obligatorio y apunta a una Solicitud de Discipulado. Pasa a
  opcional y se suma `solicitudVidaServicioId`, con un CHECK de "exactamente uno de los dos".
- `Encuentro.capitulos` pasa a opcional: el Encuentro de asistencia de Vida de Servicio no tiene
  capítulos. El servicio de la 004 sigue exigiéndolos para Vida Nueva (su validación no cambia).
- `discipuladosActivosDe` (D137) filtra por `curso.categoria = vida_nueva` (FR-040): sin esto, un
  Discipulador que además lidera una edición de Vida de Servicio quedaría bloqueado para que le
  quiten `discipulador` y con carga inflada en la sugerencia del cruce (FR-035 de la 004).
- `Inscripcion` suma `bajaPropuestaTipo` (`dada_de_baja` | `abandono`): en la 004 la baja propuesta
  siempre terminaba en `abandono`; en Vida de Servicio el Líder elige (FR-032). Para la 004 el campo
  queda `null` y el servicio de la 004 sigue confirmando a `abandono`.

## 2. Cronograma sin tabla propia: `ItemCronograma` cuelga del Grupo

**Decisión**: no hay tabla `Cronograma`. El diagrama ER la muestra con un único campo (`grupo_id`) y
relación 1 a 1 opcional con el Grupo; el Cronograma **es** el conjunto de `ItemCronograma` de un
Grupo (`grupoId`, `numeroSemana`, `fechaLiberacion`), con únicos `(grupoId, numeroSemana)` y
`(grupoId, fechaLiberacion)`.

**Porqué**: una tabla 1 a 1 sin atributos agrega un join y un estado inconsistente posible (Grupo de
Vida de Servicio sin Cronograma, o Cronograma vacío) sin modelar nada. D17 pedía que el Cronograma no
fuera "un atributo simple del Grupo" para poder tener varias semanas con fechas: los items lo
cumplen. Se registra como decisión nueva (precisa D17) y se actualiza el diagrama al mergear.

**Alternativas**: tabla `Cronograma` como en el diagrama — descartada por lo de arriba; si algún día
el Cronograma necesita atributos propios (ej. "plantilla de cronograma reutilizable"), se agrega
entonces.

## 3. Un Contenido por semana, con varias piezas

**Decisión**: `Contenido` (uno por `ItemCronograma`, `grupoId` + `itemCronogramaId` único) con
`titulo`, `texto?`, y dos tablas hijas: `ArchivoContenido` (PDF/imagen privados) y `EnlaceContenido`
(texto visible + URL, para videos y lecturas). El diagrama decía `tipo: texto | archivo | video` y un
solo `url_o_archivo`.

**Porqué**: el material real de una semana es "la guía en PDF + el video del domingo + dos líneas de
qué hacer": con un tipo por Contenido, la semana necesitaría varios Contenidos y el Líder tendría que
armar el orden. "Material cargado" (D27) pasa a ser una sola condición clara: existe el Contenido de
la semana con título y al menos una pieza (FR-020).

**Alternativas**: varios Contenidos tipados por semana (el diagrama literal) — descartado por lo de
arriba; un campo JSON con todas las piezas — descartado: los archivos necesitan fila propia para el
permiso por pedido y el borrado lógico.

## 4. Liberación calculada al leer; el aviso, una sola vez

**Decisión**: `liberada(item, contenido, hoy) = contenido != null && item.fechaLiberacion <= hoy`,
función pura en `packages/shared-types/src/vida-de-servicio.ts`, con `hoy = hoyEnArgentina()` (la
única implementación, research #7 de la 004). Ninguna tarea programada decide qué se ve.

Para el **aviso** `contenido_liberado` (D49, Flujo 10 paso 5), `Contenido.liberacionAvisadaEn`:
- Al **guardar por primera vez** el Contenido de una semana cuya fecha ya llegó, el servicio marca
  `liberacionAvisadaEn` y emite el evento (después del commit).
- Para las semanas cargadas antes de su fecha, el aviso sale el día de la fecha. Eso necesita un
  proceso programado, que **no existe todavía en `apps/api`** (no hay `@nestjs/schedule`; `evento_proximo`
  y `recordatorio_inscripcion` del Flujo 10 lo necesitan igual). Esta spec deja
  `ContenidoService.marcarLiberacionesDeHoy(hoy)`: en una transacción toma los Contenidos con
  `liberacionAvisadaEn IS NULL` cuyo item tiene `fechaLiberacion <= hoy` y Grupo `en_curso`, los marca
  con `UPDATE … WHERE liberacionAvisadaEn IS NULL RETURNING` (idempotente aunque corra dos veces a la
  vez) y emite un evento por cada uno. **La spec 012 la llama desde su proceso programado.**
- Editar un Contenido ya avisado no vuelve a avisar (FR-022).

**Porqué**: la visibilidad no puede depender de que un proceso haya corrido (si el proceso falla, la
gente igual ve el material el día que corresponde); el aviso sí puede llegar tarde sin romper nada. El
`UPDATE … RETURNING` hace que el aviso salga una sola vez sin bloqueo explícito.

**Alternativas**: un flag `liberado` escrito por una tarea — descartado: si la tarea no corre, no se
ve nada. Construir el scheduler acá — descartado: es infraestructura de notificaciones (012), y
construirlo dos veces es justo lo que el Principio XI prohíbe.

## 5. Archivos privados: `StorageService` suma `leer` y un espacio privado

**Decisión**: `StorageService` (D110) suma `abstract leer(ruta): Promise<Readable>` y `subir` recibe
`visibilidad: 'publica' | 'privada'` (las portadas siguen públicas). `LocalStorageProvider` guarda
los privados en `STORAGE_PRIVADO_DIR` (fuera de la carpeta que `main.ts` sirve estática). La descarga
es `GET /vida-de-servicio/archivos/:archivoId`, que valida el permiso por registro en cada pedido
(FR-024) y responde con `Content-Disposition: inline` y `Cache-Control: private, no-store`.

Validación al subir: tipo por **contenido** (firma de los primeros bytes), no por extensión ni por el
`mimeType` que manda el navegador; tamaño máx. 15 MB, hasta 5 por semana (FR-023). Las imágenes no se
redimensionan (a diferencia de las portadas: el Líder puede subir una lámina que tiene que leerse).

**Porqué**: es el primer archivo privado del sistema; el comentario de `storage.service.ts` ya dice que
`descargar` se agrega "el día que un archivo privado lo necesite" (Principio IV). Principio V: nunca
desde carpetas públicas.

**Alternativas**: URLs firmadas con vencimiento — descartado para el proveedor local (no hay a quién
firmarle); queda como opción natural cuando se pase a S3-compatible, detrás de la misma interfaz.

## 6. Solicitud de inscripción: tabla propia, forma base común

**Decisión**: `SolicitudVidaServicio` con la forma base de `docs/04` (`personaId`, `estado`,
`creadoPorId`, `revisadoPorId`, `revisadaEn`, `createdAt`) más `grupoId?` (edición pedida; null = "para
la próxima edición") y `motivoRechazo?`. Estados: `pendiente`, `aprobada`, `rechazada`, `retirada`
(reusa el enum `EstadoSolicitud` de la 004 sin usar `propuesta`). Índice único parcial "una
`pendiente` por Persona" en SQL (D60, patrón H-140).

**Porqué**: igual criterio que la 004 (research #2 de la 004): una tabla por tipo con forma base
común, para que la bandeja unificada sea una unión de forma conocida.

## 7. La bandeja de Solicitudes pasa a tener dos tipos

**Decisión**: `GET /solicitudes` (hoy en `SolicitudDiscipuladoController`) se mueve a un módulo
`solicitudes/` propio que une las dos tablas con la forma base y acepta `tipo=discipulado|vida_servicio`
(sin `tipo` = las dos), con la misma paginación, orden y filtros de estado. El filtro por tipo ya
existía "en la estructura" (FR-025 de la 004) y ahora se muestra. La **resolución** sigue siendo
específica por tipo (FR-025a de la 004): cada fila de la bandeja ya trae su `tipo`, y enlaza a
`/solicitudes/[id]` (Discipulado, sin cambios) o a `/solicitudes/vida-de-servicio/[id]` (nuevo).

**Porqué**: con dos tipos reales ya se puede contrastar, pero la resolución de cada uno no se parece
(Discipulado propone y espera aceptación; Vida de Servicio aprueba eligiendo edición). Generalizar "qué
hacer al aprobar" con dos casos tan distintos seguiría siendo moldear una abstracción sobre ejemplos
que no comparten nada. Se generaliza solo el listado, como dijo la 004.

**Alternativas**: un endpoint por tipo y la unión en el frontend — descartado: la paginación y el orden
de una unión no se pueden hacer bien del lado del cliente (`docs/15`, "Listados paginados", punto 2).

## 8. Prerrequisito: una función pura, dos insumos

**Decisión**: `cumplePrerrequisito({ inscripcionesCompletadas: CategoriaCurso[], completitudes:
CategoriaCurso[] }, prerequisito: CategoriaCurso | null): boolean` en `shared-types`, y una función
de la API `estadoPrerrequisito(tx, personaId, categoria)` que arma los insumos (una consulta a
Inscripciones `completada` con su `curso.categoria`, otra a Completitud Manual — de la 006) y devuelve
además **por qué no** (`sin_vida_nueva` | `vida_nueva_en_curso` | `declaracion_en_revision`) para el
mensaje de FR-009. Se usa al mostrar Mi camino, al crear la Solicitud y al aprobar (FR-016).

**Porqué**: Principio VI (regla con ramas → unit test), XI (una sola implementación, usada por las tres
vías), y D74 (los dos caminos).

**Dependencia**: la consulta de Completitud Manual y de declaración "Ya lo hice" en revisión la expone
la 006. Si la 006 todavía no mergeó cuando se implementa el lote 0, la función recibe esa parte como
`[]` detrás de un único punto (`completitudesDe(tx, personaId)`) que la 006 completa — ver plan,
Dependencias.

## 9. Apto para Ministerio como rol de estado

**Decisión**: `RolDeEstado` suma `'apto_ministerio'`; lo escribe `RolesDeEstadoService.otorgarRolDeEstado`
(el único lugar, FR-019 del 005, H-139), dentro de la transacción de la finalización. Además,
`alCompletarCategoria(tx, personaId, categoria)` en `apps/api/src/vida-de-servicio/efectos.ts`: si la
categoría es `vida_de_servicio`, otorga `apto_ministerio`. La llaman la finalización (FR-036) y la
confirmación de Completitud Manual de la 006 (FR-042).

**Porqué**: `docs/03` lo trata como rol y D131 como rol de estado; `docs/04` lo nombra como
`Persona.apto_ministerio`. Un flag aparte sería un segundo lugar para el mismo dato. "En curso: Vida de
Servicio" **no** se guarda como rol: se deriva de la Inscripción `activa` (igual que la 004 con Vida
Nueva, y por el mismo argumento que D137).

## 10. Bajas: propuesta del Líder con tipo, confirmación del Admin, o directa del Admin

**Decisión**: reusa las columnas de baja propuesta de la 004 (`bajaPropuestaEn`, `…PorId`, `…Motivo`,
`bajaRechazadaEn`, `…Motivo`) y suma `bajaPropuestaTipo`. El Admin confirma (puede cambiar el tipo) o
rechaza; o aplica directo (`POST …/inscripciones/:id/baja` con `tipo`). `cerradaEn` marca la fecha de
cierre que usa FR-034. Pregunta 1 para Echu.

## 11. Contenido visible para una Inscripción cerrada

**Decisión**: `semanasVisibles(inscripcion, items, hoy)`: si `activa` o `completada`, todas las
liberadas; si `dada_de_baja` o `abandono`, las liberadas con `fechaLiberacion <= fecha(cerradaEn)`.
Función pura con test (FR-034). El endpoint del archivo usa la misma función.

## 12. Faltas

**Decisión**: `FALTAS_PARA_ALERTA = 2` en `shared-types`; `faltasDe(inscripcionId)` cuenta
`Asistencia.presente = false`. Una consulta agrupada por Grupo para el listado (no una por fila, H-42).
Solo cuentan Encuentros posteriores a la inscripción (la Asistencia solo se crea para Inscripciones
`activa` a esa fecha, así que no hay que filtrar después). Pregunta 5 para Echu.

## 13. Asistencia: un Encuentro por Grupo y fecha

**Decisión**: índice único parcial `encuentros (grupoId, fecha) WHERE capitulos IS NULL` — los
Encuentros de asistencia de Vida de Servicio no tienen capítulos y los de Vida Nueva siempre (su
servicio los exige). `PUT /vida-de-servicio/mis-grupos/:grupoId/asistencia/:fecha` es idempotente:
upsert del Encuentro y de cada Asistencia en una transacción. El cuerpo manda solo los **ausentes**
(`ausentes: inscripcionId[]`); el resto de las `activa` queda presente (FR-027).

**Alternativas**: una columna `tipo` en Encuentro — más explícita, pero agrega un valor que hoy se
deduce del Curso del Grupo; se puede sumar si aparece un tercer uso.

## 14. Pantallas del Líder en la web app

**Decisión**: `apps/web/src/app/(app)/mis-grupos/` (listado), `[grupoId]/` (cronograma + inscriptos +
proponer finalización), `[grupoId]/semanas/[numero]/` (cargar material), `[grupoId]/asistencia/`
(tomar asistencia). La entrada en la navegación de la web app la sigue el patrón que fije la **006**
para los roles de cargo en la web app (D142); si la 006 no lo fijó todavía, se agrega como acceso en
Inicio para quien tenga `lider_curso`, sin tocar la barra de cinco pestañas. Se borra el placeholder
`apps/backoffice/src/app/mis-grupos/` y su ítem en `nav.ts`; `mis_grupos.ver` pasa a ser permiso de la
web app.

**Porqué**: D142. La web app ya es la herramienta del celular, y el Líder toma asistencia en la puerta.

## 15. Permisos nuevos (D132)

| Permiso | Roles | Uso |
|---|---|---|
| `vida_servicio.inscribir_en_nombre` | `admin` | FR-013 (D143: no el Discipulador) |
| `grupos.gestionar` | `admin` | ya existe; cubre crear edición, cronograma, Líderes, inscripción abierta, resolver bajas y finalización |
| `solicitudes.aprobar` | `admin` | ya existe; cubre aprobar/rechazar inscripciones |
| `mis_grupos.ver` | `lider_curso` | ya existe; pasa a la web app |
| `mis_grupos.gestionar` | `lider_curso` | nuevo: cargar material, tomar asistencia, proponer baja y finalización — siempre más la verificación por registro del Liderazgo vigente |
| `grupos.ver` | `admin`, `pastor` | ya existe; ver contenido y archivos de cualquier edición |

Pedir para uno mismo y ver su propia Vida de Servicio no son permisos de rol: se resuelven por
identidad, como `discipulado/me` en la 004.

`puedeQuitarRol` suma la rama `lider_curso` con `gruposServicioActivos` (FR-040), obligatoria en
`PersonaParaQuitarRol` igual que `discipuladosActivos`.

## 16. Eventos (costura para la 012)

**Decisión**: `packages/shared-types/src/eventos-vida-de-servicio.ts` con la unión tipada de
`contracts/eventos.md` y `emitirEventoVidaDeServicio()` en la API (logger estructurado, solo ids),
llamada después del commit. Mismo patrón que `eventos-discipulado.ts` (004, research #17). Cada evento
declara su `disparador` de `docs/04` (`solicitud_actualizada`, `contenido_liberado`) cuando lo tiene,
y su `prioridad`, para que la 012 no tenga que reinterpretarlos.

## 17. Celular primero (D150)

Las pantallas del Líder se diseñan a 360 px; letra de 16 px en etiquetas, botones y ayudas; `Button`
de 44 px (si la tarea de D150 todavía no cambió el default de `apps/web`, estas pantallas usan el
tamaño grande explícito, sin estilos propios). El e2e del Líder corre en el proyecto `celular` de
Playwright de `apps/web` (se crea si no existe, igual que T012b de la 004 en el backoffice).
