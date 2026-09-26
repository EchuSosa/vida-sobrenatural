# Contrato: búsqueda de Personas y otorgar/quitar rol de cargo (Historia 2)

Extiende `apps/api/src/persona/`: `roles.controller.ts` + `roles.service.ts` nuevos, en el mismo
`PersonaModule` y bajo el mismo prefijo `personas` (T024). Los dos endpoints de otorgar/quitar rol
requieren el permiso `personas.gestionar_roles` (FR-006/FR-007) vía `@RequierePermiso` — exclusivo
del rol `admin`. Los dos endpoints de lectura tienen el suyo: `GET /personas` (el listado, nuevo)
pide `personas.ver` (`admin`+`pastor`), y `GET /personas/buscar` (el buscador de tutor, existente)
mantiene sus roles de siempre bajo `personas.buscar` (`admin`+`discipulador`).

## Corrección de FR-024 (Historia 2, implementación)

La versión anterior de este contrato ponía el filtro de FR-024 **dentro de `GET /personas/buscar`,
como comportamiento por defecto y no opcional**. Decía, textual:

> ## `GET /personas/buscar?q=...` (EXTENSIÓN de un endpoint existente, no uno nuevo)
>
> **Corrección sobre la versión anterior de este contrato**: este endpoint **ya existe**
> (`persona.controller.ts`, `buscarPersonas` — H-29/D108, construido para elegir a quién vincular
> como tutor de un `pendiente_tutor`), con `@Roles('admin', 'discipulador')` y un `select` que hoy
> NO incluye `rol` ni filtra por edad. FR-005 no pide un endpoint nuevo, solo que el Admin pueda
> buscar — reusar este es preferible a duplicar la misma búsqueda de Personas en dos sitios (mismo
> espíritu que D132/Principio XI, aplicado a un endpoint y no a una regla de rol).
>
> **Uso**: FR-005 — encontrar a quién ascender (además de su uso ya existente, H-29).
>
> **Request**: `q` (string, nombre u otro dato identificatorio) — sin cambios de forma.
>
> **Response (EXTENDIDA)**: agregar `rol` al `select` existente (`BUSQUEDA_PERSONA_SELECT` en
> `persona.service.ts`, hoy `id`/`nombre`/`apellido`/`email`/`telefono`) — sigue siendo lo mínimo
> para identificar a la Persona y ver sus roles actuales, **no** el perfil completo (Fuera de
> alcance, Flujo 9).
>
> **Regla FR-024 (nueva, agregada a la búsqueda existente)**: excluye a las Personas menores de edad
> — filtro `where: { fechaNacimiento: { lte: <hoy menos EDAD_MINIMA_ROL_DE_CARGO años> } }` (mismo
> criterio exacto que `calcularEdad()`, expresado como comparación de fecha para que Postgres filtre
> sin traer filas de más — H-42), sin seleccionar `fechaNacimiento` en la respuesta (no hace falta
> exponerla). Constante `EDAD_MINIMA_ROL_DE_CARGO` de `packages/shared-types` (D133, no la
> `EDAD_MINIMA` de `persona.service.ts` — ver research.md #7). No es un parámetro opcional, es el
> comportamiento por defecto del endpoint.
>
> **Efecto colateral deseado sobre H-29**: excluir menores de esta búsqueda también mejora el caso
> de uso original (elegir un tutor) — un tutor es, por definición del dominio, alguien que se hace
> cargo de un menor, no otro menor. No es una regresión; es una restricción que faltaba ahí también.
> Revisar/actualizar los tests existentes de `buscarPersonas` (Constitución: un test que rompe por
> un cambio de modelo se arregla en el mismo commit que el cambio).
>
> **Permiso**: se mantiene `admin`/`discipulador` (sin cambios) — la restricción real de Historia 2
> no está en poder *buscar*, sino en poder *otorgar/quitar* (abajo), que sí queda exclusivo del
> Admin. Migra a `@RequierePermiso` como parte de la Historia 3 (uno de los 18 sitios existentes),
> sin cambiar los roles que ya tiene.

**Por qué cambió** — no era un error de redacción: el diseño era ese, y tenía dos problemas que
aparecieron recién al construirlo.

1. **`/buscar` existe para otro caso de uso, con otra regla de edad.** Se construyó para elegir el
   tutor de un menor (H-29/D108). La mayoría de edad del tutor ya la garantiza `activar`, con su
   propia regla (`EDAD_MINIMA` de `persona.service.ts`, el "segundo significado" que describe
   research.md #7). Si el filtro de D133 gobernara esa búsqueda, un cambio futuro de
   `EDAD_MINIMA_ROL_DE_CARGO` movería en silencio quién aparece como candidato a tutor — la forma
   exacta de H-128 que research.md #7 existe para evitar. El "efecto colateral deseado" era, en
   realidad, acoplar por coincidencia dos reglas que ese mismo research separa.
2. **El listado de Personas va a ser la vista de Flujo 9**, donde los menores **sí** tienen que
   aparecer (un `pendiente_tutor` es menor por definición y hay que poder encontrarlo y activarlo).
   Un endpoint que esconde menores por defecto habría que desarmarlo ahí.

Además, `/buscar` devuelve hasta 10 resultados sin total: sirve para elegir a una persona, no
para la pantalla de Personas, que tiene que paginar (H-42, H-101). Por eso FR-005 se resolvió con
un endpoint propio de listado y el filtro de FR-024 pasó a ser un **parámetro que la pantalla
pide**, no un comportamiento que el endpoint impone.

### Dos capas, que la versión anterior había colapsado

- **FR-011 es la GARANTÍA**: `RolesService.otorgarRol` rechaza otorgar un rol de cargo a un menor
  (`PERSONA_MENOR_DE_EDAD_NO_PUEDE_TENER_ROL_DE_CARGO`), venga el pedido por donde venga — la
  pantalla, una llamada directa a la API, un import futuro. No depende de ningún listado.
- **FR-024 es la COMODIDAD**: no mostrar, en el listado para ascender, a quien no se va a poder
  ascender. Sacar el parámetro no desprotege nada; sacar el chequeo de `otorgarRol`, sí.

Ponerle "no es un parámetro opcional, es el comportamiento por defecto" al filtro le daba la
apariencia de una protección, cuando la protección real está en otro lado.

## `GET /personas` (NUEVO — listado paginado, FR-005 y FR-024)

**Permiso**: `personas.ver` (`admin`, `pastor` — el mismo que ya protege la pantalla, T009).

**Uso**: FR-005 — la pantalla Personas del backoffice (`apps/backoffice/src/app/personas/page.tsx`),
para encontrar a quién otorgar o quitar un rol de cargo. Es también la base de la vista unificada
de Flujo 9 (fuera de alcance de este spec).

**Request** (query):
- `skip`, `take` — paginación en la base; `take` por defecto 20, máximo 100 (H-42).
- `buscar` — opcional; nombre, apellido, email o teléfono (contiene, sin distinguir mayúsculas).
- `orden` — `apellido` (default) | `nombre`; `dir` — `asc` (default) | `desc`. Desempate estable
  por el otro campo del nombre y por `id`.
- `soloMayores` — **opcional, por defecto `false`**. Con `true`, excluye a las Personas menores
  de edad (FR-024): `where: { fechaNacimiento: { lt: nacidosAntesDeParaEdad(EDAD_MINIMA_ROL_DE_CARGO) } }`,
  mismo corte exacto que `calcularEdad()` expresado como fecha para que Postgres filtre sin traer
  filas de más (H-42), incluido el caso del 29 de febrero (`calcular-edad.ts`).

**Response**: `Pagina<PersonaListado>` = `{ items, total }`, solo Personas con `activo = true`.
`PersonaListado` (`packages/shared-types`): `id`, `nombre`, `apellido`, `email`, `telefono`, `rol`
— lo mínimo para identificar a la Persona y ver sus roles actuales, **no** el perfil completo, y
sin `fechaNacimiento`. Hoy coincide con `BusquedaPersona`, pero es otro tipo a propósito: la vista
de Flujo 9 va a sumar columnas acá sin tocar el buscador de tutor.

**Quién pide `soloMayores=true`**: la pantalla Personas, porque su propósito en este spec es
ascender (FR-024). La vista de Flujo 9 no lo va a pedir.

**`quitar` (agregado al cerrar el spec, T062)**: cada ítem trae además
`quitar: Record<RolDeCargo, { puede: true } | { puede: false; motivo }>` — para cada uno de los
cuatro roles de cargo, si **quien mira** se lo puede quitar a esa Persona y, si no, por qué. Lo
calcula `puedeQuitarRol` (`packages/shared-types/src/permisos.ts`), **la misma función** con la que
`DELETE /personas/:id/roles/:rol` rechaza — así la pantalla no ofrece "Quitar" donde la API va a
responder 409 (antes decidía con "¿lo tiene?", y lo ofrecía para el Admin sembrado, para el propio
Admin y para Discipulador siempre). Motivos: `SESION_SIN_PERSONA`,
`DISCIPULADOR_SIN_VERIFICACION_DE_DISCIPULADOS_ACTIVOS`, `NO_SE_PUEDE_DEGRADAR_AL_ADMIN_SEMBRADO`,
`ADMIN_NO_PUEDE_AUTO_REVOCARSE`. `adminSembrado` se lee para evaluarlo, pero no se expone. Cuando el
spec 004 conecte la consulta de discipulados activos, cambia esa función y los dos lados cambian
juntos.

## `GET /personas/buscar?q=...` (EXISTENTE — buscador de tutor, H-29/D108)

**Cambios de este spec** (y solo estos):
- **T017**: `rol` agregado a `BUSQUEDA_PERSONA_SELECT` y a `BusquedaPersona` — ver los roles
  actuales ayuda a identificar a la Persona correcta. Sin `fechaNacimiento`.
- **T025**: `@Roles('admin', 'discipulador')` migrado a `@RequierePermiso('personas.buscar')`, con
  `personas.buscar: ['admin', 'discipulador']` en `CATALOGO_PERMISOS` — mismos roles, solo cambia
  cómo se declara. (La versión anterior de este contrato dejaba esta migración para la
  Historia 3; se hizo en la Historia 2 porque el controller ya se estaba tocando. T032 no la
  repite.)

**NO filtra por edad** (ver la corrección de arriba): la regla de mayoría de edad del tutor es de
`activar`, no de D133. Sigue devolviendo un arreglo de hasta 10 resultados, sin paginar.

## `POST /personas/:id/roles`

**Uso**: FR-006 — otorgar un rol de cargo.

**Request**: `{ rol: RolDeCargo }`.

**Reglas de negocio** (devuelven Problem Details con un código propio cada una, Principio X — no
un 403 genérico):
- **FR-011**: si la Persona destino es menor de edad, rechazar con un código dedicado (ej.
  `PERSONA_MENOR_DE_EDAD_NO_PUEDE_TENER_ROL_DE_CARGO`).
- Si la Persona ya tiene ese rol (Edge Case de spec.md): no duplicar en `Persona.rol`, responder
  éxito idempotente (no es un error).

**Efecto**: agrega el rol al arreglo `Persona.rol` (sin quitar los demás — acumulativo) y crea una
fila en `CambioDeRol` (`accion: otorgado`, FR-022).

## `DELETE /personas/:id/roles/:rol`

**Uso**: FR-007 — quitar un rol de cargo.

**Reglas de negocio**:
- **FR-002**: si la Persona destino tiene `adminSembrado = true` y `rol = admin`, rechazar
  (código dedicado, ej. `NO_SE_PUEDE_DEGRADAR_AL_ADMIN_SEMBRADO`).
- **FR-010**: si `rol = admin` y `personaId === request.user.personaId` (se lo quiere quitar a sí
  mismo), rechazar (código dedicado, ej. `ADMIN_NO_PUEDE_AUTO_REVOCARSE`). Si el rol no es
  `admin`, esta regla no aplica — la auto-revocación de otros roles de cargo está permitida.
- **FR-009**: si `rol = discipulador` y la Persona tiene discipulados activos a su cargo, rechazar
  con un mensaje que nombre cuáles (código dedicado, ej. `DISCIPULADOR_TIENE_DISCIPULADOS_ACTIVOS`,
  con el detalle de la respuesta incluyendo la lista). **Dependencia externa**: "discipulados
  activos a cargo" es una consulta contra entidades del spec 004 (Grupo/Liderazgo, modalidad Vida
  Nueva) — este spec consume esa consulta, no la define.

  **Mientras esa consulta no exista** (el spec 004 no está implementado todavía): la guarda DEBE
  **fallar cerrada**, no abierta. `DELETE /personas/:id/roles/discipulador` se rechaza
  incondicionalmente, con un código dedicado propio (ej.
  `DISCIPULADOR_SIN_VERIFICACION_DE_DISCIPULADOS_ACTIVOS`) y un mensaje que explique que el
  sistema todavía no puede verificar si esa Persona tiene discipulados a cargo, no que los tiene.
  Es el criterio general de este contrato, no un parche puntual para este caso — ver "Guardas
  cuya fuente de verdad no existe todavía" más abajo. Hoy (H-127) esto no bloquea ninguna
  revocación real: el sistema solo escribe el rol de estado `miembro_registrado`, así que ninguna
  Persona tiene todavía el rol de cargo `discipulador` para que alguien intente quitárselo. Cuando
  el spec 004 se implemente, la consulta real reemplaza este rechazo incondicional — no antes, y
  no como una nota que alguien tiene que acordarse de seguir: `tasks.md` DEBE incluir una tarea
  del spec 004 (o de la conexión entre ambos) que reemplace este bloqueo por la consulta real, no
  dejarlo como deuda implícita.

## Guardas cuya fuente de verdad no existe todavía (criterio general, H-127)

Cuando una regla de este contrato depende de una consulta, un dato o un mecanismo que otra
feature todavía no construyó, la guarda correspondiente **DEBE fallar cerrada** (rechazar la
acción) mientras esa fuente no exista — nunca fallar abierta (dejar pasar porque "no se encontró
nada que lo impida"). Una guarda que se comporta como si la ausencia de datos fuera lo mismo que
la ausencia de riesgo cumple la forma del requisito y no su propósito, y falla exactamente en el
período — desde el día uno — en que nadie la está mirando. Este criterio aplica a cualquier regla
futura de este spec con la misma forma, no solo a FR-009.

**Efecto**: quita el rol del arreglo `Persona.rol` y crea una fila en `CambioDeRol`
(`accion: quitado`, FR-022).
