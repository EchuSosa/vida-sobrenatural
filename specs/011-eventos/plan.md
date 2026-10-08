# Implementation Plan: Eventos — cartelera, inscripciones, cupo, lista de espera y pagos

**Branch**: `011-eventos` | **Date**: 2026-10-07 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/011-eventos/spec.md`

## Summary

El Admin carga Eventos en el backoffice (con flyer, cupo, lista de espera, costo e instrucciones de
pago) y obtiene su QR y su link. Cada Evento tiene una página pública con URL propia, con la
información clave como texto, metadatos para compartir y datos estructurados (D82, D83). Una
Persona se anota desde esa página o desde el QR (si no tiene sesión, ingresa y vuelve al mismo
Evento); el sistema decide en el acto si queda confirmada, pendiente de aprobación o en lista de
espera, sin superar nunca el cupo, y promueve automáticamente desde la lista cada vez que se libera
un lugar. Con costo, la Persona queda "confirmada, falta el pago" (D148), sube el comprobante
(archivo privado) y el Admin lo verifica desde la bandeja unificada de Solicitudes; un rechazo
cancela la Inscripción y libera el lugar. El Admin además aprueba o rechaza inscripciones (también
en lote), anota y registra pagos en nombre de quien no usa la app, cancela, reactiva o elimina
Eventos (D119), y crea **Eventos de bautismo** para la spec 010 (D147). Cada transición emite un
**suceso** sin datos personales que la spec 012 convierte en avisos.

Enfoque técnico: un módulo `evento` nuevo en `apps/api` con tres modelos (`Evento`,
`InscripcionEvento`, `Pago`); el cupo se garantiza bloqueando la fila del Evento dentro de cada
transacción (research #1) y una única función promueve desde la lista (research #3);
`StorageService` gana áreas públicas/privadas y lectura controlada (research #6); páginas públicas
con ISR y una isla cliente para el estado propio (research #10).

## Technical Context

**Language/Version**: TypeScript en Node.js 22+, el stack del monorepo. Sin lenguaje nuevo.

**Primary Dependencies**: NestJS + Prisma 7 (`apps/api`), `sharp` (ya está, D110); Next.js 16 App
Router + NextAuth.js + next-intl (`apps/web`, `apps/backoffice`); `packages/shared-types`;
`packages/ui` (`TablaDatos`, `ControlesTabla`, `Paginacion`, `CampoFecha`, `CampoHora`,
`useEnvio`, `useValidacionCampos`, `ResumenErrores`, `EstadoVacio`, `PlaceholderImagen`,
`ConfirmDestructiveDialog`, `MigaDePan`). **Dependencia nueva**: `qrcode` en `apps/backoffice`
(research #8). Condicional: `@nestjs/throttler` si la 007 no lo agregó (research #10).

**Storage**: PostgreSQL vía Prisma: 3 modelos y 6 enums (`data-model.md`), con índices únicos
parciales y CHECKs en SQL dentro de la migración (patrón H-140). Archivos: `StorageService` con
áreas `portadas` (existente), `flyers` (pública) y `comprobantes` (privada).

**Testing**: Jest unit e integración (`apps/api`), Playwright con axe en claro y oscuro
(`apps/web`, `apps/backoffice`); proyecto `celular` nuevo en `apps/web` (research #16).

**Target Platform**: Docker Compose local (D130).

**Project Type**: la web application existente. Extiende `apps/api`, `apps/web`, `apps/backoffice`,
`packages/shared-types` y `packages/ui`, sin proyectos nuevos.

**Performance Goals**: cartelera y página de Evento dentro de las metas de Core Web Vitals en
celular (LCP < 2.5 s: flyer con `next/image`, `priority` solo en la página del Evento). La
inscripción con bloqueo de fila soporta la ráfaga del culto (SC-003: 20 simultáneas).

**Constraints**:
- El cupo nunca se supera (FR-016, SC-003): todo cambio de ocupación pasa por el bloqueo del Evento.
- Una sola promoción (`promoverDesdeLista`) para los seis caminos que liberan lugar (Principio XI).
- Los comprobantes nunca se sirven desde una carpeta pública (Principio V, SC-005).
- Los sucesos no llevan datos personales (Principio X).
- Ningún texto fijo en el código (D84); colores solo de tokens (D118); estados con texto + ícono (D81).

**Scale/Scope**: 3 modelos, 4 permisos nuevos, unos 35 endpoints, 2 pantallas públicas nuevas
(cartelera real, página del Evento) + 1 sección en el Inicio público, 1 pantalla de la app
(`/mis-eventos`) con 2 diálogos (cancelar, subir comprobante), 3 pantallas del backoffice
(listado, detalle con inscriptos, papelera) + el formulario de Evento, y cambios en 2 existentes
(bandeja de Solicitudes, Inicio del backoffice).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Chequeo | Resultado |
|---|---|---|
| I. Spec-First | ¿Spec antes del código? | PASA — `spec.md` derivada de `docs/02`, `04`, `07` y D54/D55/D56/D58/D67/D69/D82/D83/D147/D148. Lo que `docs/` no decidía está como decisión nueva propuesta (abajo) y en Preguntas para Echu; nada se implementa antes de que Echu las vea. |
| II. Terminología | ¿Nombres canónicos? | PASA — Evento, Inscripción a Evento, Pago, Sede, Persona, como en `docs/04`. `InscripcionEvento` en código porque `Inscripcion` ya es la de Grupo. En pantalla, "Anotarme" (`docs/15`). |
| III. Soft delete | ¿Se borra algo? | PASA — cancelar es estado; eliminar es `eliminadoEn` con papelera (D119); Inscripciones y Pagos nunca se borran (cancelada / rechazado). El archivo de un flyer reemplazado sí se borra del almacenamiento (es un archivo, no una entidad; igual que las portadas, D110). |
| IV. Simplicidad | ¿Algo sin spec? | PASA — sin borrador, sin cuotas, sin plazo automático, sin exportar, sin pasarela. Cada campo nuevo del Evento traza a D83 (lugar), D147 (tipo), D148 (instrucciones de pago para poder pagar) o al Flujo 10 (hora, para el recordatorio). |
| V. Seguridad | ¿Autorización por registro? | PASA en diseño — Inscripciones y Pagos ajenos → 404; comprobante con chequeo en cada pedido; `destino` validado contra redirect abierto; límites de pedidos en endpoints públicos y subidas. Tests de acceso ajeno por id en `tasks.md`. |
| VI. Testing | ¿Reglas con ramas testeadas? | A CUBRIR en `tasks.md` — unit de `decidirEstadoInicial`, `estadoPagoDeInscripcion`, `estadoInscripcionDeEvento`, `slugDeEvento`, `destinoSeguro`, validación de comprobante; integración de cupo concurrente, promoción en cada camino, rechazo de pago, eliminar con datos; e2e del flujo crítico (SC-007). |
| VII. Accesibilidad | ¿WCAG, axe en los dos temas, flyer y QR? | A CUBRIR — `alt` obligatorio (D83, CHECK en base), información como texto, QR siempre con link, subida de comprobante con teclado; axe claro/oscuro en los e2e críticos. |
| VIII. Experiencia consistente | ¿Cuatro estados, una acción principal, `useEnvio`, "qué pasa después"? | A CUBRIR — tarea de checklist de `docs/15` por pantalla (D114); confirmación neutra para cancelar inscripción (D151, reversible) y destructiva para eliminar Evento. |
| IX. Idiomas | ¿next-intl, claves estables? | A CUBRIR — estados y medios como claves; namespaces nuevos en los dos `es.json`. El contenido que carga el Admin no se traduce (Fase 2). |
| X. Errores | ¿Un código por regla nueva? | PASA en diseño — códigos nuevos listados en los contratos; sucesos solo con ids. |
| XI. Una sola fuente de verdad | ¿Nada duplicado? | PASA en diseño — estados derivados, límites, MIME permitidos, `destinoSeguro` e `instanteEnArgentina` en `shared-types`; procesamiento de imagen compartido con portadas; una promoción; la bandeja extendida por fuentes, no copiada; tarjeta de Evento y badge de estado en `packages/ui` si los usan las dos apps. |

Sin violaciones. **Re-chequeo después del diseño:** sin cambios.

## Project Structure

### Documentation (this feature)

```text
specs/011-eventos/
├── spec.md
├── plan.md              # este archivo
├── research.md          # Fase 0 — 17 decisiones
├── data-model.md        # Fase 1
├── quickstart.md        # Fase 1 — 19 escenarios
├── contracts/
│   ├── eventos-api.md         # públicos, gestión, flyer, cancelar/eliminar, QR
│   ├── inscripciones-api.md   # anotarse, Mis eventos, gestión de inscriptos
│   ├── pagos-api.md           # comprobante, verificación, en nombre de
│   └── eventos-dominio.md     # sucesos para la 012 y consultas de recordatorios
├── checklists/requirements.md
└── tasks.md             # Fase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
packages/shared-types/src/
├── eventos.ts             # NUEVO: tipos, estados derivados, límites, MIME de comprobante
├── sucesos-evento.ts      # NUEVO: SucesoEvento (contracts/eventos-dominio.md)
├── navegacion.ts          # NUEVO: destinoSeguro() (research #11)
├── formato.ts            # + instanteEnArgentina() y formatearInicioEvento(), junto a diaCivilEnArgentina()
├── discipulado.ts         # TipoSolicitud += 'inscripcion_evento' | 'pago'
├── permisos.ts            # + eventos.gestionar, eventos.papelera.ver, inscripciones_evento.gestionar, pagos.verificar
├── error-code.ts          # + códigos de los contratos
└── index.ts

