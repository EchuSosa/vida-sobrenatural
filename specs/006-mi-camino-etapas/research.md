# Research: 006 — Mi camino por etapas, historial previo, Discipulador en la web y alta de adultos

Fase 0 del plan. Cada decisión: qué se eligió, por qué, y qué se descartó. Las cinco que van a
`docs/05` al mergear están en `plan.md` ("Decisiones nuevas"); acá están también las menores.

## 1. Estado de las etapas: calculado en el momento, en la API, con la regla en `shared-types`

- **Decision**: `GET /camino/me` arma, por cada etapa, los **hechos** (para Vida Nueva: el
  `EstadoMiDiscipulado` que ya calcula `estadoPropio` de la 004; para todas: la declaración más
  reciente y la Completitud vigente; edad) y los pasa a `estadoDeEtapa(etapa, hechos)`, una
  función pura de `packages/shared-types/src/camino.ts`. La habilitación usa `reglaDeEtapa(etapa,
  completas)`, también pura. No se guarda ningún "estado de etapa".
- **Rationale**: D137 ya fijó el criterio (no guardar lo que se puede calcular de una fuente que
  existe). Las funciones puras se testean sin Prisma (Principio VI) y la web app las puede usar
  para textos sin otra llamada.
- **Alternatives**: una tabla `EtapaPersona` con el estado — descartada: cada spec de etapa
  tendría que acordarse de actualizarla (la forma de H-100). Calcular el estado en el frontend con
  cuatro llamadas — descartado: cuatro idas y vueltas desde el celular y la regla en dos lados.

## 2. Qué etapas están "construidas"

- **Decision**: `ETAPAS_CONSTRUIDAS: readonly EtapaCamino[] = ['vida_nueva']` en `camino.ts`. Una
  etapa fuera de esa lista se muestra `proximamente` (FR-004), sin importar su regla. La spec de
  cada etapa la agrega a la lista en el mismo commit en que construye su pedido.
- **Rationale**: un solo lugar para "existe o no" (FR-004: "un cambio en un solo lugar"). Se
  descartó un feature flag por entorno: no hay entornos que difieran en esto y agrega config.

## 3. Textos de las cards: reusar las claves de Primeros pasos

- **Decision**: los subtítulos salen de una clave por etapa compartida: se mueven
  `primerosPasos.paso2Descripcion`…`paso4Descripcion` a `etapas.<etapa>.descripcion` en el
  `es.json` de `apps/web`, y Primeros pasos y Mi camino leen esas mismas claves. Bautismo suma
  `etapas.bautismo.descripcion` provisoria, con un comentario `D98` en el archivo de mensajes
  (`_comentario`), porque `docs/12` no tiene ese texto.
- **Rationale**: el pedido exige "textos de `docs/12` / Primeros pasos, no inventados", y
  Principio XI: dos claves con el mismo texto se desincronizan. Los textos de Primeros pasos
  empiezan en minúscula ("tu primer paso…", porque siguen a un guion); la clave compartida conserva
  el texto tal cual y la card lo muestra como oración con `first-letter:uppercase` (CSS), sin tocar
  Primeros pasos.
- **Alternatives**: copiar los textos — descartado (XI). Escribir textos nuevos — descartado por
  el pedido.

## 4. Declaración y Completitud: dos entidades

Ver Decisión nueva 2 en `plan.md`. Detalle del ciclo:

```text
Declaración:  pendiente ──confirmar(Admin)──▶ confirmada  (+ crea Completitud origen=declaracion)
                 │  └──rechazar(Admin, motivo?)──▶ rechazada
                 └──retirar(Persona)──▶ retirada
Completitud:  vigente ──anular(Admin)──▶ anulada (anuladaEn, anuladaPorId)
Registro directo (Admin): crea Completitud origen=admin; si hay declaración pendiente de esa
etapa, la confirma en la misma transacción.
```

## 5. Concurrencia entre pedido de Vida Nueva, declaración y Completitud

- **Decision**: las cinco operaciones que pueden chocar (pedir Vida Nueva propio o en nombre,
  declarar, confirmar, registrar directo) empiezan bloqueando la fila de la Persona
  (`SELECT … FROM personas WHERE id = $1 FOR UPDATE`) y recién después leen el estado. Los índices
  únicos parciales (una `pendiente` por Persona y etapa; una Completitud vigente por Persona y
  etapa) son la red de seguridad: si igual se violan, la API responde el código de negocio, no un
  500.
- **Rationale**: mismo patrón que D137/H-142 (bloquear la Persona) y H-140 (índice parcial como
  verdad ante carreras). El bloqueo es corto y por Persona: no hay contención real.

## 6. Bandeja de Solicitudes con un segundo tipo

