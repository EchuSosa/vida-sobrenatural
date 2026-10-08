# Flujos y Casos de Uso

> Estado: en progreso. Se va completando flujo por flujo en la Sesión 4.

## Flujo 2 — Registro de usuario

**Actor:** Persona nueva (visitante que decide registrarse).

**Camino feliz (mayor de 18):**

1. La persona entra a la app y toca "Registrarme" (o intenta ver contenido que requiere login y se le ofrece registrarse).
2. Elige método de acceso: vía SSO (Google) o con **código por email** (D141): escribe su email, recibe un código de 6 dígitos y lo escribe en la app, lo que verifica el email.
3. Autoriza el acceso (o escribe el código) — el sistema recibe email, nombre básico y (si es Google) la foto de perfil desde el proveedor SSO. Si la verificación contra la API falla por un error inesperado, el login se bloquea con un mensaje para reintentar (fail-closed, D88).
4. El sistema pide completar datos obligatorios: **apellido, nombre, género, fecha de nacimiento, teléfono, dirección, Sede, estado civil, profesión, año en que empezó a venir a la iglesia** (D214: "¿En qué año empezaste a venir a la iglesia?", lista de años + "Este año"; hoy solo existe la Sede La Plata, pero el campo ya queda preparado para más sedes a futuro). El formulario se divide en pasos cortos con indicador de progreso (D94).
5. El sistema calcula la edad a partir de la fecha de nacimiento. Es **mayor de 18** → se crea la cuenta con `estado = activa` y rol "Miembro registrado".
6. La persona llega a una pantalla de bienvenida/perfil. Accede al contenido público + su propio perfil.

**Camino alternativo (menor de 18):**

4a. El sistema calcula la edad y detecta que es **menor de 18**.
4b. El registro se corta: se muestra un mensaje explicando que necesita que un adulto/tutor gestione su cuenta, y se lo redirige a contactar a la iglesia (WhatsApp).
4c. **El intento queda igualmente registrado** en el sistema con `estado = pendiente_tutor` (no se descarta el dato) — visible para el Admin en el back office, para que pueda hacer seguimiento y, si corresponde, completar el alta manualmente usando el contacto de un tutor.
4d. La cuenta en estado `pendiente_tutor` **no puede iniciar sesión** ni acceder a contenido hasta que un Admin la active manualmente.

**Datos obligatorios en el registro:** apellido, nombre, género, fecha de nacimiento, teléfono (input estructurado con selector de país, no texto libre), dirección, Sede, estado civil, profesión (categoría predefinida, con detalle libre opcional si es "Otro"), año en que empezó a venir a la iglesia (D214 — el tiempo se calcula al mostrarlo). (Email básico llega del proveedor SSO.) Con esto, el registro inicial ya cubre los datos que hoy se piden por separado en el formulario físico de Bautismo — no hace falta volver a pedirlos en la Solicitud de Bautismo (Flujo 6).

**Personas que no pueden o prefieren no registrarse solas** (ej. personas mayores): las da de alta el Admin (D143), ver Flujo 12.

---

## Flujo 3 — Discipulado (Vida Nueva)

**Actores:** Admin (asigna), Discipulador (ejecuta), Persona (discipulado).

**Camino feliz:**

1. Una Persona registrada solicita comenzar Vida Nueva desde la app (botón "Quiero empezar Vida Nueva"), creando una **Solicitud de Discipulado** en estado `pendiente`. (Si la Persona no tiene acceso a la app, el Admin o un Discipulador crea la Solicitud en su nombre — Flujo 12, D143; el Discipulador lo hace desde la web app.) Si la Persona ya declaró Vida Nueva como hecha ("Ya lo hice") y está en revisión, o la tiene registrada por la iglesia, el pedido se rechaza (D155).
2. El Admin revisa la Solicitud, la aprueba, y al hacerlo crea un nuevo **Grupo** de Curso "Vida Nueva" (modalidad `seguimiento_por_encuentros`), asignando manualmente:
   - La Persona, vía **Inscripción**.
   - El Discipulador, vía **Liderazgo** (rol: discipulador) — el Admin ve un listado de Discipuladores filtrado por `disponible_discipulado = true` y sin un Bloqueo de Disponibilidad activo en la fecha actual, para elegir entre quienes efectivamente pueden tomar un nuevo discipulado.
