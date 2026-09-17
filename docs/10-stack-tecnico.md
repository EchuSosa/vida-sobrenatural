# Stack Técnico

> Preparado antes de la Sesión 6 formal, para tener el terreno allanado cuando lleguemos a `/speckit.plan` (Spec Kit). Puede ajustarse en esa sesión si surge algo nuevo.

## Arquitectura general

Ver [`diagrama-arquitectura.mermaid`](diagrama-arquitectura.mermaid) para el diagrama completo.

Tres aplicaciones separadas, compartiendo un backend único:

- **App web** (`apps/web`): la que usa la Persona final. Es una **PWA** (con notificaciones push).
- **App backoffice** (`apps/backoffice`): la que usa el Admin, y los Discipuladores/Líderes de curso con su acceso limitado.
- **API** (`apps/api`): backend NestJS, la única puerta a la base de datos — ambos frontends la consumen, ninguno accede a PostgreSQL directamente.

La navegación de cada app está definida en `14-navegacion.md`; los sistemas de notificaciones, errores y feedback, en `16-sistemas-transversales.md`.

### Puertos fijos (desarrollo local)

Por default, tanto Next.js como NestJS arrancan en el puerto 3000 — con 3 apps corriendo a la vez, eso genera colisiones y hace que cada una salte a un puerto distinto sin previsibilidad. Se fijan explícitamente (D86, corregido en D104):

| App | Puerto | Dónde se fija |
|---|---|---|
| `apps/web` | 3001 | script `dev`/`start` de `package.json` (`next dev -p 3001`) |
| `apps/backoffice` | 3002 | script `dev`/`start` de `package.json` (`next dev -p 3002`) |
| `apps/api` | 3333 | `PORT=3333` en `apps/api/.env` (default en `main.ts`) |

El puerto 3000 queda libre a propósito (es el default de Next.js y NestJS; cualquier otro proyecto local que lo use no choca).

Los frontends necesitan saber dónde está la API — en el `.env.local` de cada uno se configuran `API_BASE_URL` (llamadas desde el servidor) y `NEXT_PUBLIC_API_BASE_URL` (llamadas desde el navegador), ambas en `http://localhost:3333`, y `NEXTAUTH_URL` con el puerto propio de cada app (3001 / 3002). Ver los `.env.local.example`.

## Monorepo

- **Herramienta**: pnpm workspaces + Turborepo.
- **Estructura**:
  ```
  /apps
    /web          → Next.js, PWA, la persona final
    /backoffice   → Next.js, Admin/líderes/discipuladores
    /api          → NestJS, la única puerta a la base de datos
  /packages
    /shared-types  → tipos generados por Prisma, DTOs y catálogo de códigos de error compartidos
    /ui            → componentes shadcn/ui compartidos entre web y backoffice
  ```
- **Por qué**: las 3 apps comparten el mismo modelo de datos (Persona, Curso, Grupo, etc.). Un paquete compartido de tipos evita que se desincronicen entre frontend y backend — TypeScript avisa apenas algo deja de coincidir. Turborepo cachea builds para no recompilar todo de cero en cada cambio.

## Backend

- **Framework**: NestJS (TypeScript)
- **ORM**: Prisma
- **Base de datos**: PostgreSQL
- **Datos de demo**: script de seed de Prisma con datos ficticios en español (generador tipo Faker) + escenarios armados a mano (D99).
- **Tareas programadas**: `@nestjs/schedule` — recordatorios de Eventos (D49, D73), sincronización de YouTube (D93) y envío/reintento de entregas de notificaciones (D100).
- **Errores**: filtro global de excepciones con formato Problem Details (RFC 9457) + `code` + `requestId` (D101).
- **Logs**: estructurados en JSON (ej. `nestjs-pino`), con `requestId` y sin datos personales sensibles.
- **Seguridad** (base propuesta, ver `13-requisitos-no-funcionales.md`): guards/policies para autorización por registro, `class-validator` (whitelist), `helmet`, `@nestjs/throttler`, CORS limitado a los dos frontends.

## Frontend

