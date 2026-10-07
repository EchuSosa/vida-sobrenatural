---

description: "Tareas de la spec 007 — ingreso con código por email"
---

# Tasks: Ingreso con código por email

**Input**: Design documents from `/specs/007-ingreso-codigo-email/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Sí. Principio VI: toda regla con ramas lleva test unitario, lo que toca la base lleva
integración, y el ingreso es un flujo crítico (sin él no entra nadie sin Google), así que lleva e2e
en las dos apps, con `axe` en claro y oscuro.

**Organization**: Por historia de `spec.md`. Los **lotes** (L1…L6) agrupan tareas que se pueden
hacer en paralelo, por ejemplo con varias sesiones o subagentes: dentro de un lote, las tareas con
`[P]` tocan archivos distintos y no dependen entre sí.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Puede correr en paralelo (archivos distintos, sin dependencias pendientes)
- **[Story]**: Historia de `spec.md` (US1…US6)

## Recordatorios que valen para todas las tareas

- Ningún texto de interfaz fijo: pantallas por `next-intl` (`apps/web/src/messages/es.json`,
  `apps/backoffice/src/messages/es.json`); el mail por `apps/api/src/email/mensajes/es.json` (D84).
- Colores solo de tokens (D118). Estados nunca solo por color (D81).
- Ni el email ni el código ni la IP van a logs o a Sentry (FR-020, D101).
- Si se edita `packages/shared-types` con los servidores levantados, recompilarlo (H-33).
- Commits en español, uno por cambio coherente; el test que rompe por un cambio se arregla en el
  mismo commit.

---

## Phase 1: Setup — Lote L1

**Purpose**: Infraestructura de email y variables de entorno.

- [ ] T001 [P] Sumar el servicio `mailpit` (imagen `axllent/mailpit`, puertos `1025:1025` SMTP y `8025:8025` web, `restart: unless-stopped`) a `docker-compose.yml`, y el paso "abrir Mailpit en http://localhost:8025" a `specs/revision-manual/COMO-ARRANCAR.md`.
- [ ] T002 [P] Agregar `CODIGO_INGRESO_SECRET`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_SEGURO`, `EMAIL_REMITENTE` a `apps/api/.env.example`, `apps/api/.env.test.example` y `apps/api/.env.e2e.example`, con valores de Mailpit (`localhost`, `1025`, `false`) y un comentario que remite a D140 para producción.
- [ ] T003 [P] Agregar `nodemailer` y `@types/nodemailer` a `apps/api/package.json` (`pnpm --filter api add nodemailer` y `add -D @types/nodemailer`).

---

## Phase 2: Foundational (Blocking Prerequisites) — Lotes L2 y L3

**Purpose**: Lo que todas las historias necesitan: valores compartidos, modelo, email normalizado,
`EmailService`, el módulo de código en la API y las piezas de UI compartidas.

**⚠️ CRITICAL**: Ninguna historia arranca antes de terminar esta fase.

### Lote L2 (en paralelo)

