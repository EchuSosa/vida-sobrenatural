# Feature Specification: Ingreso con código por email

**Feature Branch**: `007-ingreso-codigo-email`

**Created**: 2026-09-30

**Status**: Draft

**Input**: User description: "Ingreso con código por email, sin contraseñas, para web app y backoffice. Quien no tiene cuenta de Google (Hotmail, Yahoo, mail del trabajo) no puede entrar hoy; Echu adelantó este ítem de Fase 2 (`docs/08-roadmap-producto.md`, `docs/10-stack-tecnico.md`, D97) al MVP, antes de la 006. Decidido: la persona escribe su email, recibe un código de 6 dígitos por mail, lo escribe en la app y entra. Sin contraseñas en ninguna parte; el Admin no reparte credenciales. Recibir el código es la verificación de que el email existe y es suyo. Convive con Google: quien tiene Google sigue entrando con Google; mismo email → misma Persona. Sirve para Personas dadas de alta por el Admin con email de otro proveedor (D97): entran solas con el código. Quien no tiene ningún email sigue como hoy (el Admin actúa en su nombre, D97). Vale para web app y backoffice. A resolver: vida del código, intentos por código, límite de envíos contra spam, duración de la sesión (cuidando 001/002 y D88 fail-closed), email no registrado (arranca el registro de 4 pasos igual que con Google, sin revelar si un email existe), menores (D35: mismo reconocimiento de cuenta pre-cargada), texto del mail en voseo con el código grande, cuánto dura y 'si no fuiste vos, ignorá este mail', sin datos personales. Infraestructura: no existe EmailService; la 007 lo construye según `docs/10-stack-tecnico.md` §Email (D96)."

## Clarifications

### Session 2026-09-30

- Q: ¿Qué límites usa el código de ingreso (vida, intentos, envíos)? → A: El código dura **15 minutos** (margen para un mail que tarda o una persona que va más lenta), 5 intentos por código, 5 envíos por hora por email y **30 por hora por origen**. El límite por origen queda alto a propósito: un domingo, toda la gente que se registra desde el wifi del templo comparte la misma dirección de red, y un límite de 5 dejaría afuera a la sexta persona.
- Q: ¿Cuánto dura la sesión antes de volver a pedir código o entrar con Google? → A: En la **web app, 30 días** y en el **backoffice, 7 días**; en los dos casos el plazo se renueva mientras la Persona use la app. Vale igual para Google y para código. Hoy las dos apps usaban el valor por defecto del proveedor de autenticación (30 días) sin que estuviera decidido por escrito; el backoffice se acorta porque muestra datos de contacto de otras Personas, incluidos menores, y puede quedar abierto en una computadora compartida.
- Q: En el backoffice, si alguien pide código con un email sin Persona o sin rol de cargo, ¿se le manda igual el mail? → A: **Sí**, el mismo mail que a cualquier otro email; recién al escribir el código ve que no tiene acceso al backoffice, igual que hoy con Google. Ni la pantalla ni el mail distinguen un email del equipo de uno cualquiera, y el mecanismo es el mismo en las dos apps.
- Q: ¿Qué texto lleva el mail del código? → A: Asunto **"Tu código para entrar: NNNNNN"** (el código en el asunto, para que la notificación del celular lo muestre sin abrir el mail). Cuerpo: "¡Hola! / Este es tu código para entrar a Vida Sobrenatural: / **NNNNNN** (grande) / Escribilo en la pantalla donde lo pediste. Vale por 15 minutos y sirve una sola vez. / Si no fuiste vos, ignorá este mail: nadie puede entrar sin este código. / Iglesia Vida Sobrenatural". El mismo texto en la versión de texto plano.
- Q: ¿Cómo se ordenan las dos formas de entrar en la pantalla de ingreso? → A: Arriba **"Entrar con Google"** como botón con contorno, después una línea "o", y abajo el campo de email con **"Enviarme el código"** como única acción principal (D94). Mismo orden en la web app y en el backoffice.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Entrar a la app con un código enviado al email (Priority: P1)

Una Persona ya registrada cuyo email no es de Google (por ejemplo, Hotmail, Yahoo o el mail del trabajo) quiere entrar a la app. Escribe su email, recibe un mail con un código de 6 dígitos, lo escribe en la pantalla y queda con la sesión iniciada, sin haber creado ni recordado ninguna contraseña.

**Why this priority**: Es el motivo de toda la spec. Hoy esa persona no tiene ninguna forma de entrar sola, y en una iglesia es mucha gente. Sin esta historia no hay nada que mostrar.

