# Quickstart: Base Transversal de la App

Valida de punta a punta cada historia de `spec.md` sobre un ambiente local ya preparado (ver
`docs/11-setup-local.md` para el setup inicial del monorepo, ya hecho para el spec 001).

## Prerrequisitos

- Docker Compose corriendo (`postgres`), migraciones de Prisma aplicadas incluyendo las de este
  spec (`idiomaPreferido`, `temaPreferido` en `Persona`).
- Las tres apps levantadas en sus puertos fijos: `apps/api` (3333), `apps/web` (3001),
  `apps/backoffice` (3002) — ver `docs/10-stack-tecnico.md`.
- Seed de Prisma corrido (`pnpm --filter api prisma db seed`) — deja cargada la Sede de ejemplo más
  las Personas de demo de este spec (Decisión 13 de `research.md`).
- `SENTRY_DSN` **sin setear** en los `.env.local`/`.env` de las tres apps (para validar que Sentry
  queda desactivado en local).

## Cómo recorrer esta guía (revisión manual)

- Cada escenario se prueba en **escritorio y en ancho de celular** (o en un celular real), y en **modo claro y oscuro**.
- Al menos una pasada completa con una **cuenta real de Google**, además del login de test.
- Anotá cada hallazgo en el archivo de revisión de la ronda (`specs/revision-manual/`), no solo los errores: también textos confusos o mejoras.
- Al terminar, completá el checklist de lector de pantalla: `specs/002-base-transversal/checklists/accesibilidad-manual.md`.

## Historia 1 — Navegación

1. Abrir `http://localhost:3001/` sin sesión: el menú principal muestra Nosotros, Primeros pasos,
   Ministerios, Eventos, Visitanos + botones Dar/Ingresar.
2. Reducir el viewport a ancho de celular: las mismas secciones aparecen en un menú hamburguesa;
   Dar/Ingresar siguen visibles.
3. Entrar a `/primeros-pasos`: se ve el contenido que antes vivía en `/bienvenida` (spec 001).
   Visitar `/bienvenida` directamente: da "no encontrado" (FR-007, sin redirección).
4. Entrar a `/visitanos`: se ve la información de la Sede de demo (antes en `/sede`). Visitar `/sede`
   directamente: da "no encontrado" (FR-008).
5. Entrar a `/ministerios` o `/eventos`: se ve un estado vacío amable, no un error (FR-005).
6. Iniciar sesión (login de test, `ALLOW_TEST_LOGIN=true` como en el spec 001) con la Persona demo
   `demo-activa@example.com`: la navegación cambia a la barra Inicio/Mi camino/Eventos/Avisos/Perfil.
7. Entrar a `http://localhost:3002/` (backoffice) autenticado con un email de rol Admin (seed o
   variable de entorno de test): el menú lateral muestra los ítems de Admin, incluidos los que
   todavía no tienen funcionalidad (estado vacío).

## Historia 2 — Accesibilidad

1. En cualquier página de `apps/web`, presionar Tab una vez desde el principio: el primer elemento
   enfocable es "Saltar al contenido".
2. Recorrer el menú público y la barra con sesión solo con teclado: el foco nunca desaparece ni
   queda atrapado; abrir el menú hamburguesa y cerrarlo con Escape devuelve el foco al botón.
3. Correr `pnpm --filter web test:e2e` — el test de registro (spec 001) y los nuevos de Primeros
   pasos/Visitanos incluyen `@axe-core/playwright` en modo claro y oscuro (`research.md`, Decisión
   9): deben terminar sin violaciones.
4. `pnpm --filter web lint` y `pnpm --filter backoffice lint`: `eslint-plugin-jsx-a11y` no reporta
   errores.

## Historia 3 — Feedback y estados

1. Con la API apagada, entrar a `/visitanos`: se ve el estado de error con botón "Reintentar", no
   una pantalla rota.
2. Completar el formulario de `/registro` (spec 001) y observar el botón al enviar: queda en estado
   de carga y bloqueado hasta la respuesta.
3. Mientras cargan los datos de `/visitanos` (con la red lenta, ej. "Slow 3G" en DevTools): se ven
   esqueletos con la forma del contenido, no una pantalla en blanco.
