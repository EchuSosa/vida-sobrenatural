# Contrato: API de Mi camino (Persona)

Módulo nuevo `apps/api/src/camino/`. Todas las rutas exigen sesión (`JwtNextAuthGuard`); se
recortan por identidad (D134): la Persona es la de la sesión, nunca un parámetro. Errores en
Problem Details (Principio X).

## GET /camino/me — FR-007

Estado de las cuatro etapas de la Persona de la sesión.

**200** `CaminoDeLaPersona` (`data-model.md`):

```json
{
  "etapas": [
    { "etapa": "vida_nueva", "estado": "disponible", "puedeDeclarar": true },
    { "etapa": "vida_de_servicio", "estado": "proximamente", "puedeDeclarar": true,
      "declaracion": { "estado": "no_confirmada", "motivo": "Traenos el certificado y lo vemos", "en": "2026-10-01T13:00:00Z" } },
    { "etapa": "ministerio", "estado": "proximamente", "puedeDeclarar": true },
    { "etapa": "bautismo", "estado": "en_revision", "declaracionId": "…", "desde": "2026-10-05T18:20:00Z" }
  ],
  "vidaNueva": { "estado": "puede_pedir" }
}
```

- Siempre cuatro etapas, en el orden de `ETAPAS_CAMINO`.
- `vidaNueva` es exactamente lo que devuelve `GET /discipulado/me` (004), para que la card y
  `/mi-camino/vida-nueva` no hagan dos llamadas distintas.
- Implementación: `CaminoService.estadoDeEtapas(personaId)` junta `HechosCamino` (una consulta por
  fuente, en paralelo) y aplica `estadoDeEtapa` de `shared-types`. Nunca devuelve notas de
  Encuentros ni datos de otra Persona.

**Tests**: unit de `estadoDeEtapa` por rama (data-model); integración: Persona sin nada, con
pedido, con Grupo en curso, finalizada, con declaración pendiente, rechazada, confirmada, con
Completitud anulada; una Persona no ve las declaraciones de otra.

## POST /camino/me/declaraciones — FR-008 a FR-010

```json
{ "etapa": "bautismo", "comentario": "Me bauticé en 2015 en otra iglesia" }
```

- `etapa`: `EtapaCamino` (requerido). `comentario`: opcional, ≤ 500 (`VALIDACION`, campo
  `comentario`, code `COMENTARIO_DEMASIADO_LARGO`).
- En una transacción: bloquea la fila de la Persona (`FOR UPDATE`), junta `HechosCamino` y aplica
  `puedeDeclarar`. Rechazos, en este orden:
  - edad < 12 → **403** `EDAD_INSUFICIENTE_PARA_PEDIR_SOLO`
  - etapa completa (sistema o Completitud vigente) → **409** `ETAPA_YA_COMPLETADA`
  - ya hay una `pendiente` de esa etapa → **409** `DECLARACION_YA_PENDIENTE` (el índice parcial lo
    garantiza ante carreras; su violación se traduce a este código)
  - Vida Nueva con pedido abierto o Inscripción activa → **409** `ETAPA_EN_CURSO`
- Crea `DeclaracionHistorial { estado: pendiente, creadoPorId: null }` y emite el evento
  `declaracion_historial_creada` (`eventos.md`).

**201** `{ "id": "…", "etapa": "bautismo", "estado": "pendiente", "createdAt": "…" }`

## DELETE /camino/me/declaraciones/:id — FR-011

Retira una declaración propia pendiente. Ajena o inexistente → **404** `NO_ENCONTRADO` (no se
revela que existe). No pendiente → **409** `DECLARACION_NO_PENDIENTE`. Pasa a `retirada` con
`retiradaEn`. **204**.

## Cambios a endpoints de la 004 — FR-017

`POST /discipulado/solicitudes/me` (la Persona) y `POST /discipulado/solicitudes` (en nombre de,
`solicitudes.crear_en_nombre`): **después** de bloquear la fila de la Persona y **antes** de las
reglas que ya tenían, consultan:

- declaración `pendiente` de `vida_nueva` → **409** `HISTORIAL_VIDA_NUEVA_EN_REVISION`
- Completitud vigente de `vida_nueva` → **409** `VIDA_NUEVA_COMPLETADA_POR_HISTORIAL`

Hoy `crear()` bloquea la Solicitud abierta (`bloquearAbiertaDe`); se agrega el bloqueo de la fila
de la Persona al principio de la transacción (mismo patrón que proponer, D137), para serializar
pedido y declaración (research #5). Test de integración de la carrera: pedir y declarar a la vez →
exactamente uno gana.
