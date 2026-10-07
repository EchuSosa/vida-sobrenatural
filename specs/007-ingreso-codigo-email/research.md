# Research: Ingreso con código por email

Sin `NEEDS CLARIFICATION` en Technical Context. Las decisiones de negocio salieron del
`/speckit-clarify` (cinco preguntas, ver `spec.md`) y de dos decisiones de Echu tomadas durante el
plan: el proveedor de email se pospone (D140) y la Constitución se enmienda a v1.3.0 (D141). Este
documento registra las decisiones de **diseño técnico**, con la alternativa considerada y por qué
se descartó.

## 1. Quién genera y verifica el código: `apps/api`, no NextAuth

**Decisión**: El código lo genera, guarda y verifica `apps/api`, en un módulo nuevo
`codigo-ingreso`. Cada app de Next (web y backoffice) lo conecta a NextAuth con un proveedor
`Credentials` propio, `id: 'codigo-email'`, cuyo `authorize()` llama a la API para verificar el
código y, si es correcto, devuelve `{ email, emailVerificadoPorProveedor: true }`. Desde ahí el
flujo es **el mismo que con Google**: el callback `signIn` busca la Persona, aplica
`pendiente_tutor` y fail-closed (D88), y el callback `jwt` hidrata `personaId`, `estado` y `rol`.

**Rationale**:
- Las dos apps tienen que aceptar el mismo código con las mismas reglas (FR-001). Si la lógica
  viviera en cada app de Next, estaría escrita dos veces (Principio XI).
- La base de datos solo la toca `apps/api` (convención del repo). Los límites de intentos y de
  envíos necesitan una fuente de verdad compartida.
- Reusar `signIn`/`jwt` tal cual hace que FR-011, FR-014 y FR-015 salgan gratis: el código entra
  por la misma puerta que Google.

**Alternativas consideradas**:
- **Proveedor Email de NextAuth (Auth.js)**: descartado. Manda un **enlace mágico**, no un código
  para escribir (lo decidido es el código, porque la persona puede pedirlo en la compu y leerlo en
  el celular). Además exige un adaptador de base de datos para guardar los tokens de verificación,
  y el proyecto usa sesiones JWT sin adaptador; sumarlo solo para esto trae tablas de NextAuth
  (`Account`, `Session`, `VerificationToken`) que nadie más usa.
- **Endpoints públicos de la API llamados desde el navegador**: descartado. Los dos endpoints son
  internos (`InternalLookupGuard`, igual que `GET /personas/by-email`); solo los llaman los
  servidores de Next. Así la API no queda expuesta a Internet para esto, y el origen del pedido
  (para el límite por origen) lo informa un servidor de confianza.

## 2. Cómo se guarda el código

**Decisión**: Se guarda la **huella HMAC-SHA256** del código, con un secreto de servidor propio
(`CODIGO_INGRESO_SECRET`). La comparación es en tiempo constante (`crypto.timingSafeEqual`). El
código se genera con `crypto.randomInt(0, 1_000_000)` y se completa con ceros a la izquierda.

**Rationale**: Un código de 6 dígitos tiene un millón de valores. Con un SHA-256 simple, quien lea
la tabla lo recupera probando todos en menos de un segundo. Con HMAC y un secreto que no está en la
base, la tabla sola no alcanza (FR-020, Principio V enmendado).

**Alternativas consideradas**: bcrypt/argon2, descartados: están pensados para contraseñas de
larga vida y no cambian nada frente a un secreto de servidor para un valor que vence en 15
minutos; solo suman una dependencia nativa.

## 3. Límites de intentos y de envíos, sin infraestructura nueva

**Decisión**: Los límites se calculan con la misma tabla `CodigoIngreso`, sin Redis ni
`@nestjs/throttler`:
- **Por email** (5 por hora): se cuentan las filas de ese email creadas en la última hora.
- **Por origen** (30 por hora): se cuentan las filas con la misma huella de origen en la última
  hora. El origen es la IP del navegador, que el servidor de Next manda a la API en el header
  `X-Origen-Cliente`. Se guarda solo su huella HMAC, nunca la IP en claro (dato personal).
- **Por código** (5 intentos): un contador en la fila. El incremento es atómico
  (`UPDATE … SET intentosFallidos = intentosFallidos + 1 WHERE id = … AND intentosFallidos < 5`),
  para que dos intentos simultáneos no pasen el límite.

Pasado un límite de envíos, la API responde `429` con `DEMASIADOS_PEDIDOS` y `reintentarEn`
(segundos hasta que se libere el lugar más viejo de la ventana). La respuesta es la misma sea cual
sea el email (FR-008).

**Rationale**: Principio IV (simplicidad). El volumen es el de una iglesia: decenas de pedidos por
día. Una tabla con índice por `(email, creadoEn)` y `(origenHuella, creadoEn)` alcanza de sobra.

**Alternativas consideradas**: `@nestjs/throttler` en memoria, descartado: cuenta pedidos HTTP y no
emails, se pierde al reiniciar la API y no distingue un pedido fallido por el envío (que no debe
contar, ver punto 5).

