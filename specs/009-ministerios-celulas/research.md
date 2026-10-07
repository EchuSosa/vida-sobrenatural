# Research: Ministerios y Células (postulación)

Cada punto: **Decisión** / **Por qué** / **Alternativas descartadas**. Lo que acá se marca como
"decisión nueva" se repite en `plan.md` → "Decisiones nuevas (se numeran al mergear)".

## 1. Aptitud: se lee, no se calcula

- **Decisión**: "apta" = `'apto_ministerio' ∈ Persona.rol`. Una sola función, `esAptaParaMinisterio(roles)`
  en `packages/shared-types/src/ministerios.ts`, usada por la API (rechazo) y por `GET /ministerios/me`
  (estado `no_apta`). El valor `apto_ministerio` en `RolDeEstado` lo agrega la spec 008; si esta spec
  se implementa antes, lo agrega el lote 0 de acá (una línea; quien mergee segundo resuelve el conflicto
  trivial).
- **Por qué**: D40 + D131 — es un rol de estado que escribe el sistema en un único lugar
  (`RolesDeEstadoService`). Recalcular desde Inscripciones o Completitudes Manuales sería una segunda
  copia de la regla de la 008 (Principio XI).
- **Alternativas**: el botón "Quiero servir" + activación manual (D28): superada por D40. Derivar de
  `Inscripcion completada` en Vida de Servicio: duplica la 008 y no cubre la Completitud Manual.

## 2. La membresía es la Postulación `aprobada` (sin tabla de miembros)

- **Decisión**: no hay entidad "MiembroMinisterio". El Ministerio y la Célula actuales de una Persona
  son los de su única Postulación `aprobada`. El rol de estado `miembro_ministerio` se otorga (append
  idempotente) al aprobar la primera y **no se quita** (roles acumulativos, docs/03; FR-019 de la 005:
  "siempre se otorga, nunca se quita").
- **Por qué**: docs/04 y D19 ya modelan la membresía así ("una sola aprobada activa", la anterior pasa
  a `inactiva`). Una tabla aparte sería una segunda fuente del mismo dato (mismo razonamiento que D137).
- **Alternativas**: quitar el rol al pasar a `inactiva` sin reemplazo — contradice FR-019 de la 005 y
  la naturaleza acumulativa; el alcance de notificaciones (D48) y "Contenido de su Ministerio" se
  resuelven por la Postulación aprobada, no por el rol.

## 3. Unicidad garantizada por la base (pendiente y aprobada)

- **Decisión**: dos índices únicos parciales en SQL a mano (patrón H-140):
  `postulaciones_una_pendiente ON postulaciones ("personaId") WHERE estado = 'pendiente'` y
  `postulaciones_una_aprobada ON postulaciones ("personaId") WHERE estado = 'aprobada'`. La aprobación
  corre en una transacción que bloquea la fila de la Persona (`SELECT … FOR UPDATE`, mismo patrón que
  `quitarRol`/D137), pasa la anterior a `inactiva` y la nueva a `aprobada`. Una violación del índice
  (P2002) se traduce al código de negocio, nunca a 500.
- **Por qué**: FR-003/FR-020/SC-003 piden garantía ante concurrencia; la interfaz (H-57) no alcanza.
- **Alternativas**: chequeo en el servicio sin índice — carrera entre dos pestañas o dos Admins.

## 4. La advertencia de cambio también la exige la API

- **Decisión**: `POST /postulaciones/:id/aprobar` recibe `{ confirmarCambio?: boolean }`. Si la Persona
  tiene otra `aprobada` y `confirmarCambio !== true`, responde 409 `POSTULACION_REQUIERE_CONFIRMAR_CAMBIO`
  con `ministerioActual: { id, nombre }` en las extensiones del Problem Details; la interfaz muestra el
  diálogo con ese nombre y reintenta con `confirmarCambio: true`. El detalle ya trae `ministerioActual`
  para mostrarlo antes de tocar el botón.
- **Por qué**: si la advertencia fuera solo de interfaz, una membresía que cambió entre abrir el detalle
  y aprobar (otro Admin aprobó otra) pasaría sin aviso. Que la API decida cierra esa carrera.
- **Alternativas**: un endpoint `GET …/advertencia` previo — dos idas y la misma carrera.

## 5. `retirada` como quinto estado — decisión nueva

- **Decisión**: `EstadoPostulacion = pendiente | aprobada | rechazada | inactiva | retirada`.
- **Por qué**: la Solicitud de Discipulado ya la tiene (spec 004, FR-039) y D151 la usa de ejemplo
  ("retirar el pedido"). Sin ella, quien se equivoca de Ministerio queda trabado (D60: una sola
  pendiente) hasta que el Admin la rechace — un "rechazo" que no lo es.
- **Alternativas**: borrar la pendiente — viola el Principio III.

## 6. `inactiva` guarda por qué

- **Decisión**: `motivoInactivacion: 'cambio_de_ministerio' | 'baja'`, `inactivadaEn`, `inactivadaPorId`,
  `motivoBaja?` (texto interno). En `cambio_de_ministerio` además `reemplazadaPorId` (la Postulación que
  la reemplazó).
- **Por qué**: Mi camino tiene que distinguir "te cambiaste a Z" de "ya no figurás en X" (FR-011), y el
  historial (FR-016) tiene que poder contarlo.

## 7. Bandeja unificada: un registro de "fuentes" por tipo

