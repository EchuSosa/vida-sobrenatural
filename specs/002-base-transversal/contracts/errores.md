# Contract: Formato de error de `apps/api`

Aplica a **toda** respuesta de error de `apps/api`, incluidos los endpoints ya existentes del spec
001 (`/personas/*`, `/sedes/*`) — Historia 4, FR-020 a FR-022; Constitución Principio X.

## Forma de la respuesta (Problem Details, RFC 9457)

```json
{
  "type": "https://vidasobrenatural.app/errores/email-duplicado",
  "title": "Email ya registrado",
  "status": 409,
  "code": "EMAIL_DUPLICADO",
  "detail": "Ya existe una Persona registrada con este email.",
  "requestId": "a1b2c3d4",
  "errors": [{ "campo": "telefono", "code": "TELEFONO_INVALIDO" }]
}
```

- `code`: identificador estable del catálogo compartido (`packages/shared-types`,
  `data-model.md` de este spec) — es lo único que el frontend usa para decidir el mensaje. Nunca
  cambia entre versiones de la API sin agregar un código nuevo (no se reinterpreta uno existente).
- `title` / `detail`: en español, pensados para logs/Swagger — **no** se muestran tal cual al
  usuario final (el frontend traduce `code`, ver `research.md` Decisión 7).
- `requestId`: identifica la petición; aparece también en los logs estructurados de `apps/api`
  (Decisión 5) y, si Sentry está activo, en el evento reportado. Se muestra a la persona solo en el
  caso `ERROR_INTERNO`, como referencia para reportar el problema.
- `errors`: presente únicamente cuando `code: "VALIDACION"` — un elemento por campo inválido, cada
  uno con su propio `code` de campo (ej. `TELEFONO_INVALIDO`, ya usado informalmente por el DTO de
  registro del spec 001; se formaliza con este contrato).

## Garantías

- Todo error de `class-validator` (body inválido) se normaliza a `code: "VALIDACION"` con el detalle
  por campo en `errors`, sin importar qué DTO lo generó.
- Todo error no reconocido (excepción no controlada, error de Prisma no mapeado explícitamente)
  responde `500` con `code: "ERROR_INTERNO"` y **nunca** expone el mensaje o stack trace original en
  el cuerpo de la respuesta — esos detalles solo quedan en el log (correlacionado por `requestId`) y,
  si corresponde, en Sentry.
- Ningún campo de esta respuesta contiene datos personales de la Persona afectada (Constitución
  Principio X) — `detail`/`errors` describen la regla de negocio, nunca repiten el valor enviado
  (ej. no se ecoa el email o teléfono inválido dentro del mensaje).

## Consumo esperado en los frontends

Ver `research.md`, Decisión 7: un cliente de API común parsea esta forma, traduce `code` con
`next-intl`, y expone `errors` para que el formulario marque cada campo — nunca se construye un
mensaje a mano concatenando `title`/`detail`.
