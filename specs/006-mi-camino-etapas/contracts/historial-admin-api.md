# Contrato: historial previo y Completitud Manual (Admin)

Módulo `apps/api/src/camino/` (`historial-admin.controller.ts`). Permisos del catálogo (D132).

## GET /solicitudes (cambia) — FR-012

La bandeja de la 004 suma el tipo `historial`. Cada fila:

```json
{
  "tipo": "historial",
  "id": "…",
  "persona": { "id": "…", "nombre": "…", "apellido": "…" },
  "estado": "pendiente",
  "fecha": "2026-10-05T18:20:00Z",
  "revisadoPor": null,
  "creadoPor": null,
  "detalle": { "etapa": "bautismo" }
}
```

- Query `tipo=discipulado|historial` (opcional; sin él, los dos; hoy un `tipo` distinto de
  `discipulado` devuelve vacío y eso cambia). Mapeo por tipo: **estado** — el filtro por defecto
  "abiertas" es `pendiente,propuesta` para Discipulado y `pendiente` para historial; "resueltas" es
  `aprobada,rechazada,retirada` y `confirmada,rechazada,retirada`; **orden** `espera` (más vieja
  primero) y `fecha` usan `createdAt` en los dos; **buscar** filtra por nombre/apellido de la
  Persona en los dos. El resto de los parámetros
  (estado, orden, página) igual que en la 004. Las filas de Discipulado suman `"tipo":
  "discipulado"` y `"detalle": {}` (cambio compatible: la bandeja actual es el único consumidor).
- Permiso: `solicitudes.ver` (`admin`, `pastor`).

## GET /historial/declaraciones/:id — FR-013

Detalle para el Admin y el Pastor (`solicitudes.ver`).

**200**:

```json
{
  "id": "…", "etapa": "vida_nueva", "estado": "pendiente", "comentario": "…",
  "createdAt": "…", "revisadoPor": null, "revisadaEn": null, "motivoRechazo": null,
  "persona": { "id": "…", "nombre": "…", "apellido": "…", "edad": 34, "sinAccesoALaApp": false },
  "contexto": { "completa": null, "enCurso": false, "completitudVigente": null,
                "declaracionesAnteriores": [{ "estado": "rechazada", "fecha": "…" }] }
}
```

`contexto` es lo que el sistema ya sabe de esa Persona en esa etapa (FR-013), calculado con
`CaminoService`. Nunca incluye notas de Encuentros (D134).

## POST /historial/declaraciones/:id/confirmar — FR-013

Permiso `historial.resolver` (`admin`). Transacción: bloquea la Persona; exige `pendiente`
(`DECLARACION_NO_PENDIENTE`); si la etapa ya está completa por el sistema o con Completitud
vigente → **409** `ETAPA_YA_COMPLETADA`. Pasa a `confirmada` (`revisadoPorId`, `revisadaEn`) y
crea `CompletitudManual { origen: declaracion, declaracionId, registradaPorId }`. Emite
`declaracion_historial_confirmada`. No toca `Persona.rol` (FR-019). **200** con el detalle actualizado.

## POST /historial/declaraciones/:id/rechazar — FR-013

Permiso `historial.resolver`. Cuerpo `{ "motivo"?: string }` (≤ 500, `VALIDACION` en `motivo`).
Exige `pendiente`. Pasa a `rechazada`. Emite `declaracion_historial_rechazada`. **200**.

## GET /personas/:id/camino — FR-014 (contexto para registrar directo)

Permiso `personas.ver` (`admin`, `pastor`). Devuelve, por etapa: completa (y cómo), en curso,
Completitud vigente (`id`, `origen`, `registradaEn`, `registradaPor`), declaración pendiente. Lo
usa el panel "Etapas" de la fila de Personas. Sin notas, sin datos de discipulado más allá del
estado.

## POST /personas/:id/completitudes — FR-014

Permiso `completitud_manual.gestionar` (`admin`). Cuerpo `{ "etapa": EtapaCamino, "nota"?: string }`.
Transacción: bloquea la Persona; vigente de esa etapa o completa por sistema → **409**
`ETAPA_YA_COMPLETADA`; Vida Nueva con Inscripción activa o pedido abierto → **409**
`ETAPA_EN_CURSO`. Crea la Completitud `origen: admin`; si había declaración `pendiente` de esa
etapa, la pasa a `confirmada` y la vincula (en ese caso `origen: declaracion`). Emite
`completitud_manual_registrada` y, si había declaración, también
`declaracion_historial_confirmada`. **201**.

Persona inexistente → 404. Vale para Personas sin acceso a la app y para menores (lo registra el
Admin, coherente con FR-044 de la 004).

## POST /personas/:id/completitudes/:completitudId/anular — FR-015

Permiso `completitud_manual.gestionar`. Ya anulada → **409** `COMPLETITUD_NO_VIGENTE`. Setea
`anuladaEn`, `anuladaPorId`. No toca la declaración que la originó (queda `confirmada`, es
historia). **200**.

## Tests

Integración (`*.integration-spec.ts`): confirmar crea exactamente una Completitud y no cambia `Persona.rol`; confirmar una ya retirada → `DECLARACION_NO_PENDIENTE`; registrar VN con VN completada por Grupo → `ETAPA_YA_COMPLETADA`; anular la Completitud de VN vuelve a ofrecer el pedido en `GET /camino/me`; doble confirmación concurrente → una
gana, la otra `DECLARACION_NO_PENDIENTE`; rechazar con motivo y que la Persona lo vea en
`GET /camino/me`; registrar directo con declaración pendiente la confirma; anular y volver a
registrar; Pastor → 403 en confirmar, rechazar, registrar y anular, 200 en los GET; Discipulador
→ 403 en todo.