**Independent Test**: Puede probarse por completo con una Persona `activa` cuyo email no es de Google: pedir el código desde la pantalla de ingreso de la web app, leer el mail capturado en el entorno local, escribir el código y verificar que la sesión queda iniciada con esa misma Persona (mismo nombre, mismo avance, mismo rol).

**Acceptance Scenarios**:

1. **Given** una Persona `activa` con email de cualquier proveedor, **When** escribe su email en la pantalla de ingreso y pide el código, **Then** el sistema le envía un mail con un código de 6 dígitos y la pantalla le pide que lo escriba, diciendo a qué email se envió y cuánto dura.
2. **Given** una Persona que recibió el código, **When** lo escribe correctamente antes de que venza, **Then** queda con la sesión iniciada como esa Persona, y llega a la pantalla a la que quería ir (o al Inicio de la app).
3. **Given** una Persona que escribe un código incorrecto, **When** envía el formulario, **Then** ve un mensaje junto al campo que dice que el código no coincide y cómo seguir (revisar el mail o pedir uno nuevo), sin perder el email ya escrito.
4. **Given** un código que ya venció, o que ya se usó una vez, **When** la Persona lo escribe, **Then** el sistema no la deja entrar y le ofrece pedir un código nuevo.
5. **Given** una Persona que pidió un código y no le llegó, **When** toca "Enviarme otro código", **Then** recibe un código nuevo y el anterior deja de servir.
6. **Given** una Persona que llegó al límite de intentos fallidos con un mismo código, **When** intenta de nuevo, **Then** ese código deja de servir y la pantalla le pide que solicite uno nuevo.

---

### User Story 2 - Registrarse con un email de cualquier proveedor (Priority: P1)

Un Visitante sin cuenta de Google quiere registrarse como Miembro registrado. Escribe su email, recibe el código, lo escribe y continúa con el mismo registro de 4 pasos que hoy hace quien entra con Google, con el email ya verificado.

**Why this priority**: Sin esto, el ingreso por código solo sirve a quien ya fue cargado por el Admin. La puerta de entrada de la iglesia (Bienvenida → registro) quedaría cerrada para la misma gente que motiva esta spec.

**Independent Test**: Puede probarse por completo pidiendo un código con un email que no pertenece a ninguna Persona, escribiendo el código y completando el registro de 4 pasos; al terminar, la Persona queda `activa` (o `pendiente_tutor` si es menor) con ese email.

**Acceptance Scenarios**:

1. **Given** un email que no pertenece a ninguna Persona, **When** el Visitante pide el código, **Then** la pantalla responde exactamente igual que para un email registrado (mismo texto, mismo paso siguiente), sin revelar si el email existe.
2. **Given** un Visitante que escribió bien el código de un email no registrado, **When** se verifica, **Then** entra al registro de 4 pasos con el email ya cargado y no editable, igual que con Google.
3. **Given** un Visitante que completa el registro después de verificar el código, **When** confirma, **Then** la Persona queda creada con ese email y puede volver a entrar más adelante pidiendo otro código.
4. **Given** un Visitante que completa el registro con una fecha de nacimiento de menor de 18 años, **When** confirma, **Then** la Persona queda en `pendiente_tutor`, exactamente como hoy con Google (FR-008 de la spec 001).

---

### User Story 3 - Convivir con Google sin duplicar Personas (Priority: P1)

Una Persona que se registró con Google puede seguir entrando con Google, y también puede entrar con el código si un día no tiene a mano su cuenta de Google. Una Persona que se registró con código y después se crea una cuenta de Google con el mismo email entra a la misma Persona. En ningún caso existen dos Personas con el mismo email.

**Why this priority**: Si el código creara Personas duplicadas, el avance de alguien quedaría partido en dos y el equipo de la iglesia no sabría cuál es la real. Es una condición de seguridad y de integridad del dato, no una comodidad.

**Independent Test**: Puede probarse por completo con una Persona registrada vía Google: entrar con código usando el mismo email y verificar que es la misma Persona (mismo id, mismo avance); y al revés, con una Persona registrada por código que entra con Google con el mismo email.

**Acceptance Scenarios**:

1. **Given** una Persona registrada con Google, **When** entra con código usando el mismo email, **Then** queda con la sesión iniciada como esa misma Persona.
2. **Given** una Persona registrada con código, **When** entra con Google con el mismo email (verificado por Google), **Then** queda con la sesión iniciada como esa misma Persona.
3. **Given** un email escrito con mayúsculas o espacios distintos al que está guardado, **When** se pide el código, **Then** el sistema lo trata como el mismo email.
4. **Given** la pantalla de ingreso, **When** alguien la abre, **Then** ve arriba "Entrar con Google" (botón con contorno), una línea "o", y el campo de email con "Enviarme el código" como acción principal.