- **Decision**: `GET /solicitudes` (FR-025 de la 004) une las Solicitudes de Discipulado y las
  Declaraciones de Historial en la **forma base** (`tipo`, `id`, `persona`, `estado`, `fecha`,
  `revisadoPor`, `creadoPor`) más `detalle` por tipo (`etapa` para el historial). Se pagina
  server-side sobre la unión (`UNION ALL` ordenado y paginado en SQL, o dos consultas con
  `take = skip + tamaño` mezcladas en memoria, que alcanza a esta escala — se elige la segunda por
  simple y se deja el comentario H-42). El filtro por tipo, oculto mientras había uno solo, se
  muestra (FR-012). Cada fila enlaza a su detalle por tipo (`/solicitudes/[id]` o
  `/solicitudes/historial/[id]`).
- **Rationale**: FR-025a de la 004 dejó la resolución específica por tipo a propósito; esto suma
  el segundo tipo sin abstraer la resolución.
- **Alternatives**: una pantalla aparte "Historial previo" — descartada: la bandeja unificada
  existe justo para no tener una cola por tipo (`docs/14`).

## 7. Aviso de posible duplicado: cómo se compara

- **Decision**:
  - **Teléfono**: `normalizarTelefono` en `shared-types` — solo dígitos; si el código de país es
    `54`, se quita el `9` de celular que sigue al 54, y un `15` después del código de área no se
    intenta interpretar (el input estructurado de D90 ya no lo permite). Se compara contra
    `normalizarTelefono(persona.telefono)`. Para no recorrer la tabla, la API filtra por los
    **últimos 8 dígitos** con un índice (columna calculada no; `telefono` ya se guarda en el
    formato del input estructurado, y se agrega `@@index([telefono])`; la comparación fina se hace
    en memoria entre los candidatos).
  - **Nombre + apellido + fecha**: se buscan las Personas con la misma `fechaNacimiento`
    (`@@index([fechaNacimiento])`, pocas filas por fecha) y se comparan `normalizarNombre(nombre)`
    y `normalizarNombre(apellido)` en la API: minúsculas, sin tildes (`NFD` + quitar marcas),
    espacios colapsados.
  - Se incluyen Personas con `activo = false`, marcadas como inactivas.
- **Rationale**: D145 pide exactamente esas dos condiciones. Comparar en la API evita depender de
  la extensión `unaccent` de Postgres (no instalada) y mantiene la normalización en un solo lugar
  testeable. A la escala de una iglesia, los candidatos por fecha o por sufijo de teléfono son un
  puñado.
- **Alternatives**: `pg_trgm`/similitud difusa — descartado: D145 no pide parecidos, pide
  iguales; un aviso con falsos positivos difusos le enseña al Admin a ignorarlo.

## 8. Forma del aviso de duplicado en la API

- **Decision**: `POST /personas/alta` con el cuerpo del alta y `confirmarPosibleDuplicado?:
  boolean`. Sin confirmación y con coincidencias → **409** Problem Details con `code:
  POSIBLE_DUPLICADO` y `coincidencias: CoincidenciaDuplicado[]` (extensión del Problem Details,
  como `discipulados` en `DISCIPULADOR_TIENE_DISCIPULADOS_ACTIVOS`). Con `true` → crea. La
  búsqueda se repite en el segundo envío (si apareció una coincidencia nueva entre medio, igual
  crea: el Admin ya confirmó que es otra persona).
- **Rationale**: un solo endpoint, sin estado intermedio en el servidor; el formulario conserva
  los datos y reenvía. Un endpoint aparte "chequear duplicados" se descartó: dos llamadas que
  pueden divergir y la regla en dos lugares.

## 9. Validaciones del alta = las del registro

- **Decision**: extraer de `RegistroPersonaDto` y de `use-formulario-registro.ts` las reglas que
  hoy comparten (requeridos, `TELEFONO_REGEX`, `profesionDetalle` si `otro`, rangos de fecha) a
  `packages/shared-types/src/registro.ts` (`erroresDeDatosPersonales(datos)` → `{campo, code}[]`).
  `AltaPersonaDto` extiende la base de datos personales con `email?` y `consentimiento: true`. El
  formulario del backoffice usa los mismos componentes de campo de `packages/ui` (`CampoTelefono`,
  `CampoFecha`) y, si algún paso del registro tiene un componente propio de `apps/web` que el alta
  necesita (selector de profesión, de tiempo congregándose), se baja a `packages/ui`.
- **Rationale**: FR-031 ("mismas validaciones, en un solo lugar") y Principio XI (H-33 fue
  exactamente esto: `TELEFONO_REGEX` duplicada).
