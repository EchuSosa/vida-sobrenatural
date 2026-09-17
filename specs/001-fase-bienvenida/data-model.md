# Data Model: Fase de Bienvenida para Visitantes

Alcance: solo las entidades declaradas en `spec.md` (Persona, Sede). Nombres de campos alineados
con `docs/04-dominio-entidades.md` (Principio II de la Constitución — terminología canónica).
Ningún registro se borra físicamente (Principio III) — ambas entidades tienen `activo`.

## Sede

Representa una locación/congregación de Vida Sobrenatural (Historia 1, Historia 3).

| Campo | Tipo | Obligatorio | Notas |
|---|---|---|---|
| `id` | uuid | sí | PK |
| `nombre` | string | sí | ej. "La Plata" |
| `direccion` | string | sí | |
| `contactoTelefono` | string | no | al menos un medio de contacto entre teléfono/email (FR-002) |
| `contactoEmail` | string | no | |
| `horarios` | string | sí | texto libre (ej. "Domingos 10 y 18 hs") — sin modelar Cronograma, eso es de Curso/Grupo (fase posterior) |
| `descripcionBienvenida` | text | no | contenido específico de esa Sede para Historia 1 |
| `activo` | boolean | sí, default `true` | soft delete (Principio III); una Sede con `activo=false` no aparece para Visitantes ni es seleccionable en el registro |
| `createdAt` / `updatedAt` | datetime | sí | auditoría estándar |

**Validaciones**:
- `nombre` único entre Sedes activas (evita duplicados accidentales del Admin).
- Al menos uno de `contactoTelefono` / `contactoEmail` presente (FR-002 exige poder contactar la
  Sede sin preguntarle a una persona).

**Reglas de negocio**:
- FR-004: si hay más de una Sede con `activo=true`, el Visitante debe poder elegir/identificar la
  suya antes de ver su información (mecanismo de acceso puntual diferido a tasks, ver Assumptions
  del spec).
- Edge case del spec ("Admin elimina o desactiva la única Sede activa"): `PATCH /sedes/:id` con
  `activo=false` está permitido aunque sea la última activa — el frontend de Historia 1 debe
  manejar el caso de "cero Sedes activas" (mensaje, no error 500).

## Persona

Representa a un individuo que interactúa con la iglesia (Historia 2, 2b, y contacto para
Historia 3). Se crea recién cuando autoriza el acceso vía SSO y completa el formulario — un
Visitante que solo mira contenido de Bienvenida (Historia 1) **no** genera un registro de Persona.

| Campo | Tipo | Obligatorio | Notas |
|---|---|---|---|
| `id` | uuid | sí | PK |
| `email` | string | sí | recibido del proveedor SSO; **único** entre Personas (FR-009) — es el único dato de contacto con constraint de unicidad |
| `nombre` | string | sí | pre-completado desde `given_name` del perfil de Google, editable en el formulario |
| `apellido` | string | sí | pre-completado desde `family_name` del perfil de Google, editable en el formulario (FR-006) |
| `genero` | enum | sí | valores a definir junto al resto del dominio en `docs/04-dominio-entidades.md`; no se amplía aquí por no ser parte del alcance de esta fase |
| `fechaNacimiento` | date | sí | usada para calcular edad (FR-007); no editable por la propia Persona luego del registro (fuera de alcance de esta fase, ver Flujo 11) |
| `telefono` | string | sí | FR-006; **no** único (FR-009 — dos Personas pueden compartir teléfono) |
| `direccion` | string | sí | FR-006 |
| `sedeId` | uuid (FK → Sede) | sí | FR-006/FR-009; la Sede a través de la cual se registró |
| `estadoCivil` | enum | sí | `soltero_a, casado_a, en_concubinato, viudo_a, divorciado_a, separado_a` (`docs/05-decisiones.md` D53) |
| `profesion` | string | sí | FR-006 |
| `tiempoCongregacion` | enum | sí | `menos_6_meses, 6_meses_a_1_anio, 1_a_3_anios, 3_a_5_anios, mas_5_anios` (D53) |
| `fotoUrl` | string | no | `picture` del perfil de Google, guardada tal cual al registrarse; no editable por la propia Persona por ahora |
| `estado` | enum: `activa` \| `pendiente_tutor` | sí, default calculado en el registro | FR-007/FR-008; **no** se agrega un tercer valor (ver Clarifications del spec, decisión sobre cierre de casos) |
| `activo` | boolean | sí, default `true` | soft delete (Principio III); se pone en `false` cuando un `pendiente_tutor` no se autoriza (FR-014) — no es lo mismo que `estado` |
| `consentimientoDatos` | boolean | sí para `estado=activa` | FR-013 — lo marca la propia Persona si es mayor de edad |
| `tutorNombre` | string | solo si pasó por `pendiente_tutor` → `activa` | `docs/04-dominio-entidades.md`; se completa en el momento de activar (FR-008), no en el formulario inicial |
| `tutorTelefono` | string | ídem | ídem — también sirve como evidencia informal de que el consentimiento del menor (FR-013) lo dio el tutor, no el menor |
| `rol` | string/array | sí, default `["miembro_registrado"]` cuando `estado=activa` | roles acumulativos (`docs/03-roles-permisos.md`); esta fase solo asigna `miembro_registrado` al activarse — `admin`/`discipulador` se asignan fuera de este flujo (dato de seed/gestión manual, no hay UI de asignación de rol en este spec) |
| `createdAt` / `updatedAt` | datetime | sí | auditoría estándar |

**Validaciones**:
- `email` único entre **todas** las Personas (activas o no) — FR-009.
- `telefono` explícitamente **sin** constraint de unicidad — decisión de Clarifications.
- `consentimientoDatos` no puede ser `true` si `estado=pendiente_tutor` en el momento de la
  creación (el menor no puede autoconsentir) — se completa recién cuando se activa, a partir del
  consentimiento del tutor (FR-013).

### Transiciones de estado (`estado`)

```text
(no existe) --[POST /personas, edad >= 18]--> activa
(no existe) --[POST /personas, edad < 18]--> pendiente_tutor
pendiente_tutor --[PATCH /personas/:id/activar, con tutorNombre+tutorTelefono]--> activa
```

Al ejecutar `PATCH /personas/:id/activar`, el sistema DEBE setear `consentimientoDatos=true`
(representa el consentimiento del tutor, capturado fuera del sistema — FR-013).

### Transiciones de `activo` (independiente de `estado`)

```text
true --[PATCH /personas/:id/marcar-inactiva, solo si estado=pendiente_tutor]--> false
```

No hay transición de vuelta de `activo=false` a `true` definida en el spec de esta fase (si se
necesitara reabrir un caso, es una operación manual de Admin sobre el registro, fuera de alcance
de un endpoint dedicado por ahora).

## Fuera de alcance en esta fase (confirmado)

Campos y entidades mencionados en `docs/04-dominio-entidades.md` pero que **no** se implementan en
este feature, porque pertenecen a fases posteriores según el spec: `disponible_discipulado`,
`apto_ministerio`, Inscripción, Curso, Grupo, Cronograma, Contenido, Encuentro, Asistencia,
Ministerio, Célula, Postulación, Solicitud de Bautismo, Solicitud de Discipulado, Evento,
Inscripción a Evento, Pago, Suscripción a Notificación, Notificación, Relación Familiar. No se
agregan columnas ni tablas para ninguno de ellos todavía (Principio IV).
