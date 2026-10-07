# Feature Specification: Notificaciones — Avisos in-app y email

**Feature Branch**: `012-notificaciones`

**Created**: 2026-10-07

**Status**: Draft

**Input**: User description: "012 — Notificaciones: Avisos in-app y email. Todo lo que dicen `docs/02` (Notificaciones), `docs/04`, `docs/07` (Flujo 10) y `docs/16`, con D149: en esta tanda, Avisos in-app + email para lo importante (D96); push al celular queda para la tanda siguiente. D48: manuales del Admin a todos, a un Grupo o a un Ministerio, con opción 'importante'. D49: disparadores automáticos (contenido liberado, Solicitud/Postulación/Inscripción resuelta, evento próximo con proceso programado). D59/D100: cada Aviso lleva a su entidad. Incluye: pantalla Avisos de la web app (hoy vacía, leídos/no leídos), envío manual desde el backoffice, un mecanismo único para que cada spec emita sus eventos (la 004 ya tiene `apps/api/src/discipulado/eventos.ts` que hoy solo loguea: generalizalo), y el email importante. Dependencias: el `EmailService` (SMTP, Mailpit en local) lo construye la spec 007: usalo, no lo dupliques. Definí el catálogo de eventos de las specs 004 (ya construida), 008 (Vida de Servicio), 009 (Ministerios), 010 (Bautismo) y 011 (Eventos), que se están especificando en paralelo."

**Fuentes**: `docs/02-alcance-mvp.md` (Notificaciones), `docs/04-dominio-entidades.md`
(Notificación, Entrega de Notificación), `docs/07-flujos-casos-de-uso.md` (Flujo 10, y los pasos de
los Flujos 3 a 8 y 12 que disparan avisos), `docs/14-navegacion.md` (pestaña Avisos, ítem
Notificaciones del backoffice), `docs/15-guia-ux-ui.md`, `docs/16-sistemas-transversales.md` §1, y
las decisiones D47–D49, D59, D72, D84, D96, D100, D142, D145, D147–D150.

**Qué queda afuera de esta spec (D149)**: notificaciones **push** y todo lo que necesitan (PWA
instalable, service worker, Suscripción a Notificación, pedido de permiso en contexto,
instrucciones para iPhone). El modelo deja lugar para el canal `push` sin construirlo. También
quedan afuera las preferencias de canal por Persona (Fase 2, `docs/08`) y la traducción del texto
de los avisos manuales (Fase 2, D84).

## Glosario de interfaz

| Concepto del modelo | Qué ve la persona |
|---|---|
| Notificación / Entrega canal `app` | **Aviso** ("Avisos", "Tenés 3 avisos sin leer") |
| Notificación manual | En el backoffice: **aviso** ("Enviar un aviso"); en la web app, igual que cualquier aviso |
| `prioridad = importante` | Backoffice: "**Importante — también se manda por mail**". Web app: no se distingue con otra palabra; el aviso dice lo mismo |
| `alcance = todos / grupo / ministerio` | "**A quién le llega**: A todas las personas / A un grupo / A un ministerio" |
| `leida_en = null` | "**Sin leer**" (texto + ícono, nunca solo color — D81) |

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ver mis avisos y llegar a lo que cambió (Priority: P1)

Una Persona entra a la pestaña **Avisos** de la web app y ve, del más nuevo al más viejo, todo lo
que se le avisó: qué pasó, cuándo, y cuáles todavía no leyó. Tocar un aviso lo marca como leído y la
lleva a la pantalla de lo que cambió (su solicitud en Mi camino, su inscripción en Mis eventos, un
aviso de la iglesia completo). La pestaña muestra cuántos avisos sin leer tiene, sin depender solo
del color.

