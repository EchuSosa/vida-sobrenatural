# Stack Técnico

> Preparado antes de la Sesión 6 formal, para tener el terreno allanado cuando lleguemos a `/speckit.plan` (Spec Kit). Puede ajustarse en esa sesión si surge algo nuevo.

## Arquitectura general

Ver [`diagrama-arquitectura.mermaid`](diagrama-arquitectura.mermaid) para el diagrama completo.

Tres aplicaciones separadas, compartiendo un backend único:

- **App web** (`apps/web`): la que usa la Persona final. Es una **PWA** (con notificaciones push).
- **App backoffice** (`apps/backoffice`): la que usa el Admin, y los Discipuladores/Líderes de curso con su acceso limitado.
- **API** (`apps/api`): backend NestJS, la única puerta a la base de datos — ambos frontends la consumen, ninguno accede a PostgreSQL directamente.

## Monorepo

- **Herramienta**: pnpm workspaces + Turborepo.
- **Estructura**:
  ```
  /apps
    /web          → Next.js, PWA, la persona final
    /backoffice   → Next.js, Admin/líderes/discipuladores
    /api          → NestJS, la única puerta a la base de datos
  /packages
    /shared-types  → tipos generados por Prisma, DTOs compartidos
    /ui            → componentes shadcn/ui compartidos entre web y backoffice
  ```
- **Por qué**: las 3 apps comparten el mismo modelo de datos (Persona, Curso, Grupo, etc.). Un paquete compartido de tipos evita que se desincronicen entre frontend y backend — TypeScript avisa apenas algo deja de coincidir. Turborepo cachea builds para no recompilar todo de cero en cada cambio.

## Backend

- **Framework**: NestJS (TypeScript)
- **ORM**: Prisma
- **Base de datos**: PostgreSQL

## Frontend

- **Framework**: React con Next.js
- **Estilos**: Tailwind CSS
- **Componentes UI**: shadcn/ui (se copian al repo, no son una dependencia tradicional) — compartidos entre `apps/web` y `apps/backoffice` vía `packages/ui`, para consistencia visual entre ambas.

## Documentación de API

- **Swagger / OpenAPI**, vía el módulo oficial `@nestjs/swagger` — se genera automáticamente desde los mismos decoradores de los controllers, sin trabajo manual extra.
- El spec de OpenAPI resultante también sirve para autogenerar el cliente TypeScript que consumen los frontends, manteniendo sincronizado el contrato de la API (no solo el modelo de datos de Prisma).

## Autenticación

- **SSO**: NextAuth.js (Auth.js) — maneja login con Google/Facebook, sesiones, y es gratuito.

## Almacenamiento de archivos

- Comprobantes de pago (Eventos), fotos/archivos de Contenido, etc.
- **Fase de desarrollo**: almacenamiento local (filesystem).
- **Diseño**: se implementa detrás de una capa de abstracción (ej. un servicio `StorageService` con una interfaz simple `subir/descargar/eliminar`), para poder migrar a un proveedor S3-compatible (AWS S3, Cloudflare R2, etc.) más adelante **sin reescribir la lógica de negocio** que usa esos archivos.

## Notificaciones push

- PWA (manifest + service worker) + Web Push API — ya definido en la Sesión 4 (Flujo 10).

## Hosting / Infraestructura

- **Decisión pospuesta deliberadamente.** Se desarrolla y prueba todo en **local** primero (ej. Docker Compose con Postgres + backend + frontend), para no consumir planes gratuitos de hosting antes de tener algo para mostrar.
- Cuando el proyecto esté listo para mostrarse a la iglesia o usarse con datos reales, se retoma esta decisión (candidatos típicos para este stack: Vercel para el frontend Next.js, Railway/Render/Fly.io para el backend NestJS + Postgres — a evaluar en su momento, sin comprometerse ahora).

## Pendiente para la Sesión 6 formal

- Confirmar/ajustar este stack si surge algo nuevo.
- Configuración de Docker Compose para desarrollo local.
- Decisión de hosting real (cuando corresponda).

---
*Preparado fuera de sesión formal, antes de comenzar a usar Spec Kit (`/speckit.plan`).*
