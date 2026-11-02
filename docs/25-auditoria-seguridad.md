# 25 — Auditoría de seguridad (2026-11-02)

Ítem 4 del plan de Echu (2026-11-01): informe en `docs/`, y consultarle **antes** de arreglar algo
crítico. Lo no crítico se arregla en PRs chicos, uno por hallazgo, y se marca acá.

## Alcance y método

- Revisión del código de `apps/api`, `apps/web`, `apps/backoffice` y `packages/*` en `main`
  (`ebfceae`), más `pnpm audit --prod` del 2026-11-02.
- Qué se miró: autenticación y sesión, autorización (guards de cada ruta), ingreso con código,
  datos personales en logs, privacidad de lo sensible (respuestas de Eventos, notas de la charla,
  dirección en "Encontrá tu grupo"), subida y entrega de archivos, cabeceras HTTP, CORS, secretos y
  dependencias.
- Qué **no** se hizo: prueba de intrusión contra un entorno publicado (no hay ninguno todavía), ni
  revisión de la infraestructura (depende del hosting, ítem 3). La autorización objeto por objeto
  (que nadie vea lo de otro cambiando un id) se revisó **por muestreo**, no ruta por ruta.

## Resumen

| Severidad | Cantidad | Qué |
|---|---|---|
| Crítica | 1 | Dependencias con ejecución remota de código sin autenticación (Next) |
| Alta | 2 | Roles de la sesión que no se revalidan; resto de dependencias "high" |
| Media | 5 | Cabeceras de seguridad, datos personales en logs, límite por origen esquivable, Swagger público, CORS abierto |
| Baja | 3 | Comparación del secreto interno, firma con secreto vacío, carpeta de archivos públicos |

**Nada de esto es explotable hoy**: la app no está publicada. Los hallazgos críticos y altos
**bloquean el ítem 3** (publicar): se arreglan antes de que haya una URL pública.

## Hallazgos

### S-01 · Crítica · Next.js con ejecución remota de código sin autenticación

- **Dónde:** `apps/web` y `apps/backoffice` usan `next@16.3.5`.
- **Qué pasa:** `pnpm audit` informa, entre otros, *Unauthenticated Remote Code Execution in Image
  Optimization API* y *in `use cache` function* (`next ≤ 16.4.0`, arreglado en `16.4.1`), y
  *Remote Code Execution in `next/og` ImageResponse* (`< 16.3.6`). La web usa `next/og`
  (`(publica)/opengraph-image.tsx` y `twitter-image.tsx`) y `next/image`. También
  `@sentry/nextjs < 10.75.2` (*Middleware Bypass when using Tunnel route*) y `proxy-addr < 2.0.8`
  (*IP spoofing*), vía Express.
- **Recomendación:** subir `next` a `≥ 16.4.1` en las dos apps (y `eslint-config-next` a la par),
  `@sentry/nextjs` a `≥ 10.75.2`, y las dependencias de Express de la API. Correr las tres suites.
- **Estado:** pendiente — **se consulta con Echu antes de arreglarlo** (es crítico y es un cambio
  de versión menor de Next, 16.3 → 16.4).

### S-02 · Alta · Los roles de la sesión no se revalidan

- **Dónde:** `apps/*/src/auth.ts` (callback `jwt`) y `apps/api/src/auth/*.guard.ts`.
- **Qué pasa:** el rol y el estado de la Persona se leen de la base **solo al iniciar sesión** o
  con un `update()` explícito, y viajan en el JWT; la API confía en `rol` del token (lo firman los
  servidores, eso está bien) sin volver a mirar la base. Si al Admin se le saca el rol, o una
  Persona se da de baja, sigue entrando con lo que tenía **hasta 7 días en el backoffice y 30 en la
  web** (`DURACION_SESION_*`). Cerrar sesión no revoca nada (la sesión es un JWT sin estado). Es la
  "staleness de rol" aceptada en `research.md` (Decisión 6) para el MVP local, pero con datos
  reales es un riesgo.
- **Recomendación (a elegir con Echu):** que `JwtNextAuthGuard` resuelva `rol` y `estado` desde la
  base en cada pedido (con caché corta, ej. 60 s), dejando el JWT solo para la identidad; o que el
  callback `jwt` vuelva a consultar la Persona cada pocos minutos.
- **Estado:** pendiente — **se consulta con Echu** (cambia cómo funciona la sesión).

### S-03 · Alta · Resto de dependencias "high"

- **Qué:** `undici < 7.30.1` (entre otros, *TLS certificate validation bypass*), `body-parser
  < 2.4.0` y `multer < 2.5.0` (denegación de servicio), `sharp < 0.35.5` (librsvg), `zod < 4.6.6`,
  `markdown-it < 14.3.3`, y varias de herramientas de desarrollo (`prisma` CLI → `mysql2`,
  `shadcn` → `@modelcontextprotocol/sdk`) que no llegan a producción pero conviene subir.
- **Recomendación:** subir las de producción en un PR, con las tres suites; las de herramientas en
  otro.
- **Estado:** pendiente (no crítico; va después de S-01 porque Next arrastra varias).

### S-04 · Media · Sin cabeceras de seguridad en web y backoffice

- **Dónde:** `apps/web/next.config.ts`, `apps/backoffice/next.config.ts` (no definen `headers()`).
- **Qué pasa:** no hay `Content-Security-Policy`, ni `frame-ancestors`/`X-Frame-Options` (el
  backoffice se podría embeber en otra página: *clickjacking* sobre acciones del Admin), ni
  `Referrer-Policy`, ni `X-Content-Type-Options`. `Strict-Transport-Security` corresponde cuando
  haya HTTPS (ítem 3).
