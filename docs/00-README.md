# Documentación — App de Gestión, Iglesia Vida Sobrenatural (La Plata)

Documentación de producto, previa a los specs técnicos (metodología SDD). Cada documento tiene una sola responsabilidad y se actualiza de forma independiente a medida que avanzan las sesiones de trabajo.

## Índice

| Documento | Contenido |
|---|---|
| [01-vision-problema.md](01-vision-problema.md) | Visión del producto, Problem Statement, criterio de éxito, proceso real relevado |
| [02-alcance-mvp.md](02-alcance-mvp.md) | Qué entra y qué no entra en el MVP, y por qué |
| [03-roles-permisos.md](03-roles-permisos.md) | Matriz de actores, roles y permisos |
| [04-dominio-entidades.md](04-dominio-entidades.md) | Entidades del dominio y sus relaciones |
| [05-decisiones.md](05-decisiones.md) | Registro de decisiones de producto/técnicas (estilo ADR — Architecture Decision Record) |
| [06-preguntas-abiertas.md](06-preguntas-abiertas.md) | Backlog de temas a resolver, tareas pendientes antes de la demo y pendientes de producción |
| [07-flujos-casos-de-uso.md](07-flujos-casos-de-uso.md) | Flujos paso a paso de cada proceso (casos de uso) |
| [08-roadmap-producto.md](08-roadmap-producto.md) | Visión completa del proyecto por fases (MVP / Fase 2 / Backlog) |
| [09-notas-identidad-visual.md](09-notas-identidad-visual.md) | Notas y referencias visuales recopiladas antes de la Sesión 6 |
| [10-stack-tecnico.md](10-stack-tecnico.md) | Stack técnico (puertos, backend, frontend, DB, auth, storage, email, monitoreo, integraciones) |
| [11-setup-local.md](11-setup-local.md) | Guía paso a paso para el setup local (repo, Docker, Spec Kit, NestJS, Next.js, Prisma) |
| [12-contenido-bienvenida.md](12-contenido-bienvenida.md) | Contenido real/adaptado para la parte pública (Bienvenida, culto, Liderazgo, redes) |
| [13-requisitos-no-funcionales.md](13-requisitos-no-funcionales.md) | Accesibilidad, SEO, seguridad, performance, idiomas y dominio — transversales a todas las specs |
| [14-navegacion.md](14-navegacion.md) | Menús de la web pública, la app con sesión y el backoffice; nombres visibles del proceso |
| [15-guia-ux-ui.md](15-guia-ux-ui.md) | Guía de UX/UI: botones, estados, formularios, tono, tokens, modo oscuro, checklist por pantalla |
| [16-sistemas-transversales.md](16-sistemas-transversales.md) | Sistemas de notificaciones (Avisos, push, email), errores (Problem Details, Sentry) y feedback de acciones |
| [21-instalacion.md](21-instalacion.md) | Instalar el sistema para una iglesia: primera instalación y recuperación del Admin (D130/D131) — distinto del atajo de desarrollo |
| [23-manual-de-pruebas.md](23-manual-de-pruebas.md) | Manual de pruebas a mano, sin jerga: glosario, personas de demo para `/dev/entrar` y casos por prioridad (⭐ Demo, P1, P2) con columna de resultado |
| [diagrama-er.mermaid](diagrama-er.mermaid) | Diagrama ER completo (entidades, atributos, cardinalidades) |
| [diagrama-arquitectura.mermaid](diagrama-arquitectura.mermaid) | Diagrama de arquitectura (apps del monorepo, API, tareas programadas, base de datos, servicios externos) |

## Estado del proyecto

| Etapa | Estado |
|---|---|
| Visión y Problema | ✅ Cerrado |
| Alcance MVP | ✅ Confirmado (se sigue ampliando a medida que surgen ideas nuevas, ver `02-alcance-mvp.md`) |
| Roles y Actores | ✅ Cerrado |
| Entidades y relaciones (diagrama ER) | ✅ Cerrado |
| Flujos / casos de uso | ✅ Cerrado |
| Navegación | ✅ Definida (ver `14-navegacion.md`) |
| Guía de UX/UI | ✅ Definida (ver `15-guia-ux-ui.md`) |
| Sistemas transversales | ✅ Definidos (ver `16-sistemas-transversales.md`) |
| Identidad visual | 🔄 Notas recopiladas, decisión pendiente (ver `09-notas-identidad-visual.md`) |
| Requisitos no funcionales | 🔄 Accesibilidad, SEO, idiomas y modo oscuro confirmados; seguridad y performance como base propuesta (ver `13-requisitos-no-funcionales.md`) |
| Contenido y demo | 🔄 Criterios definidos (D98, D99) y contenido de Bienvenida en `12-contenido-bienvenida.md`; falta "En qué creemos", fotos reales y guion de la demo |
| Especificaciones técnicas (SDD) | ⬜ Pendiente |
| Stack e implementación | 🔄 Setup local en curso (ver `11-setup-local.md`) |

## Convención de trabajo

- Cada sesión de trabajo puede tocar uno o varios documentos, según el tema — no hay un documento por sesión.
- Las decisiones ya cerradas no se vuelven a debatir salvo que aparezca información nueva; en ese caso, se registra el cambio en `05-decisiones.md` en vez de reescribir la decisión anterior sin dejar rastro.
- **Antes de agregar una decisión o un documento nuevo, revisar el último número usado** (se trabaja en paralelo desde claude.ai y Claude Code; ver D89 y D103).
- Ningún spec técnico (fase SDD) se escribe hasta que el modelo de dominio (`04-dominio-entidades.md`) esté razonablemente estable.
- Los requisitos no funcionales (`13`), la guía de UX/UI (`15`) y los sistemas transversales (`16`) aplican a todas las specs y se trasladan como principios a la constitución de Spec Kit.
- **Cada spec amplía `db:seed-demo` con sus entidades** (D120), incluyendo datos hostiles —nombres largos, tildes, campos vacíos— no solo casos felices.
- **Un lote de correcciones no se da por cerrado sin correr las tres suites**: unitarios (`pnpm --filter api run test`), integración (`pnpm --filter api run test:e2e` — config aparte) y e2e de `apps/web` (`pnpm --filter web exec playwright test`). El hueco entre la primera y la segunda dejó un test en rojo durante el Lote 4 (H-36).
- **Un test que rompe por un cambio de modelo se actualiza en el mismo commit que el cambio**, no se hereda en rojo ni se reporta como "falla preexistente".