- **Framework**: React con Next.js (App Router)
- **Estilos**: Tailwind CSS
- **Componentes UI**: shadcn/ui (se copian al repo, no son una dependencia tradicional) — compartidos entre `apps/web` y `apps/backoffice` vía `packages/ui`, para consistencia visual entre ambas. Los tokens de diseño (variables CSS, modo claro y oscuro) viven en `packages/ui` y deben cumplir los contrastes de WCAG 2.2 AA (D81, D95). Íconos: Lucide.
- **Modo oscuro**: variables CSS de shadcn + un proveedor de tema (ej. `next-themes`), con opción Claro / Oscuro / Sistema (D95).
- **Idiomas**: `next-intl` desde el inicio, solo con `es` en el MVP (D84). Ningún texto de interfaz escrito directo en los componentes. Los mensajes de cada código de error viven acá.
- **Formularios**: teléfono con selector de código de país y profesión por categoría (D90).
- **Errores**: `error.tsx`, `global-error.tsx`, `not-found.tsx` y página sin conexión (D101).
- **SEO** (D82): Metadata API, `sitemap.ts`, `robots.ts`, JSON-LD (schema.org `Church` / `Event`), SSG/ISR para páginas públicas.
- **Performance**: React Server Components por defecto, `next/image`, `next/font`.

## Documentación de API

- **Swagger / OpenAPI**, vía el módulo oficial `@nestjs/swagger` — se genera automáticamente desde los mismos decoradores de los controllers, sin trabajo manual extra.
- El spec de OpenAPI resultante también sirve para autogenerar el cliente TypeScript que consumen los frontends, manteniendo sincronizado el contrato de la API (no solo el modelo de datos de Prisma).
- La API devuelve **códigos** de error (ej. `CUPO_LLENO`), no mensajes en un idioma, para que cada frontend los traduzca (D84, D101).

## Autenticación

- **SSO**: NextAuth.js (Auth.js) — maneja login con Google/Facebook, sesiones, y es gratuito.
- Se guarda la foto de perfil de Google (`picture`) como `foto_url` (D87).
- Si la verificación contra `apps/api` en el callback `signIn` falla, el login se bloquea (fail-closed, D88).
- Solo se vincula una cuenta por email si el proveedor garantiza el email verificado (relevante para D35 y D97).
- Personas dadas de alta por el Admin sin cuenta Google/Facebook no tienen login en el MVP (D97). El ingreso con código por email (proveedor Email de NextAuth) queda para Fase 2.
- **Pendiente**: cómo valida la API NestJS la sesión de NextAuth (ver `06-preguntas-abiertas.md`).

## Email (D96)

- `EmailService` detrás de una interfaz simple (mismo criterio que `StorageService`), para cambiar de proveedor sin tocar la lógica.
- Proveedor transaccional con plan gratuito — a elegir en `/speckit.plan`.
- Plantillas con componentes (ej. React Email), con versión en texto plano.
- **Local**: captura de emails con Mailpit (en Docker Compose), sin envíos reales.
- Producción: remitente del dominio de la iglesia con SPF/DKIM (cuando exista el dominio, D85).

## Monitoreo: Sentry (D101)

- SDK oficial para Next.js (`apps/web`, `apps/backoffice`) y para NestJS (`apps/api`), con source maps.
- `sendDefaultPii: false`, filtro `beforeSend` que elimina datos personales (emails, teléfonos, direcciones, cuerpos de formularios), sin grabación de sesiones. Usuario identificado solo por ID interno.
- Desactivado en local; activo en staging/producción con etiqueta de entorno. Plan gratuito.
- Variables de entorno: `SENTRY_DSN` (por app), `SENTRY_ENVIRONMENT`.

## Integraciones con redes sociales

- **YouTube (MVP, D93)**: YouTube Data API v3 con una API key (sin OAuth ni acceso a la cuenta de la iglesia).
  - Se obtiene una vez el ID de la lista "uploads" del canal (`channels.list`, `contentDetails.relatedPlaylists.uploads`) y después se consulta `playlistItems.list` — 1 unidad de cuota por llamada, sobre 10.000 diarias gratuitas. **No usar `search.list`** (100 unidades por llamada).
  - Una tarea programada (ej. cada 1–2 horas) guarda los últimos videos en la tabla `VIDEO_YOUTUBE`; la web lee de la API propia. Si YouTube falla, se muestra lo último guardado.
  - En el frontend: miniatura + reproductor de carga diferida (patrón "lite YouTube embed"), usando `youtube-nocookie.com`. El iframe solo se carga al hacer clic.
  - Variables de entorno: `YOUTUBE_API_KEY`, `YOUTUBE_CHANNEL_ID`. Alternativa sin API key: el feed RSS público del canal.
- **Instagram (Fase 2)**: Instagram API con login de Instagram — requiere cuenta profesional, autorización de alguien de la iglesia y renovación automática del token (60 días). Mismo patrón de guardado local, copiando las imágenes al almacenamiento propio. Hasta entonces, solo enlace al perfil.
- **Widgets de terceros** (Elfsight y similares): descartados por costo, peso, rastreadores y accesibilidad (ver `13-requisitos-no-funcionales.md`).