3. El Discipulador y la Persona coordinan la primera reunión **fuera de la app** (usando el teléfono/dirección visibles en Mis discipulados, en la web app — D142). En ese encuentro se entrega el libro físico "Vida Nueva".
4. Después de cada reunión, el Discipulador entra a la web app (Mi camino › Mis discipulados, D156) y crea un **Encuentro**: fecha, capítulos vistos, notas opcionales.
5. No hay liberación de contenido digital — el avance es simplemente un registro histórico de encuentros. **Las notas de cada Encuentro las ve solo el Discipulador** (D134): el Admin y el Pastor siguen el proceso desde la vista administrativa de discipulados, que muestra quién discipula a quién, cuántos encuentros hubo, desde cuándo y qué capítulos se vieron, **sin el texto de las notas**.
6. Cuando el Discipulador considera que el proceso terminó (todos los capítulos vistos), **propone la finalización** del Grupo (`propuesta_finalizacion = true`). El Admin la revisa y **confirma** (`Grupo.estado = finalizado`), lo cual marca la Inscripción como `completada`. Este paso no dispara "Apto para Ministerio" — habilita, fuera del sistema por ahora, los pasos siguientes (bautismo, Vida de Servicio).

**Nota:** el discipulado no usa Cronograma ni Contenido (eso es exclusivo de cursos con modalidad `liberacion_programada`). Usa Encuentro para registrar reuniones y avance (ver `04-dominio-entidades.md`, decisión D24) — y ese mismo mecanismo de Encuentro también lo usa Vida de Servicio, pero solo para tomar asistencia, no para el avance del libro.

**Gestión de disponibilidad (independiente, en cualquier momento):**

- El Discipulador puede alternar `disponible_discipulado` manualmente cuando lo considere (ej. al terminar un discipulado, avisa que está libre para uno nuevo — no es automático).
- El Discipulador puede crear un **Bloqueo de Disponibilidad** con fecha de inicio y fin (ej. vacaciones), que se levanta solo al pasar la fecha, sin que tenga que acordarse de reactivarse.

---

## Flujo 4 — Vida de Servicio

**Actores:** Admin (crea el Grupo), Líder de curso (carga contenido), Persona (solicita inscripción).

**Alta del Grupo (una vez, al arrancar una nueva edición):**

1. El Admin crea un nuevo **Grupo** (en pantalla, una "edición") del Curso "Vida de Servicio" (modalidad `liberacion_programada`): nombre, Sede, fecha de inicio, cantidad de semanas.
2. El Admin define el **Cronograma**: una fila por semana, cada una con su fecha de liberación (ej. todos los miércoles). El Cronograma no es una tabla aparte: son los items del Grupo (D161).
3. El Admin asigna uno o más **Líderes de curso** al Grupo (vía Liderazgo) — cualquiera de ellos puede cargar contenido de cualquier semana, sin responsable fijo por semana.

**Inscripción de una Persona:**

4. Una Persona con rol "Miembro registrado" (o ya con roles previos) ve el Grupo disponible. El botón "Solicitar inscripción" está **bloqueado** salvo que la Persona cumpla el `prerequisito_categoria` del Curso (por defecto, `vida_nueva` — ver `04-dominio-entidades.md`): tener una Inscripción `completada` en Vida Nueva (individual o grupal, cualquiera cuenta), o una **Completitud Manual** cargada por el Admin.
4a. Si el prerrequisito no está cumplido, la Persona ve un mensaje explicando qué le falta, y no puede continuar — salvo que el Admin lo destrabe con una Completitud Manual (ver Flujo 9).
5. Si el prerrequisito está cumplido, la Persona **solicita inscribirse** desde Mi camino (o el Admin lo hace en su nombre si no tiene acceso — Flujo 12), eligiendo una edición con inscripción abierta o, si no hay ninguna, **"para la próxima edición"** (D163).
6. El Admin revisa la solicitud en la bandeja unificada y la **aprueba** (asignándole la edición si la pidió para la próxima) — recién ahí se crea la **Inscripción** y la Persona pasa a tener el rol "En curso: Vida de Servicio", con acceso al contenido de ese Grupo.

**Publicación semanal de contenido:**