## 4. Qué pasa con las filas viejas

**Decisión**: Cada pedido nuevo borra las filas con más de 24 horas (`DELETE … WHERE creadoEn <
now() - 24h`). Es un borrado físico: `CodigoIngreso` es un dato técnico efímero, no un recurso del
dominio (ver la justificación del Principio III en `plan.md`). No hace falta una tarea programada.

**Alternativas consideradas**: una tarea programada (cron), descartada: el hosting todavía no está
definido (D75), y el borrado en el mismo pedido mantiene la tabla chica igual.

## 5. Orden de las operaciones al pedir un código

**Decisión**:
1. Normalizar el email (minúsculas, sin espacios al principio y al final).
2. Revisar los dos límites de envíos. Si se pasó alguno, responder `429`.
3. Generar el código y, en una transacción, marcar como `reemplazado` el código vigente de ese
   email y crear la fila nueva.
4. Enviar el mail. Si el envío falla, **borrar la fila nueva** (no cuenta contra el límite, ver
   los casos borde de la spec) y responder `503 ENVIO_EMAIL_FALLIDO`. El código anterior queda
   reemplazado igual: la persona pide otro.
5. Responder `202` sin cuerpo, igual para cualquier email.

La API **no consulta si el email pertenece a una Persona** en este paso: no lo necesita. Eso hace
que la respuesta y el tiempo de respuesta sean idénticos para cualquier email (FR-008, SC-004).

## 6. Envío de email: SMTP con un solo adaptador (D140)