- [ ] T004 [P] Crear `packages/shared-types/src/codigo-ingreso.ts` con `normalizarEmail(email) = email.trim().toLowerCase()` y las constantes de data-model.md: `CODIGO_INGRESO_LARGO = 6`, `CODIGO_INGRESO_VIDA_MIN = 15`, `CODIGO_INGRESO_MAX_INTENTOS = 5`, `CODIGO_INGRESO_ENVIOS_POR_EMAIL_HORA = 5`, `CODIGO_INGRESO_ENVIOS_POR_ORIGEN_HORA = 30`, `DURACION_SESION_WEB_S = 30 * 24 * 60 * 60`, `DURACION_SESION_BACKOFFICE_S = 7 * 24 * 60 * 60`; reexportarlo en `packages/shared-types/src/index.ts`.
- [ ] T005 [P] Agregar a `packages/shared-types/src/error-code.ts` los códigos `CODIGO_INCORRECTO`, `CODIGO_SIN_INTENTOS`, `CODIGO_VENCIDO`, `DEMASIADOS_PEDIDOS`, `ENVIO_EMAIL_FALLIDO`, con un comentario que remite a `specs/007-ingreso-codigo-email/contracts/codigo-ingreso-api.md`.
- [ ] T006 [P] Agregar el modelo `CodigoIngreso` a `apps/api/prisma/schema.prisma` exactamente como en data-model.md (`id` uuid, `email String`, `codigoHuella String`, `origenHuella String`, `venceEn DateTime`, `intentosFallidos Int @default(0)`, `usadoEn DateTime?`, `reemplazadoEn DateTime?`, `creadoEn DateTime @default(now())`, `@@index([email, creadoEn])`, `@@index([origenHuella, creadoEn])`) y generar la migración `codigo_ingreso`.
- [ ] T007 [P] Crear `apps/api/src/email/email.service.ts` (clase abstracta `EmailService` con `enviar(mensaje: MensajeEmail): Promise<void>` e interfaz `MensajeEmail { para, asunto, html, texto }`), `apps/api/src/email/smtp-email.service.ts` (nodemailer con las variables `SMTP_*` y `EMAIL_REMITENTE`; la API no arranca si falta `SMTP_HOST`; ante un error loguea solo el tipo, nunca destinatario ni cuerpo) y `apps/api/src/email/email.module.ts`, siguiendo el patrón de `apps/api/src/storage/`. Ver `contracts/email-codigo-ingreso.md`.
- [ ] T008 [P] Crear `apps/api/test/email-service-falso.ts`: `EmailServiceFalso` que guarda los mensajes en un arreglo y permite simular un fallo de envío (para FR-021 y el caso borde de envío fallido).

### Lote L3 (en paralelo, después de L2)

- [ ] T009 Crear la migración de datos `normalizar_email_persona` en `apps/api/prisma/migrations/`: primero un chequeo que busca emails de `Persona` que chocan al pasar a `lower(trim(email))` y, si hay alguno, **falla** con la lista (no fusiona Personas); después `UPDATE "Persona" SET email = lower(trim(email))`. Research.md #8.
- [ ] T010 [P] Normalizar el email con `normalizarEmail` en todo camino que crea, edita o busca una Persona por email en `apps/api/src/persona/persona.service.ts` (incluido `findByEmail`, que hoy compara exacto), en el alta de menores/tutor del backoffice y en `apps/api/prisma/seed.ts`/`seed-demo.ts`. Test unitario en `apps/api/test/unit/persona/` que busca `ANA@Hotmail.com ` y encuentra `ana@hotmail.com`.
- [ ] T011 [P] Crear `apps/api/src/email/plantillas/codigo-ingreso.ts` (`plantillaCodigoIngreso({ codigo, minutos }) → { asunto, html, texto }`) y `apps/api/src/email/mensajes/es.json` con el texto aprobado en el clarify (asunto "Tu código para entrar: {codigo}"; cuerpo "¡Hola!" / "Este es tu código para entrar a Vida Sobrenatural:" / código / "Escribilo en la pantalla donde lo pediste. Vale por {minutos} minutos y sirve una sola vez." / "Si no fuiste vos, ignorá este mail: nadie puede entrar sin este código." / "Iglesia Vida Sobrenatural"). HTML: tabla de una columna, estilos en línea, ancho máximo 480 px, `lang="es"`, código en 32 px o más con espaciado entre letras, colores de un único objeto `COLORES_EMAIL` que nombra el token de `docs/17-paleta-y-tokens.md` de cada valor. Sin enlaces, sin datos personales. Test unitario en `apps/api/test/unit/email/`: el HTML y el texto contienen el código, los minutos y la frase "si no fuiste vos", y no contienen ningún otro dato.
- [ ] T012 [P] Crear `apps/api/src/codigo-ingreso/huella.ts`: `generarCodigo()` con `crypto.randomInt(0, 1_000_000)` completado a 6 dígitos, `huella(valor)` HMAC-SHA256 con `CODIGO_INGRESO_SECRET` en hex, `coincide(valor, huella)` con `crypto.timingSafeEqual`, y `limpiarCodigo(entrada)` que quita espacios y guiones y exige exactamente 6 dígitos. Tests unitarios en `apps/api/test/unit/codigo-ingreso/huella.spec.ts` (largo, ceros a la izquierda, misma huella para el mismo valor, distinta con otro secreto, `"482 913"` y `"482-913"` válidos, `"48291"` inválido).
- [ ] T013 [P] Crear `packages/ui/src/components/boton-ingresar-google.tsx` moviendo el de `apps/backoffice/src/components/boton-ingresar-google.tsx`, con variante de contorno (`variant="outline"`) y el `callbackUrl` por prop; exportarlo en `packages/ui/src/index.ts` y actualizar los imports del backoffice en el mismo commit.
- [ ] T014 [P] Crear `packages/ui/src/components/formulario-ingreso-codigo.tsx` según `contracts/nextauth-codigo-email.md`: paso email (campo "email", botón principal "Enviarme el código") y paso código (texto con el email y los minutos, campo con `inputMode="numeric"` y `autoComplete="one-time-code"`, botón principal "Entrar", acciones de texto "Enviarme otro código" y "Usar otro email"). Recibe `pedirCodigo`, `verificarCodigo`, los textos traducidos y el paso inicial por props. Usa `useEnvio` y `Button` (H-57), `MensajeErrorCampo` y `ResumenErrores` (H-50); foco al título al cambiar de paso y al resumen si hay errores; conserva el email escrito ante un error. Exportarlo en `packages/ui/src/index.ts`.

