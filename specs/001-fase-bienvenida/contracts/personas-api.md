# Contract: Personas API (`apps/api`)

Base path: `/personas`.

## Formato de errores *(actualización 2026-09-17, FR-018, D101)*

Todos los errores de este contrato (400/403/404/409 descritos abajo) siguen el formato Problem
Details + `code` del catálogo compartido ya implementado por 002-base-transversal (ver
`specs/002-base-transversal/contracts/errores.md`) — no se define un formato de error propio para
esta fase. Los `code` usados por este contrato: `VALIDACION` (400, con `errors` por campo),
`EMAIL_DUPLICADO` (409, FR-009), `SEDE_INVALIDA` (400), `CONSENTIMIENTO_REQUERIDO` (400),
`PERSONA_NO_PENDIENTE_TUTOR` (409), `NO_ENCONTRADO` (404), `SIN_PERMISO` (403).

## GET /personas/by-email

**Uso interno, no llamado por el navegador**: lo invoca el callback server-side de NextAuth.js
(en `apps/web`/`apps/backoffice`) durante el login, para resolver si el email autenticado ya
corresponde a una Persona (ver `research.md`, Decisión 2).

- **Auth**: `X-Internal-Secret: <INTERNAL_API_SECRET>` (secreto de servicio a servicio, nunca
  expuesto al navegador). No acepta JWT de usuario.
- **Query params**: `email` (string, requerido).
- **Response 200** (existe):
  ```json
  { "id": "uuid", "estado": "activa", "activo": true, "rol": ["miembro_registrado"] }
  ```
- **Response 404**: no existe ninguna Persona con ese email → el frontend debe llevar al
  Visitante al formulario de registro (Historia 2).

## POST /personas

Registro inicial — Historia 2 / Historia 2b, FR-005 a FR-009, FR-013.

- **Auth**: sesión NextAuth válida (JWT de usuario). El `email` NO es un campo del body — el
  backend lo toma exclusivamente de los claims del JWT ya validado por el guard, así que no hay
  ningún valor de email enviado por el cliente que pueda no coincidir: la identidad de la Persona
  a crear queda fijada por el token, no por el body. (`nombre` sí es un campo del body: el
  Visitante puede corregirlo respecto del que llegó de Google — no se valida contra el token
  porque el formulario está pensado para permitir esa corrección, ver Historia 2, Acceptance
  Scenario 2.)
- **Request body**:
  ```json
  {
    "apellido": "string",
    "nombre": "string",
    "genero": "string (enum)",
    "fechaNacimiento": "YYYY-MM-DD",
    "telefono": "string (+<código país><dígitos>, ej. '+54 92211234567')",
    "direccion": "string",
    "sedeId": "uuid",
    "estadoCivil": "string (enum)",
    "profesion": "string (enum)",
    "profesionDetalle": "string (obligatorio si profesion='otro', ignorado si no)",
    "tiempoCongregacion": "string (enum)",
    "consentimientoDatos": true,
    "fotoUrl": "string (opcional, URL — picture del perfil de Google)"
  }
  ```
  `apellido` y `nombre` llegan pre-completados en el formulario desde `family_name`/`given_name`
  del perfil de Google (editables); `fotoUrl` sale de `picture` del mismo perfil, sin editar.
  `telefono` se arma en el formulario con un selector de código de país + un input numérico
  (sin letras); el backend igual valida el formato (`+` + dígitos/espacios) del lado del servidor.
  `profesion` es un selector de categorías (`salud`, `educacion`, `tecnologia_ingenieria`,
  `comercio_ventas`, `oficios_construccion`, `administracion_finanzas`, `legal`,
  `comunicacion_marketing`, `arte_diseno`, `servicios_gastronomia`, `transporte`, `estudiante`,
  `ama_de_casa`, `jubilado_a`, `sin_ocupacion`, `otro`); si se elige `otro`, el formulario muestra
  un campo de texto corto adicional (`profesionDetalle`), obligatorio en ese caso únicamente.
