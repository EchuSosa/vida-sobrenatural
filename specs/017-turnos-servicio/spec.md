# Feature Specification: Turnos de servicio

**Feature Branch**: `017-turnos-servicio`

**Created**: 2026-11-02

**Status**: Escrita por Claude con las respuestas provisorias de `docs/06` (D250–D257), por pedido
de Echu del 2026-11-01: "Para las 6 preguntas de docs/06, elegí vos la respuesta más razonable,
documentala en docs/06 con el porqué y dejala fácil de cambiar (configurable o en un solo lugar). No
esperes mi OK." Se confirma con la iglesia cuando la haya.

**Input**: "cada domingo tenemos ministerios que trabajan y se organizan, por ejemplo, ceremonial,
¿tenemos forma de saber qué domingo le toca a quién o cómo lo podríamos organizar?" (Echu,
2026-10-12), y la propuesta anotada en `specs/016-lideres-ministerio/spec.md`, Out of Scope.

**Fuentes**: `specs/009-ministerios-celulas` (Ministerio, Área, membresía = Postulación aprobada,
D170), `specs/016-lideres-ministerio` (líder por Ministerio, D244), `specs/012-notificaciones`
(avisos, D197, D203), `docs/22-ministerios.md`, `docs/06-preguntas-abiertas.md`, D81, D132, D241,
D250–D257.

## Lo configurable, en un solo lugar

| Qué | Dónde | Valor inicial |
|---|---|---|
| Días de servicio de cada Ministerio | Backoffice → Ministerio → "Días de servicio" | Demo: Bienvenida domingos; Ceremonial 2.º domingo; Vida en Acción sábados |
| Cupo de cada área por fecha | Backoffice → Ministerio → área; o el líder en la grilla | `CUPO_TURNO_POR_DEFECTO` = 1 |
| Cuántas fechas muestra la grilla | `FECHAS_VISIBLES_TURNOS` (shared-types) | 8 |
| Fechas que cuenta "cuántas veces sirvió" | `FECHAS_PARA_CONTAR_TURNOS` (shared-types) | 8 |
| Días antes del recordatorio | `DIAS_RECORDATORIO_TURNO` (shared-types) | 2 |
| Áreas de Bienvenida | Catálogos (Admin) | Demo: + "Atención a quienes ministran", "Limpieza" (D254) |

## User Scenarios & Testing *(mandatory)*

### User Story 1 - El Admin carga los días de servicio y los cupos (Priority: P1) ⭐

En el backoffice, en el detalle de un Ministerio, hay una sección **"Días de servicio"**: una o
varias reglas ("Todos los domingos", "El segundo domingo del mes", "Todos los sábados"), con
"Agregar" y "Quitar". Debajo, la lista de las próximas fechas que salen de esas reglas, cada una con
**"Este día no hay"** (suspender) y "Volver a habilitar". En cada área (o en el Ministerio, si no tiene
áreas) se ve y edita el **cupo**: cuánta gente necesita por fecha (1 a 20).

**Independent Test**: el Admin le carga a Ceremonial "El segundo domingo del mes" y ve las próximas
fechas: 8/11, 13/12, 10/1…; suspende el 13/12 y deja de aparecer en la grilla del líder.

**Acceptance Scenarios**:

1. **When** el Admin agrega "Todos los domingos" a Bienvenida, **Then** las próximas
   `FECHAS_VISIBLES_TURNOS` fechas son los próximos domingos (en Argentina).
2. **When** agrega una regla repetida, **Then** 409 `DIA_DE_SERVICIO_REPETIDO`, mostrado debajo del
   campo.