**Why this priority**: es la mitad del problema que la app vino a resolver ("enterarse de
novedades sin depender de WhatsApp", D47) y el único canal que llega a **todas** las Personas con
acceso a la app. Hoy la pantalla existe y está vacía.

**Independent Test**: sembrar avisos (leídos y sin leer, automáticos y uno manual) para una
Persona fixture, entrar a `/avisos`, ver el orden, el contador, tocar uno y verificar que queda
leído y que se llegó a su destino.

**Acceptance Scenarios**:

1. **Given** una Persona con 3 avisos sin leer y 2 leídos, **When** abre la app, **Then** la
   pestaña Avisos muestra "3" con un texto accesible "3 avisos sin leer", y la pantalla lista los 5
   del más nuevo al más viejo, con los sin leer marcados con texto "Sin leer" + ícono.
2. **Given** un aviso sin leer de "tu pedido de Vida Nueva tiene novedades", **When** la Persona lo
   toca, **Then** el aviso queda leído, el contador baja en uno y la app la lleva a Mi camino.
3. **Given** un aviso manual de la iglesia, **When** la Persona lo toca, **Then** ve el aviso
   completo (título, mensaje entero, fecha) en su propia pantalla, y queda leído.
4. **Given** una Persona con avisos sin leer, **When** toca "Marcar todos como leídos", **Then**
   todos quedan leídos, el contador desaparece y un mensaje breve lo confirma.
5. **Given** una Persona sin ningún aviso, **When** entra a Avisos, **Then** ve un estado vacío
   amable que explica qué va a aparecer ahí y la invita a Mi camino.
6. **Given** una Persona con más de 20 avisos, **When** entra a Avisos, **Then** ve los 20 más
   nuevos y un paginado en palabras ("Página 1 de 3", Anterior/Siguiente) que vive en la URL.
7. **Given** que la API no responde, **When** la Persona entra a Avisos, **Then** ve un mensaje
   en lenguaje simple con "Reintentar" y el código de referencia; la pestaña no muestra un número
   inventado.
8. **Given** el aviso de otra Persona, **When** alguien intenta marcarlo como leído o abrirlo por
   URL, **Then** la API lo rechaza como inexistente.

---

### User Story 2 - Que el sistema avise solo cuando algo cambia en mi camino (Priority: P1)

Cuando el Admin resuelve algo de una Persona (acepta o rechaza su pedido de Vida Nueva, le asigna
Discipulador, confirma que terminó, activa su cuenta), la Persona recibe un aviso sin que nadie lo
escriba a mano. Todas las specs emiten sus avisos de la **misma forma**: un evento con nombre,
destinatario e ids, que un único mecanismo convierte en el aviso correcto, con su prioridad y su
destino. La 004, que hoy solo escribe los eventos en el log, pasa a producir avisos reales.

**Why this priority**: sin esto la pantalla de la Historia 1 solo tendría avisos manuales, y el
caso más importante de D49 (`solicitud_actualizada`) seguiría sin llegar. Además, es el contrato que
008, 009, 010 y 011 necesitan para no inventar cada una su propio envío (Principio XI).

**Independent Test**: con la 004 ya construida, aceptar una propuesta de discipulado y rechazar
otra Solicitud; verificar que cada Persona tiene su aviso, con el texto y el destino del catálogo, y
que deshacer la operación (falla en medio de la transacción) no deja aviso.

**Acceptance Scenarios**:

1. **Given** una Persona con una Solicitud de Discipulado en propuesta, **When** el Discipulador
   acepta la propuesta, **Then** la Persona tiene un aviso "Ya tenés Discipulador" que la lleva a Mi
   camino, y es **importante** (también va por mail, Historia 3).
2. **Given** una Solicitud de Discipulado pendiente, **When** el Admin la rechaza, **Then** la
   Persona tiene un aviso importante que la lleva a Mi camino, sin el motivo del rechazo en el texto
   del aviso.
3. **Given** un Discipulador, **When** el Admin le propone un discipulado nuevo, **Then** el
   Discipulador tiene un aviso "Tenés un discipulado para aceptar" que lo lleva a su pantalla de
   discipulados.
4. **Given** una operación de la 004 que falla después de emitir su evento y se deshace, **When**
   termina, **Then** no existe ningún aviso de esa operación.
5. **Given** el mismo evento emitido dos veces con la misma clave (ej. un recordatorio programado
   que corre dos veces), **When** se procesa, **Then** existe un solo aviso por destinatario.
6. **Given** un evento cuyo destinatario es "el Admin" (ej. una propuesta declinada), **When** se
   emite, **Then** no se crea ningún aviso: sigue apareciendo en la tarjeta de Pendientes del
   backoffice, como hoy.
7. **Given** un menor en Pendientes de tutor, **When** el Admin lo activa, **Then** la Persona
   tiene un aviso importante de bienvenida que la lleva a Mi camino.

---

### User Story 3 - Recibir por mail lo importante, aunque no use la app (Priority: P1)

Cuando un aviso es **importante**, además de quedar en Avisos se manda por mail a toda Persona
destinataria que tenga email cargado — también a quien nunca entró a la app (alta por el Admin,
D97/D145). El asunto nunca dice nada sensible; el cuerpo explica la novedad en el tono de la app y
tiene un único botón que lleva a la pantalla correspondiente. Si el mail no sale, se reintenta solo;
si no sale nunca, queda registrado.

**Why this priority**: D96. En el celular, sin push (D149), el mail es lo único que avisa a quien no
abre la app; y para las Personas cargadas por el Admin es el único canal.

**Independent Test**: resolver una Solicitud de una Persona con email y otra sin email; ver en
Mailpit un solo mail para la primera, con asunto genérico, versión de texto y botón; simular una
falla del servidor de correo y ver los reintentos y el estado final.

**Acceptance Scenarios**:

1. **Given** un aviso importante para una Persona con email, **When** se crea, **Then** en menos de
   2 minutos llega un mail con asunto genérico ("Hay novedades sobre tu pedido"), el detalle en el
   cuerpo, un botón "Ver en la app" que lleva al mismo destino que el aviso, y versión en texto
   plano equivalente.
2. **Given** un aviso **normal** (ej. contenido liberado), **When** se crea, **Then** no se manda
   ningún mail.
3. **Given** una Persona sin email cargado, **When** recibe un aviso importante, **Then** no se
   intenta ningún mail y el aviso igual queda en Avisos.
4. **Given** que el servidor de correo rechaza el envío, **When** se reintenta, **Then** se hacen
   hasta 5 intentos con espera creciente; si el último falla, la entrega queda "no se pudo enviar"
   con el tipo de error (sin el email ni el cuerpo en los logs).
5. **Given** que el mail se envía, **When** la acción que lo originó responde, **Then** la
   respuesta no esperó al envío: la acción del Admin o de la Persona termina igual de rápido con o
   sin mail.
6. **Given** que la Persona cambió su email entre que se creó el aviso y que salió el mail,
   **When** se envía, **Then** va al email vigente.

---

### User Story 4 - Mandar un aviso de la iglesia desde el backoffice (Priority: P2)

El Admin, desde **Notificaciones** en el backoffice, escribe un aviso (título y mensaje), elige a
quién le llega —todas las personas, un Grupo o un Ministerio— y si es importante (también por
mail). Antes de enviarlo ve cuántas personas lo van a recibir y cuántas por mail, y confirma.
Después ve el historial de avisos enviados con cuántas personas lo leyeron y cuántos mails no
salieron. El Pastor ve lo mismo sin poder enviar (D64, D142).

**Why this priority**: D48. Es el reemplazo directo del grupo de WhatsApp para comunicar algo a toda
la iglesia o a un grupo, pero depende de que exista la Historia 1 para que alguien lo lea.

**Independent Test**: como Admin, mandar un aviso importante a un Grupo con 3 inscriptos (2 con
email); verificar el conteo previo, que los 3 lo ven en Avisos, que salen 2 mails y que el
historial muestra 3 destinatarios.

**Acceptance Scenarios**:

1. **Given** el Admin en Notificaciones, **When** toca "Enviar un aviso", completa título, mensaje,
   "A quién le llega: A un grupo" y elige el Grupo, **Then** ve "Le va a llegar a 3 personas" antes
   de confirmar.
2. **Given** que marca "Importante — también se manda por mail", **When** lo marca, **Then** ve una
   advertencia de usarlo con moderación y el conteo suma "2 lo reciben también por mail".
3. **Given** el formulario con título vacío o un mensaje de más de 1000 caracteres, **When**
   intenta enviar, **Then** ve el error debajo de cada campo y el resumen arriba, que dice cómo
   corregirlo (H-50).
4. **Given** el formulario completo, **When** confirma en el diálogo "¿Mandar este aviso a 3
   personas?", **Then** el botón queda bloqueado con "Enviando…", y al terminar el aviso aparece
   primero en el historial con un mensaje breve de confirmación; tocar dos veces no lo manda dos
   veces.
5. **Given** un Grupo o Ministerio sin ninguna persona activa, **When** lo elige, **Then** ve "Este
   grupo no tiene personas para avisar" y no puede enviar.
6. **Given** el historial, **When** abre un aviso enviado, **Then** ve el texto, quién lo mandó,
   cuándo, a quién le llegó, cuántas personas lo leyeron y, si fue importante, cuántos mails salieron,
   cuántos están por salir y cuántos no se pudieron enviar — con los nombres de esas personas, para
   avisarles por otro medio.
7. **Given** una Pastora, **When** entra a Notificaciones, **Then** ve el historial y los detalles
   pero no ve "Enviar un aviso", y la API le rechaza el envío.
8. **Given** un Discipulador o Líder de curso, **When** intenta enviar un aviso por la API,
   **Then** se rechaza (sin permiso).

---

### User Story 5 - Recordatorios de Eventos (Priority: P2)

El día anterior a un Evento, quienes tienen una Inscripción confirmada reciben un aviso de
recordatorio (`evento_proximo`). Si el Admin configuró en el Evento "recordar a los que no se
anotaron N días antes", ese día reciben un aviso todas las Personas que todavía no se anotaron
(`recordatorio_inscripcion`). Los dos los dispara un proceso programado, nunca dos veces para el
mismo Evento.

**Why this priority**: D49 lo nombra, pero depende de la entidad Evento, que construye la spec 011.
Se puede entregar después de las Historias 1 a 4 sin bloquearlas.

**Independent Test**: con la 011 construida, crear un Evento para mañana con 2 inscriptos
confirmados y 1 pendiente, correr el proceso programado dos veces, y verificar un solo aviso para
cada confirmado y ninguno para la pendiente.

**Acceptance Scenarios**:

1. **Given** un Evento mañana con inscriptos confirmados, **When** corre el proceso del día,
   **Then** cada confirmado tiene un aviso normal "Mañana es {evento}" que lo lleva a la página del
   Evento en Mis eventos; ni los pendientes, ni los de lista de espera, ni los cancelados lo reciben.
2. **Given** un Evento con "recordar 3 días antes", **When** faltan 3 días, **Then** las Personas
   activas que no tienen una Inscripción vigente reciben un aviso normal que lleva a la página
   pública del Evento; quienes ya están anotados no.
3. **Given** que el proceso corre dos veces el mismo día (o se reinicia la API), **When** termina,
   **Then** no hay avisos duplicados.
4. **Given** un Evento sin `requiere_inscripcion` o sin días de anticipación configurados, **When**
   corre el proceso, **Then** no hay recordatorio de inscripción.
5. **Given** un Evento cancelado/eliminado o con cupo completo sin lista de espera, **When** corre
   el proceso, **Then** no hay recordatorio de inscripción.

---

### User Story 6 - Catálogo de avisos de Vida de Servicio, Ministerios, Bautismo y Eventos (Priority: P3)

Las specs 008, 009, 010 y 011 emiten sus eventos con el mismo mecanismo de la Historia 2, contra un
catálogo que define esta spec: qué eventos hay, a quién le llegan, si son importantes, qué dicen y a
dónde llevan. Cuando cada spec construye su transición, el aviso sale solo.

**Why this priority**: el catálogo se escribe ahora (para que las cuatro specs en paralelo no
inventen el suyo), pero cada aviso se puede probar recién cuando existe la transición que lo emite.

**Independent Test**: por cada evento del catálogo, un test que emite el evento con ids de fixture
y verifica destinatarios, prioridad, texto y destino; y por cada spec ya mergeada, un test de que su
transición lo emite.

**Acceptance Scenarios**:

1. **Given** una Postulación a Ministerio pendiente, **When** el Admin la aprueba o la rechaza,
   **Then** la Persona tiene un aviso importante que la lleva a Mi camino (009).
2. **Given** un Pago `pendiente_verificacion`, **When** el Admin lo verifica o lo rechaza, **Then**
   la Persona tiene un aviso importante que la lleva a su inscripción en Mis eventos (011, D148).
3. **Given** un Evento con lista de espera, **When** se libera un lugar y la primera de la lista
   pasa a confirmada o pendiente, **Then** recibe un aviso importante "Conseguiste lugar en
   {evento}" (011, Flujo 8 paso 9).
4. **Given** contenido de una semana de Vida de Servicio que se vuelve visible (fecha alcanzada y
   contenido cargado), **When** se libera, **Then** cada inscripto activo del Grupo tiene un aviso
   normal, una sola vez por semana liberada (008).
5. **Given** una Solicitud de Bautismo aceptada, **When** el Admin suma a la Persona a un Evento de
   bautismo, **Then** recibe un aviso importante con la fecha que la lleva a ese Evento (010, D147).
6. **Given** un evento emitido con un nombre que no está en el catálogo, **When** se compila,
   **Then** no compila (el catálogo es un tipo cerrado), y hay un test que verifica que cada
   nombre del catálogo tiene texto en `es` y destino.

---

### Edge Cases

- **Aviso cuyo destino ya no existe o ya no es accesible** (Grupo finalizado, Evento eliminado,
  Persona dada de baja del Grupo): tocarlo lo marca como leído y lleva igual a la pantalla de
  destino, que resuelve su propio estado vacío o "no encontrado"; el aviso no se borra ni se oculta.
- **Persona `pendiente_tutor` o inactiva (`activo = false`)**: no es destinataria de ningún aviso
  ni mail. Si se activa después, no recibe los avisos de antes.
- **Persona sin email y sin acceso a la app**: recibe el aviso en Avisos igual (queda en su
  historial si más adelante entra, D145) y ningún mail.
- **Admin destinatario de su propio aviso manual**: si es "A todas las personas", también le llega a
  él/ella, como a cualquier Persona activa.
- **Alcance resuelto en el momento del envío**: quien entra a un Grupo después de un aviso no lo
  recibe; quien sale del Grupo después lo conserva.
- **Una Persona en el Grupo y con email repetido en dos Personas** (D145 permite duplicados
  posibles): cada Persona es un destinatario distinto; el mail se manda por Persona.
- **Volumen**: un aviso a todas las personas (cientos) se reparte dentro de la misma acción sin
  dejar al Admin esperando más de unos segundos; los mails salen después, en tanda.
- **Tope diario del proveedor de mail**: los mails que el proveedor rechaza por límite se
  reintentan con espera creciente (hasta ~1 día); los que no salen quedan "no se pudo enviar" y el
  Admin los ve en Notificaciones.
- **Evento emitido dentro de una transacción que se deshace**: no queda aviso ni mail.
- **El mismo hecho emitido dos veces** (doble clic, reintento, proceso programado que corre de
  nuevo): un solo aviso por destinatario, por la clave de idempotencia.
- **Más de 99 sin leer**: la pestaña muestra "99+" y el texto accesible dice el número real.
- **Dos pestañas abiertas marcando el mismo aviso**: marcar leído es idempotente; no se pisa la
  primera fecha de lectura.
- **Mensaje manual con saltos de línea o un enlace escrito**: se muestra como texto plano con los
  saltos de línea respetados; el enlace se ve como texto (no se vuelve clickeable) para que un aviso
  no sea una vía de phishing.
- **Datos sensibles**: ningún asunto de mail ni texto corto de aviso automático nombra el tipo de
  pedido sensible, un motivo de rechazo o a otra Persona; el detalle está en la pantalla de destino
  (D96, `docs/13` §5).
- **Idioma**: el texto de los avisos automáticos y los mails se arma en el `idioma_preferido` del
  destinatario; como hoy solo existe `es`, cualquier otro cae a `es` (D84).

## Requirements *(mandatory)*

### Functional Requirements

**Avisos de la Persona (web app)**

- **FR-001**: La pestaña Avisos (`/avisos`) MUST listar los avisos de la Persona con sesión, del
  más nuevo al más viejo, paginados de a 20 por la API, con la página en la URL según el patrón de
  `docs/15` (§Listados paginados).
- **FR-002**: Cada aviso MUST mostrar un título corto, una línea de detalle, la fecha relativa
  ("hace 2 horas", con la fecha completa accesible) y, si no fue leído, la marca "Sin leer" con
  texto + ícono (D81). Los textos de los avisos automáticos salen del catálogo de mensajes, en el
  idioma de la Persona (D84); los manuales muestran el título y el mensaje que escribió el Admin.
- **FR-003**: Tocar un aviso MUST marcarlo como leído (si no lo estaba) y llevar a su destino: la
  pantalla de la entidad relacionada para los automáticos (D59, D100), o la pantalla del aviso
  completo (`/avisos/{id}`) para los manuales.
- **FR-004**: La Persona MUST poder marcar todos sus avisos como leídos con una sola acción, con
  confirmación breve y sin diálogo (es reversible en la práctica y no destruye nada, D151).
- **FR-005**: La pestaña Avisos de la barra de navegación MUST mostrar la cantidad de avisos sin
  leer (con "99+" por encima de 99), con un texto accesible que diga el número real y no solo un
  punto de color; se actualiza en cada navegación (sin tiempo real).
- **FR-006**: La pantalla Avisos MUST tener los cuatro estados (cargando con esqueleto, vacío con
  explicación y enlace a Mi camino, error con "Reintentar" y código de referencia, y éxito), y su
  texto, incluido el título que hoy está escrito fijo en el código, MUST salir de `next-intl`.
- **FR-007**: La API MUST autorizar por registro: una Persona solo lista, abre y marca como leídos
  sus propios avisos; el aviso de otra Persona responde como inexistente (Principio V).
- **FR-008**: Marcar como leído MUST ser idempotente y conservar la primera fecha de lectura.
- **FR-009**: Las pantallas Avisos y Aviso completo MUST diseñarse primero a 360 px, con letra de
  16 px en títulos, detalle y botones (14 px solo para la fecha) y objetivos táctiles de al menos
  44 px (D150).

**Mecanismo único de emisión (API)**

- **FR-010**: MUST existir un único punto de entrada para que cualquier módulo de la API emita un
  evento de aviso: nombre del evento (de un catálogo cerrado y tipado en código compartido),
  destinatario e ids. Ningún módulo crea Notificaciones ni Entregas por su cuenta (Principio XI).
- **FR-011**: La emisión MUST hacerse **dentro de la misma transacción** que el cambio de dominio
  que la origina: si el cambio se confirma, el aviso existe; si se deshace, no. El envío de mails
  ocurre después y fuera de esa transacción (D100: no bloquea la acción del usuario).
- **FR-012**: Cada entrada del catálogo MUST definir: el disparador de `docs/04` al que pertenece,
  a quién llega (alcance derivado: Persona, inscriptos activos de un Grupo, confirmados de un
  Evento, todas las Personas), la prioridad (`normal` / `importante`), la entidad relacionada y el
  destino en la web app, la clave de idempotencia, y las claves de texto (título, detalle, asunto
  y cuerpo del mail si es importante).
- **FR-013**: Los eventos MUST llevar solo ids en sus datos: ningún nombre, teléfono, email ni
  motivo viaja en el evento ni se guarda en la Notificación automática; el texto se arma al mostrarlo
  o al mandar el mail, en el idioma del destinatario (D84, Principio X).
- **FR-014**: Un evento emitido con una clave de idempotencia que ya existe MUST NOT crear una
  segunda Notificación.
- **FR-015**: Los eventos cuyo destinatario es "el Admin" MUST NOT generar avisos en esta tanda: lo
  que espera una acción del Admin ya está en la tarjeta de Pendientes del backoffice (spec 004).
- **FR-016**: Solo son destinatarias las Personas con `estado = activa` y `activo = true` al momento
  de la emisión; el alcance se resuelve en ese momento.
- **FR-017**: Toda Persona destinataria MUST recibir una Entrega por el canal `app` (aunque hoy no
  tenga acceso a la app), y además una por el canal `email` si la Notificación es importante y la
  Persona tiene email cargado. El canal `push` existe en el modelo y no se usa (D149).
- **FR-018**: La 004 MUST pasar a emitir por este mecanismo: la función que hoy loguea
  (`apps/api/src/discipulado/eventos.ts`) se reemplaza por el punto de entrada único, y sus diez
  eventos se mapean al catálogo (contracts/catalogo-eventos.md). El log estructurado sin datos
  personales se conserva.
- **FR-019**: Activar una Persona desde Pendientes de tutor (Flujo 7, ya construido) MUST emitir el
  aviso importante de cuenta activada (`docs/16`: "activación de una cuenta creada por el Admin").

**Email de los importantes**

- **FR-020**: Los mails MUST mandarse con el `EmailService` de la spec 007 (adaptador SMTP, Mailpit
  en local), sin un segundo servicio de mail.
- **FR-021**: Cada mail MUST tener: asunto genérico sin datos sensibles; cuerpo en el tono de la app
  con la novedad; un único botón "Ver en la app" al destino del aviso (URL absoluta a la web app);
  versión de texto plano equivalente; el logo; un pie que explica por qué le llega ("Te escribimos
  porque es un aviso importante sobre tu camino en la iglesia"). Para los avisos manuales, el asunto
  es el título que escribió el Admin.
- **FR-022**: Los mails MUST salir en segundo plano: se procesan las Entregas `pendiente` del canal
  email; ante una falla se reintenta hasta 5 intentos en total con espera creciente (alrededor de 1
  minuto, 10 minutos, 1 hora y 6 horas entre intentos); después del último queda `fallida` con el
  tipo de error.
- **FR-023**: Dos procesos que corren a la vez MUST NOT mandar el mismo mail dos veces.
- **FR-024**: Ni los logs ni Sentry MUST contener el email del destinatario, el asunto ni el cuerpo;
  solo ids y el tipo de error (Principio X, D101).
- **FR-025**: El mail se manda al email vigente de la Persona al momento del envío; si en ese
  momento la Persona ya no tiene email o no está activa, la Entrega queda `fallida` con ese motivo.

**Avisos manuales (backoffice)**

- **FR-026**: El ítem Notificaciones del backoffice MUST listar los avisos manuales enviados (más
  nuevos primero, paginados con `TablaDatos` y `Paginacion`): título, a quién le llegó, si fue
  importante, quién lo mandó, cuándo, y cuántas personas lo leyeron sobre el total.
- **FR-027**: El Admin MUST poder crear un aviso con título (obligatorio, hasta 80 caracteres),
  mensaje (obligatorio, hasta 1000 caracteres, texto plano), a quién le llega (`todos`, un Grupo en
  curso, o un Ministerio activo) e importante (sí/no, por defecto no).
- **FR-028**: Antes de confirmar, el formulario MUST mostrar cuántas personas lo van a recibir y,
  si es importante, cuántas también por mail; al marcar importante, MUST advertir que se use con
  moderación (`docs/16`).
- **FR-029**: Enviar MUST pedir una confirmación que repite el alcance y la cantidad, bloquear el
  botón con indicador de carga y proteger el envío de la reentrada (H-57); un alcance sin personas
  MUST rechazarse con un error propio.
- **FR-030**: El detalle de un aviso manual MUST mostrar el texto completo, autor, fecha, alcance,
  leídos sobre total y, si fue importante, mails enviados / por salir / no enviados, con los nombres
  de quienes no recibieron el mail.
- **FR-031**: La pantalla Notificaciones MUST mostrar además, en una sección propia, los mails de
  avisos **automáticos** que no se pudieron enviar en los últimos 30 días (Persona, qué aviso, cuándo),
  para que el Admin la contacte por otro medio.
- **FR-032**: Permisos (catálogo D132): `notificaciones.ver` (Admin y Pastor) para el listado y los
  detalles; `notificaciones.enviar` (solo Admin) para crear. La pantalla de la Pastora no muestra la
  acción de enviar y la API la rechaza igual.
- **FR-033**: Un aviso manual enviado MUST NOT poder editarse ni retirarse en esta tanda (el texto
  ya llegó a la gente y salió por mail).
- **FR-034**: Los errores de validación del formulario MUST mostrarse por campo con la pieza
  compartida de `packages/ui` (mensaje debajo del campo, resumen arriba con enlaces, foco al resumen,
  cómo corregir — H-50).

**Recordatorios programados**

- **FR-035**: Un proceso programado MUST correr una vez por día (a la mañana, hora de Argentina) y
  emitir `evento_proximo` para cada Evento que ocurre al día siguiente, a quienes tienen una
  Inscripción a Evento `confirmada`.
- **FR-036**: El mismo proceso MUST emitir `recordatorio_inscripcion` para cada Evento con
  `requiere_inscripcion`, con `dias_anticipacion_recordatorio` configurado, al que le faltan
  exactamente esos días y que todavía acepta inscripciones (hay cupo o lista de espera), a todas las
  Personas activas sin una Inscripción vigente a ese Evento.
- **FR-037**: Correr el proceso más de una vez el mismo día MUST NOT duplicar avisos (FR-014), y el
  proceso MUST poder correrse a mano en desarrollo y en los tests.
- **FR-038**: Los procesos programados viven en un solo lugar de la API, para que la liberación de
  contenido de la 008 (que también depende de una fecha) use el mismo mecanismo en vez de crear
  otro.

**Catálogo de eventos de otras specs**

- **FR-039**: El catálogo MUST incluir los eventos de 004 (construida), 008, 009, 010 y 011 según
  contracts/catalogo-eventos.md. Cada spec emite los suyos desde su transición; si la transición ya
  existe cuando se implementa esta spec, la conexión es tarea de esta spec; si no, es tarea de la
  spec que la construye.
- **FR-040**: Cada evento del catálogo MUST tener un test que verifique destinatarios, prioridad,
  texto en `es` y destino, y un test que afirme que cada nombre del catálogo tiene todas sus claves
  de texto (así un evento nuevo no se olvida en ningún lado).

**Datos de demo**

- **FR-041**: `db:seed-demo` MUST sembrar avisos para las Personas de demo (sin leer y leídos,
  automáticos y manuales, uno con título largo y tildes, uno con mensaje de 1000 caracteres) y al
  menos un aviso manual con un mail fallido, para que las pantallas se puedan revisar a mano (D120).

### Key Entities *(include if feature involves data)*

- **Notificación**: un hecho que hay que avisar. `tipo` (`manual` / `automatica`), `prioridad`
  (`normal` / `importante`), `alcance` (`todos` / `grupo` / `ministerio` / `evento` / `persona`) +
  `alcance_id`, para las automáticas el `evento` del catálogo (de donde se deriva el `disparador` de
  `docs/04`) con sus parámetros (solo ids) y la entidad relacionada (`entidad_relacionada_tipo` +
  `entidad_relacionada_id`); para las manuales `titulo`, `mensaje` y `creado_por`; una clave de
  idempotencia opcional y única; fecha de creación. Nunca se borra (Principio III).
- **Entrega de Notificación**: una por destinatario y canal (`app`, `email`; `push` reservado).
  Estado (`pendiente` / `enviada` / `fallida`), intentos, próximo intento, último error (solo el
  tipo), fecha de envío y, para `app`, `leida_en`. Es lo que alimenta la pestaña Avisos.
- **Evento de aviso** (no se guarda): lo que emite cada spec — nombre del catálogo, destinatario e
  ids.
- **Entradas del catálogo** (código, no base de datos): una por nombre de evento, con las
  propiedades de FR-012.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Una Persona cuya solicitud se resuelve tiene el aviso en la app **en el mismo
  momento** en que el cambio se confirma (sin esperar ningún proceso), y el mail, si corresponde,
  le llega en menos de 2 minutos en condiciones normales.
- **SC-002**: El 100 % de los avisos importantes a Personas con email termina en "enviado" o en "no
  se pudo enviar" visible para el Admin; ninguno queda pendiente para siempre ni se pierde sin
  rastro.
- **SC-003**: Desde la pestaña Avisos, una Persona llega a la pantalla de lo que cambió en **un
  toque**.
- **SC-004**: El Admin manda un aviso a un Grupo en menos de 1 minuto desde que abre
  Notificaciones, sabiendo antes de confirmar a cuántas personas les llega.
- **SC-005**: Un aviso a todas las personas (500 Personas de prueba) se confirma en menos de 5
  segundos para el Admin.
- **SC-006**: Ningún asunto de mail ni texto de aviso automático contiene un nombre, teléfono,
  email, motivo de rechazo o tipo de pedido sensible (verificado por test sobre todo el catálogo).
- **SC-007**: Ningún recordatorio llega dos veces a la misma Persona por el mismo Evento, aunque
  el proceso corra varias veces.
- **SC-008**: Las pantallas Avisos, Aviso completo, Notificaciones (listado, envío y detalle) pasan
  axe sin violaciones en modo claro y oscuro, y se usan con teclado y lector de pantalla.
- **SC-009**: Agregar un aviso nuevo en una spec futura es agregar una entrada al catálogo y una
  llamada en su transición: ninguna pantalla ni servicio de envío cambia.

## Assumptions

- **Push queda afuera** (D149). El modelo conserva el canal `push` y la entidad Suscripción a
  Notificación de `docs/04` queda sin construir hasta la tanda siguiente.
- **Personas que reciben el canal `app`**: todas las destinatarias, tengan o no acceso hoy. Flujo
  10 paso 10 dice que las Personas sin acceso "solo reciben las importantes por email": ese
  comportamiento se mantiene para el mail, y el aviso en la app no le cuesta nada a nadie y queda en
  su historial el día que entre con su email (D145, spec 007).
- **Destinatario "Admin"** (eventos de la 004 como `propuesta_declinada`, `finalizacion_propuesta`):
  no generan avisos; la tarjeta de Pendientes del backoffice ya cumple esa función. Ver Preguntas.
- **Avisos del Discipulador**: el Discipulador recibe en la web app los avisos dirigidos a él
  (`propuesta_nueva`), con destino en su pantalla de discipulados, que la spec 006 traslada a la web
  app (D142). Mientras esa pantalla no exista en la web app, el destino es Mi camino. Prioridad
  `normal` (D96 no lo lista entre los importantes). Ver Preguntas.
- **Prioridades**: se siguen al pie de la letra los importantes de `docs/16` §1 (resolución de una
  solicitud, promoción desde lista de espera, pago verificado o rechazado, activación de cuenta,
  manuales marcados). Los demás eventos del catálogo (contenido liberado, recordatorios, finalización
  o baja confirmadas, propuesta al Discipulador) son `normal`. Que el Admin cancele la inscripción a
  un Evento de una Persona se trata como resolución de su solicitud (importante).
- **Alcance de un Grupo**: sus Inscripciones `activa` (no los líderes). Alcance de un Ministerio:
  sus miembros con Postulación `aprobada` vigente (definición de la spec 009).
- **Recordatorio de inscripción**: va a las Personas activas **sin** inscripción vigente al Evento.
  Flujo 8 dice "a quienes no se anotaron" y Flujo 10 dice "a todas"; se toma Flujo 8 porque
  recordarle que se anote a quien ya se anotó confunde. Ver Preguntas.
- **Antelación de `evento_proximo`**: el día anterior al Evento, en la corrida de la mañana. Ver
  Preguntas.
- **Mensaje manual**: texto plano, sin Markdown ni enlaces clickeables, sin traducción (un solo
  idioma, el que escribió el Admin).
- **El historial de avisos no vence ni se borra** (Principio III); el paginado lo mantiene usable.
- **Contador sin tiempo real**: se actualiza al navegar; no hay websockets ni consultas periódicas.
- **Proveedor de mail**: el que defina la 007 (D140); esta spec no lo elige. Los límites diarios del
  plan gratuito se cubren con los reintentos y la sección de mails no enviados. Ver Preguntas.
- **Dependencias**: spec 007 (`EmailService`, Mailpit), 004 (eventos, Grupo e Inscripción ya
  construidos), 006 (pantalla del Discipulador en la web app), 008/009/010/011 (sus transiciones y
  entidades: Contenido, Ministerio y Postulación, Solicitud de Bautismo, Evento, Inscripción a Evento
  y Pago). Detalle en `plan.md`.

## Preguntas para Echu

1. **¿El Discipulador recibe por mail cuando le proponen un discipulado nuevo?** Hoy le llega solo
   como aviso en la app (D96 no lo lista como importante). **Recomiendo que sí** (importante): la
   propuesta espera su respuesta, el Admin la ve "sin respuesta" a los 3 días (004), y sin push el
   mail es lo único que le avisa si no abre la app.
2. **¿El Admin recibe avisos de lo que espera su acción** (solicitud nueva, propuesta declinada,
   propuesta de finalización)? **Recomiendo que no** en esta tanda: ya lo ve en Pendientes del
   backoffice, que es donde trabaja (D142), y duplicarlo en la web app suma ruido.
3. **Recordatorio de inscripción: ¿a todas las personas o solo a quienes no se anotaron?** Flujo 8 y
   Flujo 10 dicen cosas distintas. **Recomiendo solo a quienes no se anotaron** (es lo que asume la
   spec).
4. **¿Cuándo llega el recordatorio de un Evento a los inscriptos?** **Recomiendo el día anterior,
   a la mañana** (es lo que asume la spec). Si preferís dos días antes, es una constante.
5. **Avisos importantes a "todas las personas" y el tope del plan gratuito de mail.** Un aviso
   importante a toda la iglesia puede superar el tope diario del proveedor (en algunos planes
   gratuitos, 100 o 300 mails por día). **Recomiendo permitirlo** con la advertencia y el conteo de
   mails antes de confirmar (lo que asume la spec), y elegir el plan del proveedor (D140) con un tope
   por encima de la cantidad de Personas con email.