### Lote L3b (después de T006, T007, T011, T012)

- [ ] T015 Crear `apps/api/src/codigo-ingreso/codigo-ingreso.service.ts` con `pedir(email, origen)` y `verificar(email, codigo)`, en el orden de research.md #5: normalizar; revisar límite por email (5 filas en la última hora) y por origen (30 filas con la misma `origenHuella` en la última hora) → `DEMASIADOS_PEDIDOS` con `reintentarEn`; en una transacción, marcar `reemplazadoEn` en el código vigente y crear la fila (`venceEn = ahora + 15 min`); enviar con `EmailService`; si el envío falla, borrar la fila nueva y lanzar `ENVIO_EMAIL_FALLIDO`; borrar filas con más de 24 horas. **Nunca** consulta `Persona`. `verificar`: busca el código vigente (sin `usadoEn`, sin `reemplazadoEn`, `venceEn > ahora`, `intentosFallidos < 5`); sin vigente → `CODIGO_VENCIDO`; huella distinta → incremento atómico (`UPDATE … WHERE intentosFallidos < 5`) y `CODIGO_INCORRECTO` con `intentosRestantes`, o `CODIGO_SIN_INTENTOS` si fue el quinto; correcto → `usadoEn = ahora` y devuelve el email.
- [ ] T016 Tests unitarios en `apps/api/test/unit/codigo-ingreso/codigo-ingreso.service.spec.ts` con Prisma simulado y `EmailServiceFalso`: cada límite (5.º pedido pasa, 6.º falla; 30 por origen), código vencido a los 15 min, usado, reemplazado, cinco intentos, envío fallido que no cuenta, y que `pedir` no toca `Persona`.
- [ ] T017 Crear `apps/api/src/codigo-ingreso/codigo-ingreso.controller.ts`, `dto/` y `codigo-ingreso.module.ts`: `POST /auth/codigo-ingreso/pedidos` (202 vacío, `X-Origen-Cliente` obligatorio) y `POST /auth/codigo-ingreso/verificaciones` (200 `{ email }`), los dos con `InternalLookupGuard`, errores en Problem Details con `errors: [{ campo, code }]` como en `contracts/codigo-ingreso-api.md` (`EMAIL_INVALIDO` para formato, hasta 254 caracteres). Registrar el módulo y `EmailModule` en `apps/api/src/app.module.ts`.
- [ ] T018 Test de integración `apps/api/test/integration/codigo-ingreso.e2e-spec.ts` contra la base de test con `EmailServiceFalso`: 202 idéntico (cuerpo y headers) para un email registrado y uno no registrado; 401 sin secreto; 429 al sexto pedido; verificación correcta una sola vez; `GET /personas/by-email` encuentra con mayúsculas y espacios; la tabla nunca guarda el código en claro.