---

### User Story 4 - Entrar solas las Personas cargadas por el Admin y los menores pre-cargados (Priority: P2)

Una Persona adulta dada de alta por el Admin con un email que no es de Google (D97), o un menor cuya cuenta pre-cargó el Admin/Discipulador con autorización del tutor (D35), entra sola con el código, sin que nadie le reparta una contraseña. El sistema la reconoce contra la Persona ya cargada igual que hoy lo hace con Google.

**Why this priority**: Resuelve el hueco que dejó D97 ("sin acceso a la app"), pero depende de la Historia 1 y no bloquea la entrada de gente nueva.

**Independent Test**: Puede probarse por completo cargando desde el backoffice una Persona adulta con un email que no es de Google, y un menor pre-cargado y activado; cada uno pide su código y entra a su propia Persona, sin pasar por el registro.

**Acceptance Scenarios**:

1. **Given** una Persona adulta dada de alta por el Admin con email de cualquier proveedor, **When** pide y escribe el código, **Then** entra a su Persona sin pasar por el registro.
2. **Given** un menor pre-cargado y activado por el Admin/Discipulador (D35), **When** pide y escribe el código con el email cargado, **Then** entra a su Persona sin repetir la validación de edad.
3. **Given** una Persona en `pendiente_tutor`, **When** pide y escribe correctamente el código, **Then** llega a la misma pantalla de espera que hoy ve con Google, sin sesión de Miembro registrado.
4. **Given** una Persona desactivada (`activo = false`), **When** pide y escribe el código, **Then** el sistema la trata igual que hoy trata el ingreso con Google de esa Persona.
5. **Given** una Persona sin email, **When** el equipo la gestiona, **Then** todo sigue como hoy: el Admin actúa en su nombre (D97).

---

### User Story 5 - Entrar al backoffice con código (Priority: P2)

Una Persona del equipo (Admin, Discipulador, Líder de curso, Pastor/Pastora) que no tiene cuenta de Google entra al backoffice con el mismo mecanismo de código.

**Why this priority**: El equipo también puede no tener Google, y el Admin es quien más necesita entrar. Va después de la app porque el backoffice lo usan pocas personas y hoy ya entran con Google.

**Independent Test**: Puede probarse por completo con una Persona con rol de cargo y email que no es de Google: pedir el código desde el backoffice, escribirlo y ver el backoffice con su rol.

**Acceptance Scenarios**:

1. **Given** una Persona con un rol de cargo, **When** pide y escribe el código en el backoffice, **Then** entra al backoffice con sus permisos.
2. **Given** un email sin Persona o una Persona sin rol de cargo, **When** pide el código en el backoffice, **Then** la pantalla responde igual que para cualquier otro email, y después de escribir el código ve el mismo resultado que hoy ve esa persona al entrar con Google (sin acceso al backoffice), sin arrancar ningún registro.
3. **Given** una Persona con sesión iniciada en la web app, **When** abre el backoffice, **Then** necesita iniciar sesión ahí también, igual que hoy con Google (cada app tiene su propia sesión).

---

### User Story 6 - Recibir un mail claro y cálido (Priority: P2)

La Persona recibe un mail que se entiende de un vistazo, en el tono de la iglesia: el código grande, cuánto dura, qué hacer con él, y qué hacer si no fue ella quien lo pidió.

**Why this priority**: El público incluye gente mayor y gente que recién llega. Un mail confuso o que parece spam corta el ingreso aunque todo lo demás funcione.

**Independent Test**: Puede probarse por completo abriendo el mail capturado en el entorno local, en su versión con formato y en texto plano, y verificando contenido y tono contra `docs/15-guia-ux-ui.md`.

**Acceptance Scenarios**:

1. **Given** una Persona que pidió un código, **When** abre el mail, **Then** ve el código de 6 dígitos grande y fácil de copiar, cuánto dura, y el texto "si no fuiste vos, ignorá este mail", en español rioplatense con voseo.
2. **Given** el mail del código, **When** se revisa su contenido, **Then** no incluye ningún dato personal (ni nombre, ni si el email está registrado, ni ningún otro dato de la Persona) más allá del propio código.
3. **Given** un cliente de correo que no muestra formato, **When** la Persona abre el mail, **Then** ve la versión en texto plano con la misma información.

---

### Edge Cases