7. Un Líder de curso, **desde la web app** (Mis grupos, D142), carga el **Contenido** de una semana determinada del Cronograma (texto, archivos y enlaces, D161), idealmente con anticipación a la fecha de liberación.
8. El contenido se vuelve visible para los inscriptos del Grupo automáticamente cuando se cumplen **ambas condiciones**: la fecha actual alcanzó la fecha de liberación programada, **y** el contenido ya fue cargado. Si la fecha llega y todavía no se cargó nada, simplemente no hay nada que mostrar hasta que un Líder lo suba (no hay liberación de "vacío").
9. El contenido permanece disponible para los inscriptos incluso después de que el Grupo finalice (ver decisión D10).

**Asistencia y bajas:**

10. Cada semana, cualquier Líder asignado al Grupo (o el Admin) abre la pantalla de asistencia del Grupo — reemplaza la planilla física de la puerta. Esto crea (o usa) el **Encuentro** correspondiente a esa reunión, y marca presente/ausente para cada Inscripción activa. El Encuentro de asistencia es independiente de si ese domingo también hay Contenido digital liberado — son dos registros separados que pueden coincidir en fecha.
11. En el listado de inscriptos del Grupo, las Personas que ya acumularon **2 o más faltas** se destacan visualmente (con ícono y texto, no solo color — D81), para que el Líder/Admin pueda decidir con un vistazo si corresponde alguna acción. El sistema **no da de baja automáticamente** a nadie — solo señala el caso.
12. Desde ese listado, sobre una Inscripción activa, **el Líder propone la baja eligiendo el tipo y el Admin la confirma** (puede corregir el tipo) o la rechaza; **el Admin también puede aplicarla directo** (ej. cuando le avisan por WhatsApp) — D158. Los tipos:
    - **Dar de baja** (`estado = dada_de_baja`): decisión administrativa, ej. por exceso de faltas sin excepción.
    - **Marcar abandono** (`estado = abandono`): la propia Persona comunicó que no va a continuar.
    - No hacer nada (queda `activa`, ej. si se decide hacer una excepción pese a las faltas).
13. En ambos casos de baja, la Persona pierde acceso al contenido que se libere **después** de la baja (conserva lo liberado hasta ese día, D166), pero el registro histórico no se borra, y queda claro el motivo (útil para reportes a futuro: cuánta gente abandona por decisión propia vs. se da de baja).

**Finalización del Grupo y habilitación para Ministerio:**

14. Al terminar el cronograma, un Líder **propone** finalizar el Grupo (`propuesta_finalizacion = true`).
15. El Admin **confirma** la finalización (`Grupo.estado = finalizado`).
16. Todas las Inscripciones que seguían `activa` pasan automáticamente a `completada`, y el sistema otorga el rol de estado `apto_ministerio` a esas Personas (D159). También lo otorga una Completitud Manual de Vida de Servicio (D160). Las que estaban `dada_de_baja` o `abandono` no reciben el flag.

---

## Flujo 5 — Postulación a Ministerio

**Actores:** Persona, Admin.

**Activación del flag "Apto para Ministerio" (previo a poder postularse):**

1–3. *(Enmendados por D40, D169.)* El flag no se pide ni se activa a mano: lo escribe el sistema al completar Vida de Servicio (Flujo 4, paso 16) o al registrarse una Completitud Manual de Vida de Servicio (D160). Quien no lo tiene ve en la card de Ministerio de Mi camino qué le falta, y puede ver los Ministerios sin el formulario. Quien ya servía antes de la app declara Vida de Servicio con "Ya lo hice" y, confirmado, se postula (D174).

**Postulación a un Ministerio específico:**

4. Con el flag activo, la Persona entra a un Ministerio del listado y ve un formulario de postulación: elige el Ministerio (ya seleccionado por contexto), **elige la Célula** dentro de ese Ministerio (opcional: "No tengo preferencia", D175), y completa datos adicionales opcionales (motivación, disponibilidad).
5. Se crea una **Postulación** en estado `pendiente` (una sola pendiente por Persona). Mientras está pendiente, la Persona puede **retirarla** (D171).

**Revisión por el Admin:**