4. En `/ministerios` y `/eventos`: el estado vacío tiene un mensaje amable y una acción sugerida.
5. En el backoffice, ejecutar una acción destructiva disponible (ej. desactivar una Sede o marcar
   inactiva una Persona pendiente): aparece un diálogo de confirmación que nombra lo afectado, con
   botones de verbo concreto (nunca un "Cancelar" ambiguo); al confirmar, un aviso breve con
   "Deshacer" cuando la acción lo permite.
6. Los avisos breves (toasts) se leen con lector de pantalla y duran lo suficiente para leerlos.

## Historia 4 — Errores

1. Con la API apagada, pedir cualquier dato: aparece el mensaje amable + "Reintentar" (no un error
   técnico).
2. Visitar una URL inexistente (ej. `/esto-no-existe`): página propia de "no encontrado" con enlaces
   a Inicio y Primeros pasos.
3. Provocar un error de validación en `POST /personas` (ej. con `curl`, un body incompleto): la
   respuesta sigue el formato de `contracts/errores.md` (`code: "VALIDACION"`, `errors` por campo,
   `requestId` presente).
4. Revisar los logs de `apps/api` para esa misma request: aparecen en JSON con el mismo `requestId`,
   sin el email/teléfono/dirección del body.

## Historia 5 — Tema claro/oscuro

1. Sin sesión, con el sistema operativo en modo oscuro: la web pública se ve en modo oscuro sin
   configurarlo.
2. Con sesión (`demo-activa@example.com`), entrar a Perfil y elegir "Claro": la interfaz cambia al
   instante. Verificar en la base (`SELECT "temaPreferido" FROM personas WHERE email = ...`) que
   quedó guardado.
3. Cerrar sesión, volver a iniciarla: la interfaz carga directamente en modo claro, sin flash del
   modo del sistema antes de aplicar la preferencia guardada.
4. Verificar que el selector de tema **se encuentra** desde la app con sesión (Perfil en la barra
   inferior), en escritorio y en celular.
5. Repetir los pasos 2–4 en el **backoffice**, desde el menú de usuario: el tema se guarda y al
   recargar o volver a iniciar sesión no hay flash (`apps/backoffice/src/auth.ts`).
6. Revisar en ambos temas que textos, botones, bordes y foco sigan siendo legibles (contraste).

## Historia 6 — Idioma

1. Buscar en el código de `apps/web`/`apps/backoffice` (ej. `grep` de texto visible en JSX) — no
   debería haber strings de interfaz fuera de `messages/es.json`, **incluido `registro/page.tsx`**
   (migrado en la Phase 8 del spec 001, cierra T082).
2. Revisar el `<html>` de cualquier página: `lang="es"`.
3. Crear una Persona nueva (registro del spec 001): en la base, `idiomaPreferido = 'es'` por default.

## Historia 7 — SEO

1. `curl http://localhost:3001/sitemap.xml` y `.../robots.txt`: listan/permiten solo las rutas
   públicas.
2. Ver el código fuente de `/visitanos`: incluye el `<script type="application/ld+json">` con
   `@type: "Church"`.
3. `curl http://localhost:3002/robots.txt`: `Disallow: /` completo para el backoffice.
4. Compartir (o inspeccionar las meta tags Open Graph de) cualquier página pública: título y
   descripción propios, no genéricos.
5. Verificar que cada página pública tiene **imagen** de vista previa (`og:image`, 1200×630, con
   texto alternativo) y tarjeta de Twitter. Probar pegando el link en WhatsApp (con un túnel o una
   vista previa de meta tags) — debe mostrar imagen, título y descripción (SC-007).

## Historia 8 — Datos de demostración

1. En un ambiente limpio, correr el seed: queda una Sede y las Personas demo de la Decisión 13 de
   `research.md` (una por estado: activa, pendiente_tutor, inactiva).
2. Volver a correr el seed: no duplica nada (idempotente).

## Regresión del spec 001

`pnpm --filter api test`, `pnpm --filter api test:e2e` y `pnpm --filter web test:e2e` (Playwright)
siguen en verde sin modificar sus aserciones existentes (`research.md`, Decisión 14).