- **Recomendación:** `headers()` con `frame-ancestors 'none'`, `Referrer-Policy:
  strict-origin-when-cross-origin`, `X-Content-Type-Options: nosniff`, `Permissions-Policy`
  mínima; CSP en modo *report-only* primero (Next y Sentry necesitan ajustes); HSTS al publicar.
- **Estado:** pendiente.

### S-05 · Media · Datos personales en los logs por la URL

- **Dónde:** `apps/api/src/main.ts` (`pino-http`).
- **Qué pasa:** el `redact` cubre el cuerpo y los headers sensibles, pero cada pedido loguea la URL
  y la *query*. `GET /personas/by-email?email=…` (lo usan las dos apps en cada inicio de sesión)
  deja el email en el log, y las búsquedas de personas (`?q=…`) dejan nombres. Va contra "nada de
  lo que identifica a alguien va a los logs" (FR-020 de la 007).
- **Recomendación:** un `serializers.req` que saque la *query* de `url` y no loguee `query` (o
  la redacte), y pasar `by-email` a `POST` con el email en el cuerpo.
- **Estado:** pendiente.

### S-06 · Media · El límite por origen del código de ingreso se puede esquivar

- **Dónde:** `origenDeHeaders` (`packages/shared-types/src/auth-server.ts`).
- **Qué pasa:** el origen es la **primera** IP de `x-forwarded-for`, que la escribe el navegador.
  Cambiándola en cada pedido se esquiva el tope de 30 envíos por hora por origen y se pueden mandar
  códigos a muchas direcciones (el tope de 5 por email sigue valiendo).
- **Recomendación:** tomar la IP que agrega el proxy de confianza (la última de la cadena, o la
  cabecera propia del hosting) y documentarlo en el runbook de publicación.
- **Estado:** pendiente — depende del hosting (ítem 3).

### S-07 · Media · Swagger público

- **Dónde:** `SwaggerModule.setup('api', …)` en `apps/api/src/main.ts`.
- **Qué pasa:** `/api` publica el mapa completo de la API. No da acceso (cada ruta tiene su guard),
  pero le ahorra trabajo a quien busca un hueco.
- **Recomendación:** montarlo solo fuera de producción (o detrás del secreto interno).
- **Estado:** pendiente.

### S-08 · Media · CORS abierto

- **Dónde:** `app.enableCors()` en `apps/api/src/main.ts`.
- **Qué pasa:** se acepta cualquier origen. El riesgo es bajo (la API no usa cookies, solo
  `Bearer`), pero con la app publicada conviene limitarlo.
- **Recomendación:** `origin` desde variables de entorno con las URLs de web y backoffice.
- **Estado:** pendiente.

### S-09 · Baja · El secreto interno se compara con `!==`

- **Dónde:** `apps/api/src/auth/internal-lookup.guard.ts`.
- **Recomendación:** `timingSafeEqual` sobre los dos valores.
- **Estado:** pendiente.

### S-10 · Baja · `mintApiToken` firma con un secreto vacío si falta la variable

- **Dónde:** `packages/shared-types/src/auth-server.ts` (`NEXTAUTH_SECRET ?? ''`).
- **Qué pasa:** la API lo rechaza (exige la variable), pero la app arranca igual y falla tarde.
- **Recomendación:** fallar al arrancar si falta, como la API.
- **Estado:** pendiente.

### S-11 · Baja · Las portadas se sirven desde la carpeta raíz del almacenamiento

- **Dónde:** `apps/api/src/storage/archivos-publicos.ts`.
- **Qué pasa:** `/portadas` sirve la carpeta base completa; lo privado (`.privado/`) queda afuera
  solo por `dotfiles: 'deny'`. Funciona, pero es una sola barrera.
- **Recomendación:** servir cada área pública desde su propia carpeta.
- **Estado:** pendiente.

## Lo que está bien (revisado)

- **El login de prueba no existe en producción:** `testLoginHabilitado()` exige
  `NODE_ENV !== 'production'` además de `ALLOW_TEST_LOGIN`.
- **Ingreso con código:** 6 dígitos con `randomInt`, vence a los 15 min, 5 intentos con
  incremento atómico, 5 envíos por email por hora, guardado como HMAC, borrado a las 24 h, sin
  email ni código en los logs, y solo lo pueden llamar los servidores (secreto interno).
- **Rutas públicas:** solo contenido público (cartelera, Evento por slug, Sedes, Libros, Palabra
  Profética, Ministerios públicos). Todo lo demás pasa por `JwtNextAuthGuard` y los permisos del
  catálogo (`PermisosGuard`).
- **Privacidad:** el cuerpo de los pedidos sale redactado de los logs (email, teléfono, dirección,
  ubicación, DNI, respuestas); la dirección de "Encontrá tu grupo" no se guarda; las respuestas
  sensibles de Eventos se filtran por permiso y se borran a los 30 días; las notas de la charla
  quedan con autor y solo para quien corresponde.
- **Archivos:** las imágenes se vuelven a codificar con `sharp` (se pierde cualquier contenido
  escondido), y la ruta de cada archivo pasa por `basename` (no hay `../`).
- **Secretos:** no hay ningún `.env` versionado.
- **Contenido escrito por personas:** se muestra como texto (QA ronda 1 probó `<img onerror>` en un
  nombre: no se ejecuta).
