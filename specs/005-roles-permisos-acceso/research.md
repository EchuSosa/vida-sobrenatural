# Research: Roles, permisos y acceso al backoffice

Sin `NEEDS CLARIFICATION` en Technical Context — el stack ya está establecido en el monorepo y
las tres sesiones previas (`/speckit.specify`, `/speckit.clarify`) ya resolvieron toda ambigüedad
de negocio. Este documento registra las decisiones de **diseño técnico** necesarias para pasar de
los requisitos funcionales a `data-model.md`/`contracts/`, con la alternativa considerada y por
qué se descartó.

## 1. Dónde vive el catálogo de permisos (D132, Historia 3)

**Decisión**: `packages/shared-types/src/permisos.ts` — un mapa `Record<Permiso, RolDeCargo[]>`
en TypeScript plano, exportado junto al resto de valores/tipos compartidos (`persona.ts`,
`sede.ts`, etc., mismo paquete que ya compila para los tres proyectos, Principio XI).

**Rationale**: Es el único lugar que tanto `apps/api` como `apps/backoffice` ya importan por
convención (`@vida-sobrenatural/shared-types`). Vivir ahí, y no en `apps/api` con el backoffice
importándolo vía HTTP, es lo que permite que el backoffice decida qué mostrar sin una llamada de
red extra — la API sigue siendo la única que **autoriza** de verdad (Principio V), el backoffice
solo lee el mismo catálogo para no ofrecer una acción que la API va a rechazar.

**Alternativas consideradas**:
- Tabla en base de datos, editable por el Admin — descartada explícitamente por D132 (ver su
  rationale en `docs/05-decisiones.md`: compra poco, cuesta pantalla de administración, semillas,
  migración, riesgo de que el Admin se deje afuera a sí mismo).
- Endpoint de la API que devuelve el catálogo en runtime, consultado por el backoffice — se
  descarta por ahora: agrega una llamada de red y un estado de carga extra a cada decisión de UI
  sin necesidad, cuando el catálogo cambia solo con un deploy de todas formas (mismo argumento de
  D132 contra la tabla editable, aplicado a este caso).

## 2. Cómo se declara el permiso requerido por un endpoint/pantalla (Historia 3, FR-014/FR-015)

**Decisión**: Reemplazar `@Roles(...)` por `@RequierePermiso(permiso: Permiso)` en la API — el
decorador ya no recibe roles literales, recibe una clave del catálogo. `RolesGuard` se extiende
(o se reemplaza por `PermisosGuard`) para resolver `CATALOGO_PERMISOS[permiso]` a la lista de
roles antes de chequear `request.user.rol`. Los 18 sitios existentes migran uno a uno.

**Rationale**: Es el cambio mínimo que cumple D132 sin reescribir el mecanismo de autenticación
(`JwtNextAuthGuard` sigue igual) ni el shape de `request.user.rol` (sigue siendo `string[]`,
Principio IV: no tocar lo que no hace falta tocar).

**Alternativas consideradas**: Un servicio de autorización centralizado invocado a mano dentro de
cada controller (en vez de un decorador + Guard) — descartado porque pierde la ventaja actual de
`@Roles` (declarativo, visible en la firma del endpoint, documentado por Swagger) sin ganar nada
a cambio.

## 3. Cómo protege una pantalla del backoffice (Historia 4, FR-016/FR-017)

**Decisión de dos partes**:
1. `requerirPermiso(permiso)` en `apps/backoffice/src/auth.ts`, hermano de `requerirSesion()`
   (H-116) — llama primero a `requerirSesion()`, después chequea el permiso contra el mismo
   `CATALOGO_PERMISOS`, y usa `notFound()` igual que `requerirSesion()` si no lo tiene (mismo
   criterio ya documentado ahí: evitar log de stack trace en un caso esperado y frecuente).
2. Un registro explícito `apps/backoffice/src/permisos-por-pantalla.ts` que mapea cada ruta a un
   `Permiso` o al valor explícito `'cualquier-sesion'` (para pantallas como la Historia 5, el
   Pastor, o pantallas sin restricción de rol) — y un test que recorre
   `apps/backoffice/src/app/**/page.tsx` y falla si alguna ruta no tiene entrada.

