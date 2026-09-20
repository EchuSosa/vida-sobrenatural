# Data Model: Base Transversal de la App

Alcance: solo lo que este spec agrega o modifica sobre el modelo ya existente del spec 001
(`specs/001-fase-bienvenida/data-model.md`). No se tocan `Sede` ni el resto de los campos/estados de
`Persona` ya documentados ahí.

## Persona (campos nuevos)

| Campo | Tipo | Obligatorio | Notas |
|---|---|---|---|
| `idiomaPreferido` | enum `Idioma` (`es`) | sí, default `es` | Historia 6 (FR-031). Un solo valor posible en este spec — agregar `pt`/`en` en Fase 2 es sumar valores al enum, sin migración de datos existentes. No se pide en el registro. |
| `temaPreferido` | enum `TemaPreferido` (`claro` \| `oscuro` \| `sistema`) | sí, default `claro` (corregido D106, actualización 2026-09-20 — originalmente `sistema`) | Historia 5 (FR-026 a FR-028). Elegido por la propia Persona desde Perfil (app) o el menú de usuario (backoffice); se recuerda entre sesiones y dispositivos. |

**Validaciones**:
- `idiomaPreferido` y `temaPreferido` siempre tienen un valor (no son opcionales) — todo registro
  nuevo los recibe por default sin intervención del formulario de registro del spec 001, que no
  cambia.

**No hay transición de estado** para ninguno de los dos campos: `idiomaPreferido` no tiene UI para
cambiarlo en este spec (Assumptions del spec); `temaPreferido` cambia libremente en cualquier
momento vía `PATCH /personas/me/preferencias` (ver `contracts/personas-api.md`), sin reglas de
negocio asociadas más allá de pertenecer al enum.

## Catálogo de códigos de error (`ErrorCode`)

No es una entidad de base de datos — vive como un `type` de TypeScript en
`packages/shared-types/src/error-code.ts`, compartido por las tres apps (ver `research.md`,
Decisión 6). Cada valor tiene:
- Un identificador estable (ej. `EMAIL_DUPLICADO`) que la API devuelve en el campo `code` de toda
  respuesta de error (Problem Details, RFC 9457).
- Un mensaje amable por app, en `messages/es.json` de `apps/web` y `apps/backoffice` bajo el
  namespace `errors.<CODE>`.

Valores iniciales de este spec (algunos migran mensajes de excepción ya existentes en el spec 001,
otros son genéricos para cualquier feature futura):

| Código | Origen | Status HTTP típico |
|---|---|---|
| `NO_AUTENTICADO` | Genérico — falta o es inválido el JWT | 401 |
| `SIN_PERMISO` | Genérico — rol insuficiente o recurso ajeno | 403 |
| `NO_ENCONTRADO` | Genérico — recurso inexistente | 404 |
| `VALIDACION` | Genérico — `class-validator` (incluye `errors` por campo) | 400 |
| `EMAIL_DUPLICADO` | Migrado de `persona.service.ts` (POST /personas, FR-009 del spec 001) | 409 |
| `SEDE_INVALIDA` | Migrado de `persona.service.ts` (`sedeId` inexistente o inactiva) | 400 |
| `CONSENTIMIENTO_REQUERIDO` | Migrado de `persona.service.ts` (FR-013 del spec 001) | 400 |
| `PERSONA_NO_PENDIENTE_TUTOR` | Migrado de `persona.service.ts` (`PATCH /:id/activar` fuera de estado) | 409 |
| `VERIFICACION_LOGIN_FALLIDA` | Reservado para D88 (fail-closed), ya nombrado en `docs/16` | 401 |
| `ERROR_INTERNO` | Genérico — cualquier error no reconocido | 500 |

Cada feature futura agrega sus propios valores a esta misma unión (Constitución, Principio X) —
nunca reemplaza ni reinterpreta uno existente.

## Fuera de alcance en este spec (confirmado)

No se agregan entidades nuevas de base de datos más allá de las dos columnas de `Persona` listadas
arriba. `Sede`, el resto de `Persona`, y todas las entidades listadas como "fuera de alcance" en
`specs/001-fase-bienvenida/data-model.md` siguen sin implementarse.