6. El Admin ve las Postulaciones pendientes en la bandeja unificada de Solicitudes (filtro por tipo, D178). Antes de aprobar una, el sistema verifica si la Persona ya tiene una Postulación `aprobada` activa en **otro** Ministerio:
   - **Si la tiene:** se le muestra una advertencia: *"Esta persona ya pertenece al Ministerio X. ¿Confirmás el cambio?"* Si el Admin confirma, la Postulación anterior pasa a `inactiva` (motivo `cambio_de_ministerio`) y la nueva a `aprobada`. La confirmación la exige la API, no solo la pantalla (D173).
   - **Si no tiene ninguna activa:** se aprueba directamente, sin advertencia.
7. Al aprobarse, la Persona pasa a tener el rol "Miembro de Ministerio", con el Ministerio y la Célula elegidos.
8. **Si el Admin rechaza** la Postulación, pasa a estado `rechazada`. La Persona **puede volver a postularse** al mismo Ministerio más adelante (no queda bloqueada permanentemente) — se crea una nueva Postulación cuando lo intente de nuevo (D172). El motivo del rechazo es interno: la Persona ve un mensaje amable y a quién consultar (D176).
9. **Dejar un Ministerio:** lo hace el Admin desde el detalle del Ministerio ("Dar de baja del Ministerio"): la Postulación pasa a `inactiva` con motivo `baja` y la Persona puede volver a postularse; conserva el rol Miembro de Ministerio (acumulativo). La Persona no tiene un botón propio para salirse (D174).

---

## Flujo 6 — Solicitud de Bautismo

**Actores:** Persona, Admin.

**Requisito para pedir (D147):** Vida Nueva en curso o completada (por el sistema o por historial confirmado), o que el Admin la haya habilitado. Desde 12 años la Persona pide sola; menor de 12, el Admin lo pide en su nombre (D184). Solo el Admin pide en nombre de otra Persona (D187).

1. Desde la card de Bautismo de Mi camino, la Persona toca "Quiero bautizarme" y, si quiere, escribe algo en "¿Querés contarnos algo?" (sin fecha deseada, D179).
2. Se crea una **Solicitud de Bautismo** en estado `pendiente` (una sola abierta por Persona). La card dice "Recibimos tu pedido, el equipo lo está revisando".
3. El Admin la ve en la bandeja unificada de Solicitudes y la **acepta** o la **rechaza**. Aceptada sin fecha, la Persona ve "Aceptamos tu pedido, te avisamos la próxima fecha" (D147). Rechazada, ve un texto amable y puede volver a pedir; el motivo es solo del equipo (D185).
4. Cuando la iglesia fija una fecha, el Admin crea un **Evento de bautismo** (Flujo 8, D188) y, desde su detalle, **suma a los aceptados** que esperan fecha, de a varios. Cada asignación es una Inscripción a Evento confirmada creada por el Admin (D181); la Persona ve en su card fecha, hora y lugar, leídos del Evento.
5. Mientras su pedido esté abierto, la Persona puede **retirarlo** y, si ya tiene fecha, decir **"No puedo ese día"** (vuelve a esperar fecha). Las dos confirmaciones son neutras (D183, D151). Si el Evento se cancela, los asignados vuelven a esperar fecha.
6. Pasado el Evento, el Admin **confirma quiénes se bautizaron** (todos tildados por defecto); las tildadas quedan `realizada` y la card dice que se bautizó; las destildadas vuelven a esperar fecha (D180).
7. Ningún aviso fuera de la app nombra el bautismo (`docs/13` punto 5); la página pública del Evento de bautismo no muestra quiénes se bautizan (D182).

---

## Flujo 8 — Evento (publicación e inscripción)

**Actores:** Admin (publica, verifica pagos, puede inscribir o dar de baja inscripciones), Persona (se inscribe, cancela su propia inscripción, si aplica).

**Publicación:**

