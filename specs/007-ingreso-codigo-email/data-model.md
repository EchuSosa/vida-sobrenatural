# Data Model: Ingreso con código por email

## Modelo nuevo: `CodigoIngreso`

Un pedido de ingreso con código por email. No se vincula a una Persona: existe aunque el email no
esté registrado, para no revelar qué emails lo están (FR-008).

| Campo | Tipo | Reglas |
|---|---|---|
| `id` | `String @id @default(uuid())` | |
| `email` | `String` | Normalizado (`normalizarEmail`: sin espacios al principio y al final, minúsculas). FR-010. |
| `codigoHuella` | `String` | HMAC-SHA256 del código con `CODIGO_INGRESO_SECRET`, en hex. Nunca el código en claro (FR-020). |
| `origenHuella` | `String` | HMAC-SHA256 de la IP del navegador, con el mismo secreto. Nunca la IP en claro. Solo sirve para el límite por origen. |
| `venceEn` | `DateTime` | `creadoEn + 15 minutos` (FR-004). |
| `intentosFallidos` | `Int @default(0)` | Máximo 5 (FR-006). Se incrementa en forma atómica. |
| `usadoEn` | `DateTime?` | Se completa al verificar bien. Un código usado no vuelve a servir (FR-004). |
| `reemplazadoEn` | `DateTime?` | Se completa cuando se pide un código nuevo para el mismo email (FR-005). |
| `creadoEn` | `DateTime @default(now())` | Base de los límites por hora y del borrado a las 24 horas. |

**Índices**: `@@index([email, creadoEn])` (límite por email y búsqueda del código vigente) y
`@@index([origenHuella, creadoEn])` (límite por origen).

**Código vigente** de un email: la fila más nueva de ese email con `usadoEn = null`,
`reemplazadoEn = null`, `venceEn > now()` e `intentosFallidos < 5`. Hay como máximo una (FR-005).

### Estados

```text
            pedir código nuevo (mismo email)
vigente ──────────────────────────────────────▶ reemplazado
   │  │
   │  └── 5.º intento fallido ─────────────────▶ sin intentos
   │  └── pasan 15 minutos ────────────────────▶ vencido
   └───── código correcto ─────────────────────▶ usado
```

Los cuatro estados finales son equivalentes para quien escribe el código: tiene que pedir uno
nuevo. No hay columna `estado`; el estado se deduce de los campos de arriba.

### Ciclo de vida

- **Se crea** al pedir un código, después de pasar los límites de envíos (research.md #5).
- **Se borra físicamente** si el envío del mail falla (no cuenta contra el límite), o cuando tiene
  más de 24 horas (limpieza en cada pedido nuevo, research.md #4). Excepción al soft delete
  justificada en `plan.md` (Principio III).

## Cambios en `Persona`

No cambia el modelo. Cambia el **dato**:

- **Migración de datos**: `email` pasa a minúsculas y sin espacios en todas las filas. Antes, un
  chequeo busca emails que choquen al normalizarlos; si hay alguno, la migración falla con la
  lista (research.md #8).
- **Escritura**: todo camino que crea o edita una Persona guarda el email normalizado (registro,
  alta de menores o adultos por el Admin, seeds).
- **Lectura**: `GET /personas/by-email` normaliza antes de buscar.

## Valores compartidos nuevos (`packages/shared-types`)

| Nombre | Valor | Lo usan |
|---|---|---|
| `normalizarEmail(email)` | `email.trim().toLowerCase()` | API, web, backoffice |
| `CODIGO_INGRESO_LARGO` | `6` | API (generar), `packages/ui` (campo y validación) |
| `CODIGO_INGRESO_VIDA_MIN` | `15` | API (vencimiento), plantilla del mail, texto de la pantalla |
| `CODIGO_INGRESO_MAX_INTENTOS` | `5` | API |
| `CODIGO_INGRESO_ENVIOS_POR_EMAIL_HORA` | `5` | API |
| `CODIGO_INGRESO_ENVIOS_POR_ORIGEN_HORA` | `30` | API |
| `DURACION_SESION_WEB_S` | `30 * 24 * 60 * 60` | `apps/web/src/auth.ts` |
| `DURACION_SESION_BACKOFFICE_S` | `7 * 24 * 60 * 60` | `apps/backoffice/src/auth.ts` |

## Códigos de error nuevos (`ErrorCode`)

`CODIGO_INCORRECTO`, `CODIGO_SIN_INTENTOS`, `CODIGO_VENCIDO`, `DEMASIADOS_PEDIDOS`,
`ENVIO_EMAIL_FALLIDO`. Significado y HTTP en `contracts/codigo-ingreso-api.md`.
