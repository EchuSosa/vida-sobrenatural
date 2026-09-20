# Research: Base Transversal de la App

Fuente principal: `docs/10-stack-tecnico.md` (stack ya decidido antes de Spec Kit) y la Constitución
v1.1.0 (Principios VII–X). Este documento resuelve **cómo** implementar cada pieza sobre el código
real que ya existe del spec 001, no si usarla — el stack ya está decidido.

## 1. `packages/ui` — extraer los tokens y componentes ya duplicados

**Situación actual**: `apps/web/src/app/globals.css` y `apps/backoffice/src/app/globals.css` son
**idénticos byte a byte** (mismo bloque `@theme inline` + tokens `:root`/`.dark` generados por
`shadcn init`), igual que `src/lib/utils.ts` y `src/components/ui/button.tsx`. `docs/10` ya decidió
que estos tokens deben vivir en `packages/ui` — hoy no existe ese paquete, así que hay que crearlo.

**Decision**: Nuevo paquete de workspace `@vida-sobrenatural/ui` (mismo patrón que
`@vida-sobrenatural/shared-types`: `"type": "module"`, `main`/`types` apuntando a `src/index.ts`,
sin build step propio — cada app lo consume como fuente TypeScript vía `transpilePackages`).
Contiene:
- `src/styles/theme.css`: el bloque de tokens (`@theme inline`, `:root`, `.dark`) extraído de los
  `globals.css` actuales, con los valores reemplazados por la **paleta neutra provisoria** (ver
  Decisión 2) — reemplaza sin tocar la estructura cuando exista la paleta de marca definitiva.
- `src/components/ui/*.tsx`: los componentes shadcn ya generados (`button.tsx`, y los que sumen las
  historias de este spec: `sheet`, `navigation-menu`, `dropdown-menu`, `sidebar`, `toast`/`sonner`,
  `skeleton`, `alert-dialog`), consolidados en una sola copia.
- `src/lib/utils.ts`: el helper `cn()`, hoy duplicado.

Cada app:
- `globals.css` pasa a `@import "@vida-sobrenatural/ui/theme.css";` en vez de repetir el bloque de
  tokens, y agrega `@source "../../../packages/ui/src/**/*.{ts,tsx}";` para que Tailwind v4 escanee
  las clases usadas en los componentes compartidos (viven fuera del árbol de cada app).
- `next.config.ts` suma `transpilePackages: ['@vida-sobrenatural/ui']` (el paquete no se compila a
  JS aparte, así que Next.js debe transpilarlo como si fuera código propio).
- Los `src/components/ui/*.tsx` locales que migran al paquete se reemplazan por un re-export
  (`export * from '@vida-sobrenatural/ui'`) o se eliminan y los imports pasan a apuntar al paquete,
  según convenga por componente al implementar.

**Nota (H-33, revisión manual ronda 2, D113)**: esta decisión — consumir `packages/ui` como fuente
TypeScript sin build propio — sigue vigente y no cambia. `packages/shared-types` sí sumó un build
propio (`tsc` → `dist/`), pero por una razón que no aplica a `packages/ui`: `shared-types` lo
consume también `apps/api` en runtime plano (`node dist/main.js`, sin bundler ni loader de TS), que
no puede ejecutar `.ts` fuente. `packages/ui` solo lo consume Next.js (un bundler), que sí resuelve
TypeScript fuente sin problema vía `transpilePackages`. Ver D113 en `docs/05-decisiones.md`.

**Alternativas consideradas**: mantener la duplicación y agregar un lint/CI check de "archivos
idénticos" — se descarta porque no evita que diverjan con el tiempo (Principio VIII exige
consistencia real, no solo detectarla después) y `docs/10` ya fijó `packages/ui` como la solución.

## 2. Paleta de color provisoria (Clarifications, Sesión 2026-09-17)

**Decision**: Se parte de la paleta `neutral` que shadcn ya generó (`components.json`:
`baseColor: "neutral"`) para fondo/texto/borde, y se agregan los tokens semánticos que shadcn no
define por defecto pero que la Constitución (Principio VII) y `15-guia-ux-ui.md` exigen para nunca
comunicar un estado solo con color:
- `--color-success` / `--color-success-foreground` (verde, ej. `oklch` equivalente a Tailwind
  `green-600`/`green-50`, ajustado si el contraste medido no alcanza 4.5:1 en algún modo).
- `--color-warning` / `--color-warning-foreground` (ámbar, ej. equivalente a `amber-600`/`amber-50`).
- `--destructive`/`--success`/`--warning` ya se definen para `:root` y `.dark` por separado, cada
  par verificado con una herramienta de contraste (ej. la extensión de Chrome de axe, o
  `culorijs`/`polished` en un script puntual) antes de darlos por buenos — no alcanza con "se ven
  bien".