**Decisión**: `EmailService` (clase abstracta de NestJS usada como token de inyección, mismo patrón
que `StorageService` en `apps/api/src/storage/`), con un único adaptador `SmtpEmailService` basado
en **nodemailer**. Configuración por variables de entorno: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`,
`SMTP_PASS`, `SMTP_SEGURO`, `EMAIL_REMITENTE`. En local y en los e2e apunta a **Mailpit**
(`localhost:1025`, interfaz en `localhost:8025`), que se suma al `docker-compose.yml`. En los tests
unitarios y de integración de la API se reemplaza por un `EmailServiceFalso` que guarda los
mensajes en memoria (FR-021: los tests nunca envían mails reales).

**Rationale**: D140. Todos los candidatos (Resend, Brevo, SES) aceptan SMTP; cambiar de proveedor
es cambiar variables de entorno.

## 7. Plantillas del mail: funciones de TypeScript, sin React Email

**Decisión**: La plantilla es una función pura
`plantillaCodigoIngreso({ codigo, minutos, idioma }) → { asunto, html, texto }` en
`apps/api/src/email/plantillas/`. Los textos salen de un catálogo de mensajes
`apps/api/src/email/mensajes/es.json` (Principio IX, D84), con las claves del texto aprobado en el
clarify. El HTML es una tabla simple con estilos en línea (lo que aceptan todos los clientes de
correo), el código en letra grande y monoespaciada, y los colores del tema claro medidos en
`docs/17-paleta-y-tokens.md`, escritos como valores porque un mail no puede leer variables CSS.

**Rationale**: `docs/10` y `docs/16` nombraban React Email como **ejemplo**. Sumar React y un
renderizador a `apps/api` (NestJS) para un solo mail de cuatro líneas es un artefacto prematuro
(Principio IV). Si los avisos importantes de D96 necesitan plantillas más ricas, esa spec puede
cambiar la implementación detrás de la misma función.

**Nota sobre tokens (D118)**: la regla de "todos los colores salen de tokens" se cumple tomando
los valores de los tokens del tema claro y dejándolos en un único objeto `COLORES_EMAIL` con un
comentario que nombra el token de origen. No se escribe ningún color suelto en la plantilla.

## 8. Normalización del email en toda la app

**Decisión**: `normalizarEmail(email) = email.trim().toLowerCase()` en
`packages/shared-types`, usada por la API al crear una Persona, al buscarla por email
(`GET /personas/by-email`) y al pedir o verificar un código; y por las dos apps de Next antes de
llamar a la API. Una migración pasa a minúsculas los emails ya guardados en `Persona`. Antes de
migrar, un chequeo busca emails que choquen al pasarlos a minúsculas; si hay alguno, la migración
**falla** con la lista, para que Echu decida cuál queda (no se fusionan Personas en silencio).

**Rationale**: FR-010 y FR-011. Hoy `findByEmail` compara exacto (`findUnique({ where: { email }
})`): una Persona cargada por el Admin como `Ana@Hotmail.com` no se encontraría pidiendo el código
con `ana@hotmail.com`, y el sistema arrancaría un registro nuevo que después chocaría con la
unicidad.

**Alternativas consideradas**: índice sin distinguir mayúsculas (`citext` o `lower(email)` único),
descartado: obliga a tocar todas las consultas por email con una función, y guardar el valor ya
normalizado es más simple de leer y de testear.

## 9. Errores de la verificación y cómo llegan a la pantalla

**Decisión**: La verificación responde con un código de error del catálogo compartido
(`packages/shared-types/src/error-code.ts`, Principio X):

| Situación | HTTP | `ErrorCode` | Campo |
|---|---|---|---|
| Código incorrecto, quedan intentos | 422 | `CODIGO_INCORRECTO` | `codigo` |
| Código incorrecto, era el último intento | 422 | `CODIGO_SIN_INTENTOS` | `codigo` |
| Sin código vigente (vencido, usado, reemplazado o nunca pedido) | 422 | `CODIGO_VENCIDO` | `codigo` |
| Límite de envíos | 429 | `DEMASIADOS_PEDIDOS` | `email` |
| El envío del mail falló | 503 | `ENVIO_EMAIL_FALLIDO` | — |

"Nunca pedido" y "vencido" comparten código a propósito: distinguirlos no le sirve a la persona
(en los dos casos tiene que pedir uno nuevo) y no agrega nada que filtrar.

En Next, `authorize()` convierte cada código en una subclase de `CredentialsSignin` de Auth.js con
`code` igual al `ErrorCode`, y la acción de servidor lo devuelve al formulario, que lo muestra con
`MensajeErrorCampo` y `ResumenErrores` de `packages/ui` (H-50). Si la API **no responde** (red,
5xx distinto de 503 de envío), `authorize()` lanza un error común y NextAuth manda a la pantalla de
error de verificación: fail-closed (D88, FR-015).

## 10. Duración de la sesión

**Decisión**: `session: { strategy: 'jwt', maxAge: 30 días, updateAge: 1 día }` en `apps/web` y
`maxAge: 7 días, updateAge: 1 día` en `apps/backoffice`. Los valores viven en
`packages/shared-types` (`DURACION_SESION_WEB_S`, `DURACION_SESION_BACKOFFICE_S`) para que el
test que los verifica y la configuración lean lo mismo.

**Rationale**: FR-016. `updateAge` de un día hace que el vencimiento se corra mientras la persona
use la app, sin reescribir la cookie en cada pedido. El token de API (`mintApiToken`, 1 hora) no
cambia.

## 11. La pantalla de ingreso: una pieza compartida

**Decisión**: El formulario de dos pasos (email → código) es un componente de presentación de
`packages/ui`, `FormularioIngresoCodigo`, que recibe por props las dos acciones de servidor y los
textos ya traducidos. Cada app monta su propia página y sus acciones (`pedirCodigo`,
`verificarCodigo`), porque las acciones dependen del `signIn` de cada app. El botón "Entrar con
Google" también pasa a `packages/ui` (`BotonIngresarGoogle`, hoy solo en el backoffice), con la
variante de contorno decidida en el clarify.

- **Web app**: `/ingresar` deja de ser solo una redirección. Sin sesión, muestra la pantalla de
  ingreso (Google arriba, "o", email). Con sesión, sigue redirigiendo según el estado (H-85). El
  paso del código es `/ingresar/codigo` (el email viaja en una cookie de corta vida, no en la URL,
  para que no quede en el historial ni en los logs). El botón "Ingresar" del menú público apunta a
  `/ingresar`. `pages.signIn` de NextAuth pasa a `/ingresar`. `/registro` sin sesión redirige a
  `/ingresar`.
- **Backoffice**: `PantallaSinSesion` suma el formulario debajo del botón de Google, con el mismo
  orden. El paso del código se resuelve en la misma pantalla (sin ruta nueva): el backoffice no
  tiene rutas públicas.

**Rationale**: Principio XI y FR-001 (mismo orden en las dos apps). Lo que difiere a propósito
entre las dos apps (a dónde se va después, qué pasa sin Persona) queda en cada app, igual que hoy
en `auth.ts` (H-41).

## 12. Cómo se prueba de punta a punta sin mails reales

**Decisión**: Los e2e de Playwright piden el código por la pantalla real y lo leen de **Mailpit**
por su API HTTP (`GET http://localhost:8025/api/v1/search?query=to:<email>`, y el mensaje con
`GET /api/v1/message/{id}`), con un helper `leerCodigoDeMailpit(email)` en cada carpeta `e2e/`
(o compartido, si ya existe un paquete de helpers de e2e). El `global-setup` de los e2e vacía
Mailpit (`DELETE /api/v1/messages`). El proveedor `test-login` existente **no cambia**: los demás
e2e siguen entrando con él.

**Rationale**: `docs/10-stack-tecnico.md` (Testing) ya prevé inspeccionar los mails con Mailpit en
los e2e locales. Leer el mail real prueba también la plantilla (Historia 6).

## 13. Personas que hoy no tienen email

**Hallazgo**: `Persona.email` es `String @unique` **obligatorio** en `schema.prisma`, aunque
`docs/04-dominio-entidades.md` y D97 dicen que el email es opcional en el alta del Admin. El alta
de adultos por el Admin sin email (Flujo 12) todavía no está construida. Esta spec **no** cambia
eso: una Persona sin email no puede pedir código, y el día que el alta sin email exista, esta spec
no necesita cambios (solo busca por email). Queda anotado para la spec que construya el Flujo 12.