**Checkpoint**: La API pide y verifica códigos y manda el mail a Mailpit. Las historias pueden
empezar.

---

## Phase 3: User Story 1 - Entrar a la app con un código enviado al email (Priority: P1) 🎯 MVP — Lote L4 (web)

**Goal**: Una Persona `activa` con email de cualquier proveedor entra a la web app con el código.

**Independent Test**: Escenarios 1–4 de `quickstart.md`.

- [ ] T019 [US1] Validar primero el camino de Auth.js v5 (riesgo de plan.md): en `apps/web/src/auth.ts`, agregar el proveedor `Credentials` `id: 'codigo-email'` (siempre registrado, también en producción) cuyo `authorize()` llama a `POST /auth/codigo-ingreso/verificaciones` con `X-Internal-Secret`; `200` → `{ id: email, email, name: null, emailVerificadoPorProveedor: true }`; `422` → subclase de `CredentialsSignin` con `code` = `ErrorCode`; otra respuesta o API caída → `Error` común (fail-closed, D88). Sumar `session.maxAge = DURACION_SESION_WEB_S`, `updateAge = 24 * 60 * 60` y `pages.signIn = '/ingresar'`. Los callbacks `signIn`/`jwt`/`session` no cambian.
- [ ] T020 [US1] Crear `apps/web/src/app/(publica)/ingresar/acciones.ts` con las acciones de servidor `pedirCodigo(email)` (llama a `POST /auth/codigo-ingreso/pedidos` con `X-Origen-Cliente` tomado de `x-forwarded-for` o la conexión; guarda el email normalizado en una cookie `httpOnly`, `sameSite=lax`, de 15 minutos; devuelve `{ ok }` o `{ errores, reintentarEn }`) y `verificarCodigo(codigo)` (lee la cookie; `signIn('codigo-email', { email, codigo, redirect: false })`; si sale bien borra la cookie y redirige a `/ingresar`; si es `CredentialsSignin` devuelve `{ errores: [{ campo: 'codigo', code }] }`).
- [ ] T021 [US1] Cambiar `apps/web/src/app/(publica)/ingresar/page.tsx`: con sesión, las mismas redirecciones de hoy (H-85); sin sesión, la pantalla de ingreso con `BotonIngresarGoogle` (contorno, `callbackUrl: '/ingresar'`), el separador "o" y `FormularioIngresoCodigo` en el paso email, que al enviar bien navega a `/ingresar/codigo`. Agregar `loading.tsx` y `error.tsx` en la misma carpeta.
- [ ] T022 [US1] Crear `apps/web/src/app/(publica)/ingresar/codigo/page.tsx`: sin la cookie del email, redirige a `/ingresar`; con ella, `FormularioIngresoCodigo` en el paso código. "Enviarme otro código" vuelve a llamar a `pedirCodigo` con el mismo email; "Usar otro email" borra la cookie y vuelve a `/ingresar`.
- [ ] T023 [P] [US1] Agregar a `apps/web/src/messages/es.json` los textos de las dos pantallas y los mensajes por código de error de `contracts/nextauth-codigo-email.md` (cada uno dice cómo seguir; `DEMASIADOS_PEDIDOS` con `{minutos}` calculado de `reintentarEn`).
- [ ] T024 [P] [US1] Apuntar "Ingresar" de `apps/web/src/config/nav-publica.ts` a `/ingresar`, y hacer que `apps/web/src/app/(publica)/registro/formulario-registro.tsx` redirija a `/ingresar` sin sesión en vez de mostrar su propio botón de Google (queda un solo lugar de ingreso). Revisar los e2e existentes que esperaban el botón en `/registro` y corregirlos en el mismo commit.
- [ ] T025 [US1] Crear `apps/web/e2e/mailpit.ts` con `leerCodigoDeMailpit(email)` (`GET http://localhost:8025/api/v1/search?query=to:<email>`, último mensaje, extrae los 6 dígitos del asunto) y vaciar Mailpit (`DELETE /api/v1/messages`) en `apps/web/e2e/global-setup.ts`.
- [ ] T026 [US1] Crear `apps/web/e2e/ingreso-codigo.spec.ts` con los escenarios 1–4 de `quickstart.md` (entra a `/inicio`; código equivocado con mensaje por campo y email conservado; cinco intentos; el código reemplazado no sirve) y `axe` en claro y oscuro sobre `/ingresar` y `/ingresar/codigo`.
- [ ] T027 [US1] Verificar `/ingresar` (pantalla de ingreso de la web) contra el checklist de `docs/15-guia-ux-ui.md` (sección "Checklist por pantalla"): cuatro estados, una sola acción principal ("Enviarme el código"), Google con contorno arriba, tono y voseo, teclado y lector de pantalla, contraste en los dos temas incluido `hover`, errores por campo con resumen y foco (H-50), botón bloqueado mientras envía (H-57).
- [ ] T028 [US1] Verificar `/ingresar/codigo` (pantalla del código de la web) contra el mismo checklist: además, `autoComplete="one-time-code"`, el texto dice a qué email se mandó y cuánto dura, las acciones "Enviarme otro código" y "Usar otro email" son de texto y no compiten con "Entrar".