3. **When** suspende una fecha que ya tiene turnos publicados, **Then** confirma ("Se les avisa a
   las 4 personas que tenían turno") y esas personas reciben el aviso.
4. **When** pone un cupo fuera de 1 a 20, **Then** error por campo con cómo corregirlo.
5. Errores: si la API falla al guardar, el aviso dice qué pasó, lo cargado queda en pantalla y se
   puede reintentar; tres toques en "Agregar" agregan una sola regla.

### User Story 2 - El líder arma y publica el rol (Priority: P1) ⭐

En la web app, en "Mi ministerio" (spec 016), una pestaña **"Turnos"**: una grilla de las próximas
fechas (filas) × áreas (columnas; en celular, una fecha por vez con las áreas una debajo de otra).
Cada celda muestra a quiénes tiene asignados y, si no llega al cupo, **"Faltan 2"** con ícono y
texto. "Agregar" abre la lista de integrantes vigentes del área (o del Ministerio, si no tiene
áreas), con **cuántas veces sirvió cada uno** en las últimas `FECHAS_PARA_CONTAR_TURNOS` fechas, y
un aviso si ese día ya tiene turno en su otro Ministerio (D255). Cada fecha tiene **"Copiar la
fecha anterior"** y **"Publicar"**; una fecha publicada muestra "Publicada" y lo que se cambie se
avisa al guardar.

**Independent Test**: la líder de Bienvenida asigna a dos personas en Seguridad el 8/11 (cupo 2),
publica, y cada una recibe "El domingo 8/11 servís en Bienvenida — Seguridad".

**Acceptance Scenarios**:

1. **Given** es líder vigente de Bienvenida, **When** abre "Turnos", **Then** ve las próximas fechas
   no suspendidas con sus áreas, cupos y lo asignado; las fechas en borrador dicen "Borrador".
2. **When** asigna a alguien que ya está ese día en el Ministerio, **Then** 409
   `YA_TIENE_TURNO_ESE_DIA` y lo dice en la celda.
3. **When** asigna a alguien con turno ese día en otro Ministerio, **Then** ve el aviso "Ese día ya
   sirve en Ceremonial" y puede seguir.
4. **When** toca "Copiar la fecha anterior", **Then** copia los turnos de la fecha publicada anterior
   de quienes siguen siendo integrantes, sin pisar lo que ya tenía la fecha.
5. **When** publica, **Then** la fecha queda "Publicada", cada persona con turno recibe un aviso
   importante (in-app y mail) y, `DIAS_RECORDATORIO_TURNO` días antes, un recordatorio.
6. **When** cambia un turno de una fecha publicada, **Then** avisa a quien entra ("servís") y a quien
   sale ("ya no servís").
7. **Given** no es líder de ese Ministerio, **Then** no ve la pestaña y la API responde 403.
8. El Admin ve y edita la misma grilla desde el backoffice; el Pastor la ve sin botones.
9. Errores: API caída al asignar o publicar → aviso con "Reintentar" y nada a medias; doble toque en
   "Publicar" publica y avisa una sola vez.

### User Story 3 - La persona ve sus turnos (Priority: P1) ⭐

En el **Inicio**, una tarjeta **"Tu próximo turno"**: "Domingo 8 de noviembre — Bienvenida,
Seguridad", con el resto de sus próximos turnos en "Ver mis turnos". Solo aparecen fechas
publicadas. Si no tiene ninguno, la tarjeta no aparece.

**Acceptance Scenarios**:

1. **Given** tiene un turno publicado, **Then** lo ve en el Inicio con fecha en Argentina, Ministerio
   y área.
2. **Given** su turno está en borrador, **Then** no lo ve.
3. **Given** se suspende la fecha, **Then** deja de verlo y recibió el aviso.
4. Errores: si la API falla, la tarjeta dice que no se pudo cargar, con "Reintentar", sin romper el
   resto del Inicio.

### User Story 4 - "No puedo ir" (Priority: P2)

Desde "Mis turnos", en un turno publicado y futuro, **"No puedo ir"** (con motivo opcional, hasta
200 caracteres, que ve solo el líder). El turno queda **"Falta cubrir"** en la grilla y los líderes
reciben un aviso. El líder reemplaza con "Agregar" como siempre.

**Acceptance Scenarios**:

1. **When** avisa que no puede, **Then** su turno desaparece de "Tu próximo turno" y la grilla del
   líder muestra "Falta cubrir" en esa celda.
2. **Given** la fecha ya empezó, **Then** el botón no está y la API responde 409
   `TURNO_YA_EMPEZO`.
3. Errores: doble toque manda un solo aviso; API caída → aviso con "Reintentar".

### Edge Cases

- Un integrante deja el Ministerio (baja de la membresía): sus turnos futuros quedan "Falta cubrir"
  y el líder recibe un aviso.
- Se quita una regla de días: las fechas futuras que ya tenían turnos publicados se suspenden con
  aviso (como el escenario 3 de la US1); las que estaban en borrador desaparecen.
- Un Ministerio se inactiva o va a la papelera: sus fechas futuras dejan de verse; al reactivarlo
  vuelven con sus turnos.
- Cambio de mes con "segundo domingo": la regla siempre se calcula en el calendario de Argentina.
- Una persona con turno se da de baja de la app: igual que dejar el Ministerio.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Cada Ministerio MUST poder tener cero o más **Días de servicio** (reglas): semanal
  (día de la semana) o mensual (posición 1.º–4.º o último, y día de la semana). Sin reglas, no hay
  turnos (D250).
- **FR-002**: Las **Fechas de servicio** MUST salir de las reglas, en el calendario de Argentina, y
  persistirse recién cuando tienen algo (un turno, una suspensión o la publicación).
- **FR-003**: Cada área, y cada Ministerio sin áreas, MUST tener un **cupo** de 1 a 20, 1 por
  defecto (D251).
- **FR-004**: Un **Turno** MUST ser Persona + Fecha de servicio + área (o ninguna si el Ministerio no
  tiene áreas). Solo integrantes vigentes del área (o del Ministerio). Una Persona, una vez por fecha
  y Ministerio (`YA_TIENE_TURNO_ESE_DIA`) (D255).
- **FR-005**: Arman el rol los líderes vigentes del Ministerio y el Admin; el Pastor lo ve (D253).
- **FR-006**: Publicar una fecha MUST avisar a cada persona con turno (importante: in-app y mail) y
  programar el recordatorio; cambiar o quitar un turno publicado avisa a quien entra y a quien sale
  (D256). Todo aviso se emite en la misma transacción que el cambio (D197).
- **FR-007**: "Cuántas veces sirvió" MUST contar turnos publicados no cancelados en las últimas
  `FECHAS_PARA_CONTAR_TURNOS` fechas del Ministerio.
- **FR-008**: "No puedo ir" MUST marcar el turno como cancelado por la persona, con motivo opcional
  visible solo para los líderes y el Admin, y avisar a los líderes (D257).
- **FR-009**: Todas las acciones MUST seguir H-50 (errores por campo), H-57 (`useEnvio`, sin doble
  envío) y tener sus e2e del caso de error (API caída, validación, doble envío).
- **FR-010**: Ningún dato del turno (motivo de "No puedo ir") va a los logs ni a los avisos de otras
  personas.

### Key Entities

- **Día de servicio** (regla): Ministerio, tipo (semanal / mensual), día de la semana, posición en el
  mes (si es mensual), activo.
- **Fecha de servicio**: Ministerio, día (fecha civil en Argentina), estado (borrador / publicada /
  suspendida), publicada en/por.
- **Turno**: Fecha de servicio, Persona, área (opcional), estado (asignado / cancelado por la
  persona / quitado), motivo (si lo canceló la persona), quién y cuándo.
- **Cupo**: en el Área (y en el Ministerio, para los que no tienen áreas).

## Success Criteria *(mandatory)*

- **SC-001**: La líder de Bienvenida arma y publica el rol de un domingo desde el celular en menos de
  3 minutos.
- **SC-002**: Cada persona con turno se entera por la app (aviso + Inicio) sin un mensaje de
  WhatsApp.
- **SC-003**: Ningún domingo queda con un área sin cubrir sin que la grilla lo diga en texto.
- **SC-004**: `axe` sin violaciones en claro y oscuro en la grilla, "Mis turnos" y la tarjeta del
  Inicio; 44 px en celular.

## Assumptions

- Hay una sola reunión por domingo (Echu, 2026-10-12); un turno es por día, sin horario.
- Las respuestas a docs/06 son provisorias (D250–D257); cambiarlas no requiere migrar datos salvo la
  forma de las reglas de días.

## Out of Scope

- Rotación automática y disponibilidad previa de cada persona.
- Horarios dentro del día (varias reuniones), y turnos de Eventos.
- Intercambio de turnos entre personas sin pasar por el líder.
