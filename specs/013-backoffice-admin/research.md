# Research: Backoffice del Admin (013)

Cada punto: **Decisión**, **Rationale**, **Alternativas consideradas**. Lo que se vuelve decisión de producto o de
arquitectura con alcance más allá de esta spec está repetido en `plan.md` → "Decisiones nuevas".

## 1. Fuente única de la bandeja: una vista SQL `solicitudes_bandeja`

**Decisión**: una vista de PostgreSQL `solicitudes_bandeja` con `UNION ALL` de una rama por tipo, todas con las mismas
columnas (`tipo`, `id`, `personaId`, `estado`, `abierta`, `createdAt`, `esperaDesde`, `creadoPorId`,
`revisadoPorId`, `revisadaEn`). La API la consulta con `$queryRaw` para **ordenar, filtrar y paginar** (solo ids y
`tipo`), y después **hidrata** cada página pidiéndole a la fuente de cada tipo sus resúmenes por id — el mismo patrón
de dos pasos que ya usa `SolicitudDiscipuladoService.listar` (004). La vista se crea en una migración de esta spec con
la rama de Discipulado; cada spec de tipo (008–011) la **recrea** en su propia migración sumando su rama
(`CREATE OR REPLACE VIEW` con todas las ramas — el SQL completo vive en un solo archivo versionado,
`apps/api/prisma/vistas/solicitudes_bandeja.sql`, que cada migración copia).

**Rationale**: `docs/15` (listados) exige que paginado, búsqueda y orden se resuelvan en la API: con seis tablas, la
única forma de ordenar "lo más viejo primero" entre tipos y paginar de verdad es que la base vea un solo conjunto. Una
vista no duplica datos (Principio XI: ningún estado copiado que pueda desincronizarse) y no necesita triggers.
Hidratar por tipo mantiene en cada spec el armado de su resumen (sus joins, sus campos propios, como
`propuestaVigente` de Discipulado).

**Alternativas consideradas**:
- *Tabla `solicitud` común con herencia* (una fila base por Solicitud + tabla por tipo): rehace el modelo de 004 y
  obliga a las cinco specs en paralelo a escribir en dos tablas. Descartada: el patrón común de `docs/04` es de
  forma, no de tabla (D31).
- *Merge en memoria* (cada tipo devuelve sus `skip+take` primeros, la API mezcla y corta): correcto pero el costo
  crece con la página pedida, y el `total` exige un `COUNT` por tipo igual. Descartada por `docs/15`.
- *Prisma `view` (preview feature `views`)*: tipado lindo, pero sigue en preview y obliga a mantener el modelo de
  la vista en `schema.prisma` a mano igual que el SQL. Descartada; `$queryRaw` tipado alcanza (ya es el patrón).

## 2. Registro de tipos en código: `TIPOS_SOLICITUD` y `FuenteSolicitudes`

