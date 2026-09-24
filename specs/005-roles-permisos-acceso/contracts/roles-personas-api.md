# Contrato: búsqueda de Personas y otorgar/quitar rol de cargo (Historia 2)

Extiende `apps/api/src/persona/` (o un módulo nuevo `roles/` que dependa de `persona/`, a decidir
en `tasks.md` según tamaño). Todos los endpoints requieren el permiso `personas.gestionar_roles`
(nombre provisorio del catálogo, FR-006/FR-007) vía `@RequierePermiso`.

## `GET /personas/buscar?q=...`

**Uso**: FR-005 — encontrar a quién ascender.

**Request**: `q` (string, nombre u otro dato identificatorio), paginado (H-42).

**Response**: lista acotada — lo mínimo para identificar a la Persona (id, nombre, apellido,
email, roles actuales), **no** el perfil completo (Fuera de alcance, Flujo 9).

**Regla FR-024**: excluye a las Personas menores de edad
(`calcularEdad(fechaNacimiento) < EDAD_MINIMA_ROL_DE_CARGO` — constante propia de D133 en
`packages/shared-types`, no la `EDAD_MINIMA` de `persona.service.ts`, ver research.md #7),
sin importar su `estado` — no es un parámetro de filtro opcional, es el comportamiento por defecto
y único de este endpoint (consecuencia de FR-011, no una opción de UI).

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