- **Decisión**: `GET /solicitudes` sale de `SolicitudDiscipuladoController` a un módulo propio
  `apps/api/src/bandeja/` con una lista de **fuentes** (`FuenteBandeja`: `tipo`, `contar(filtros)`,
  `listar(filtros, skip, take)` que devuelve `SolicitudResumen`). Con dos tipos el listado mezclado se
  resuelve con un `UNION ALL` en SQL (`$queryRaw` con `select` explícito de las columnas base), ordenado
  y paginado en la base (docs/15 H-101: paginado, búsqueda y orden en la API). `TipoSolicitud` pasa a
  `'discipulado' | 'postulacion'`; el filtro por tipo se muestra (spec 004: "no se muestra mientras haya
  uno solo"). El detalle sigue siendo específico por tipo: el backoffice abre la Postulación en
  `/solicitudes/postulacion/[id]` (segmento estático: no choca con `/solicitudes/[id]` de la 004, que
  sigue siendo el de Discipulado; la fila de la bandeja enlaza según `tipo`).
- **Por qué**: 008 (Vida de Servicio), Bautismo y Eventos también suman tipos; cada una agrega su
  fuente sin tocar el resto. La spec 004 decidió "genérica en el listado, específica en la resolución".
- **Riesgo de paralelo**: otras specs pueden proponer lo mismo a la vez. Coordinación en `plan.md`: la
  primera que mergea crea `bandeja/`, las demás rebasan y solo agregan su fuente.
- **Alternativas**: traer cada tipo por separado y mezclar en memoria — rompe el paginado (H-101).
  Una vista SQL — atar el esquema a una lista de tipos que crece por spec; el `UNION` en código es
  igual de barato y vive junto a las fuentes.

## 8. Rutas de la app (Persona)

- **Decisión**: `/mi-camino/ministerios` (lista) y `/mi-camino/ministerios/[id]` (detalle +
  formulario), dentro del grupo `(app)`, con miga "Mi camino › Ministerios › {nombre}". La página
  pública `/ministerios` sigue siendo la pública (sin formulario).
- **Por qué**: D107 — una pestaña de la app no saca a la web pública. Mismo patrón que `/mis-eventos`
  vs `/eventos` (Next no deja que las dos resuelvan la misma URL).

## 9. Catálogo en el backoffice

- **Decisión**: `/ministerios` (listado), `/ministerios/[id]` (detalle con Células y miembros),
  `/ministerios/papelera`, y la papelera de Células dentro del detalle (sección colapsable, no ruta
  propia). Entrada desde Catálogos (`/catalogos` deja de decir "todavía no están acá" para Ministerios).
  Reusa `TablaDatos`, `ControlesTabla` + `useControlesTablaUrl`, `EstadoActivoBadge`,
  `ConfirmDestructiveDialog` (con el modo de nombre exacto que ya usa Sedes, D38) — nada nuevo en
  `packages/ui` salvo lo de la investigación 10.
- **Por qué**: es exactamente el patrón de Sedes (D117, D119, D126) — reusar, no reinventar.
- **Listado de Ministerios sin paginar en el servidor** (catálogo chico, docs/15); **miembros de un
  Ministerio paginados** por la API (`Pagina<T>`), porque crecen.

## 10. Card de Mi camino y piezas compartidas

- **Decisión**: la card de Ministerio es un componente de `apps/web` (solo la usa la web). El aviso con
  ícono + título + texto que hoy vive como función local `Aviso` en `mi-camino-cliente.tsx` (004) se
  extrae a `packages/ui` como `AvisoEstado` en el lote 0, y la card de Vida Nueva pasa a usarlo — la
  segunda card que lo necesita (Principio XI; la regla de CLAUDE.md "buscá si ya existe"). Si la
  spec 006 o la 008 lo extraen antes con otro nombre, se usa el suyo.
- **Por qué**: dos copias del mismo patrón visual de estados son la forma de H-41.

## 11. Nombres únicos sin distinguir mayúsculas ni tildes

- **Decisión**: unicidad como regla del servicio (igual que Sede: "único entre activas es regla de
  negocio, no constraint"), comparando con `normalizarNombre()` de `packages/shared-types` (minúsculas,
  sin tildes, espacios colapsados). Si no existe, se agrega ahí (y la validación del formulario del
  backoffice usa la misma). Alcance: Ministerios no eliminados; Células no eliminadas del mismo
  Ministerio.
- **Alternativas**: índice único con `unaccent(lower())` — requiere la extensión `unaccent` y una
  función inmutable propia; no se justifica para decenas de filas.

## 12. Eventos para notificaciones

- **Decisión**: mismo patrón que la 004 (`contracts/eventos.md`): `EventoMinisterio` tipado en
  `packages/shared-types/src/eventos-ministerio.ts`, `emitirEventoMinisterio()` en
  `apps/api/src/ministerio/eventos.ts`, llamado **después** del commit, que hoy solo loguea ids. Las
  aprobadas, rechazadas y bajas llevan `prioridad: 'importante'` (docs/16: resolución de una
  Postulación va por email). La 012 conecta el envío en ese único enchufe.
- **Resolución de alcance `ministerio`** (D48): `miembrosActivosDe(tx, ministerioId)` en
  `apps/api/src/ministerio/miembros.ts` — la única definición: Postulación `aprobada` en ese Ministerio,
  Persona `activo = true`. La 012 la importa.

## 13. Página pública

- **Decisión**: `GET /ministerios/publicos` (sin sesión, solo activos, solo `nombre`, `descripcion`,
  Células activas por nombre). La página usa `revalidate` igual que las demás públicas con datos del
  catálogo (spec 003). Sin datos estructurados nuevos (schema.org no tiene un tipo que aporte acá).

## 14. Celular

- **Decisión**: las pantallas de la Persona se diseñan a 360 px primero, con D150 (16 px, `Button` de
  44 px — si la tarea de D150 todavía no está en `main`, esta spec no la implementa: usa el `Button` que
  haya y lo hereda cuando llegue). Sus e2e llevan la etiqueta `@celular` y corren también a 360×740.