## Testing

- **Unitarios e integración**: Jest — lógica de negocio con ramas (cálculo de edad, prerrequisitos, duplicados, flags automáticos como `apto_ministerio`, resolución de destinatarios y canales de notificación) y operaciones que dependen de la base de datos (ej. cascadas de estado al finalizar un Grupo), esta última con una base de datos de test.
- **End-to-end**: Playwright — acotado a los flujos de usuario críticos por fase (ej. el registro completo de Bienvenida, incluyendo la rama de menor de edad), no a cobertura exhaustiva de cada pantalla.
- **Accesibilidad**: `eslint-plugin-jsx-a11y` + `@axe-core/playwright` dentro de los e2e críticos, en modo claro y oscuro, más una pasada manual con lector de pantalla (D81).
- **Autorización**: tests específicos que intentan acceder a recursos ajenos cambiando IDs (deben fallar).
- **Errores**: tests que verifican que cada regla de negocio devuelve su `code` del catálogo.
- **Integraciones externas**: YouTube, email y push se mockean en los tests; nunca se llama a servicios reales desde la suite (los emails se pueden inspeccionar con Mailpit en e2e locales).
- **Criterio**: proyecto de una sola desarrolladora — se prioriza una cantidad razonable de tests de alto valor sobre cobertura total. Ver decisión D79.
- **CI/CD**: sin Jenkins (ver D80) — implica levantar y mantener servidor propio, infraestructura innecesaria a esta escala. Los tests se corren a mano en local por ahora; GitHub Actions queda pospuesto hasta que el repo se suba a un remoto (mismo criterio que posponer el hosting, D75). Cuando exista, sumar Lighthouse CI con presupuestos de performance/accesibilidad/SEO.

## Almacenamiento de archivos

- Comprobantes de pago (Eventos), fotos/archivos de Contenido, flyers de Eventos, etc.
- **Fase de desarrollo**: almacenamiento local (filesystem), **fuera de cualquier carpeta pública**; los archivos privados se sirven solo vía API con control de permisos.
- **Diseño**: se implementa detrás de una capa de abstracción (ej. un servicio `StorageService` con una interfaz simple `subir/descargar/eliminar`), para poder migrar a un proveedor S3-compatible (AWS S3, Cloudflare R2, etc.) más adelante **sin reescribir la lógica de negocio** que usa esos archivos (bucket privado + URLs firmadas).
- Las imágenes se redimensionan y comprimen al subirse (performance).

## Notificaciones push

- PWA (manifest + service worker) + Web Push API — ya definido en la Sesión 4 (Flujo 10).
- El service worker nunca cachea datos privados. Los textos no incluyen datos sensibles y se arman en el `idioma_preferido` del destinatario.
- Suscripciones vencidas (respuesta del servicio push) se desactivan automáticamente (D100).

## Hosting / Infraestructura

- **Decisión pospuesta deliberadamente.** Se desarrolla y prueba todo en **local** primero (Docker Compose con Postgres + Mailpit; las apps corren con `pnpm dev` en los puertos fijos), para no consumir planes gratuitos de hosting antes de tener algo para mostrar.
- Cuando el proyecto esté listo para mostrarse a la iglesia o usarse con datos reales, se retoma esta decisión (candidatos típicos para este stack: Vercel para el frontend Next.js, Railway/Render/Fly.io para el backend NestJS + Postgres — a evaluar en su momento, sin comprometerse ahora). Preferir una región cercana a Argentina (ej. São Paulo). El hosting del backend debe permitir procesos siempre activos o cron jobs (tareas programadas).
- **Dominio** también pospuesto (D85, candidato `vidasobrenatural.org.ar`). La URL base sale siempre de variables de entorno.

## Pendiente para la Sesión 6 formal

- Confirmar/ajustar este stack si surge algo nuevo.
- Sumar Mailpit al `docker-compose.yml` de desarrollo local.
- Validación de sesión NextAuth ↔ NestJS.
- Elección del proveedor de email transaccional.
- Decisión de hosting y dominio reales (cuando corresponda).

---
*Preparado fuera de sesión formal, antes de comenzar a usar Spec Kit (`/speckit.plan`). Ampliado con testing (D79/D80), puertos fijos (D86, D104), foto de perfil y login fail-closed (D87/D88), datos estructurados de registro (D90), requisitos no funcionales (D81–D85), integración con YouTube (D93), modo oscuro (D95), y email, seed, errores y Sentry (D96–D101).*
