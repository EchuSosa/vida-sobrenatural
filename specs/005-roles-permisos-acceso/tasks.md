# Tasks: Roles, permisos y acceso al backoffice

**Input**: Design documents from `/specs/005-roles-permisos-acceso/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: no pedidos explícitamente en el spec, pero la Constitución (Principio VI) exige test
unitario para lógica de negocio con ramas, test de integración para cambios en cascada contra la
base, y e2e para flujos críticos — se incluyen con ese criterio, no exhaustivos.

**Organización**: agrupadas por historia de usuario (spec.md), en su orden de prioridad.

## Hallazgos de esta sesión que cambian el plan (ya corregidos en research.md/data-model.md/contracts/, resumidos acá para quien lea las tareas)

Verificando el plan contra el código antes de generar las tareas aparecieron tres conflictos que
no existían al escribir `research.md` la primera vez — los tres ya están corregidos en los
documentos del plan; las tareas de abajo ya asumen la versión corregida:

1. **`GET /personas/buscar` ya existe** (`persona.controller.ts`, H-29/D108, para elegir tutor) —
   no es un endpoint nuevo de este spec. Se **extiende**, no se duplica (contracts/roles-personas-api.md).
   **Corregido al implementar la Historia 2**: se extiende solo con `rol` (T017) y la migración de
   permiso (T025). El listado de FR-005 y el filtro de FR-024 **no** van en `/buscar` sino en un
   endpoint propio, `GET /personas?soloMayores=true` — `/buscar` es el buscador de tutor, con otra
   regla de edad, y el listado va a ser la vista de Flujo 9, donde los menores sí aparecen
   (contracts/roles-personas-api.md, "Corrección de FR-024").
2. **`NAV_BACKOFFICE` (`apps/backoffice/src/config/nav.ts`) ya es el registro ruta→acceso** que
   Historia 4 necesita — usado hoy por el sidebar y por el smoke de accesibilidad
   (`axe-todas-las-rutas.spec.ts`). Se **extiende** (campo `roles` → `permiso`), no se crea un
   `permisos-por-pantalla.ts` nuevo (habría sido la misma duplicación que este spec existe para
   eliminar, cometida por el propio spec).
3. **`apps/backoffice` no tiene Jest configurado.** La verificación mecánica de FR-017 se
   construye como una regla de ESLint (`eslint-rules/pantalla-declara-permiso.mjs`, misma familia
   que `no-session-check-en-page.mjs` de H-116), no como un test de Jest.

---

## Phase 1: Setup

- [ ] T001 [P] Crear `packages/shared-types/src/permisos.ts`: `RolDeCargo` (unión de los 4 roles de cargo), `Permiso` (unión vacía por ahora, se completa historia por historia), `CATALOGO_PERMISOS: Record<Permiso, RolDeCargo[]>` vacío — exportar los tres desde `packages/shared-types/src/index.ts`.
- [ ] T002 [P] Agregar `EDAD_MINIMA_ROL_DE_CARGO = 18` a `packages/shared-types/src/persona.ts` (D133/H-128) — constante propia, **no** reutiliza `EDAD_MINIMA` de `apps/api/src/persona/persona.service.ts` (esa ya significa otras dos cosas ahí).
- [ ] T003 [P] Agregar a `packages/shared-types/src/error-code.ts` los códigos nuevos de este spec (Principio X — un código por regla, comentario citando D131/D133/H-127 según corresponda): `PERSONA_MENOR_DE_EDAD_NO_PUEDE_TENER_ROL_DE_CARGO`, `NO_SE_PUEDE_DEGRADAR_AL_ADMIN_SEMBRADO`, `ADMIN_NO_PUEDE_AUTO_REVOCARSE`, `DISCIPULADOR_TIENE_DISCIPULADOS_ACTIVOS`, `DISCIPULADOR_SIN_VERIFICACION_DE_DISCIPULADOS_ACTIVOS`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**⚠️ CRITICAL**: ninguna historia arranca hasta que esta fase esté completa.

- [ ] T004 Extender `apps/api/prisma/schema.prisma`: `Persona.adminSembrado Boolean @default(false)` (data-model.md; FR-002).
- [ ] T005 Generar y aplicar la migración de Prisma para T004 (`pnpm --filter api run db:migrate`).
- [ ] T006 [P] Crear `apps/api/src/auth/permisos.decorator.ts`: `@RequierePermiso(permiso: Permiso)` — mismo patrón `SetMetadata` que `roles.decorator.ts` (depende de T001).
- [ ] T007 Crear `apps/api/src/auth/permisos.guard.ts`: resuelve el permiso requerido contra `CATALOGO_PERMISOS` y compara con `request.user.rol`; si el permiso pedido no existe en el catálogo, **deniega** (fail-closed, Constitution Check Principio V) — depende de T001, T006.
- [ ] T008 [P] Test unitario `apps/api/src/auth/permisos.guard.spec.ts`: un permiso no declarado en el catálogo deniega; un permiso declarado autoriza solo a los roles listados; ningún rol autoriza si `requiredRoles` está vacío (Principio VI) — depende de T007.
- [ ] T009 Extender `apps/backoffice/src/config/nav.ts` (NO crear un archivo nuevo — research.md #3): renombrar `ItemNavBackoffice.roles: RolBackoffice[]` a `permiso: Permiso | 'cualquier-sesion'`; reescribir `itemsParaRoles(roles)` para resolver los roles efectivos de cada ítem vía `CATALOGO_PERMISOS[permiso]` antes de filtrar. Registrar en `CATALOGO_PERMISOS` (T001) un permiso `.ver` por cada ruta **preservando exactamente los roles que ya tiene hoy** (refactor sin cambio de comportamiento): `inicio.ver` (admin,pastor) → `/`; `personas.ver` (admin,pastor) → `/personas`; `pendientes_tutor.ver` (admin,discipulador,pastor) → `/pendientes-tutor`; `solicitudes.ver` (admin,pastor) → `/solicitudes`; `grupos.ver` (admin,pastor) → `/grupos`; `eventos.ver` (admin,pastor) → `/eventos`; `notificaciones.ver` (admin,pastor) → `/notificaciones`; `sedes.ver` (admin,pastor) → `/sedes` y `/sedes/[id]` (agregar esta última con `enMenu:false`, hoy sin entrada); `sedes.papelera.ver` (admin) → `/sedes/papelera`; `palabra_profetica.ver` (admin,pastor) → `/palabra-profetica`; `libros.ver` (admin,pastor) → `/libros` y `/libros/[id]` (agregar con `enMenu:false`, hoy sin entrada); `libros.papelera.ver` (admin) → `/libros/papelera`; `catalogos.ver` (admin,pastor) → `/catalogos`; `mis_discipulados.ver` (discipulador) → `/mis-discipulados`; `mi_disponibilidad.ver` (discipulador) → `/mi-disponibilidad`; `mis_grupos.ver` (lider_curso) → `/mis-grupos`. Depende de T001. **Además, eliminar el tipo `RolBackoffice` de este mismo archivo** (no dejarlo como alias): hoy es una unión de los mismos cuatro valores que `RolDeCargo` (`packages/shared-types`), y con `roles` reemplazado por `permiso` su único uso restante es el cast `session.user.rol as RolBackoffice[]` de `apps/backoffice/src/components/backoffice-shell.tsx` — reemplazar ese cast por `RolDeCargo` importado de `@vida-sobrenatural/shared-types`. Un alias (`type RolBackoffice = RolDeCargo`) evitaría la misma desincronización, pero no aporta nada — no restringe ni documenta un subconjunto distinto de `RolDeCargo` (los cuatro roles de cargo son exactamente los mismos en ambos contextos), así que sería un nombre local sin motivo propio, indirección sin beneficio. Eliminarlo del todo dice lo mismo con menos: un lector de `backoffice-shell.tsx` no tiene que aprender que "RolBackoffice" no es un tipo real, solo un espejo de otro.
- [ ] T010 Extender `apps/backoffice/src/auth.ts`: `requerirPermiso(permiso: Permiso)` — llama primero a `requerirSesion()`, después resuelve `CATALOGO_PERMISOS[permiso]` contra `session.user.rol`, `notFound()` si no lo tiene (mismo criterio que `requerirSesion`, research.md #3). Depende de T001.
- [ ] T011 [P] Verificar (manual o script) que `pnpm --filter backoffice run test:e2e -- axe-todas-las-rutas` sigue en verde tras T009 — el refactor de `nav.ts` no debe cambiar qué ve cada rol en el sidebar.

**Checkpoint**: catálogo, guard/decorator de la API, y registro de rutas del backoffice listos — las historias pueden empezar.

---

## Phase 3: User Story 1 - Instalar la iglesia con un Admin que funciona (Priority: P1) 🎯 MVP

**Goal**: FR-001 a FR-004 — Admin sembrado indegradable + comando CLI de recuperación, documentado como parte de instalar el sistema.

**Independent Test**: instalar desde cero, verificar Admin funcional sin tocar la base a mano; correr el comando en una instalación existente.

**Nota de dependencia cruzada**: verificar que el Admin sembrado es indegradable (Acceptance Scenario 2) requiere el endpoint de quitar rol de la Historia 2 (T021/T023) — el enforcement de FR-002 se construye ahí (misma guarda que FR-010, mismo servicio), no acá. Esta historia entrega el script/CLI y la documentación, que son útiles y verificables por sí solos (Acceptance Scenarios 1, 3, 4) sin depender de la Historia 2.

- [x] T012 [P] [US1] Crear `apps/api/scripts/recrear-admin.ts`: script `tsx` idempotente (mismo patrón que `sembrar-e2e-admin.ts`) — recibe un email, crea la Persona con rol `admin` y `adminSembrado=true` si no existe, o se los agrega/confirma si ya existe (contracts/cli-recrear-admin.md).
- [x] T013 [US1] Agregar el script `db:recrear-admin` a `apps/api/package.json` (ej. `"db:recrear-admin": "tsx scripts/recrear-admin.ts"`) — depende de T012.
- [x] T014 [US1] Documentar el camino de instalación (FR-004): creado como `docs/21-instalacion.md` (el 18 ya estaba ocupado por `18-plan-correccion-rondas-8-9.md`; se siguió la convención de `docs/00-README.md`, que también se actualizó) con los pasos de FR-001 (primera instalación) y FR-003 (recuperación), explícitamente distinto de `specs/revision-manual/COMO-ARRANCAR.md` (atajo de entorno de desarrollo, D130 lo pide separado).
- [x] T015 [US1] Test de integración `apps/api/test/recrear-admin.e2e-spec.ts`: correr el script contra la base de test, verificar que crea la Persona; correrlo de nuevo, verificar que no duplica (idempotencia).
- [x] T016 [US1] Test de integración `apps/api/test/roles-admin-sembrado.e2e-spec.ts`: **depende de T021/T023 (Historia 2)** — `DELETE /personas/:id/roles/admin` sobre una Persona con `adminSembrado=true` devuelve `NO_SE_PUEDE_DEGRADAR_AL_ADMIN_SEMBRADO`, sin importar quién lo pida (Acceptance Scenario 2).

**Checkpoint**: comando CLI y documentación de instalación funcionando; la garantía de indegradabilidad queda verificada en conjunto con la Historia 2 (T016).

---

## Phase 4: User Story 2 - Encontrar y ascender a una Persona a un rol de cargo (Priority: P1)

**Goal**: FR-005 a FR-011, FR-024 — búsqueda de Personas (extendiendo el endpoint existente), otorgar/quitar rol de cargo con las tres reglas de `/speckit.clarify` más el fallo cerrado de H-127.

**Independent Test**: Admin busca una Persona, le otorga y le quita un rol de cargo; verificar los cuatro rechazos (menor de edad, admin sembrado, auto-revocación de admin, discipulador sin verificación).

- [x] T017 [US2] Extender `BUSQUEDA_PERSONA_SELECT` en `apps/api/src/persona/persona.service.ts`: agregar `rol` (para mostrar "roles actuales", FR-005) — no agregar `fechaNacimiento` al select.
- [x] T018 [US2] ~~Extender `buscarPersonas(q)` con el filtro FR-024~~ — **reemplazada al implementar** (contracts/roles-personas-api.md, "Corrección de FR-024"): nuevo `GET /personas` (`persona.controller.ts`, `@RequierePermiso('personas.ver')`) → `PersonaService.listarPersonas(skip, take, buscar, orden, dir, soloMayores)`, paginado en la base (`Pagina<PersonaListado>`, `take` default 20 / máx. 100, búsqueda por nombre/apellido/email/teléfono, orden `apellido|nombre` con desempate estable, solo `activo`). FR-024 es el parámetro **opcional** `soloMayores` (default `false`): `fechaNacimiento: { lt: nacidosAntesDeParaEdad(EDAD_MINIMA_ROL_DE_CARGO) }`, helper nuevo en `calcular-edad.ts` con el mismo corte exacto que `calcularEdad()` (incluido el 29/2), para que Postgres filtre sin traer de más (H-42). Tipo `PersonaListado` nuevo en `packages/shared-types`. `buscarPersonas` **no** filtra por edad (D133 no gobierna la búsqueda de tutor). Depende de T002, T017.
- [x] T019 [US2] Tests unitarios en `apps/api/test/unit/persona-listado.spec.ts` (no existe `persona.service.spec.ts`; los de `PersonaService` viven en `test/unit/`): `nacidosAntesDeParaEdad` coincide con `calcularEdad` (incluido 29/2 con año de corte no bisiesto); `listarPersonas` sin `soloMayores` no filtra por fecha, con `soloMayores` filtra en la base con el corte de FR-024, busca/ordena en la base con desempate, devuelve `{ items, total }`; `buscarPersonas` devuelve `rol` sin `fechaNacimiento` (T017) y **no** filtra por edad. Los tests existentes de `buscarPersonas` (`persona-estado.spec.ts`) no cambian.
- [x] T020 [P] [US2] Crear `apps/api/src/persona/dto/otorgar-rol.dto.ts`: `{ rol: RolDeCargo }` con `class-validator` (`@IsIn` de los 4 valores).
- [x] T021 [US2] Crear `apps/api/src/persona/roles.service.ts`, método `otorgarRol(personaId, rol, adminId)`: FR-006 (independiente de cualquier otro paso); FR-011 (rechaza si `calcularEdad(persona.fechaNacimiento) < EDAD_MINIMA_ROL_DE_CARGO`, código `PERSONA_MENOR_DE_EDAD_NO_PUEDE_TENER_ROL_DE_CARGO`); si ya tiene el rol, no duplica, responde éxito idempotente (Edge Case de spec.md). Depende de T002, T020.
- [x] T022 [US2] Mismo archivo, método `quitarRol(personaId, rol, adminId)`: FR-007; **FR-002** — rechaza (`NO_SE_PUEDE_DEGRADAR_AL_ADMIN_SEMBRADO`) si la Persona destino tiene `adminSembrado=true` y `rol=admin`; **FR-010** — rechaza (`ADMIN_NO_PUEDE_AUTO_REVOCARSE`) si `rol=admin` y `personaId === adminId` (no aplica a otros roles de cargo); **FR-009/H-127** — si `rol=discipulador`, rechaza **siempre** por ahora (`DISCIPULADOR_SIN_VERIFICACION_DE_DISCIPULADOS_ACTIVOS`, fallo cerrado — la consulta real contra el spec 004 todavía no existe, contracts/roles-personas-api.md). Depende de T021 (mismo archivo).
- [x] T023 [P] [US2] Test unitario `apps/api/src/persona/roles.service.spec.ts`: cubre las cuatro ramas de negocio de T021/T022 (menor de edad, admin sembrado, auto-revocación de admin, discipulador fallo cerrado) más el caso idempotente de otorgar un rol ya existente y el caso "quitar otro rol de cargo de uno mismo si permitido" (Principio VI). Depende de T021, T022.
- [x] T024 [US2] Crear `apps/api/src/persona/roles.controller.ts` (`@Controller('personas')`, junto a `PersonaController` en el mismo módulo): `POST /personas/:id/roles` y `DELETE /personas/:id/roles/:rol`, ambos con `@RequierePermiso('personas.gestionar_roles')`. Registrar `personas.gestionar_roles: ['admin']` en `CATALOGO_PERMISOS` (T001). Depende de T006, T007, T021, T022.
- [x] T025 [US2] Migrar el `@Roles('admin', 'discipulador')` de `GET /personas/buscar` (persona.controller.ts) a `@RequierePermiso('personas.buscar')`; registrar `personas.buscar: ['admin', 'discipulador']` en `CATALOGO_PERMISOS` (sin cambiar quién puede buscar — solo cómo se declara, contracts/roles-personas-api.md). Depende de T006, T007.
- [x] T026 [US2] Test de integración `apps/api/test/roles-personas.e2e-spec.ts`: otorgar un rol, acumularlo y quitarlo conservando los demás; rechazar un rol que no es de cargo; los cuatro rechazos con su código propio (menor de edad aunque esté `activa`, admin sembrado, auto-revocación, discipulador); permisos (otorgar/quitar solo Admin — un Pastor recibe 403 sin cambios; `GET /personas/buscar` abierto a admin/discipulador y cerrado a pastor; `GET /personas` para admin/pastor y no discipulador); `GET /personas?soloMayores=true` excluye a la menor en items y total, sin el parámetro la incluye, paginación y orden en la base; `GET /personas/buscar` sigue siendo un arreglo, trae `rol` y **no** filtra por edad. Depende de T024, T025.
- [x] T027 [US2] Reescribir `apps/backoffice/src/app/personas/page.tsx` (hoy un placeholder `EstadoVacio`, fuera de alcance la vista unificada completa de Flujo 9): Server Component con `requerirPermiso('personas.ver')` que consume `GET /personas` (T018) **pidiendo `soloMayores=true`** (FR-024 lo pide la pantalla, no lo impone el endpoint — la descripción de la pantalla aclara que no lista menores). Patrón de listado paginado de `pendientes-tutor/page.tsx` (H-101): `q`, `orden`, `dir` y `pagina` en la URL, resueltos por la API, redirect de un `?pagina=` inválido o fuera de rango; `TAMANIO_PAGINA` en `constantes.ts`; `loading.tsx` y `error.tsx` propios (Principio VIII); `puedeGestionarRoles` calculado con `tienePermiso(..., 'personas.gestionar_roles')` de `packages/shared-types`. Depende de T009, T010, T018, T024, T025.
- [x] T028 [US2] Crear `apps/backoffice/src/app/personas/personas-cliente.tsx`: Client Component con la tabla de resultados y, **solo si la sesión tiene el permiso `personas.gestionar_roles`** (chequeo vía `CATALOGO_PERMISOS`, no un `rol.includes` a mano), un modal por fila para otorgar/quitar un rol de cargo — muestra los cuatro mensajes de rechazo (T003) de forma legible, no un 403 genérico. Depende de T027.
- [ ] T029 [US2] Verificar `apps/backoffice/src/app/personas/page.tsx`/`personas-cliente.tsx` contra el checklist de `docs/15-guia-ux-ui.md` (cuatro estados, una sola acción principal, orden de botones, tono, teclado/lector de pantalla, contraste en los dos temas). **Recorrida al cerrar la Historia 3 — queda abierta por un punto**: estados (cargando/vacío con y sin búsqueda/error/éxito), acción principal, confirmación antes de quitar, bloqueo de reentrada (`useEnvio`, H-57), toast de éxito, tono, celular y contraste en los dos temas (axe) cumplen. **Teclado: el foco entra al modal al abrir y Escape lo devuelve al botón, pero no queda atrapado** — un Tab después del último control sale al "Saltar al contenido" de la página de atrás (verificado con teclado real de Playwright). Pasa igual en el diálogo de Activar de pendientes-tutor: es el `Sheet` compartido de `packages/ui`, no esta pantalla — se arregla ahí, como hallazgo propio.

**Checkpoint**: Historia 2 funcional de punta a punta (con T016 de la Historia 1 verificando la indegradabilidad del Admin sembrado sobre este mismo endpoint).

---

## Phase 5: User Story 3 - Que la interfaz y la API nunca discrepen sobre quién puede hacer qué (Priority: P1)

**Goal**: FR-012 a FR-015 — migrar los 18 `@Roles` existentes y los chequeos ad hoc del backoffice al catálogo único.

**Independent Test**: cambiar quién tiene un permiso existente en un solo lugar y verlo reflejado en la API y el backoffice a la vez (el caso D129).

- [x] T030 [P] [US3] Migrar `apps/api/src/libro/libro.controller.ts`: reemplazar los 7 `@Roles('admin')` por `@RequierePermiso('libros.gestionar')`; registrar `libros.gestionar: ['admin']` en `CATALOGO_PERMISOS`.
- [x] T031 [P] [US3] Migrar `apps/api/src/palabra-profetica/palabra-profetica.controller.ts`: reemplazar los 3 `@Roles('admin', 'pastor')` por `@RequierePermiso('palabra_profetica.editar')`; registrar `palabra_profetica.editar: ['admin', 'pastor']` (D129 ya implementado — esta migración no cambia el resultado, solo su fuente).
- [x] T032 [P] [US3] Migrar `apps/api/src/persona/persona.controller.ts`: los `@Roles('admin', 'discipulador')` de `GET /pendientes-tutor`, `PATCH /:id/activar` y `PATCH /:id/marcar-inactiva` a `@RequierePermiso('pendientes_tutor.gestionar')`; registrar `pendientes_tutor.gestionar: ['admin', 'discipulador']`. (El cuarto `@Roles` de este controller, `GET /buscar`, ya se migró en T025 de la Historia 2 — no repetir.)
- [x] T033 [P] [US3] Migrar `apps/api/src/sede/sede.controller.ts`: reemplazar los 4 `@Roles('admin')` por `@RequierePermiso('sedes.gestionar')`; registrar `sedes.gestionar: ['admin']`.
- [x] T034 [US3] Migrar `apps/backoffice/src/app/libros/page.tsx`, `libros/[id]/page.tsx` y `libros/papelera/page.tsx`: reemplazar el `if (!rol.includes('admin') && !rol.includes('pastor'))` a mano por `requerirPermiso('libros.ver')` (ya registrado en T009); las acciones de editar/eliminar/portada dentro de la pantalla se condicionan a `libros.gestionar` (T030), no a `libros.ver`. **Corregida al implementar (H-129)**: `libros/papelera/page.tsx` va con `requerirPermiso('libros.papelera.ver')` (`['admin']`, registrado en T009 y el mismo que le asigna `nav.ts`), **no** con `libros.ver` — la papelera es del Admin. `libros/page.tsx` y `libros/[id]/page.tsx` sí van con `libros.ver`.
- [x] T035 [US3] Migrar `apps/backoffice/src/app/palabra-profetica/page.tsx`: mismo patrón — `requerirPermiso('palabra_profetica.ver')` para la pantalla, `palabra_profetica.editar` (T031) para las acciones (siguen incluyendo a `pastor`, D129).
- [x] T036 [US3] Migrar `apps/backoffice/src/app/sedes/papelera/page.tsx`: reemplazar el `try/catch` de `SIN_PERMISO` por `requerirPermiso('sedes.papelera.ver')` — decisión de este spec: chequear antes de pedir los datos, no reaccionar al error después (mismo criterio que las demás pantallas protegidas, FR-016). **No alcanza por sí sola (H-129)**: `GET /sedes?estado=papelera` era público, así que el `catch` de `SIN_PERMISO` nunca se disparaba y la pantalla dejaba entrar a cualquier sesión — cerrar la pantalla sin cerrar la API sería cosmético. La API se cierra en T064.
- [x] T037 [US3] Verificar con `grep -rn "@Roles(" apps/api/src/` que da cero resultados (SC-005) y con una revisión manual que ningún archivo de `apps/backoffice` declara una lista de roles propia fuera de lo que resuelve `requerirPermiso`/`itemsParaRoles` (FR-013). **Al implementar**: el grep se queda pero no prueba la migración (pasa igual con los roles equivocados en el catálogo — la forma de H-118); lo que la prueba es el diff antes/después de quién alcanza cada endpoint y cada pantalla. La "revisión manual" se reemplaza por la regla mecánica de T066.
- [x] T038 [US3] Verificar T034/T035/T036 contra el checklist de `docs/15-guia-ux-ui.md` — el mecanismo de protección cambia, el contenido visual no; confirmar que ningún estado (cargando/vacío/error/éxito) se rompió con el cambio.

**Tareas agregadas al implementar — H-129** (`specs/revision-manual/2026-09-17-001-002.md`): las dos papeleras no estaban protegidas en la API, y tres lugares afirmaban que sí. La intención siempre fue Admin (`nav.ts`, Swagger, el comentario de la pantalla); esto la hace cumplir, no decide nada nuevo.

- [x] T064 [US3] Cerrar las papeleras en la API: `GET /sedes/papelera` (`@RequierePermiso('sedes.papelera.ver')`) y `GET /libros/papelera` (`@RequierePermiso('libros.papelera.ver')`), rutas propias declaradas antes de `:id`, con la misma forma de respuesta que tenía `?estado=papelera` (`Sede[]` / `Pagina<Libro>`). `GET /sedes` y `GET /libros` siguen públicos sin ningún guard (el catálogo público no cambia) y `estado=papelera` pasa a responder 400 `VALIDACION` (`campo: estado`, `ESTADO_INVALIDO`) — no un fallback silencioso a `activas`, que haría que un cliente viejo mostrara registros activos como si fueran la papelera. Criterio: la autorización queda en la metadata de la ruta (visible en Swagger, en el guard y en cualquier auditoría), no en una rama sobre el valor de un parámetro. Actualizar los tests de integración de sedes/libros que usaban `?estado=papelera` y agregar el rechazo (sin sesión 401, Pastor 403, Admin 200, `?estado=papelera` 400). Las dos pantallas pasan a llamar a las rutas nuevas. Depende de T030, T033.
- [x] T065 [US3] Corregir los textos que afirmaban una protección inexistente (H-129): la descripción de Swagger de `GET /sedes` ("vista del Admin"), el comentario de `sedes/papelera/page.tsx` ("Gateado por rol en el backend"), el de `sede.service.ts` ("la papelera sí la gatea el controller"), el de `libro.controller.ts` ("sin guard nuevo") y los JSDoc de `eliminadoEn` en `packages/shared-types` (`sede.ts`, `libro.ts`) que nombran `?estado=papelera`. Cada uno pasa a describir lo que el código hace.
- [x] T066 [US3] Regla de ESLint `eslint-rules/sin-rol-de-sesion-en-pantallas.mjs`, cableada en `apps/backoffice/eslint.config.mjs`: prohíbe leer `session.user.rol` (acceso directo o desestructurado) fuera de `src/auth.ts` y `src/components/backoffice-shell.tsx`, para que toda decisión de acceso pase por `requerirPermiso`/`tienePermisoSesion` (FR-013). Mira el acceso a `.rol`, no los nombres de los roles: cubre `rol.includes(...)`, `rol.some(...)` y cualquier variante futura. Es lo que vuelve mecánica la segunda mitad de T037. Verificar que falla sobre el código previo a T034/T035 y pasa después.

**Checkpoint**: catálogo único gobernando los 18 sitios de la API y los 5 de backoffice que hoy declaraban un rol a mano.

---

## Phase 6: User Story 4 - Ninguna pantalla nueva del backoffice nace sin protección por rol (Priority: P2)

**Goal**: FR-016/FR-017 — mecanismo uniforme (`requerirPermiso`, ya construido en Foundational) + detección mecánica de una pantalla sin declarar.

**Independent Test**: pantalla de prueba protegida por un permiso del catálogo; un rol sin ese permiso queda afuera; una pantalla sin entrada en `NAV_BACKOFFICE` hace fallar el lint.

- [x] T039 [US4] Crear `eslint-rules/pantalla-declara-permiso.mjs` (misma familia que `no-session-check-en-page.mjs`, H-116): recorre cada `page.tsx` bajo `apps/backoffice/src/app/`, deriva su ruta del path del archivo, importa `NAV_BACKOFFICE` de `apps/backoffice/src/config/nav.ts` y falla si esa ruta no tiene entrada — resolver en esta tarea cómo el runtime de ESLint (`.mjs`) importa un módulo TypeScript (`nav.ts`); research.md #3 lo deja como detalle de construcción, no de diseño. **Ampliada al implementar la Historia 3**: además de exigir la entrada, la regla compara el permiso de `requerirPermiso('x')` de cada `page.tsx` con el `permiso` de su entrada en `NAV_BACKOFFICE` y falla si difieren — es el caso que dejó pasar la papelera de Libros (T034 original: `libros.ver` en la página, `libros.papelera.ver` en `nav.ts`; H-129). **Estricta (H-132, decidido al implementar)**: toda `page.tsx` DEBE llamar a `requerirPermiso(X)` con la X de su entrada en `NAV_BACKOFFICE` — la única excepción es una entrada declarada `'cualquier-sesion'` (hoy ninguna). Detecta de una vez la falta de entrada, la falta de chequeo y el desajuste. Como estaba escrita (comparar solo cuando la página ya llama a `requerirPermiso`) habría dado cero violaciones sobre 12 pantallas sin proteger. **Falla cerrada**: si no puede leer o entender `nav.ts`, el lint aborta con un error explicativo — nunca cero violaciones por no haber encontrado su fuente.
- [x] T040 [US4] Wire de T039 en `apps/backoffice/eslint.config.mjs` (mismo patrón que `local/no-session-check-en-page`, línea 8/46 de ese archivo).
- [x] T041 [P] [US4] Test de la regla T039 (fixture `page.tsx` sin entrada en `NAV_BACKOFFICE` → debe fallar; con entrada → debe pasar) — seguir la convención de test que ya usen las demás reglas de `eslint-rules/` (verificar en esta tarea si existe un archivo `*.test.mjs` hermano para alguna regla existente y replicar esa forma). **Al implementar**: ninguna regla tenía test, así que esta fija la convención (`<regla>.test.mjs` hermano, `node --test`, corrido por el script `test` de `apps/backoffice`, donde se resuelve `eslint`). Cubre además la falta de chequeo, el desajuste de permiso, `nav.ts` ilegible, y el caso histórico de H-129 reconstruido desde git.
- [x] T042 [US4] Correr `pnpm --filter backoffice run lint` sobre el estado actual del repo (con T009/T030-T036 ya aplicados) y confirmar cero violaciones — las 18 rutas existentes ya tienen entrada desde T009 (decía 17: son 18). **Al implementar**: con la regla estricta, cero violaciones recién después de T067/T068.
- [x] T043 [US4] Documentar en el propio `pantalla-declara-permiso.mjs` (comentario de cabecera, mismo estilo que `no-session-check-en-page.mjs`) el criterio y la historia de origen (H-116 resolvió sesión; esta regla resuelve permiso).

**Tareas agregadas al implementar — H-132 y H-134** (`specs/revision-manual/2026-09-17-001-002.md`):

- [x] T067 [US4] (H-132) Las 11 pantallas que no chequeaban permiso (además de `/`, ver T068) pasan a `requerirPermiso` con el permiso de su entrada en `nav.ts`: `sedes`, `sedes/[id]` (`sedes.ver`), `pendientes-tutor` (`pendientes_tutor.ver`) — que muestran datos reales — y los ocho placeholders `catalogos`, `eventos`, `grupos`, `notificaciones`, `solicitudes`, `mis-discipulados`, `mi-disponibilidad`, `mis-grupos`. Restituye lo que `nav.ts` ya decía (criterio de H-129): el diff de quién entra no da vacío y está bien; se documenta el antes/después de las 18.
- [x] T068 [US4] (H-134) `/` resuelve DESTINO, no permiso: deriva de `itemsParaRoles(roles)` (nunca un destino fijo) — si el primer ítem es `/`, es Inicio (`requerirPermiso('inicio.ver')`); si es otro, redirige ahí; si no hay ninguno (ej. una cuenta de Google que no es Persona, `rol = []`), pantalla TERMINAL "tu cuenta no tiene acceso al backoffice", sin redirigir a ningún lado. `nav.ts` no cambia. `not-found.tsx` usa el mismo resolutor para su botón (hoy apunta a `/` fijo: el bucle sin salida ya existía y salía por H-132). E2e: un Discipulador que aterriza en `/`, y una sesión con `rol = []` que NO termina en redirect.

**Checkpoint**: cualquier `page.tsx` nuevo que no declare su permiso en `NAV_BACKOFFICE` rompe el lint — no depende de que alguien lo recuerde.

---

## Phase 7: User Story 5 - El Pastor ve todo el backoffice, sin gestionarlo (Priority: P2)

**Goal**: FR-018 — confirmar/ajustar que el Pastor tiene acceso de solo lectura consistente, con la excepción ya decidida de Palabra Profética (D129).

**Independent Test**: sesión Pastor recorre pantallas del backoffice, ve contenido, no ve acciones de gestión salvo en Palabra Profética.

- [x] T044 [US5] Auditoría de las pantallas con acciones reales (Libros, Palabra Profética, Sedes, Personas — y Pendientes tutor, sumada al decidir H-132): confirmar que cada acción de crear/editar/eliminar/gestionar está condicionada a un permiso de **gestión** (`libros.gestionar`, `sedes.gestionar`, `personas.gestionar_roles` — todos sin `pastor`) y no al permiso de **ver** (`libros.ver`, `sedes.ver`, `personas.ver` — con `pastor`), excepto `palabra_profetica.editar` que sí incluye `pastor` (D129). Es una verificación sobre lo ya construido en las Historias 2/3, no código nuevo en el caso general.
- [x] T045 [US5] **Resuelto por D134** (`docs/05-decisiones.md`, tomada tras reportar esto como caso abierto): las pantallas `mi-*` (`mis-discipulados`, `mi-disponibilidad`, `mis-grupos`) se recortan por **identidad** (quien mira), no por rol — "ver todo" (Historia 5) no anula eso, da acceso a las vistas administrativas, no al escritorio de otra Persona (D134-a). `mis_discipulados.ver`, `mi_disponibilidad.ver` y `mis_grupos.ver` quedan **sin cambios** respecto de T009 (`discipulador`, `discipulador`, `lider_curso` — sin `pastor`): los roles son acumulativos (`docs/03-roles-permisos.md`), así que un Pastor que efectivamente discipula ya tiene el rol `discipulador` y llega por ahí con contenido real; uno que no discipula no gana nada abriendo un ítem vacío por construcción, y agregarlo haría que el catálogo significara dos cosas distintas (en los permisos administrativos, "quién puede ver esta información"; acá pasaría a ser "quién puede abrir este cascarón"). Lo que sí verifica esta tarea: las tres pantallas consultan siempre por el `personaId` de la sesión actual (nunca "todos", nunca una rama especial `if (rol.includes('pastor'))`) — a quien llegue por tener el rol correspondiente (incluido un Pastor con `discipulador`) le muestran lo suyo, nada más. Si no hay discipulados/disponibilidad/grupos propios, la pantalla renderiza el mismo `EstadoVacio` que vería cualquier Discipulador/Líder de curso sin asignaciones — sin mensaje ni copy especial para ningún rol. La vista administrativa de discipulados (quién discipula a quién, encuentros, capítulos — sin el texto de las notas, D134-b) es trabajo del spec 004, no de esta tarea. **Verificado al implementar**: las tres pantallas solo llaman a `requerirPermiso` (T067) y renderizan un `EstadoVacio` fijo — **todavía no consultan ningún dato** (el spec 004 no está implementado), así que "filtran por el `personaId` de la sesión" se cumple solo porque no hay ninguna consulta. Sin rama por rol, el mismo vacío para todos. La verificación real (que la consulta use el `personaId` de la sesión) corresponde a la tarea del spec 004 que agregue esas consultas.
- [x] T046 [US5] Test e2e `apps/backoffice/e2e/pastor-solo-lectura.spec.ts`: sesión Pastor navega Libros, Palabra Profética, Sedes y Personas — ve contenido, no ve botones de crear/editar/eliminar salvo en Palabra Profética (donde sí los ve, D129). **Al implementar**: cubre CADA caso que verificó T044 (no una muestra), incluidos Sedes (T069), Pendientes tutor (T070), los enlaces a las papeleras (T071) y el detalle de Libros (T072). Suma `e2e/enlaces-alcanzables.ts`: en cada pantalla que la sesión puede abrir, resuelve cada `href` renderizado contra `NAV_BACKOFFICE` + `CATALOGO_PERMISOS` con los roles reales de la sesión; uno inalcanzable es una falla (verificado: encuentra las dos regresiones de T071 si se revierten). No ve enlaces fuera del DOM (menús cerrados) ni el inverso (algo alcanzable que no se enlaza, T072); devuelve los `href` por pantalla para un diferencial entre sesiones, a decidir si entra acá o en la Historia 6.

**Tareas agregadas al implementar — H-133 y la decisión sobre Pendientes tutor**:

- [x] T069 [US5] (H-133) Sedes: "Crear Sede", Inactivar, Reactivar y Eliminar (listado) y Desactivar/Reactivar (detalle) se condicionan a `tienePermisoSesion(session, 'sedes.gestionar')` — mismo patrón que Libros. Antes se renderizaban sin ninguna condición (la API respondía 403). **Al implementar (T044)**: también el formulario editable del detalle ("Guardar cambios", que H-133 no nombraba) — `FormularioSede` suma `soloLectura`, mismo mecanismo que `FormularioLibro`. "Ver detalle" queda para quien ve el listado (navegación, `sedes.ver`).
- [x] T070 [US5] Pendientes tutor, opción (a): `GET /personas/pendientes-tutor` pasa de `pendientes_tutor.gestionar` a `pendientes_tutor.ver` (el Pastor lee la lista, D64); Activar y Cerrar el caso se condicionan a `pendientes_tutor.gestionar` en la pantalla. Dejar escrito en el código que esta lista es la única compuesta enteramente por menores de edad, con sus datos de contacto y el teléfono del tutor, y que el acceso del Pastor sale de D64 — si algún día se restringe, es esa decisión la que hay que tocar.
- [x] T071 [US5] (T044, regresión de H-129) El enlace "Papelera" de los listados de Libros y de Sedes se condiciona al permiso de ABRIR esa pantalla (`libros.papelera.ver` / `sedes.papelera.ver`), no al de gestionar: un control se condiciona al permiso de lo que provoca, y el enlace es navegación. Hoy los cuatro permisos son `['admin']` y ninguna prueba distingue las dos opciones — el motivo queda escrito en el código para que nadie los unifique cuando los conjuntos se separen. Lo introdujo la Historia 3: cerró las papeleras y dejó el enlace visible para el Pastor (un botón que llevaba a un 404). El e2e de H-129 (`goto` directo → 404) no cambia.
- [x] T072 [US5] (T044) Libros: "Ver detalle" estaba dentro del menú de acciones y todo el menú dependía de `libros.gestionar` — el Pastor no tenía cómo abrir el detalle de un Libro desde la pantalla. El menú queda para quien ve el listado (`libros.ver`) con "Ver detalle"; reordenar, Inactivar/Reactivar y Eliminar siguen en `libros.gestionar`. Se corrige el comentario de `LibrosCliente` que afirmaba que el Pastor "ve todo" (la figura de H-129). Es el INVERSO de T071 — un destino alcanzable sin enlace — y el helper de T046 es ciego a él por construcción.

**Checkpoint**: acceso del Pastor verificado y consistente en las pantallas con acciones reales, y en las tres pantallas `mi-*` (D134) — sin excepción por rol en ninguna.

---

## Phase 8: User Story 6 - Saber quién otorgó o quitó un rol, y cuándo (Priority: P3)

**Goal**: FR-019 a FR-023 — lugar único de escritura de roles de estado, y auditoría de cambios de rol de cargo.

**Independent Test**: otorgar y quitar un rol de cargo, verificar un registro consultable de ambas acciones.

- [x] T047 [US6] Agregar el modelo `CambioDeRol` a `apps/api/prisma/schema.prisma` (id, `personaId` FK indexada, `rol String`, `accion` enum `AccionCambioRol {otorgado, quitado}`, `realizadoPorId String`, `createdAt` — sin `updatedAt`, sin soft delete, data-model.md). **Al implementar (H-140/H-141)**: suma `origen` (`OrigenCambioRol {backoffice, recuperacion_cli}`) y `realizadoPorId` pasa a `String?` — nullable SOLO por la fila del CLI; la invariante la sostienen dos CHECK (backoffice ⇒ con autor; CLI ⇒ sin autor), no un comentario.
- [x] T048 [US6] Generar y aplicar la migración de Prisma para T047. (`20260925204725_cambio_de_rol`, con los dos CHECK agregados a mano al SQL generado.)
- [x] T049 [US6] Crear `apps/api/src/cambio-de-rol/cambio-de-rol.service.ts`: `registrar(personaId, rol, accion, realizadoPorId)` (solo `INSERT`, nunca `UPDATE`/`DELETE`) y `listar(personaId?, skip, take)`. Depende de T047/T048. **Al implementar**: el autor es un actor discriminado (`ActorDeCambioDeRol`: `{ origen: 'backoffice'; realizadoPorId: string } | { origen: 'recuperacion_cli' }`); la escritura vive en `registrarCambioDeRol` (función pura), que usan el servicio y el CLI — un solo lugar que inserta. `listar` resuelve el nombre del autor con una segunda consulta.
- [x] T050 [US6] Conectar `roles.service.ts` (T021/T022, Historia 2) para que `otorgarRol`/`quitarRol` llamen a `cambioDeRolService.registrar(...)` después de cada cambio exitoso (FR-022) — modifica los métodos ya construidos en la Historia 2, no los reescribe. Depende de T021, T022, T049. **Al implementar (H-140)**: el cambio y su registro en una sola transacción; un pedido idempotente no registra. `realizadoPorId: string` en la firma (no `string | null` — antes `otorgarRol` recibía el autor y lo descartaba como `_adminId`). El chequeo de autor va PRIMERO, en el controller, antes de FR-002/FR-010: sesión sin Persona → 403 `SESION_SIN_PERSONA` (código propio, no SIN_PERMISO). Con `?? null`, FR-010 comparaba `personaId === null` — no existía para esa sesión. El caso de T016 con sesión sin Persona pasa a una sesión con Persona. **H-141**: `scripts/recrear-admin.ts` también registra cuando agrega `admin` (creación o Persona existente), con `{ origen: 'recuperacion_cli' }`. El seed (`SEED_ADMIN_EMAIL`) queda afuera: no es un camino de instalación de una iglesia (si alguna vez lo es, necesita lo mismo).
- [x] T051 [US6] Crear `apps/api/src/cambio-de-rol/cambio-de-rol.controller.ts`: `GET /cambios-de-rol?personaId=...`, paginado (H-42), `@RequierePermiso('personas.gestionar_roles')` (mismo permiso que otorgar/quitar — sin pantalla de auditoría separada, spec.md no pide esa granularidad). Depende de T006, T007, T049.
- [x] T052 [P] [US6] Test unitario `cambio-de-rol.service.spec.ts`: `registrar` inserta sin tocar filas previas; `listar` pagina y filtra por `personaId`.
- [x] T053 [US6] Test de integración: otorgar y quitar un rol (endpoints de la Historia 2) deja dos filas en `CambioDeRol`, consultables vía `GET /cambios-de-rol`. Depende de T050, T051. **Al implementar**: además, el no-op no deja fila; Pastor y Discipulador reciben 403 en el historial; no hay POST/DELETE; la base rechaza la fila de backoffice sin autor y la del CLI con autor (CHECK, H-140); sesión sin Persona + quitarse admin → `SESION_SIN_PERSONA`, no FR-010; y el CLI deja su fila en creación y en Persona existente (recrear-admin.e2e-spec.ts).
- [x] T054 [US6] Un lugar único donde el sistema escribe los roles de **estado** (FR-019): crear `apps/api/src/persona/roles-de-estado.service.ts` con `otorgarRolDeEstado(personaId, rol)` — sin condición de negocio propia (a diferencia de los roles de cargo, siempre se otorga, nunca se quita, FR-019). **Al implementar (H-139)**: AGREGA el rol con un único `UPDATE` atómico e idempotente (`array_append` solo si no lo tiene), nunca reemplaza el arreglo; acepta el cliente de una transacción para correr dentro de la del alta o la activación. `RolDeEstado` en `packages/shared-types`.
- [x] T055 [US6] Migrar las dos escrituras existentes de `miembro_registrado` para que pasen por T054 en vez de escribir `Persona.rol` directo (FR-020): el **autorregistro de un adulto** (`PersonaService.create`, Flujo 2) y la **activación de un menor** (`PersonaService.activar`, Flujo 7). El alta por Admin todavía no existe — cuando exista, es el tercer sitio. *Corregida al implementar*: decía "(registro, Flujo 2; alta por Admin)", que nombraba un sitio inexistente y omitía `activar`, el único que podía perder datos: escribía `rol = ['miembro_registrado']` y pisaba un rol de cargo otorgado mientras la Persona esperaba al tutor (H-139). Test de integración del caso alcanzable (registrada a los 17, cumple 18, recibe un rol de cargo, se activa: lo conserva) — rojo con el código anterior (`Received: ["miembro_registrado"]`).
- [ ] T056 [US6] Extender `apps/backoffice/src/app/personas/personas-cliente.tsx` (Historia 2, T028): agregar una acción "Ver historial de roles" por fila que abre un modal con lo que devuelve `GET /cambios-de-rol?personaId=...` (Acceptance Scenario 3). Depende de T028, T051.
- [ ] T057 [US6] Verificar T056 (modificación de `personas-cliente.tsx`) contra el checklist de `docs/15-guia-ux-ui.md`.

**Checkpoint**: todas las historias completas — cambios de rol auditados, escritura de roles de estado centralizada.

---

## Phase 9: Polish & Cross-Cutting Concerns

- [ ] T058 [P] Actualizar `docs/03-roles-permisos.md` si hace falta tras la implementación real (verificar que sigue coincidiendo con D131/D133 y con los permisos nuevos del catálogo — no debería requerir cambios de fondo, solo confirmar).
- [ ] T059 [P] Swagger: confirmar que los endpoints nuevos (`POST/DELETE /personas/:id/roles`, `GET /cambios-de-rol`) quedan documentados con `@ApiOkResponse`/`@ApiCreatedResponse` describiendo la historia que los agrega, mismo estilo que el resto de `persona.controller.ts`.
- [ ] T060 Revisar que ningún `console.log`/dato personal quede en logs de los nuevos servicios (Principio X, Sentry sin datos personales).
- [ ] T061 Correr `pnpm --filter backoffice run lint` y confirmar cero violaciones de `pantalla-declara-permiso` (T039) sobre el estado final del árbol de `apps/backoffice/src/app/`.
- [ ] T062 Correr `specs/005-roles-permisos-acceso/quickstart.md` completo (los 6 escenarios) contra un entorno local levantado.
- [ ] T063 Correr las tres suites de la convención de `docs/00-README.md` antes de dar la fase por cerrada: `pnpm --filter api run test`, `pnpm --filter api run test:e2e` (config aparte), y los e2e de `apps/backoffice` (`pnpm --filter backoffice exec playwright test`) — las tres en verde (Governance, D114).
- [ ] T073 (H-138) Una Persona de e2e por rol de cargo: `loguearseComoAdminE2E` con `['admin']` a secas (hoy `e2e-admin` tiene admin + discipulador + lider_curso, `apps/api/scripts/sembrar-e2e-admin.ts`), y una Persona para cada uno de los otros roles. En un spec sobre qué rol puede qué, ningún e2e distingue hoy "el Admin puede X" de "alguna de estas tres puede X". El smoke de axe (`axe-todas-las-rutas.spec.ts`, para el que se sumó `lider_curso`) tiene que resolver su cobertura de otra forma — por ejemplo, recorrer cada ruta con una sesión que tenga su permiso.

---

## Dependencies & Execution Order

### Fases

- **Setup (1)**: sin dependencias.
- **Foundational (2)**: depende de Setup — bloquea todas las historias.
- **Historia 1 (3)** y **Historia 2 (4)**: dependen de Foundational; T016 de la Historia 1 depende además de T021/T023 de la Historia 2 (cruce explícito, documentado ahí).
- **Historia 3 (5)**: depende de Foundational; T032 depende de T025 (Historia 2) para no migrar `GET /buscar` dos veces.
- **Historia 4 (6)**: depende de Foundational (T009) y, para T042 (cero violaciones), de que la Historia 3 (5) ya haya migrado las pantallas ad hoc.
- **Historia 5 (7)**: depende de las Historias 2 y 3 (los permisos de gestión vs. ver que audita ya deben existir).
- **Historia 6 (8)**: depende de la Historia 2 (T021/T022, que T050 modifica).
- **Polish (9)**: depende de todas las historias que se decida incluir en esta iteración.

### Historias P1 entre sí

Aunque spec.md numera Historia 1, 2, 3 en ese orden, la secuencia de construcción real es
**Foundational → Historia 2 → Historia 1 (cierre de T016) → Historia 3** — Foundational ya deja
el mecanismo de permisos listo (T001-T010) para que la Historia 2 lo use desde el primer
endpoint nuevo, en vez de escribir `@Roles` y migrar después.

## Implementation Strategy

### MVP (Historia 1 + Historia 2)

Setup → Foundational → Historia 1 (T012-T015, sin T016 todavía) → Historia 2 completa → T016
(cierra la Historia 1). Con esto, un Admin sembrado ya puede otorgar/quitar roles de cargo de
punta a punta — el MVP funcional de este spec.

### Incremental

1. Setup + Foundational.
2. Historia 1 (parcial) + Historia 2 → MVP, demo posible.
3. Historia 3 → deja de haber duplicación en los 18+5 sitios existentes.
4. Historia 4 → ninguna pantalla nueva nace sin declarar su permiso.
5. Historia 5 → confirma/documenta el acceso de solo lectura del Pastor, incluidas las pantallas `mi-*` recortadas por identidad (D134, T045).
6. Historia 6 → auditoría y lugar único de roles de estado.
7. Polish.