- Se documenta expresamente en `packages/ui/src/styles/theme.css` (comentario) que estos son
  valores **provisorios**: el reemplazo por la paleta de marca (pendiente en
  `docs/09-notas-identidad-visual.md`) solo debe tocar los valores de los tokens, no su estructura
  ni los componentes que los consumen.

**Alternativas consideradas**: esperar la decisión de marca antes de construir nada de este spec —
descartado explícitamente en la clarificación del spec (bloquear toda la base transversal por una
decisión de diseño no relacionada con navegación/errores/accesibilidad viola el Principio IV).

## 3. Modo claro/oscuro y persistencia de `tema_preferido`

**Decision**: `next-themes` (`attribute="class"`, `defaultTheme="system"`, `enableSystem`) como
`ThemeProvider` en `Providers` de cada app (junto al `SessionProvider` ya existente). Para que la
preferencia guardada en `Persona.tema_preferido` (D95, `docs/04`) se aplique en cualquier
dispositivo sin parpadeo de tema incorrecto:
1. El endpoint interno `GET /personas/by-email` (usado hoy solo por el callback `signIn`/`jwt` de
   NextAuth) suma `temaPreferido` a su respuesta.
2. El callback `jwt` de `apps/web/src/auth.ts` **y el de `apps/backoffice/src/auth.ts`** (ambos ya
   existen, cada uno con su propia instancia de NextAuth sobre la misma `Persona`) guardan ese valor
   en el token, igual que ya hacen con `estado`/`rol`; el callback `session` de cada uno lo expone en
   `session.user.temaPreferido`.
3. **Corrección de implementación** (ver T078): leer `auth()` en el `RootLayout` para setear la
   clase inicial en `<html>` fuerza a Next.js a renderizar *todas* las páginas dinámicamente —
   incluidas las públicas de `(publica)`, que la Historia 7 (SEO) necesita servidas estáticas
   (SSG). En cambio, un componente cliente `SincronizarTema` (sin UI) vive solo dentro de
   `(app)/layout.tsx` — ya dinámico por requerir sesión — y sincroniza `next-themes` con
   `session.user.temaPreferido` en un efecto apenas hay sesión disponible. El costo es un posible
   flash breve (tema del sistema/`localStorage` → preferencia guardada) solo dentro de la sección
   con sesión; el sitio público no se ve afectado y mantiene SSG.
4. Cambiar el tema desde Perfil (app) o el menú de usuario (backoffice) llama a
   `PATCH /personas/me/preferencias` (ver Decisión 12) de forma optimista: se aplica al instante en
   el cliente (`next-themes`) y se persiste en el servidor sin bloquear la UI.

**Alternativas consideradas**: guardar la preferencia solo en `localStorage` — descartado porque
FR-028 exige que la preferencia siga a la Persona entre dispositivos, no solo en el navegador donde
se eligió.

## 4. `next-intl` en modo de un solo idioma