- ¿Qué pasa si alguien pide códigos una y otra vez para el mismo email, o para muchos emails desde el mismo lugar? El sistema limita los envíos por email y por origen (FR-009); pasado el límite, muestra un mensaje que dice cuándo puede volver a intentar, igual para emails registrados y no registrados.
- ¿Qué pasa si la Persona pide dos códigos seguidos? Solo sirve el último (FR-005).
- ¿Qué pasa si escribe el código con espacios o guiones (lo copió del mail)? El sistema los ignora y valida solo los 6 dígitos.
- ¿Qué pasa si el envío del mail falla (servicio de email caído)? La Persona ve un error que le dice que no se pudo enviar y que pruebe de nuevo en unos minutos; el pedido no cuenta contra su límite de envíos.
- ¿Qué pasa si la API no responde al verificar el código? El ingreso se bloquea y la Persona ve la misma pantalla de "no pudimos verificar tu cuenta" que hoy (D88, fail-closed).
- ¿Qué pasa si pide el código en un dispositivo y lo escribe en otro? El código sirve donde se escriba, siempre que sea junto al mismo email.
- ¿Qué pasa si el Admin cambia el email de una Persona mientras tiene un código vigente? El código pendiente del email anterior deja de servir para esa Persona.
- ¿Qué pasa si una Persona abre el registro de 4 pasos después de verificar el código y lo abandona a la mitad? Igual que con Google: no se crea ninguna Persona; la próxima vez pide otro código y arranca de nuevo.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE ofrecer, en la pantalla de ingreso de la web app y del backoffice, la opción de entrar escribiendo un email y un código recibido por mail, además del ingreso con Google. El orden es: "Entrar con Google" arriba como botón con contorno, una línea "o", y el campo de email con "Enviarme el código" como única acción principal de la pantalla (D94).
- **FR-002**: El sistema NO DEBE pedir, guardar ni mostrar ninguna contraseña, en ninguna de las dos apps ni en el mail.
- **FR-003**: Al pedir un código, el sistema DEBE generar un código numérico de 6 dígitos, al azar e impredecible, y enviarlo al email escrito.
- **FR-004**: El código DEBE vencer a los **15 minutos** de enviado, y servir **una sola vez**.
- **FR-005**: Pedir un código nuevo para el mismo email DEBE invalidar cualquier código anterior todavía vigente para ese email.
- **FR-006**: El sistema DEBE aceptar como máximo **5 intentos** de verificación por código; al quinto intento fallido, ese código deja de servir y la Persona tiene que pedir uno nuevo.
- **FR-007**: Verificar correctamente el código DEBE contar como verificación del email (equivalente al `email_verified` de Google en FR-017 de la spec 001).
- **FR-008**: La respuesta en pantalla al pedir un código DEBE ser idéntica para un email registrado y uno no registrado — mismo texto, mismo paso siguiente, sin diferencias observables que revelen si el email pertenece a una Persona.
- **FR-009**: El sistema DEBE limitar los pedidos de código a **5 por hora por email** y **30 por hora por origen** (dirección de red) para evitar que se use para enviar spam. El límite por origen es más alto a propósito: mucha gente comparte la misma dirección de red en el wifi del templo. Pasado el límite, DEBE mostrar un mensaje que diga cuándo se puede volver a intentar.
- **FR-010**: Los emails DEBEN compararse sin distinguir mayúsculas y minúsculas e ignorando espacios al principio y al final, tanto al pedir el código como al reconocer a la Persona.
- **FR-011**: Un código correcto para un email que pertenece a una Persona DEBE iniciar la sesión como esa Persona, sea cual fuere la forma en que se registró (Google, código o alta del Admin). NUNCA DEBE existir más de una Persona con el mismo email.
- **FR-012**: En la web app, un código correcto para un email que no pertenece a ninguna Persona DEBE llevar al mismo registro de 4 pasos que hoy arranca con Google, con el email ya verificado y no editable.
- **FR-013**: En el backoffice, el sistema DEBE enviar el código a cualquier email pedido (tenga o no Persona o rol de cargo), con el mismo mail que a los demás. Un código correcto para un email sin Persona o sin rol de cargo DEBE llevar al mismo resultado que hoy tiene esa situación con Google, sin arrancar ningún registro.
- **FR-014**: Las reglas de estado que hoy se aplican al entrar con Google DEBEN aplicarse igual al entrar con código: `pendiente_tutor` va a la pantalla de espera (FR-008 de la 001), el menor pre-cargado y activado entra sin repetir la validación de edad (D35), y la Persona desactivada recibe el mismo trato que hoy.
- **FR-015**: Si la API no responde al verificar el código o al reconocer a la Persona, el ingreso DEBE bloquearse y mostrar la pantalla de error de verificación existente (D88, fail-closed).
- **FR-016**: La sesión DEBE durar **30 días en la web app** y **7 días en el backoffice**, y ese plazo DEBE renovarse mientras la Persona use la app. La duración es la misma se entre con Google o con código, y la sesión se cierra con la misma acción "Cerrar sesión" (FR-044 de la spec 002). Pasado el plazo sin uso, la Persona vuelve a la pantalla de ingreso.
- **FR-017**: El mail del código DEBE usar el texto acordado en Clarifications (asunto con el código incluido), estar en español rioplatense con voseo, en el tono de `docs/15-guia-ux-ui.md`, mostrar el código grande, decir cuánto dura, incluir "si no fuiste vos, ignorá este mail", y tener una versión en texto plano con la misma información.
- **FR-018**: El mail del código NO DEBE incluir ningún dato personal ni ninguna pista de si el email está registrado.
- **FR-019**: Los errores de la pantalla de código (código incorrecto, vencido, sin intentos, límite de envíos, envío fallido) DEBEN mostrarse junto al campo con la pieza compartida de errores de validación, diciendo cómo seguir (H-50), y el botón de enviar DEBE bloquearse mientras se procesa (H-57).
- **FR-020**: El sistema NO DEBE guardar el código en forma legible, ni escribirlo en logs, ni enviar el email o el código a la observabilidad de errores (D101).
- **FR-021**: El sistema DEBE contar con un servicio de envío de email intercambiable, con captura local de los mails en desarrollo y en los tests (D96, `docs/10-stack-tecnico.md` §Email), y los tests NUNCA DEBEN enviar mails reales.
- **FR-022**: Todos los textos nuevos de pantalla y del mail DEBEN salir de los mensajes traducibles (D84).