**Checkpoint**: MVP. Una Persona con Hotmail entra a la web sola.

---

## Phase 4: User Story 2 - Registrarse con un email de cualquier proveedor (Priority: P1)

**Goal**: Un email nuevo verificado con el código arranca el registro de 4 pasos.

**Independent Test**: Escenarios 5–6 de `quickstart.md`.

- [ ] T029 [US2] Verificar que `apps/web/src/app/(publica)/registro/` funciona con una sesión de `codigo-email` sin `givenName`/`familyName`/`image`: nombre y apellido vacíos y editables, email no editable, sin `fotoUrl`, y `POST /personas` guarda el email normalizado. Ajustar solo lo que falle.
- [ ] T030 [US2] Agregar a `apps/web/e2e/ingreso-codigo.spec.ts` los escenarios 5 y 6: pedir código con un email nuevo muestra exactamente la misma pantalla que con uno registrado (comparar el texto visible), entra al registro con el email cargado, lo completa y queda `activa`; con fecha de menor queda en `pendiente_tutor` y ve la pantalla de espera.

---

## Phase 5: User Story 3 - Convivir con Google sin duplicar Personas (Priority: P1)

**Goal**: Mismo email → misma Persona, entre por donde entre.

**Independent Test**: Escenarios 7–8 de `quickstart.md`.

- [ ] T031 [US3] Agregar a `apps/web/e2e/ingreso-codigo.spec.ts` los escenarios 7 y 8: entrar con código usando `ANA@Hotmail.com ` para una Persona `ana@hotmail.com`, y entrar con código con el email de una Persona creada por `test-login` (el camino de Google en los e2e); en los dos casos, mismo `personaId` que la sesión anterior (leerlo de `/perfil` o del token de API).
- [ ] T032 [P] [US3] Test de integración en `apps/api/test/integration/codigo-ingreso.e2e-spec.ts`: `POST /personas` con un email ya existente en otra capitalización devuelve `EMAIL_DUPLICADO` (la unicidad vale sobre el email normalizado).