**Rationale**: El chequeo de sesión (H-116) resolvió su parte con un guard centralizado en el
layout porque la pregunta es binaria y aplica a *todas* las pantallas por igual. El chequeo de
**permiso** no puede vivir solo en el layout porque cada pantalla necesita uno *distinto* (o
ninguno) — por eso hace falta la combinación de un helper (para no repetir el chequeo a mano,
FR-016) *más* un registro auditable (para que "me olvidé de escribirlo" se note, FR-017: un
`page.tsx` nuevo que no aparece en el registro es indistinguible de un error hasta que el test lo
marca). Un enfoque solo-ESLint (como `no-session-check-en-page`) no alcanza acá porque esa regla
prohíbe un patrón; esta necesita *exigir la presencia* de una entrada, que es más fácil de
expresar como test sobre el sistema de archivos que como regla de AST.

**Alternativas consideradas**: Middleware de Next.js (`middleware.ts`) centralizado con un mapa
ruta→permiso — se descarta por ahora porque el middleware de Next corre en el Edge runtime, más
restringido, y el repo no lo usa hoy para nada relacionado a auth (la sesión ya se resuelve en el
layout, Server Component); introducir un mecanismo de enforcement nuevo y distinto duplicaría en
vez de extender lo que H-116 ya estableció.

## 4. El comando CLI para el Admin sembrado (Historia 1, D130/D131, FR-001 a FR-004)

**Decisión**: `apps/api/scripts/recrear-admin.ts`, un script `tsx` en la línea de
`sembrar-e2e-admin.ts` (ya existente) — recibe un email por variable de entorno o argumento,
crea la Persona si no existe o le agrega el rol `admin` si ya existe, y marca
`adminSembrado = true`. Se agrega como script de `apps/api/package.json` (ej.
`db:recrear-admin`). El camino de instalación de una iglesia nueva (FR-001) reusa el mismo script
en su primera corrida — no hace falta un comando separado para "instalar" vs. "recuperar acceso",
es la misma operación idempotente en dos momentos distintos.

**Rationale**: El repo ya resolvió "cómo se ejecuta una tarea puntual contra Prisma sin pasar por
un endpoint HTTP" con este patrón (`contar.ts`, `limpiar-e2e.ts`, `sembrar-e2e-admin.ts`) — Principio XI
pide no reinventarlo. No se necesita `nest-commander` ni ningún framework de CLI nuevo.

**Alternativas consideradas**: Un endpoint de la API protegido por un secreto de infraestructura
(ej. un token de "bootstrap") — se descarta porque exige que la API esté corriendo y accesible por
red para poder arrancarla (problema de huevo y gallina si el Admin sembrado es justo lo que falta
para operar el sistema), mientras que un script contra la base de datos funciona incluso con la
API caída, que es exactamente el escenario de "se perdió el acceso de todos los Admin" (Historia
1, Acceptance Scenario 3).

**Nota para `tasks.md`**: D130 pide explícitamente que esto quede documentado como parte de
*instalar el sistema para una iglesia*, no como utilidad de desarrollo — `specs/revision-manual/COMO-ARRANCAR.md`
es hoy el atajo de entorno de desarrollo (usa `SEED_ADMIN_EMAIL` sobre el seed completo, H-12), no
sirve como ese documento. Hace falta decidir en `tasks.md` si esto se documenta en un archivo
nuevo (ej. `docs/18-instalacion.md`) o como una sección nueva de un doc existente — no se decide
en este plan, es una tarea de documentación con entregable propio.

## 5. Indegradabilidad del Admin sembrado (FR-002)

**Decisión**: Campo `Persona.adminSembrado: Boolean @default(false)`, seteado únicamente por
`recrear-admin.ts` (nunca por la app en runtime). El servicio de otorgar/quitar rol (FR-006/FR-007)
rechaza cualquier intento de quitar `admin` o desactivar (`activo = false`) a una Persona con
`adminSembrado = true`, sin importar quién lo pida — incluida ella misma (consistente con FR-010,
que ya prohíbe la auto-revocación de `admin` en general).