1. El Admin crea un **Evento**: nombre, **inicio con hora y fin opcional** (D189), descripción, Sede, **lugar** (opcional; por defecto la dirección de la Sede, D190), **tipo** (`general` o `bautismo` — un Evento de bautismo no tiene inscripción propia, cupo, costo ni lista de espera: lo arma el Admin con los aceptados del Flujo 6, D188), flyer opcional con su texto alternativo (D83), `publico_objetivo` (texto informativo, ej. "Jornada de mujeres" — sin validación técnica), dos flags (`requiere_inscripcion` y, si aplica, `requiere_aprobacion`), opcionalmente `cupo` (con `permite_lista_espera`) y `costo` (para campamentos u otros Eventos pagos, con **instrucciones de pago** obligatorias, D191), y opcionalmente `dias_anticipacion_recordatorio` (si se completa, dispara un recordatorio automático a quienes no se anotaron — ver Flujo 10). El Evento tiene una página pública con URL propia (D82).
2. **Si `requiere_inscripcion = false`**: el Evento es puramente informativo (aparece en la cartelera pública, cualquiera lo ve, sin botón de inscripción).
3. **Si `requiere_inscripcion = true`**: el sistema genera un **código QR** (acompañado siempre de un link equivalente) que lleva directo a la página del Evento con el botón de inscripción — pensado para reemplazar el QR a un Google Form que hoy se muestra durante el culto. Si quien escanea el QR no tiene sesión iniciada, se le pide registrarse/loguearse primero, y después se lo redirige de vuelta a completar la inscripción.

**Inscripción:**

4. Al tocar "Anotarme" (o escanear el QR), se evalúa el **cupo**:
   - Si hay lugar (o no hay `cupo` definido): sigue el flujo normal.
   - Si está lleno y `permite_lista_espera = true`: la Inscripción se crea en estado `lista_espera`.
   - Si está lleno y `permite_lista_espera = false`: no se permite inscribirse (botón deshabilitado, mensaje de cupo completo).
5. Si hay lugar, se crea la **Inscripción a Evento**:
   - Si `requiere_aprobacion = false` → queda `confirmada` automáticamente.
   - Si `requiere_aprobacion = true` → queda `pendiente` hasta que el Admin la revise y confirme.
5a. Ocupan lugar las Inscripciones `confirmada` y `pendiente` (D192). Las inscripciones cierran al inicio del Evento y la lista de espera es por orden de llegada (D194).
5b. El Admin también puede **inscribir a una Persona desde el backoffice** (ej. una Persona sin acceso a la app, Flujo 12, o alguien que avisó por WhatsApp). Se aplican las mismas reglas de cupo y lista de espera.

**Pago (solo si el Evento tiene `costo` definido):**

6. La Persona sube un **comprobante de pago**: monto, medio de pago, y el archivo/imagen del comprobante. Se crea un registro de **Pago** en estado `pendiente_verificacion`. (Si la Persona no tiene acceso a la app, el Admin puede registrar el Pago en su nombre, y ese Pago nace `verificado`, D192.) El comprobante es privado: lo ven la dueña y quien verifica pagos (D195).
7. El Admin revisa el comprobante en la bandeja de Solicitudes y lo marca `verificado` o `rechazado`. **El pago no bloquea la Inscripción** (D148): mientras tanto queda "confirmada, falta el pago" y ocupa lugar. Si lo rechaza (con un motivo que la Persona ve), la Inscripción queda `cancelada` con motivo `pago_rechazado` y se libera el lugar (paso 9) — D192.

**Cancelación y lista de espera:**

8. La Inscripción puede pasar a `cancelada` por **dos caminos**: la propia Persona la cancela desde la app, o el **Admin la da de baja manualmente** desde el back office (ej. alguien avisa por WhatsApp que no puede ir, sin necesidad de que entre a la app). Ambos casos producen el mismo resultado.
9. Si esa Inscripción estaba `confirmada` (o `pendiente`) y hay gente en `lista_espera`, el **primero de la lista** pasa automáticamente al estado que corresponda (`confirmada` directo, o `pendiente` si el Evento requiere aprobación), y recibe una Notificación **importante** avisándole que consiguió lugar (Avisos + email, D96, D149).
10. **Cancelar un Evento** conserva sus Inscripciones y avisa a los inscriptos como importante; cambiarle fecha, hora o lugar avisa como normal (D193). Un Evento sin Inscripciones se puede eliminar (papelera, D119).

---

## Flujo 7 — Alta manual de un menor de edad

**Actores:** Admin (D139, D143), tutor del menor (fuera de la app), Persona menor de edad.

**Origen del alta (dos caminos posibles):**

- **A) A partir de un intento previo:** el sistema ya tiene un registro con `estado = pendiente_tutor` (creado en el Flujo 2, cuando el menor intentó auto-registrarse y el sistema detectó la edad).
- **B) Desde cero:** el Admin o Discipulador conoce al menor por otro medio (ej. va a empezar Vida Nueva) y crea la cuenta directamente, sin que haya existido un intento previo.