packages/ui/src/components/
├── estado-inscripcion-badge.tsx   # NUEVO: estado de Inscripción/pago con texto + ícono (web y backoffice)
└── campo-archivo.tsx              # NUEVO: input de archivo accesible (flyer y comprobante en las dos apps; hoy el de portadas es un <input> suelto)

apps/api/
├── prisma/schema.prisma + migración `eventos` (CHECKs e índices parciales en SQL)
├── prisma/seed-demo.ts            # + escenarios de Eventos (research #17)
├── scripts/limpiar-e2e.ts         # + Pago → InscripcionEvento → Evento
├── scripts/sembrar-e2e-eventos.ts # NUEVO: fixtures e2e
└── src/
    ├── evento/                    # NUEVO módulo
    │   ├── evento.module.ts
    │   ├── eventos.controller.ts / eventos.service.ts            # gestión + públicos
    │   ├── inscripciones.controller.ts / inscripciones.service.ts
    │   ├── pagos.controller.ts / pagos.service.ts
    │   ├── motor-cupo.ts          # bloqueo, decidirEstadoInicial, promoverDesdeLista (research #1, #3)
    │   ├── slug.ts                # slugDeEvento (research #9)
    │   ├── comprobante.ts         # validación por firma + re-codificación (research #6)
    │   ├── sucesos.service.ts     # SucesosEventoService (research #13)
    │   ├── eventos-consultas.service.ts  # para la 012 y la 010
    │   └── dto/
    ├── solicitudes/               # NUEVO: BandejaSolicitudesService + fuentes (research #12)
    ├── storage/                   # áreas + leer(); ImagenPublicaService (research #6, #7)
    ├── sede/sede.service.ts       # Eventos cuentan como datos relacionados (D119)
    └── discipulado/pendientes-admin.service.ts  # + inscripciones pendientes y pagos a verificar

