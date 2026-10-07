# Contrato: alta de adultos por el Admin, email opcional

Módulo `apps/api/src/persona/`.

## POST /personas/alta — FR-030 a FR-036

Permiso `personas.alta` (`admin`). Discipulador y Pastor → **403** `SIN_PERMISO` (FR-029).

Cuerpo `DatosAltaPersona` (`data-model.md`):

```json
{
  "apellido": "Gómez", "nombre": "Rosa", "genero": "femenino",
  "fechaNacimiento": "1948-03-12", "telefono": "+54 9 221 555 0101",
  "direccion": "Calle 7 1234", "sedeId": "…", "estadoCivil": "viudo_a",
  "profesion": "jubilado_a", "tiempoCongregacion": "mas_de_5_anios",
  "email": null, "consentimiento": true, "confirmarPosibleDuplicado": false
}
```

Orden de validación:

1. Campos: `erroresDeDatosPersonales` (shared, los mismos del registro) + `email` con formato si
   viene + `consentimiento === true` (`CONSENTIMIENTO_REQUERIDO`, ya existe) + edad < 18 →
   `{campo: "fechaNacimiento", code: "ALTA_MENOR_DE_EDAD"}` (FR-033). Todo junto → **400**
   `VALIDACION` con `errors: [{campo, code}]` (H-50).
2. Email (normalizado) ya usado → **409** `EMAIL_DUPLICADO` con `errors: [{campo: "email", code:
   "EMAIL_DUPLICADO"}]` (FR-034). El índice único lo garantiza ante carreras.
3. Si `confirmarPosibleDuplicado !== true`: busca coincidencias (research #7). Si hay → **409**
   `POSIBLE_DUPLICADO`:

```json
{
  "type": "…", "title": "…", "status": 409, "code": "POSIBLE_DUPLICADO", "requestId": "…",
  "coincidencias": [
    { "id": "…", "nombre": "Rosa", "apellido": "Gómez", "fechaNacimiento": "1948-03-12",
      "telefono": "+54 221 5550101", "activa": true, "porque": ["telefono"] }
  ]
}
```

4. Crea la Persona (`estado: activa`, `telefonoNormalizado`, `origenAlta: admin`, `altaPor: <sesión>`,
   `consentimientoDatos: true`, `consentimientoDatosFecha: now`, `consentimientoDatosOrigen:
   presencial`) y, en la misma transacción, `RolesDeEstadoService.otorgarRolDeEstado(id,
   'miembro_registrado')`.

**201** `{ "id": "…", "nombre": "…", "apellido": "…", "sinAccesoALaApp": true }`

## PATCH /personas/:id/email — FR-037

Permiso `personas.editar_email` (`admin`). Cuerpo `{ "email": "rosa@ejemplo.com" }`. Solo si la
Persona **no** tiene email (si tiene → **409** `EMAIL_YA_CARGADO`, código nuevo — editarlo es
Flujo 9, fuera de alcance). Formato → `VALIDACION`; usado → `EMAIL_DUPLICADO`. **200**.

## Cambios por `email` opcional — FR-038

- `GET /personas` (listado del 005) y `GET /personas/buscar`: `email: string | null`, y
  `sinAccesoALaApp: boolean` (= `email === null`) para que la pantalla no lo derive a mano.
- `GET /personas/by-email` y el login: sin cambios (buscan un email concreto).
- `POST /personas` (auto-registro): sin cambios; el email sigue saliendo de la sesión.
- Auditoría de cambios de rol y vista administrativa de discipulados: si muestran email, lo
  tratan como opcional.

## Tests

Unit: `normalizarTelefono` (tres formas del mismo número, otro país), `normalizarNombre` (tildes,
mayúsculas, espacios), `sonPosiblesDuplicados` (teléfono, nombre+apellido+fecha, homónimo con otra
fecha = no). Integración (`*.integration-spec.ts`): alta sin email; alta con email; email duplicado; menor de edad; aviso
por teléfono escrito distinto; aviso contra Persona inactiva; reintento con confirmación crea;
doble envío concurrente con el mismo email → uno solo; `miembro_registrado` presente; Discipulador
y Pastor → 403; agregar email a quien no tiene; a quien tiene → `EMAIL_YA_CARGADO`.