- **Alternatives**: reusar el wizard de 4 pasos (D94) en el backoffice — descartado: D94 es para
  quien se registra sola; el Admin carga datos que ya tiene y una sola página con secciones es más
  rápida (SC-007).

## 10. `Persona.email` opcional

- **Decision**: `email String? @unique` (Postgres permite varios `NULL` en un índice único). Se
  normaliza (`trim` + minúsculas) al guardar en alta y en "Agregar email". Tipos compartidos:
  `email: string | null` donde la Persona puede venir del alta. `GET /personas/by-email` y el
  `callback` de NextAuth no cambian: buscan un email concreto, que nunca iguala `NULL`. Auditoría
  de usos: `persona.service.ts` (selects, `buscarPersonas` — el `contains` sobre `NULL` no
  coincide, correcto), `roles.service.ts` y `cambio-de-rol` (si muestran email), listado de
  Personas, panel de roles, `PedirEnNombreDe` (muestra email en el resultado), y cualquier
  `persona.email!`.
- **Rationale**: D145. El riesgo es un `.toLowerCase()` sobre `null` en una pantalla; la tarea de
  auditoría tiene un `grep` como criterio de terminado.

## 11. Pantallas del Discipulador: mover, no copiar; cliente de API y sesión de la web

- **Decision**: `git mv` de `apps/backoffice/src/app/{mis-discipulados,mi-disponibilidad}` a
  `apps/web/src/app/(app)/`. Ajustes: el `auth()` y el `apiToken` de la sesión de la web (ya
  existen, D135), `requerirPermiso` nuevo en `apps/web/src/auth.ts` (mismo resolutor
  `tienePermiso` de `shared-types`), mensajes movidos al `es.json` de la web, el layout de la
  app (sin menú lateral), migas de pan según `docs/15`. `PedirEnNombreDe` (lo usa también la
  bandeja del Admin) baja a `packages/ui`, recibiendo `buscar` y `enviar` por props (no conoce
  `apiFetch` con token ni Next). `panel-motivo.tsx`, `formulario-encuentro.tsx`,
  `editar-periodo.tsx` y `comun.ts` son solo del Discipulador: se mueven.
- **Rationale**: Principio XI y FR-026. `packages/ui` no depende de Next (D113 y el patrón de
  `Paginacion`).

## 12. D150 en la web app

- **Decision**: si al implementar `main` no tiene todavía el default de 44 px / 16 px en `apps/web`,
  la tarea T005 lo hace: el `Button` de `packages/ui` gana un tamaño `app` (h-11, `text-base`) y
  `apps/web` lo usa como default vía un wrapper o la variante por defecto según cómo lo haya
  dejado `packages/ui` (el backoffice no cambia); las etiquetas y ayudas de formularios de la web
  pasan a `text-base`. Se actualiza `docs/15` §Celular. Si ya existe, T005 se cierra sin cambios.
- **Rationale**: D150 lo pide "en la tarea que lo implemente"; esta spec mueve tres pantallas al
  celular y no puede esperar a otra.

## 13. Proyecto `celular` de Playwright en la web app

- **Decision**: se agrega `{ name: 'celular', grep: /@celular/, use: devices['Pixel 7'] }` a
  `apps/web/playwright.config.ts`, igual que el backoffice; los e2e del Discipulador y de Mi
  camino llevan `@celular`. Se suma un caso con viewport de 375 px de ancho (SC-005) para el
  chequeo de scroll horizontal.
- **Rationale**: FR-027, SC-005; las pantallas movidas ya tenían su e2e de celular en el
  backoffice (FR-046 de la 004).

## 14. Backoffice: redirecciones y pantalla terminal

- **Decision**: `apps/backoffice/src/app/mis-discipulados/page.tsx`, `[id]/page.tsx`,
  `mi-disponibilidad/page.tsx` y `mis-grupos/page.tsx` pasan a hacer `redirect()` a
  `${NEXT_PUBLIC_WEB_APP_URL}/mis-discipulados[/id]`, `/mi-disponibilidad` y `/mi-camino`. Se
  sacan sus entradas de `NAV_BACKOFFICE` (y del recorrido de axe). La pantalla terminal de
  `itemDeAterrizaje === null` (H-134, ya existe para una cuenta sin rol) cambia su texto según el
  caso: si la sesión tiene `discipulador` o `lider_curso`, "Tus discipulados y tu disponibilidad
  están en la app" + "Ir a la app"; si no tiene ningún rol, el texto actual. Variable nueva en
  `.env.example` y en `specs/revision-manual/COMO-ARRANCAR.md` (`http://localhost:3001` en local,
  D104).
- **Rationale**: ver Decisión nueva 5. Un `redirect` server-side evita pintar la pantalla vieja.