---

## Phase 6: User Story 4 - Entrar solas las Personas cargadas por el Admin y los menores pre-cargados (Priority: P2)

**Goal**: D35 y D97 funcionan con el código.

**Independent Test**: Escenario 9 de `quickstart.md`, y `pendiente_tutor` y desactivada.

- [ ] T033 [US4] Agregar a `apps/web/e2e/ingreso-codigo.spec.ts`: un menor pre-cargado y activado (sembrado como en `apps/backoffice/e2e/pendientes-tutor.spec.ts`) entra con código sin pasar por el registro; una Persona `pendiente_tutor` con código correcto llega a `/pendiente-tutor`; una Persona con `activo = false` recibe el mismo trato que hoy con `test-login` (comparar las dos).

---

## Phase 7: User Story 5 - Entrar al backoffice con código (Priority: P2) — Lote L4 (backoffice, en paralelo con la web)

**Goal**: El equipo sin Google entra al backoffice.

**Independent Test**: Escenarios 10–11 de `quickstart.md`.

- [ ] T034 [US5] En `apps/backoffice/src/auth.ts`, agregar el mismo proveedor `codigo-email` que T019 (si `authorize()` sale igual en las dos apps, moverlo a `packages/shared-types/src/auth-server.ts` como `crearProveedorCodigoEmail()`, H-41) y `session.maxAge = DURACION_SESION_BACKOFFICE_S`, `updateAge = 24 * 60 * 60`.
- [ ] T035 [US5] Crear `apps/backoffice/src/components/acciones-ingreso.ts` con `pedirCodigo(email)` y `verificarCodigo(email, codigo, destino)` (sin cookie: los dos pasos están en la misma pantalla y el email vive en el estado del formulario), con el mismo contrato de respuesta que la web.
- [ ] T036 [US5] Cambiar `apps/backoffice/src/components/pantalla-sin-sesion.tsx`: `BotonIngresarGoogle` con contorno, separador "o" y `FormularioIngresoCodigo`, en ese orden; después de entrar, vuelve a la ruta en la que estaba. Una Persona sin rol de cargo ve lo mismo que hoy con Google.
- [ ] T037 [P] [US5] Agregar a `apps/backoffice/src/messages/es.json` los mismos textos y mensajes de error que T023 (mismas claves).
- [ ] T038 [US5] Crear `apps/backoffice/e2e/ingreso-codigo.spec.ts` (con su propio `leerCodigoDeMailpit` o el de la web si ya hay helpers compartidos entre e2e) con los escenarios 10 y 11, y `axe` en claro y oscuro sobre la pantalla sin sesión.
- [ ] T039 [US5] Verificar `PantallaSinSesion` del backoffice contra el checklist de `docs/15-guia-ux-ui.md`, con los mismos puntos que T027 y T028 (los dos pasos viven en esta pantalla).

---

## Phase 8: User Story 6 - Recibir un mail claro y cálido (Priority: P2)

**Goal**: El mail se entiende de un vistazo y no filtra datos.

**Independent Test**: Escenario 12 de `quickstart.md`.

- [ ] T040 [US6] Agregar a `apps/web/e2e/ingreso-codigo.spec.ts` una prueba que abre el mail en Mailpit (`GET /api/v1/message/{id}`) y verifica en HTML y texto: asunto con el código, "15 minutos", "Si no fuiste vos, ignorá este mail", ninguna aparición del nombre de la Persona, y que el mail a un email registrado y a uno no registrado es idéntico salvo el código.
- [ ] T041 [US6] Medir el contraste AA de los colores de `COLORES_EMAIL` (texto sobre fondo, código sobre fondo) y anotar los valores en `docs/17-paleta-y-tokens.md`, en una sección "Email".

---