**Pasos:**

1. El Admin o Discipulador contacta al tutor (fuera de la app, ej. WhatsApp o en persona) y obtiene su autorización, junto con el **email que el menor va a usar para loguearse** (el mismo que usará en el SSO), nombre y teléfono del tutor.
2. En el back office, el Admin o Discipulador completa/crea el perfil de la Persona menor con: datos personales, `tutor_nombre`, `tutor_telefono`, y **cambia el estado a `activa`** (si venía de `pendiente_tutor`) o lo crea directamente en `activa` (si es alta desde cero).
3. La próxima vez que el menor inicia sesión vía SSO o con código por email (D141) usando el email ya cargado, el sistema **reconoce el email contra un registro existente en estado `activa`** y lo deja ingresar directamente — sin volver a pasar por la validación de edad del Flujo 2 (esa validación ya la hizo una persona humana, con la autorización del tutor). Solo se vincula si el proveedor confirma que el email está verificado (el código por email ya lo verifica).
4. A partir de ahí, el menor tiene acceso igual que cualquier Miembro registrado, y el Admin/Discipulador le asigna los roles que correspondan (ej. Vida Nueva) de la misma forma que a un adulto.

---

## Flujo 9 — Gestión general del back office

**Actor:** Admin.

La mayoría de las operaciones de gestión ya quedaron cubiertas dentro de los flujos específicos (crear Grupos en el Flujo 3/4, revisar Postulaciones en el Flujo 5, etc.). Este flujo cubre lo que falta: el **CRUD de catálogos base** que no tiene un flujo propio.

**Entidades de catálogo gestionadas por el Admin (crear, editar, desactivar):**
- Sede
- Curso (plantillas)
- Ministerio
- Célula (dentro de un Ministerio)

**Política de borrado:** ninguna de estas entidades se elimina definitivamente desde la app. Todas tienen un flag `activo`; "eliminar" en la práctica significa `activo = false` (soft delete). Esto preserva el historial de Grupos, Inscripciones, Postulaciones, etc. que puedan referenciarlas, y evita pérdidas accidentales de datos.

**Confirmación reforzada al desactivar:** si el registro que se quiere desactivar tiene datos relacionados activos (ej. un Curso con Grupos en curso, un Ministerio con Miembros activos), el sistema debe mostrar un modal de confirmación reforzada — el Admin debe escribir el nombre exacto del registro para confirmar — ya que desactivarlo afecta a personas reales, aunque la acción sea reversible. Si no hay datos relacionados activos, alcanza con una confirmación simple.

**Gestión de Personas:** el Admin puede ver el listado completo de Personas (con su foto de perfil cuando exista, D87), dar de alta Personas adultas (Flujo 12), editar sus datos, cambiar su `estado` (ej. activar una cuenta `pendiente_tutor`, ver Flujo 7), y asignar/quitar roles manualmente cuando haga falta corregir un error (fuera del flujo normal de solicitudes). Cada Persona tiene una **vista de perfil unificada** en el back office: sus roles actuales, historial de Inscripciones, Postulaciones y Solicitudes (con sus estados), y sus Relaciones Familiares — todo en una sola pantalla, en vez de tener que buscar por separado en cada módulo.

**Completitud Manual (excepción a prerrequisitos):** desde el perfil de una Persona, el Admin puede registrar una **etapa** del camino como hecha (Vida Nueva, Vida de Servicio, Ministerio o Bautismo — por etapa, no por Curso, D153) con una nota opcional, y también **anularla** (borrado lógico, queda quién y cuándo; se puede volver a registrar). Una Persona tiene como máximo una vigente por etapa. Sirve, por ejemplo, para quien hizo Vida Nueva en otra congregación, sin necesidad de crear un Grupo ni una Inscripción real. Esto destraba cualquier prerrequisito que dependa de esa categoría de Curso (ej. poder solicitar Vida de Servicio), tal como se describe en el Flujo 4.

