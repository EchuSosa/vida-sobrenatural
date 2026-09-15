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
| [06-preguntas-abiertas.md](06-preguntas-abiertas.md) | Backlog de temas a resolver o a validar con la iglesia |
| [07-flujos-casos-de-uso.md](07-flujos-casos-de-uso.md) | Flujos paso a paso de cada proceso (casos de uso) |
| [08-roadmap-producto.md](08-roadmap-producto.md) | Visión completa del proyecto por fases (MVP / Fase 2 / Backlog) |
| [09-notas-identidad-visual.md](09-notas-identidad-visual.md) | Notas y referencias visuales recopiladas antes de la Sesión 6 |
| [10-stack-tecnico.md](10-stack-tecnico.md) | Stack técnico (backend, frontend, DB, auth, storage) preparado antes de la Sesión 6 |
| [11-setup-local.md](11-setup-local.md) | Guía paso a paso para el setup local (repo, Docker, Spec Kit, NestJS, Next.js, Prisma) |
| [diagrama-er.mermaid](diagrama-er.mermaid) | Diagrama ER completo (entidades, atributos, cardinalidades) |
| [diagrama-arquitectura.mermaid](diagrama-arquitectura.mermaid) | Diagrama de arquitectura (apps del monorepo, API, base de datos, servicios externos) |

## Estado del proyecto

| Etapa | Estado |
|---|---|
| Visión y Problema | ✅ Cerrado |
| Alcance MVP | ✅ Confirmado (se sigue ampliando a medida que surgen ideas nuevas, ver `02-alcance-mvp.md`) |
| Roles y Actores | ✅ Cerrado |
| Entidades y relaciones (diagrama ER) | ✅ Cerrado |
| Flujos / casos de uso | ✅ Cerrado |
| Identidad visual | 🔄 Notas recopiladas, decisión pendiente (ver `09-notas-identidad-visual.md`) |
| Especificaciones técnicas (SDD) | ⬜ Pendiente |
| Stack e implementación | ⬜ Pendiente |

## Convención de trabajo

- Cada sesión de trabajo puede tocar uno o varios documentos, según el tema — no hay un documento por sesión.
- Las decisiones ya cerradas no se vuelven a debatir salvo que aparezca información nueva; en ese caso, se registra el cambio en `05-decisiones.md` en vez de reescribir la decisión anterior sin dejar rastro.
- Ningún spec técnico (fase SDD) se escribe hasta que el modelo de dominio (`04-dominio-entidades.md`) esté razonablemente estable.