**Rationale**: Un flag explícito en el modelo es más simple y más auditable que inferir "es el
Admin sembrado" de otra señal (ej. "el primer admin creado", que se rompe si se recrea con
`recrear-admin.ts` más de una vez, o si hay más de una iglesia/instalación en el futuro — aunque
eso esté fuera de alcance por D130, un flag explícito no depende de esa suposición para ser
correcto).

## 6. Auditoría de cambios de rol (Historia 6, FR-022/FR-023)

**Decisión**: Modelo Prisma nuevo `CambioDeRol` — filas append-only (nunca se editan ni se
borran, ni siquiera con soft delete: son un hecho histórico, no un recurso con ciclo de vida,
Principio III no aplica de la misma forma que a una entidad de negocio). Campos: quién ejecutó la
acción (`realizadoPorId`), sobre quién (`personaId`), qué rol, si fue otorgado o quitado, cuándo.

**Rationale**: Es el modelado más directo de "quién hizo qué cambio y cuándo" (la pregunta de
`docs/06-preguntas-abiertas.md`, acotada a roles) — no hace falta un sistema de auditoría genérico
(explícitamente fuera de alcance) para resolver este caso puntual con una tabla dedicada.

## 7. La restricción de edad para roles de cargo (D133, FR-011/FR-024)

**Decisión (revisada, H-128)**: Reusar `calcularEdad()` de `apps/api/src/persona/calcular-edad.ts`
tal cual — esa parte de la decisión original queda igual. **No** reusar `EDAD_MINIMA` (la
constante existente en `apps/api/src/persona/persona.service.ts:16`). En su lugar, se define una
constante propia para esta regla, `EDAD_MINIMA_ROL_DE_CARGO` (mismo valor, 18, pero con nombre e
identidad propios), que vive en **`packages/shared-types`** (junto al resto de valores
compartidos de Persona, ej. `persona.ts`), no en la API.

**Rationale — por qué no `EDAD_MINIMA`**: verificado en el código, `EDAD_MINIMA` ya carga dos
significados distintos en ese mismo archivo — el umbral de auto-registro (línea 145) y "el tutor
tiene que ser mayor de edad" (línea 347). Sumarle un tercer significado (D133: quién puede recibir
un rol de cargo) haría que tres reglas de negocio independientes compartan un número por
**coincidencia**, no por compartir motivo. Es la forma de H-122 (`breaks: false`): si el día de
mañana la iglesia decide que alguien de 16 años puede auto-registrarse con autorización del
tutor, quien cambie `EDAD_MINIMA` por *ese* motivo movería con él, en silencio, la regla de
protección de D133 — un menor de 16 pasaría a poder recibir un rol de cargo sin que nadie haya
decidido eso. El nombre `EDAD_MINIMA_ROL_DE_CARGO` es en sí mismo el arreglo: dice su motivo y
deja que las tres reglas se muevan por separado aunque hoy coincidan en el valor.

**Rationale — por qué en `packages/shared-types` y no como constante local de la API**: FR-024
exige que el listado de Personas del backoffice también excluya a los menores de edad. Si
`EDAD_MINIMA_ROL_DE_CARGO` quedara como constante local de un servicio de `apps/api`, y el
backoffice necesitara el mismo umbral (para un mensaje explicativo, para no ofrecer la acción de
"otorgar rol" antes de siquiera llamar a la API, o para cualquier chequeo del lado del cliente),
alguien la volvería a escribir en el backoffice — exactamente la duplicación de la misma regla en
dos apps que D132 existe para evitar, ahora "en chiquito" sobre esta constante puntual en vez de
sobre la matriz completa de permisos. Vivir en `packages/shared-types` es consistente con cómo
este mismo spec ya trata el catálogo de permisos (research.md #1): un valor de dominio que
consumen las dos apps vive una sola vez, en el paquete que las dos ya importan (Principio XI). La
función `calcularEdad()` en sí sigue en `apps/api` (opera sobre `Date`, lógica de servidor sobre
un dato que solo la API valida de forma autoritativa) — lo que se comparte es el **umbral**, no el
cálculo.