### Key Entities *(include if feature involves data)*

- **Código de ingreso** (nuevo): un pedido de ingreso por email. Guarda el email (normalizado), una huella del código (nunca el código en claro), cuándo vence, cuántos intentos fallidos lleva y si ya se usó. Existe independiente de que el email pertenezca o no a una Persona. Se descarta al usarse, al vencer o al pedirse uno nuevo para el mismo email.
- **Persona** (ya existe, spec 001): no cambia. Su email sigue siendo único; lo que cambia es que puede quedar verificado por el código además de por Google.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Una Persona con email de cualquier proveedor puede entrar a la app en menos de 2 minutos desde que escribe su email, contando la espera del mail.
- **SC-002**: El 100% de las Personas `activa` con email, cargadas por el Admin o registradas solas, pueden entrar a la app sin que el equipo les dé ninguna credencial.
- **SC-003**: Cero Personas duplicadas por email después de que la misma persona entre alternando Google y código.
- **SC-004**: Un observador que solo mira la pantalla no puede distinguir si un email está registrado o no al pedir el código.
- **SC-005**: Nadie puede entrar adivinando: con los límites de intentos y de envíos, la probabilidad de acertar un código al azar en una hora es menor a 1 en 30.000.
- **SC-006**: El mail del código se entiende sin ayuda: en la revisión manual, una persona que no conoce el sistema encuentra el código y sabe cuánto dura en menos de 10 segundos.

## Assumptions

- El registro de 4 pasos, la pantalla de `pendiente_tutor`, la pantalla de error de verificación (D88) y la acción de cerrar sesión ya existen (specs 001 y 002) y se reutilizan tal cual; esta spec no los rediseña.
- El Admin no necesita ninguna pantalla nueva para esta spec: una Persona cargada con email ya puede entrar sola. El reenvío de un código a pedido del Admin no está en alcance.
- Una persona sin email sigue sin acceso propio (D97); esta spec no agrega ningún otro medio (SMS, WhatsApp).
- El proveedor real de envío de emails en producción se define en el plan (queda pendiente en `docs/10-stack-tecnico.md`); en desarrollo y en los tests los mails se capturan localmente.
- La Persona puede cambiar de dispositivo entre pedir el código y escribirlo; no hace falta atar el código al dispositivo.
- Facebook sigue fuera de alcance como proveedor (no está implementado hoy); nada de esta spec depende de él.

## Out of Scope

- Contraseñas, enlaces mágicos (link en el mail) y cualquier otro método de ingreso distinto de Google y el código.
- Cambiar el email propio desde Perfil.
- Ingreso por SMS o WhatsApp.
- Otros mails de la plataforma (avisos importantes de D96, feedback de D102): esta spec construye el servicio de email y lo usa solo para el código; los demás mails llegan con sus propias specs.