## Phase 9: Polish & Cross-Cutting Concerns — Lote L6

- [ ] T042 [P] Correr los escenarios 13–15 de `quickstart.md` a mano (límite de envíos, API apagada, vencimiento de la cookie de sesión) y anotar el resultado en `specs/revision-manual/`.
- [ ] T043 [P] Revisar con `git grep` que ningún log ni `Sentry.capture*` nuevo incluye email, código o IP (FR-020).
- [ ] T044 [P] Actualizar `specs/revision-manual/COMO-ARRANCAR.md` con las variables nuevas y cómo leer un código en Mailpit durante la revisión manual.
- [ ] T045 Correr `/speckit-analyze` y dejar `tasks.md` y `plan.md` al día con lo que haya cambiado al implementar.
- [ ] T046 Cierre: las tres suites en verde — `pnpm --filter api run test`, `pnpm --filter api run test:e2e`, y los e2e de `apps/web` y `apps/backoffice` (con Mailpit arriba). Pedirle a Echu el consentimiento para el `prisma migrate reset` de los e2e antes de correrlos.

---

## Dependencies & Execution Order

### Fases

- **Setup (L1)**: sin dependencias.
- **Foundational (L2 → L3 → L3b)**: L2 después de L1; L3 después de L2; T015–T018 después de T006,
  T007, T011 y T012. Bloquea todas las historias.
- **US1 (web)** y **US5 (backoffice)**: después de Foundational, **en paralelo entre sí** (Lote L4):
  tocan apps distintas.
- **US2, US3, US4, US6**: después de US1 (usan su pantalla y su archivo de e2e). Entre sí, las
  tareas de e2e comparten `apps/web/e2e/ingreso-codigo.spec.ts`: hacerlas en orden, o separarlas en
  archivos si se paralelizan. T032 y T041 pueden ir en paralelo con cualquiera.
- **Polish (L6)**: al final.

### Lotes paralelos

| Lote | Tareas | En paralelo |
|---|---|---|
| L1 | T001–T003 | las tres |
| L2 | T004–T008 | las cinco |
| L3 | T009–T014 | T010–T014 entre sí; T009 sola (migración) |
| L3b | T015–T018 | en orden |
| L4 | web T019–T028 ‖ backoffice T034–T039 | dos frentes, uno por app |
| L5 | T029–T033, T040–T041 | T032 y T041 con cualquiera; el resto en orden |
| L6 | T042–T046 | T042–T044 entre sí; T045 y T046 al final |

### Parallel Example: Lote L2

```text
T004 packages/shared-types/src/codigo-ingreso.ts
T005 packages/shared-types/src/error-code.ts
T006 apps/api/prisma/schema.prisma
T007 apps/api/src/email/
T008 apps/api/test/email-service-falso.ts
```

### Parallel Example: Lote L4

```text
Frente web:        T019 → T020 → T021 → T022 → (T023, T024 en paralelo) → T025 → T026 → T027, T028
Frente backoffice: T034 → T035 → T036 → (T037) → T038 → T039
```

---

## Implementation Strategy

### MVP (Foundational + Historia 1)

1. L1, L2, L3, L3b.
2. Historia 1 en la web.
3. **Parar y validar**: escenarios 1–4 de `quickstart.md`. Una Persona con Hotmail ya entra sola.

### Incremental

1. Historia 5 (backoffice) en paralelo con la Historia 1, si hay dos frentes.
2. Historias 2 y 3: registro nuevo y convivencia con Google.
3. Historias 4 y 6: menores/altas del Admin y el mail.
4. Polish y las tres suites.

---

## Notes

- `[P]` = archivos distintos, sin dependencias pendientes.
- Cada tarea de checklist de pantalla (T027, T028, T039) cumple la definición de terminado de la
  Governance (D114): no se da por hecha citando el checklist, se revisa punto por punto.
- `test-login` no cambia: los e2e existentes siguen entrando con él.