**Decisión**:
- `packages/shared-types/src/bandeja.ts`: `TipoSolicitud` pasa a ser la unión de los tipos **conectados** (hoy
  `'discipulado'`) y `TIPOS_SOLICITUD` su lista ordenada. Por tipo: sus estados y cuáles son abiertos
  (`ESTADOS_ABIERTOS: Record<TipoSolicitud, readonly string[]>`), usados por la vista (se testea que coincidan, ver
  #3) y por la pantalla.
- `apps/api/src/bandeja/`: interfaz `FuenteSolicitudes { tipo; resumenes(ids): Promise<SolicitudBandeja[]> }`,
  registrada con un token de Nest (`FUENTES_SOLICITUDES`, multi-provider). Discipulado registra la suya en
  `solicitud-discipulado.module.ts`.
- `apps/backoffice/src/config/solicitudes.ts`: `RUTA_DETALLE_SOLICITUD: Record<TipoSolicitud, (id) => string>` y el
  ícono por tipo. Discipulado sigue en `/solicitudes/[id]`; se recomienda `/solicitudes/<tipo>/<id>` a los tipos
  nuevos (el segmento estático le gana al dinámico en el App Router).

**Rationale**: FR-007/SC-002 — sumar un tipo toca su spec y tres registros, nunca la pantalla. `Record<TipoSolicitud,
…>` hace que TypeScript **falle** si alguien agrega un tipo y se olvida la ruta, el ícono o la regla de abierto.

**Alternativas**: un `switch` por tipo en la pantalla (lo que hay que evitar); configurar la vista desde código
(generar SQL): más magia que una vista explícita.

## 3. "Abierta" en un solo lugar, verificado contra la vista

**Decisión**: la columna `abierta` de cada rama de la vista se escribe en SQL (`estado IN (...)`), y un test de
integración recorre `TIPOS_SOLICITUD` × todos los estados de cada tipo, inserta un registro por estado y verifica que
`abierta` en la vista sea igual a `ESTADOS_ABIERTOS[tipo].includes(estado)`.

**Rationale**: Principio XI admite la copia solo con un test que falle cuando diverja. La regla tiene que estar en SQL
para filtrar y paginar, y en TypeScript para la pantalla (filtro por estado del tipo); el test las ata.

## 4. Fecha de espera

**Decisión**: `esperaDesde` es, por tipo, desde cuándo espera **al Admin**: Discipulado `COALESCE(propuesta vigente,
createdAt)` (lo que ya usa el orden "espera" de 004); los demás `createdAt`. El orden por defecto es `esperaDesde ASC`
con `abierta`. "Días de espera" se calcula en el cliente con el `diasDesde` que ya usa la bandeja de la 004 (no una
segunda implementación).

## 5. Perfil de Persona: un endpoint compuesto con secciones

**Decisión**: `GET /personas/:id/perfil` devuelve datos + roles + Relaciones Familiares + tutor; el historial va en
endpoints aparte para que cada sección cargue y falle sola: `GET /solicitudes?persona=:id&filtro=todas&take=20`
(Solicitudes), `GET /personas/:id/grupos` (Inscripciones y Liderazgos, 20 más recientes de cada uno). Las secciones
de 006/009/011 (Completitudes, Ministerio, Eventos) las suma cada spec con su endpoint y su componente en
`apps/backoffice/src/app/personas/[id]/secciones/`, registrado en una lista (`SECCIONES_PERFIL`) — mismo criterio
que FR-007.

**Rationale**: una sola respuesta gigante acopla a todas las specs en un DTO; secciones independientes respetan los
cuatro estados por bloque y permiten que una sección nueva llegue sin tocar las otras.

**Alternativas**: un solo `GET` con todo (descartado por acoplamiento); GraphQL (fuera del stack, `docs/10`).

## 6. Relaciones Familiares en las dos direcciones

**Decisión**: se consultan las filas donde la Persona es `personaId` **o** `familiarId`, y el nombre visible se
resuelve con una función pura en `packages/shared-types` (`relacionDesde(tipo, lado)`: `tutor` visto desde el
familiar → "a cargo de"; `hijo_a` ↔ `padre_madre`; `conyuge` y `hermano_a` simétricas). Unit test por cada par.

**Rationale**: D112 guarda una sola fila por vínculo; si la inversa no se resuelve en un solo lugar, cada pantalla
inventa la suya. Hoy `apps/api/src/persona/persona.service.ts` tiene `INVERSO_RELACION` (para impedir el duplicado
espejo): se **mueve** a `shared-types` junto con `relacionDesde`, y el servicio pasa a importarlo — una sola tabla
de inversas (Principio XI).

## 7. Métricas al momento

**Decisión**: tres consultas agregadas (`COUNT`, `GROUP BY "tiempoCongregacion"`, `GROUP BY "sedeId"`) sobre
`personas` con `estado = 'activa' AND activo = true`, en `GET /inicio/metricas`. Los cinco rangos se completan con 0
en la API (un rango sin Personas igual aparece). Porcentajes redondeados a entero en el cliente, con
`Intl.NumberFormat` (`formato.ts`).

**Gráfico**: barras horizontales hechas con `div` y ancho porcentual sobre un token de color (`--primary`), sin
librería de gráficos: la tabla con cantidad y porcentaje es la información; la barra es refuerzo visual
(`aria-hidden`). Principio IV: una librería de charts para tres barras no se justifica.

**Rationale**: cientos de Personas (D120); un `GROUP BY` es instantáneo. Una tabla de agregados sería estado copiado.
`personas` ya tiene índice en `sedeId` y en `estado` (`schema.prisma`).

## 8. Cumpleaños

**Decisión**: `GET /personas/cumpleanos?mes=1..12` y `GET /inicio/cumpleanos-semana`. Filtro en SQL por
`EXTRACT(MONTH FROM "fechaNacimiento")` (mes) y, para la semana, por el par (mes, día) dentro de los 8 días desde
`hoyEnArgentina()` (puede cruzar mes y año). La regla del 29/2 y "cuántos cumple" viven en una función pura
`proximoCumpleanos(fechaNacimiento, hoy)` en `packages/shared-types/src/cumpleanos.ts` con unit tests (29/2 en año
bisiesto y no, 31/12 → 1/1, hoy mismo). El mes de cumpleaños es paginado de a 50 (un mes de una iglesia chica entra
en una página, pero el listado debe paginar igual, H-42).

**Índice**: índice de expresión `((EXTRACT(MONTH FROM "fechaNacimiento")))` en la migración (SQL crudo, Prisma no lo
modela); se documenta en `schema.prisma` con un comentario.

**Rationale**: D62 (sin entidad nueva); `fechaNacimiento` es `DateTime` guardado a medianoche UTC: comparar mes y día
en UTC es correcto porque la fecha no tiene hora real. `hoy` sí es la fecha civil argentina.

## 9. Comentarios: límite de envíos y email

**Decisión**: igual que la 007 (research #3 de la 007): el servidor de Next manda la IP en `X-Origen-Cliente`, la
API guarda solo su huella HMAC (`origenHuella`) y cuenta filas de `comentarios_app` de la última hora con esa huella
(5 sin sesión) o con esa `personaId` (20 con sesión). Pasado el límite, `429 DEMASIADOS_PEDIDOS` con `reintentarEn`.
El email a la desarrolladora usa el `EmailService` de la 007, destinatario en `EMAIL_COMENTARIOS_DESTINO` (si está
vacío, no se envía y se loguea sin datos personales); se envía **después** de confirmar la transacción y su falla se
registra en Sentry sin el texto.

**Rationale**: sin infraestructura nueva (Principio IV), mismo mecanismo que ya revisó la 007. La huella evita
guardar la IP (dato personal, `docs/16`).

**Alternativas**: `@nestjs/throttler` (descartado por la 007 con los mismos motivos); captcha (fricción para gente
mayor, y el volumen no lo justifica).

## 10. Navegador resumido y `requestId`

**Decisión**: el cliente manda `navegador` como "familia + versión mayor + sistema" (ej. "Chrome 141 · Android"),
calculado con `resumirNavegador(userAgent)` — función pura en `packages/shared-types/src/comentario.ts`, con unit test;
el formulario de `packages/ui` le pasa `navigator.userAgent` — nunca el user agent completo. Hoy `apiFetch`
(`packages/shared-types/src/api-client.ts`) **no** guarda el `requestId`: se le suma `ultimoRequestId()`, que recuerda en
memoria el `requestId` del último Problem Details recibido; el formulario lo lee de ahí.

**Rationale**: `docs/16` pide "datos técnicos mínimos"; el user agent completo es casi una huella del dispositivo.

## 11. Formulario de comentarios: componente compartido

**Decisión**: `FormularioComentario` vive en `packages/ui` (lo usan `apps/web` y `apps/backoffice`, Principio XI),
abre en un `Sheet` desde el pie/menú y en página propia `/contanos` en la web (enlace real para el pie, D82). Recibe
por props cómo enviar (cada app arma su llamada con `apiFetch`) y si hay sesión.

## 12. Cursos: alta acotada y "inactivo no admite Grupos nuevos"

**Decisión**: `CURSOS_RECONOCIDOS` en `packages/shared-types/src/curso.ts`: lista de `{ categoria, tipo, modalidad }`
válidas (hoy las dos de Vida Nueva; la 008 suma Vida de Servicio). El alta elige una de las que no tienen registro.
El chequeo `CURSO_INACTIVO` vive en un solo lugar de la API (`CursoService.exigirActivo(cursoId, tx)`, que rechaza `activo = false` **y**
`eliminadoEn` no nulo), llamado por la aceptación de propuesta de la 004 (`propuestas.service.ts`, rama que crea el
Grupo: hoy busca el Curso con `findUnique` por `categoria_tipo` sin mirar `activo`) y por la creación de Grupos de la
008. La rama "sumar a este Grupo" (`grupoDestinoId`) no crea Grupo y no se bloquea: el Grupo en curso sigue.

**Rationale**: D44 y `docs/04`: la combinación categoría/tipo tiene comportamiento propio; dejar que el Admin la
invente crea Cursos que ningún flujo usa (Principio IV).

## 13. Menú: Catálogos agrupa Sedes y Cursos

**Decisión**: en `nav.ts`, `/sedes` y `/cursos` pasan a `enMenu: false`; `/catalogos` queda como ítem. La miga de
pan de Sedes y Cursos (listado, detalle y papelera) suma el tramo "Catálogos" adelante (`MigaDePan` recibe los tramos
por pantalla). URLs sin cambio (enlaces existentes y e2e siguen valiendo). El ítem del menú queda marcado
(`aria-current`) en Catálogos cuando se está en `/sedes*` o `/cursos*`.

## 14. Edición de Persona

**Decisión**: `PATCH /personas/:id` (`personas.editar`) con el DTO de alta de la 006 en modo parcial; el email se
normaliza como exige la 007 para toda escritura. La regla de D133 hoy está escrita en línea dentro de
`RolesService.otorgarRol` (005): primero se **extrae** a una función (`esMenorDeEdad(fechaNacimiento, hoy)` en
`shared-types`, junto a `EDAD_MINIMA_ROL_DE_CARGO`) que usan los dos, para no duplicarla. Si la 006 no está mergeada, la
Historia 7 espera (lote 7).