**Historial previo ("Ya lo hice", D144, D154):** en la card de cada etapa de Mi camino, la Persona declara que ya la hizo (con un comentario opcional). La declaración queda en revisión — se puede retirar — y entra a la bandeja de Solicitudes como "Historial previo". El Admin la **confirma** (se crea la Completitud Manual de esa etapa) o **no la confirma** (con un motivo opcional que la Persona lee, y puede volver a declararla). Confirmar no escribe roles por sí solo, salvo lo que la regla de la etapa diga (D160).

**Cumpleaños:** el Inicio del backoffice muestra los cumpleaños de hoy y de la semana, con enlace al listado del mes (cualquier mes se puede elegir), calculado a partir de `fecha_nacimiento` — sin necesidad de una entidad nueva (D210).

**Cursos:** los Cursos los fija el código; el Admin edita nombre y descripción, los inactiva (un Curso inactivo no admite Grupos nuevos) o los elimina si no tienen Grupos (D212).

**Comentarios de la app:** el Admin ve en el Inicio del backoffice los comentarios sin revisar enviados desde "Contanos qué te parece" (D102), los abre desde ahí y los marca como revisados (D211).

---

## Flujo 10 — Notificaciones (push, Avisos y email)

**Actores:** Persona (recibe, se suscribe), Admin (crea manuales), Sistema (dispara automáticas y envía).

Detalle técnico del envío en `16-sistemas-transversales.md` (D96, D100).

**Suscripción de un dispositivo (push):**

1. La Persona, usando la app agregada a su pantalla de inicio (requisito de iOS; en Android funciona incluso sin agregarla), autoriza las notificaciones cuando la app se lo solicita **en contexto** (ej. después de enviar una solicitud), nunca al abrir la app por primera vez.
2. Se crea una **Suscripción a Notificación** para ese dispositivo, asociada a la Persona.

**Notificación manual (Admin):**

3. El Admin crea una Notificación: título, mensaje, elige el **alcance** — `todos`, o un Grupo específico, o un Ministerio específico — y opcionalmente la marca como **importante** (también se envía por email).
4. El sistema crea una Entrega por destinatario y canal, y la envía a las Suscripciones activas (push), la registra en Avisos, y si es importante la envía por email.

**Notificaciones automáticas (Sistema):**

5. **`contenido_liberado`** (alcance = `grupo`, prioridad normal): cuando un Líder carga Contenido y se cumplen las condiciones de liberación (Flujo 4, paso 7), se dispara automáticamente con `alcance_id` = el Grupo, y llega a los inscriptos activos de ese Grupo.
5b. **`proceso_actualizado`** (alcance = `persona`, prioridad normal, D199): cambios del proceso que la Persona no pidió (finalización o baja confirmadas, Vida de Servicio completada) y avisos a quien tiene que actuar (una propuesta de discipulado nuevo al Discipulador, que además es importante — D201).
6. **`solicitud_actualizada`** (alcance = `persona`, prioridad **importante**): cuando el Admin aprueba o rechaza una Postulación, Solicitud de Bautismo, Solicitud de Discipulado o Inscripción a Evento pendiente, se dispara con `alcance_id` = la Persona dueña de esa solicitud — es individual, no un segmento. También aplica a la promoción desde lista de espera, a la verificación/rechazo de un Pago y a la activación de una cuenta creada por el Admin.
7. **`evento_proximo`** (alcance = `evento`, prioridad normal): recordatorio con `alcance_id` = el Evento, enviado a quienes tienen una Inscripción a Evento confirmada, **el día anterior al Evento, a la mañana** (D202). A diferencia de los otros dos disparadores (que reaccionan a una acción), este necesita un proceso programado que revise periódicamente los Eventos próximos (detalle técnico a definir en la Sesión 5, specs).
8. **`recordatorio_inscripcion`** (alcance = `todos`, prioridad normal): si el Evento tiene `dias_anticipacion_recordatorio` configurado, el sistema envía un recordatorio a las Personas activas **que todavía no tienen una inscripción vigente** a ese Evento (D202: recordarle que se anote a quien ya se anotó confunde) cuando faltan esos días para el Evento — pensado para incentivar a quien todavía no se anotó. Como `publico_objetivo` es solo texto informativo y no hay segmentación técnica, este recordatorio necesariamente llega a todos; el Admin decide si vale la pena activarlo para cada Evento según cuán relevante sea para el público general. También requiere el mismo proceso programado que `evento_proximo`.

**Recepción:**