- **Reglas del servidor** (FR-007):
  - Calcula edad a partir de `fechaNacimiento`.
  - Si `edad >= 18`: requiere `consentimientoDatos === true` (FR-013) o rechaza con 400; crea la
    Persona con `estado: "activa"`, `activo: true`, `rol: ["miembro_registrado"]`.
  - Si `edad < 18`: ignora `consentimientoDatos` del body (el menor no autoconsiente); crea la
    Persona con `estado: "pendiente_tutor"`, `activo: true`, sin `rol` operativo (no puede iniciar
    sesión hasta activarse).
  - *(actualización 2026-09-17, FR-013, FR-015)* Campos que el servidor setea, **nunca** tomados
    del body: si `consentimientoDatos=true`, setea `consentimientoDatosFecha=now()` y
    `consentimientoDatosOrigen='app'`; siempre setea `origenAlta='autorregistro'` y `altaPor=null`
    (el alta por Admin es una feature propia, todavía sin endpoint — ver `data-model.md`).
- **Response 201**:
  ```json
  { "id": "uuid", "estado": "activa" }
  ```
  o
  ```json
  { "id": "uuid", "estado": "pendiente_tutor" }
  ```
- **Response 409**: `email` (o el email del token) ya pertenece a una Persona existente (FR-009) —
  no crea un duplicado.
- **Response 400**: falta algún campo obligatorio, `sedeId` no corresponde a una Sede activa,
  `telefono` no tiene el formato `+<código><dígitos>`, o `profesion='otro'` sin `profesionDetalle`.

## GET /personas/pendientes-tutor

Requiere rol **Admin** o **Discipulador** (FR-008, Historia 2b Acceptance Scenario 3).

- **Response 200**: lista de Personas con `estado: "pendiente_tutor"` y `activo: true` (las ya
  marcadas inactivas no aparecen — quedan cerradas, ver `data-model.md`).
  ```json
  [
    { "id": "uuid", "nombre": "...", "apellido": "...", "telefono": "...", "fechaNacimiento": "...", "sedeId": "uuid" }
  ]
  ```

## PATCH /personas/:id/activar

Requiere rol **Admin** o **Discipulador**. Camino A del Flujo 7 únicamente (ver `research.md`,
Decisión 4) — no crea Personas nuevas, solo activa una `pendiente_tutor` existente.

- **Request body**:
  ```json
  { "tutorNombre": "string (requerido)", "tutorTelefono": "string (requerido)" }
  ```
- **Reglas del servidor**: solo válido si `estado === "pendiente_tutor"` y `activo === true`;
  pasa `estado` a `"activa"`, guarda `tutorNombre`/`tutorTelefono`, asigna
  `rol: ["miembro_registrado"]`. Setea `consentimientoDatos=true` (ver `data-model.md`). El
  consentimiento de datos (FR-013) se considera dado por el tutor en este paso — no requiere un
  campo adicional en el body (queda registrado implícitamente por la presencia de
  `tutorNombre`/`tutorTelefono` y la acción del Admin/Discipulador). *(actualización 2026-09-17)*
  También setea `consentimientoDatosFecha=now()` y `consentimientoDatosOrigen='presencial'`.
- **Response 200**: `{ "id": "uuid", "estado": "activa" }`.
- **Response 409**: la Persona no está en `pendiente_tutor` (ya activada, o inactiva).
- **Response 403/401**: sin rol Admin/Discipulador o sin sesión.

## PATCH /personas/:id/marcar-inactiva

Requiere rol **Admin** o **Discipulador**. Cierre de un caso `pendiente_tutor` que el tutor no
autorizó o no pudo ser contactado (FR-014, decisión de Clarifications).

- **Request body**: ninguno.
- **Reglas del servidor**: solo válido si `estado === "pendiente_tutor"`; pasa `activo` a
  `false`. No cambia `estado` (queda como registro histórico de que fue un intento de menor no
  autorizado).
- **Response 200**: `{ "id": "uuid", "activo": false }`.
- **Response 409**: la Persona no está en `pendiente_tutor`, o ya está `activo: false`.
