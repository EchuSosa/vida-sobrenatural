# Contrato de dependencia: lo que la spec 010 necesita de las specs 011 (Eventos) y 012 (Notificaciones)

Esta spec **no** especifica Eventos ni Notificaciones. Acá queda, para quien escribe la 011 y la
012, exactamente qué se usa, para que lo cubran o avisen si no. Si al mergear algo no coincide, se
ajusta esta spec, no la otra.

## De la spec 011 — Eventos

| # | Necesidad | Para qué (FR de la 010) |
|---|---|---|
| E1 | Entidad `Evento` con `id`, `nombre`, `fecha` (instante con hora; si es solo fecha civil, ver research #11), lugar (texto o el campo que la 011 defina), `sedeId`, `activo`, `slug` y página pública. | FR-019 (la card muestra fecha, hora, lugar y enlace) |
| E2 | Un **discriminador de Evento de bautismo** (`tipo = bautismo`, o `categoria`, el nombre que la 011 elija) que el Admin elige al crear el Evento. | FR-012 (solo se asigna a Eventos de bautismo) |
| E3 | Para un Evento de bautismo: **sin** "Anotarme", QR, cupo, lista de espera, costo ni `dias_anticipacion_recordatorio`; el formulario de alta los oculta o los fija. | FR-018 |
| E4 | La página pública del Evento de bautismo **no** muestra inscriptos ni su cantidad. | FR-018, D5 |
| E5 | `InscripcionEvento` con `personaId`, `eventoId`, `estado` (al menos `confirmada` y `cancelada`) y `creadoPorId`, y una operación de servicio que el Admin use para inscribir a una Persona **salteando cupo y aprobación** cuando el Evento es de bautismo (Flujo 8, paso 5a). La 010 la llama dentro de su transacción. | FR-012, FR-017 |
| E6 | Las vías genéricas de cancelación de una inscripción (la Persona desde "Mis eventos", el Admin desde la lista de inscriptos) **no** actúan sobre inscripciones de un Evento de bautismo: "Mis eventos" lo muestra con enlace a Mi camino, y el detalle del Evento de bautismo en el backoffice monta la sección de la 010 (`SeccionBautismoEvento`) en vez de la lista genérica de inscriptos. | FR-013, FR-020a (una sola vía, la de la 010) |
| E7 | Al cancelar o desactivar un Evento de bautismo, llamar **dentro de la misma transacción** a `BautismoService.liberarAsignacionesDeEvento(tx, eventoId)` y emitir sus eventos después del commit. | FR-016, FR-026 |
| E8 | Un helper de e2e/fixtures para crear un Evento de bautismo futuro y uno pasado. | tests |
| E9 | Ruta del backoffice para el detalle de un Evento (`/eventos/[id]`) y para crear uno (`/eventos/nuevo` o similar), para el enlace "Crear un Evento de bautismo". | escenario 3.5 |

## De la spec 012 — Notificaciones

| # | Necesidad | Para qué |
|---|---|---|
| N1 | Conectar `emitirEventoBautismo` (o reemplazarlo por su emisor general) con el disparador `solicitud_actualizada`, según la tabla de `contracts/eventos-bautismo.md`. | FR-023, FR-026 |
| N2 | Texto fuera de la app genérico para estos eventos y para `evento_proximo` de un Evento de bautismo (no nombrar el bautismo ni el Evento en push ni en el asunto del email). | FR-024, `docs/13` punto 5 |
| N3 | El aviso abre Mi camino (entidad relacionada = la Solicitud de Bautismo). | Historia 6 |

## De la spec que implemente D144 — Historial previo

| # | Necesidad | Para qué |
|---|---|---|
| H1 | Implementar el puerto `HistorialPrevio` (`bautismoDeclaradoConfirmado`, `vidaNuevaDeclaradaConfirmada`) de `apps/api/src/bautismo/estado-bautismo.ts`. | FR-002, FR-030 |
| H2 | Pasarle a `TarjetaBautismo` la acción "Ya me bauticé" por la prop `accionYaLoHice`. | FR-020b |
| H3 | Al confirmar una declaración de bautismo, si hay una Solicitud abierta, retirarla con `BautismoService.retirarPorDeclaracion(tx, personaId)`. | caso borde |

**Orden de merge sugerido.** 011 antes que la 010 (sin `Evento`/`InscripcionEvento` la 010 no
compila sus lotes B y C). La 012 y la de D144 pueden llegar antes o después: la 010 funciona con el
emisor de log y el puerto en `false`.