**Decision**: Sin routing por idioma todavía (`docs/13`: "el routing por idioma se activa recién
cuando haya un segundo idioma") — no se agrega el segmento `[locale]` ni middleware de detección.
Cada app (`web`, `backoffice`) tiene su propio `messages/es.json` (los textos de cada app son
distintos: uno mira al Visitante, el otro al equipo) con un namespace `errors` cuyas claves son
literalmente los valores del enum `ErrorCode` compartido (ver Decisión 6), para que agregar un
código sin agregar su traducción sea un error de tipo detectable en build. `next-intl` se configura
con un `NextIntlClientProvider` de locale fijo `"es"` en cada `Providers`, y `getRequestConfig` para
Server Components. El `<html lang="es">` del layout (hoy hardcodeado en `"en"`) se corrige (FR-033).

**Alternativas consideradas**: usar el i18n nativo de Next.js sin `next-intl` — descartado, ya
decidido en `docs/10` (necesita el patrón de namespaces + mensajes por código de error, más simple
con `next-intl`).

## 5. Formato de error único (Problem Details) y filtro global en NestJS

**Situación actual**: `persona.service.ts`/`sede.service.ts` ya lanzan `BadRequestException`,
`ConflictException`, `NotFoundException` de Nest con mensajes en texto plano, sin `code`. Los tests
de integración existentes (`personas.integration-spec.ts`, `sedes.integration-spec.ts`) **solo
verifican `response.status`** en los casos de error (nunca el cuerpo) — confirmado leyendo ambos
archivos —, así que cambiar el formato del cuerpo de error no rompe ningún test existente.

**Decision**:
- Una clase `AppException extends HttpException` (en `apps/api/src/common/errors/`) que además del
  status recibe un `code` (del enum compartido) y opcionalmente `errors` (detalle por campo, para
  validación).
- Se refactorizan los `throw new XxxException(...)` ya existentes en `persona.service.ts` y
  `sede.service.ts` para pasar por `AppException` con su código correspondiente del catálogo (ver
  Decisión 6) — mismo status HTTP que hoy, agregan el `code`.
- Un `AllExceptionsFilter` (`@Catch()` global, registrado con `app.useGlobalFilters(...)` en
  `main.ts`) normaliza **cualquier** excepción a Problem Details:
  - `AppException` → usa su `code`/status/`errors` tal cual.
  - Errores de `class-validator` (los que ya lanza `ValidationPipe`) → `code: 'VALIDACION'`, arma
    `errors` por campo a partir del `BadRequestException` que Nest ya genera.
  - Errores de Prisma reconocidos (ej. `P2025` "no encontrado") → mapeo puntual a un código; el
    caso `P2002` (email duplicado) ya se maneja a mano en `persona.service.ts` (se mantiene, ahora
    lanzando `AppException` con `code: 'EMAIL_DUPLICADO'` en vez de `ConflictException` pelado).
  - Cualquier otro error no reconocido → `500` + `code: 'ERROR_INTERNO'`, sin exponer el mensaje
    original al cliente (solo se loguea).
- `requestId`: `nestjs-pino` (`Params: { pinoHttp: { genReqId: () => randomUUID() } }`) asigna un id
  por request; el filtro lo lee de `request.id` y lo agrega a la respuesta Problem Details y a cada
  línea de log de esa request (JSON, sin datos personales — el logger de pino se configura con
  `redact` para las rutas de body/headers sensibles conocidas, ej. `req.headers.authorization`,
  `req.body.email`, `req.body.telefono`, `req.body.direccion`).

**Alternativas consideradas**: un `Logger` de Nest + un id generado a mano por request sin una
librería de logging estructurado — descartado porque el pedido explícito es JSON estructurado con
`requestId` correlacionable (`nestjs-pino` lo da "gratis", incluyendo el `req.id` en cada línea).

## 6. Catálogo de códigos de error

**Decision**: `packages/shared-types/src/error-code.ts` exporta un enum-like union
`ErrorCode` (mismo patrón que `Profesion`/`EstadoCivil`: un `type` de strings literales, no un enum
de TypeScript, para que el JSON de la API sea directamente ese string sin capa de mapeo). Valores
iniciales — cubren tanto casos genéricos como los que ya existen en el spec 001:

```ts
export type ErrorCode =
  | 'NO_AUTENTICADO'
  | 'SIN_PERMISO'
  | 'NO_ENCONTRADO'
  | 'VALIDACION'
  | 'EMAIL_DUPLICADO'
  | 'SEDE_INVALIDA'
  | 'CONSENTIMIENTO_REQUERIDO'
  | 'PERSONA_NO_PENDIENTE_TUTOR'
  | 'VERIFICACION_LOGIN_FALLIDA'
  | 'ERROR_INTERNO';
```

`EMAIL_DUPLICADO`, `SEDE_INVALIDA`, `CONSENTIMIENTO_REQUERIDO`, `PERSONA_NO_PENDIENTE_TUTOR` son los
códigos que le corresponden a los `throw` ya existentes en `persona.service.ts`/`sede.service.ts` al
migrarlos a `AppException` (Decisión 5). `VERIFICACION_LOGIN_FALLIDA` ya está nombrado en `docs/16`
para D88 (login fail-closed) — se usa tal cual, aunque hoy ese flujo no pase por `apps/api` (queda
reservado para cuando `/error-verificacion` en `apps/web` también quiera mostrar un código).
Cada feature futura amplía esta misma unión (Constitución, Principio X) — nunca reemplaza un valor.

## 7. Manejo de errores en los frontends

**Decision**:
- `apps/web/src/app/error.tsx`, `global-error.tsx` y `not-found.tsx` (y sus equivalentes en
  `apps/backoffice`): componentes de cliente que muestran el mensaje amable correspondiente y, en
  `error.tsx`/`global-error.tsx`, el `requestId` recibido (si la excepción trae uno).
- Página de "sin conexión" servida por el service worker de la PWA (`apps/web` ya es una PWA según
  `docs/10`; se agrega la ruta `/_offline` que el service worker sirve cuando `fetch` falla por
  falta de red) — solo en `apps/web` (el backoffice no es PWA).
- Un cliente de API común (`apps/web/src/lib/api-client.ts`, análogo en backoffice, o promovido a
  `packages/shared-types` si conviene compartir el parseo de la respuesta Problem Details) que:
  1. Parsea toda respuesta no-2xx como Problem Details.
  2. Traduce `code` a un mensaje con `next-intl` (`t('errors.' + code)`, con fallback a
     `errors.ERROR_INTERNO` si el código no está en el diccionario de esa app).
  3. Para `code: 'VALIDACION'`, expone el array `errors` (campo → código) para que el formulario
     (ej. `/registro`) marque cada campo, en vez de un mensaje genérico.

**Alternativas consideradas**: manejar cada fetch por separado sin un cliente común — descartado,
duplicaría la lógica de traducción de códigos en cada pantalla (viola Principio VIII).

## 8. Sentry

**Decision**: `@sentry/nextjs` en `apps/web` y `apps/backoffice` (wizard genera
`instrumentation-client.ts`/`sentry.server.config.ts`/`sentry.edge.config.ts` y envuelve
`next.config.ts` con `withSentryConfig`); `@sentry/nestjs` en `apps/api` (`instrument.ts` importado
antes que nada en `main.ts`, más `SentryModule.forRoot()` y el filtro de excepciones ya definido en
Decisión 5 sigue siendo el que arma la respuesta al cliente — Sentry solo captura y reporta).
Configuración común a las tres apps:
- `sendDefaultPii: false`.
- `beforeSend` que elimina `email`, `telefono`, `direccion` y cualquier cuerpo de formulario de los
  eventos antes de enviarlos (chequeando `event.request.data` y breadcrumbs).
- Activo solo si `SENTRY_DSN` está seteada — cuando falta, el SDK de Sentry no se inicializa (no un
  `if` disperso por el código; se resuelve una sola vez en el punto de inicialización de cada app).
- `SENTRY_ENVIRONMENT` por app (`local`/`staging`/`production`), sin usarse en local (queda vacía o
  sin `SENTRY_DSN` en `.env.local` de desarrollo, que es lo que la desactiva).

## 9. Accesibilidad: verificación automática

**Decision**:
- `eslint-plugin-jsx-a11y` agregado a `eslint.config.mjs` de `apps/web` y `apps/backoffice`
  (`jsxA11y.flatConfigs.recommended`), con las reglas ya en `error` (no `warn`) para que el lint
  falle en CI/pre-commit tal como exige el Principio VII.
- `@axe-core/playwright` se inyecta en el e2e crítico ya existente
  (`apps/web/e2e/registro-bienvenida.spec.ts`) y en el/los que agregue este spec para Primeros
  pasos/Visitanos: después de cada paso de navegación relevante, `new AxeBuilder({ page }).analyze()`
  y `expect(results.violations).toEqual([])`. Cada test de flujo crítico corre **dos veces** (modo
  claro y modo oscuro) — se parametriza con un `test.describe.each(['light', 'dark'])` o equivalente
  que fuerza `color-scheme`/la cookie de `next-themes` antes de cada corrida.

**Alternativas consideradas**: correr axe solo una vez en modo claro — descartado, viola
explícitamente el Principio VII ("corren @axe-core/playwright en modo claro y en modo oscuro").

## 10. SEO base

**Decision**:
- Cada página pública exporta su propio `generateMetadata`/`metadata` (título + descripción) —
  reemplaza el `metadata` genérico "Create Next App" que hoy tiene `apps/web/src/app/layout.tsx`
  (queda un metadata base ahí, cada página pública lo sobreescribe).
- `apps/web/src/app/sitemap.ts` y `robots.ts` (Metadata API de Next.js) listan solo las rutas
  públicas; `robots.ts` desalinea (`disallow`) el prefijo de rutas con sesión (ver Decisión 11) y,
  en `apps/backoffice`, un `robots.ts` propio bloquea todo (`disallow: '/'`) más
  `export const metadata = { robots: { index: false, follow: false } }` en su `layout.tsx` raíz como
  refuerzo a nivel de meta tag (no solo `robots.txt`, que buscadores mal comportados podrían ignorar).
- Un componente `ChurchJsonLd` (Server Component, sin JS en el cliente) en el layout público inyecta
  el `<script type="application/ld+json">` de schema.org `Church` con nombre/dirección/horarios de
  la Sede activa (reutiliza el mismo `GET /sedes` que ya existe).

**Alternativas consideradas**: SSG explícito por página con `generateStaticParams` — no aplica
todavía (no hay rutas dinámicas públicas en este spec, Eventos con ISR queda para su propio spec).

## 11. Estructura de rutas y menús (las tres superficies)

**Decision**: `apps/web` gana un route group `(publica)` para Nosotros/Primeros
pasos/Ministerios/Eventos/Visitanos/Dar (reemplaza `/bienvenida` y `/sede`, que dejan de existir sin
redirección por la clarificación del spec) y un route group `(app)` — protegido por sesión via
`middleware.ts` o chequeo en cada `layout.tsx` — para Inicio/Mi camino/Eventos/Avisos/Perfil.
`/registro`, `/pendiente-tutor`, `/error-verificacion` (spec 001) quedan donde están, fuera de ambos
grupos, y se linkean desde Primeros pasos. Cada superficie tiene un array de configuración de
navegación tipado (`apps/web/src/config/nav-publica.ts`, `nav-app.ts`,
`apps/backoffice/src/config/nav.ts`) con `{ href, labelKey, icon, roles? }` — es el "contrato" que
una feature futura debe respetar para agregarse al menú sin tocar el layout (ver
`contracts/nav-config.md`). Las secciones sin funcionalidad implementada renderizan un componente
compartido `<EstadoVacio mensaje=".." accion={...} />` (de `packages/ui`).

Rol de la barra: `apps/backoffice` filtra el array de `nav.ts` contra `session.user.rol` (ya viene
en el token/sesión, sin necesidad de un endpoint nuevo) y arma la unión de ítems cuando hay más de
un rol.

**Alternativas consideradas**: una sola tabla de configuración compartida para las tres superficies
— descartado, cada superficie tiene una forma de ítem distinta (roles solo aplica al backoffice,
`labelKey` vive en namespaces de mensajes distintos por app).

## 12. Cambios de datos: `Persona.idiomaPreferido` / `Persona.temaPreferido`

**Decision**: dos columnas nuevas en el modelo `Persona` (`apps/api/prisma/schema.prisma`), con sus
enums (mismo patrón que `Genero`/`EstadoCivil`/`Profesion`):

```prisma
enum Idioma {
  es
}

enum TemaPreferido {
  claro
  oscuro
  sistema
}
```

`idiomaPreferido Idioma @default(es)`, `temaPreferido TemaPreferido @default(sistema)`. Un enum de
un solo valor para idioma es intencional (documenta el contrato, agregar `pt`/`en` en Fase 2 es un
solo valor de enum más, sin migración de datos). Dos endpoints nuevos en `PersonaController`:
- `GET /personas/me`: guardia `JwtNextAuthGuard`, resuelve por `request.user.personaId` (no por un
  `:id` de la URL — autorización por registro, Principio V), devuelve el subconjunto de datos propio
  (nombre, apellido, email, fotoUrl, sedeId, estado, idiomaPreferido, temaPreferido).
- `PATCH /personas/me/preferencias`: mismo guard, body `{ temaPreferido }` (DTO con `@IsEnum`),
  actualiza solo ese campo de la propia Persona.

Ambos se agregan a `contracts/personas-api.md`. `GET /personas/by-email` (uso interno) suma
`temaPreferido` a su respuesta (Decisión 3).

## 13. Datos de demostración (mínimo viable, Clarifications)

**Decision**: se extiende `apps/api/prisma/seed.ts` (ya crea una Sede) para además crear, si no
existen, 4 Personas ficticias con emails reconocibles (`demo-activa@example.com`,
`demo-pendiente-tutor@example.com`, `demo-inactiva@example.com`) cubriendo los tres estados:
activa mayor de edad, pendiente_tutor, e inactiva (pendiente_tutor + `activo: false`, caso no
autorizado). Nombres/apellidos genéricos en español (ej. "Ana Ejemplo", "Juan Demo") — nunca nombres
que puedan confundirse con una persona real. El script sigue siendo idempotente (mismo criterio que
ya usa para la Sede: si ya existe, no duplica).

## 14. Compatibilidad con los tests existentes del spec 001

Confirmado por lectura directa de los specs de test: ningún test de integración/unitario del spec
001 inspecciona el cuerpo de una respuesta de error (`personas.integration-spec.ts` y
`sedes.integration-spec.ts` solo hacen `expect(response.status)` en los casos de error), y el único
test e2e (`registro-bienvenida.spec.ts`) no depende del texto exacto de ningún mensaje de error. El
cambio de formato de error (Decisión 5), la extracción a `packages/ui` (Decisión 1) y el traslado de
`/bienvenida`/`/sede` (Decisión 11) no deberían romper ningún test existente sin modificarlo; se
verifica corriendo la suite completa antes de dar por cerrada cada tarea que toque estos puntos.