9. La Persona ve todas sus notificaciones en la pestaña **Avisos**, con estado leída/no leída; tocar una la marca como leída y la lleva a la entidad relacionada (D59).
10. **Toda Persona destinataria recibe el aviso en la app**, tenga o no acceso hoy (queda en su historial el día que entre); el mail sale solo si el aviso es importante y tiene email cargado (D200). Los avisos se crean dentro de la misma transacción que el cambio que los dispara y el mail sale después, con reintentos (D197, D204). Los eventos dirigidos al Admin no generan avisos: los ve en Pendientes (D201).

---

## Flujo 11 — Edición de perfil propio

**Actor:** Persona.

1. La Persona accede a "Mi perfil" y puede editar sus propios datos de contacto (teléfono, dirección) y otros campos no críticos (estado civil, profesión), y su preferencia de tema (Claro / Oscuro / Sistema, D95). La foto de perfil no es editable en el MVP (D87).
2. Campos que **no puede editar libremente** ella misma: `fecha_nacimiento` (afecta validaciones ya realizadas, como la de mayoría de edad) y `email` (es la identidad de login, vía SSO o código). Cambios a estos dos campos requieren contactar al Admin.
3. La Persona también puede gestionar sus **Relaciones Familiares** (vincular a su cónyuge, hijos, etc., si ya están registrados en el sistema).

---

## Flujo 12 — Alta de una Persona adulta por el Admin

**Actores:** Admin (D143 — el Discipulador ya no da de alta), Persona adulta (ej. una persona mayor o con poca experiencia digital).

**Cuándo se usa:** la Persona no puede o prefiere no registrarse sola (no tiene cuenta de Google/Facebook, no tiene email, o necesita ayuda). Ver D97.

**Pasos:**

1. El Admin obtiene los datos de la Persona **en persona o por WhatsApp**, junto con su consentimiento para guardarlos (D78). Al guardar, el sistema registra quién hizo el alta y que el consentimiento se obtuvo fuera de la app.
2. En el backoffice ("Dar de alta una persona"), crea la Persona con los mismos datos obligatorios del registro (Flujo 2). El **email es opcional**. Antes de crear, si coincide el teléfono o nombre + apellido + fecha de nacimiento con otra Persona, el sistema **avisa de un posible duplicado** con enlace a la existente, y el Admin puede seguir con "Es otra persona, crear igual" (aviso, no bloqueo — D145). Se crea con `estado = activa` y `origen_alta = admin`.
3. Según el email cargado:
   - **Email de una cuenta Google o Facebook:** la Persona puede ingresar a la app vía SSO; el sistema reconoce el email contra el registro existente (mismo mecanismo que el Flujo 7, solo con email verificado por el proveedor). Recibe un email importante avisándole que su cuenta está lista, con instrucciones simples.
   - **Otro email (sin cuenta Google/Facebook):** la Persona ingresa sola con un **código por email** (D141, spec 007): escribe su email, recibe un código de 6 dígitos y entra a su Persona, sin pasar por el registro. También recibe por email los avisos importantes (D96).
   - **Sin email:** la Persona queda registrada **sin acceso a la app** y sin avisos automáticos; el Admin/Discipulador le comunica las novedades por WhatsApp o en persona, como hoy.
4. El Admin (o el Discipulador, solo para pedir Vida Nueva en su nombre, D143) puede **actuar en nombre de la Persona**: crear su Solicitud de Discipulado, de Bautismo o de inscripción a Vida de Servicio, inscribirla a Eventos y registrar Pagos. Cada acción queda registrada como hecha por el Admin/Discipulador.
5. Su avance (Encuentros, Asistencia, Inscripciones, Completitudes) se registra igual que el de cualquier otra Persona, y cuenta para prerrequisitos y métricas.
6. Si más adelante la Persona tiene un email (de cualquier proveedor), el Admin lo carga ("Agregar email") y la Persona puede empezar a ingresar a la app con código por email, o con Google si es una cuenta de Google, sin perder su historial (D141).

---
*Sesión de origen: Sesión 4 (cerrada), ampliada fuera de sesión con Notificaciones push, cancelación/lista de espera, edición de perfil, datos estructurados de registro (D90), login fail-closed (D88), alta de adultos por el Admin y canal de email (ver `08-roadmap-producto.md` y `05-decisiones.md`).*