apps/web/src/
├── app/(publica)/eventos/page.tsx, loading.tsx, error.tsx          # cartelera (reemplaza el placeholder)
├── app/(publica)/eventos/[slug]/page.tsx, loading.tsx, not-found.tsx
├── app/(publica)/page.tsx          # próximos tres Eventos (FR-001)
├── app/(publica)/ingresar/page.tsx, registro/…   # destino (research #11)
├── app/(app)/mis-eventos/page.tsx, loading.tsx, error.tsx          # reemplaza el placeholder
├── app/api/comprobantes/[pagoId]/route.ts       # reenvía el stream con la sesión (contracts/pagos-api.md)
├── app/sitemap.ts                  # + Eventos
├── components/eventos/             # AccionInscripcion (isla), TarjetaEvento, DialogoComprobante, …
└── messages/es.json                # namespaces eventos, misEventos

apps/backoffice/src/
├── app/eventos/page.tsx (+ loading/error)        # listado (reemplaza el placeholder)
├── app/eventos/[id]/page.tsx (+ loading/error)   # detalle: datos, flyer, QR, inscriptos, pagos
├── app/eventos/[id]/qr.png/route.ts              # descarga del QR
├── app/eventos/papelera/page.tsx
├── app/solicitudes/…                             # filtro por tipo visible; filas de Inscripción y Pago
├── app/api/comprobantes/[pagoId]/route.ts
├── app/page.tsx                                  # pendientes: inscripciones y pagos
├── config/nav.ts                                 # + /eventos/[id], /eventos/papelera
└── messages/es.json                              # namespace eventos
```

**Structure Decision**: un módulo de dominio nuevo (`evento`) siguiendo la forma de
`discipulado/`, y una pieza transversal nueva (`solicitudes/`) para la bandeja, porque deja de ser
de un solo tipo.

## Dependencias con otras specs

| Spec | Qué necesita esta spec de ella | Qué le da esta spec |
|---|---|---|
| **012 Notificaciones** | El `NotificacionService` y la tarea programada que mandan los avisos (D49, D73, D100, D149). **Esta spec no envía ningún aviso**: sin la 012, los sucesos solo se loguean y la Persona se entera por la pantalla (Mis eventos). | `SucesoEvento` + `SucesosEventoService.emitir()` como costura; `EventosConsultasService.destinatariosEventoProximo()` y `eventosParaRecordatorioInscripcion()`; la tabla de qué aviso corresponde a cada suceso (`contracts/eventos-dominio.md`). |
| **007 Ingreso con código por email** | El `EmailService` (lo usa la 012 para los avisos importantes). La pantalla de ingreso nueva, que tiene que conservar el parámetro `destino` (research #11). | `destinoSeguro()` en `shared-types` y el contrato del parámetro `destino`. Si la 007 mergea antes, esta spec engancha `destino` en su pantalla; si mergea después, la 007 lo conserva. |
| **010 Bautismo** | Nada para funcionar. | Evento `tipo = bautismo` (FR-045/046), inscripción del Admin en nombre (FR-027/047), `GET /eventos/bautismo/proximos` y `GET /personas/:id/inscripciones-evento` (FR-048). La Solicitud de Bautismo, el "sumar a los aceptados" y lo que muestra Mi camino son de la 010. **Coordinación**: las dos agregan un tipo a la bandeja de Solicitudes (research #12): la que mergea segunda se adapta a la forma de la primera. |
| **Alta de adultos por el Admin** (Flujo 12, D143, D145 — la spec que la construya) | Nada: el Admin inscribe a Personas que ya existen. | — |
| **D150 (tamaños en el celular)** — la tarea que lo implemente | El `Button` de 44 px y la letra de 16 px en `apps/web`. Si no llegó, se usa el `Button` vigente y la tarea de checklist lo verifica cuando llegue. | — |
| Ya construidas: **003** (`StorageService`, `ImagenPortadaService`), **004** (bandeja de Solicitudes, `PendientesAdmin`, patrón de sucesos), **005** (`CATALOGO_PERMISOS`, auditoría de roles) | Se usan, no se vuelven a decidir. | Generalización de `StorageService` e `ImagenPortadaService` sin cambiar el comportamiento de portadas. |

## Decisiones nuevas (numeradas en `docs/05-decisiones.md`: D188–D196; la DN-9 quedó unificada en D178 y precisada en D196)

Numeradas en el lote 0 global (`lote-0-global`), con su porqué en `docs/05-decisiones.md`.

- **D188 — Tipo de Evento: `general` o `bautismo`.** Un Evento de bautismo (D147) tiene inscripción
  solo por el Admin, sin aprobación, sin costo, sin lista de espera y sin recordatorio a todos; su
  página pública no ofrece anotarse ni muestra a quiénes. **Porqué**: D147 dice que la fecha de
  bautismo "es un Evento", pero a un bautismo no se anota cualquiera: se llega por una Solicitud
  aceptada. Un tipo, y no una combinación de flags, deja que la 010 los encuentre y que las reglas
  se apliquen solas.
- **D189 — El Evento tiene inicio con hora y fin opcional** (enmienda el `fecha` del ER). **Porqué**:
  la hora hace falta para cerrar inscripciones, para el recordatorio `evento_proximo` y para que la
  información sea útil; los campamentos duran varios días.
- **D190 — `lugar` opcional, con la dirección de la Sede por defecto.** **Porqué**: D83 pide el
  lugar como texto y el ER no lo tenía; muchos Eventos (campamentos, jornadas afuera) no son en la
  Sede.
- **D191 — Instrucciones de pago por Evento, obligatorias si tiene costo.** **Porqué**: D148 deja a
  la Persona "confirmada, falta el pago": tiene que saber a dónde pagar sin preguntar por WhatsApp.
  Sigue siendo un registro de un pago externo (D67).
- **D192 — Ocupación y rechazo de pago.** Ocupan lugar las Inscripciones `confirmada` y `pendiente`.
  Rechazar un Pago deja la Inscripción `cancelada` con motivo `pago_rechazado` (no un estado nuevo)
  y promueve. Un Pago que carga el Admin nace `verificado`. **Porqué**: Flujo 8 paso 9 ya trata a
  `pendiente` como lugar ocupado; D148 pide liberar el lugar; `rechazada` ya significa otra cosa
  (respuesta a una inscripción con aprobación).
- **D193 — Cancelar un Evento avisa a sus inscriptos como importante; cambiar fecha, hora o lugar,
  como normal.** Propone sumar el disparador `evento_actualizado` (alcance `evento`) a los cuatro de
  `docs/04`; lo implementa la 012. **Porqué**: quien se anotó a un campamento que se suspende tiene
  que enterarse aunque no abra la app; hoy `docs/16` no lo lista (Preguntas para Echu, P4).
- **D194 — Reglas de calendario**: el `slug` se genera al crear y nunca cambia; las inscripciones
  cierran al inicio del Evento; no hay borrador ni plazo automático de pago; la lista de espera es
  por orden de llegada. **Porqué**: los QR se imprimen y los links se comparten; lo demás es lo más
  simple que cubre el Flujo 8 (Principio IV).
- **D195 — Comprobantes**: JPG, PNG, WebP o PDF hasta 5 MB, validados por contenido, imágenes
  re-codificadas sin metadatos, privados, visibles solo para la dueña y quien verifica pagos (el
  Pastor ve el estado, no el archivo). **Porqué**: `docs/13` ("dueño + Admin"); el PDF es como
  muchos bancos exportan una transferencia; quitar EXIF evita guardar la ubicación de la Persona.
- **D178 — La bandeja de Solicitudes se compone de fuentes por tipo** (técnica, research #12).
  **Porqué**: con un segundo y un tercer tipo (Eventos, Bautismo), copiar la consulta por tipo
  viola el Principio XI y paginar en memoria rompe `docs/15`.

## Cambios a docs al mergear

- `docs/04-dominio-entidades.md` — Evento: `inicio`/`fin`, `lugar`, `tipo`, `instrucciones_pago`,
  estado `publicado`/`cancelado` + eliminado (D119); Inscripción a Evento: qué estados ocupan lugar,
  orden de la lista, motivo de cancelación; Pago: `motivo_rechazo`, `creado_por`, un pendiente por
  Inscripción, rechazo → libera lugar (D148).
- `docs/diagrama-er.mermaid` — mismos campos.
- `docs/07-flujos-casos-de-uso.md` — Flujo 8 paso 7: reemplazar "a definir en la Sesión 5" por D148;
  paso 6: el Admin registra en nombre y queda verificado; agregar el Evento de bautismo como caso
  del paso 1 (D147).
- `docs/16-sistemas-transversales.md` — si Echu acepta D193: "Evento cancelado" en la lista de
  importantes.
- `docs/15-guia-ux-ui.md` — glosario: "Anotarme", "Lista de espera", "Subir comprobante", "Falta el
  pago".
- `docs/06-preguntas-abiertas.md` — cerrar la del Flujo 8 paso 7 si sigue listada.
- `docs/05-decisiones.md` — D188–D196 (la DN-9 de esta spec quedó unificada en D178, con la precisión D196) con su número.

## Complexity Tracking

Sin violaciones de la Constitución que justificar. Lo más complejo es la concurrencia del cupo
(research #1), deliberadamente con un mecanismo ya usado en el proyecto (D137) en vez de uno nuevo.
