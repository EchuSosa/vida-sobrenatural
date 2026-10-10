# 23 — Manual de pruebas

Este manual sirve para probar la app a mano, sin saber programar y sin conocer la iglesia. Cada
caso dice **con qué persona entrar**, **qué hacer** y **qué tenés que ver**. Al lado hay una
columna vacía para anotar si salió bien o qué pasó.

> Si algo de lo que dice un caso no coincide con lo que ves en pantalla, **eso es lo que hay que
> anotar**. No hace falta saber por qué pasa.

---

## 1. Qué es la app

1. **Vida Sobrenatural** es la app de una iglesia de La Plata para acompañar a cada persona que
   llega, desde que se registra hasta que sirve en un Ministerio.
2. Cada persona ve en el celular **Mi camino**: las etapas que hizo, la que está haciendo y la que
   sigue.
3. Las personas piden cosas desde la app (empezar Vida Nueva, anotarse en un curso, postularse a un
   Ministerio, bautizarse, anotarse en un Evento).
4. El equipo de la iglesia (el **Admin**) recibe esos pedidos en una **bandeja**, los revisa y los
   asigna, desde la computadora.
5. Todo queda registrado, y cada persona recibe **avisos** cuando algo suyo cambia.

### Glosario

| Palabra | Qué quiere decir |
|---|---|
| **Persona** | Cualquiera que está cargada en la app: alguien que se registró solo o que cargó el Admin. |
| **Vida Nueva** | La primera etapa: un curso corto, uno a uno (o en grupo chico), con un Discipulador. |
| **Discipulador** | Una persona de la iglesia que acompaña a otra durante Vida Nueva. Tiene una agenda con sus horarios libres. |
| **Vida de Servicio** | La segunda etapa: un curso grupal de varias semanas, con material semanal y asistencia. |
| **Ministerio** | Un área de servicio de la iglesia (Alabanza, Niños, Bienvenida…). La gente se **postula** y el Admin aprueba. |
| **Célula / Área** | Un subgrupo dentro de un Ministerio. En pantalla dice **"Área"**. |
| **Bautismo** | Una etapa que la persona pide; el Admin la acepta y le asigna una fecha (un Evento de bautismo). |
| **Evento** | Una actividad con fecha (un retiro, un taller, un bautismo). Puede tener inscripción, cupo, lista de espera y costo. |
| **Admin** | Quien administra: ve y resuelve todo desde el backoffice. |
| **Pastor** | Ve todo el backoffice, pero **solo para mirar**: no puede cambiar nada (salvo la Palabra Profética). |
| **Líder de curso** | Quien da Vida de Servicio: carga el material de cada semana y toma asistencia, desde el celular. |
| **Tutor** | El adulto responsable de un menor de 18. Sin tutor, un menor no puede entrar a la app. |
| **Grupo de Extensión** | Un grupo chico que se reúne una vez por semana en una casa o en la iglesia. Es de mujeres, de varones o mixto según quién lo lidere. La persona lo elige en la app por cercanía. |
| **Líder de extensión** | Quien lidera un Grupo de Extensión: recibe los pedidos para sumarse y los responde desde "Mi grupo", en el celular. |

### Dos aplicaciones distintas

| | **Web app** (la de los miembros) | **Backoffice** (la del equipo) |
|---|---|---|
| Dirección | <http://localhost:3001> | <http://localhost:3002> |
| Dónde se usa | En el **celular** (también anda en la compu) | En la **computadora** |
| Quién la usa | Todos: miembros, Discipuladores, Líderes de curso | Admin y Pastor |
| Qué tiene | Mi camino (con "Mi grupo de extensión"), Eventos, Avisos, Perfil, Mis discipulados, Mis grupos, Mi grupo | Inicio con números, Solicitudes (bandeja), Personas, Grupos, Eventos, Catálogos, Notificaciones, Grupos de extensión |

Cada app tiene **su propia sesión**: entrar en una no te hace entrar en la otra.

### Resumen de casos y tiempos

| Bloque | Casos | Tiempo estimado |
|---|---|---|
| ⭐ **Demo** — el recorrido del domingo | 22 | 1 h 25 min |
| **P1** — lo principal de cada módulo y los permisos | 56 | 3 h 40 min |
| **P2** — validaciones, casos borde, celular y modo oscuro | 94 | 4 h 10 min |
| **Total** | **172** | **unas 9 h 15 min** (dos días con pausas) |

**Orden sugerido:** primero todo el bloque ⭐ (si algo falla ahí, es lo más urgente), después P1,
y si queda tiempo, P2.

---

## 2. Antes de empezar

### 2.1. Preparar el entorno

La guía paso a paso para levantar todo está en
[`specs/revision-manual/COMO-ARRANCAR.md`](../specs/revision-manual/COMO-ARRANCAR.md). En corto:

1. Levantar la base y el correo de prueba (`docker compose up -d`).
2. Cargar los datos: el mínimo (`db:seed`) y **los datos de demo** (`db:seed-demo`). Los casos de
   este manual **dan por hecho que están cargados los datos de demo**.
3. Levantar las tres partes: la API, la web app y el backoffice.
4. Tener `ALLOW_TEST_LOGIN=true` en las dos apps, para poder usar `/dev/entrar`.

> **Para partir siempre del mismo estado**, antes de una ronda completa conviene borrar la base y
> volver a cargarla (está en "Volver a un estado limpio" de COMO-ARRANCAR). Muchos casos cambian
> datos: si repetís un caso, puede que la persona ya no esté como dice "Datos de partida".

### 2.2. Entrar con cada persona: `/dev/entrar`

No hace falta tener una cuenta de Google por cada persona. Hay una pantalla de prueba:

- **Web app:** <http://localhost:3001/dev/entrar>
- **Backoffice:** <http://localhost:3002/dev/entrar>

Escribís el email de la persona (de la tabla de abajo) y tocás **"Entrar"**. Para cambiar de
persona, volvés a `/dev/entrar` y escribís otro email.

> **Consejo:** para tener dos personas abiertas a la vez (por ejemplo, el Admin en la compu y un
> miembro "en el celular"), usá **una ventana normal y una ventana de incógnito**, o dos
> navegadores distintos.

**Personas de demo** (todas ficticias). Todos los emails terminan en `@example.com`:

| Para probar como… | Email | Quién es |
|---|---|---|
| **Admin** | `demo-admin@example.com` | Mónica Cabrera, administra la app |
| **Pastor** | `demo-pastor@example.com` | Roberto Medina, ve todo sin poder cambiar |
| **Discipuladora** (poca carga) | `demo-disc-laura@example.com` | Laura Gómez: martes y jueves a la tarde, sin nadie a cargo, con una propuesta esperando |
| **Discipuladora** (media carga) | `demo-disc-marcela@example.com` | Marcela Ruiz: martes a la noche y sábado a la mañana, acompaña a dos personas |
| **Discipulador** (mucha carga) | `demo-disc-jorge@example.com` | Jorge Acosta: lunes y miércoles, acompaña a tres personas (una ya terminó) |
| **Discipulador** (no disponible) | `demo-disc-pablo@example.com` | Pablo Herrera: tiene horarios pero está de vacaciones |
| **Líder de curso** | `demo-vs-lider-1@example.com` | Da una edición de Vida de Servicio |
| Recién registrada | `demo-nueva@example.com` | Florencia Arias: se registró y todavía no empezó nada |
| Pidió Vida Nueva | `demo-vn-pendiente@example.com` | Sofía Molina: espera que le asignen Discipulador |
| Propuesta a Laura | `demo-vn-propuesta@example.com` | Julieta Ferreyra: el Admin se la propuso a Laura |
| Haciendo Vida Nueva | `demo-vn-en-curso@example.com` | Agustina Paz: la acompaña Marcela |
| Terminó Vida Nueva | `demo-vn-terminada@example.com` | Emanuel Ortiz: puede anotarse en Vida de Servicio |
| Haciendo Vida de Servicio | `demo-vs-activa-1@example.com` | Está en la edición del Líder |
| Puede elegir Ministerio | `demo-apta@example.com` | Terminó Vida de Servicio |
| Sirve en un Ministerio | `demo-miembro@example.com` | Ya está en un Ministerio |
| Postulación en revisión | `demo-ministerio-pendiente@example.com` | Se postuló y espera respuesta |
| Pidió el bautismo | `demo-bautismo-revision@example.com` | Su pedido está en revisión |
| Bautismo con fecha | `demo-bautismo-fecha-1@example.com` | Ya tiene fecha asignada |
| Tutora de un menor | `demo-tutora-silvina@example.com` | Silvina Ledesma, tutora de Tomás (14 años) |
| Menor con tutora | `demo-menor-tomas@example.com` | Tomás Ledesma: hace Vida Nueva con Jorge |
| Haciendo Vida Nueva con Jorge | `demo-vn-matias@example.com`, `demo-vn-lucas@example.com` | Matías Vera y Lucas Godoy (Jorge ya pidió dar por terminado el de Lucas) |
| Menor sin tutor | `demo-pendiente-tutor@example.com` | No puede entrar hasta que el Admin lo active |
| **Líder de un Grupo de Extensión** | `demo-gex-lider@example.com` | Carolina Benítez: lidera "Mujeres del centro" (martes 19 hs) y tiene el pedido de Sofía Molina esperando |

Además hay una persona **sin email** (Héctor Ríos), cargada por el Admin: no puede entrar a la
app, pero se la ve en el backoffice.

Para **una persona nueva**, inventá un email que no exista, por ejemplo
`prueba-1@example.com`, `prueba-2@example.com`… Al entrar con un email nuevo, la app arranca el
registro.

### 2.3. El correo de prueba (Mailpit)

Los mails que manda la app (el código para entrar, los avisos importantes) **no salen a
internet**: caen en <http://localhost:8025>. Ahí abrís el mail como en cualquier casilla.

### 2.4. Probar "como en el celular" desde la compu

Si no tenés un celular a mano: en Chrome apretá **F12**, tocá el ícono de celular (arriba a la
izquierda del panel) y elegí un modelo, por ejemplo "iPhone SE". La página se ve con el tamaño de un
celular. Los casos del bloque ⭐ de la web app conviene hacerlos así.

### 2.5. Cómo leer un caso

- **ID:** el código del caso (por ejemplo, `VN-03`). Usalo para reportar.
- **Prio:** ⭐ demo, P1 o P2.
- **Rol:** con quién entrar.
- **Partida:** cómo tiene que estar todo antes de empezar.
- **Pasos** y **Esperado:** qué hacer y qué tenés que ver. Los textos entre comillas son los que
  aparecen en pantalla (pueden variar un poco en mayúsculas o signos).
- **Resultado:** anotá **OK**, o **Falla** + qué pasó.

---

## 3. ⭐ Demo: el recorrido del domingo

Es la historia completa de una persona que llega: se registra, pide Vida Nueva, el Admin le busca
Discipuladora, ella acepta, y la persona sigue su camino. **Hacé los casos en orden**: cada uno
usa lo que dejó el anterior.

Usá un email nuevo para la persona, por ejemplo `prueba-demo-1@example.com` (si repetís la demo,
usá `prueba-demo-2@…`). **No está en la lista de botones de `/dev/entrar` a propósito**: es una
persona que todavía no existe. Escribilo en el campo "Email" de esa pantalla y tocá "Entrar"; la
app te lleva al registro.

| ID | Prio | Rol | Partida | Pasos | Esperado | Resultado |
|---|---|---|---|---|---|---|
| DEMO-01 | ⭐ | Persona nueva (celular) | Email que no existe | 1. Abrí `localhost:3001/dev/entrar`, escribí `prueba-demo-1@example.com` en el campo "Email" y tocá "Entrar".<br>2. Paso 1: completá apellido, nombre, Género **Femenino** y una fecha de nacimiento de hace 30 años. Tocá "Siguiente".<br>3. Paso 2: teléfono `221 555 1234`, una dirección, Sede **La Plata**. "Siguiente".<br>4. Paso 3: estado civil, profesión y "¿En qué año empezaste a venir?" → "Este año". "Siguiente".<br>5. Paso 4: revisá el resumen, marcá el consentimiento y tocá "Registrarme". | Arriba se ve "Paso X de 4" en cada paso. Al final aparece "¡Listo, ya sos parte!" con el botón "Ir a mi camino". | |
| DEMO-02 | ⭐ | Persona de DEMO-01 | Recién registrada | 1. Tocá "Ir a mi camino". | Se ven cuatro tarjetas en este orden: **Vida Nueva** ("La podés empezar"), **Vida de Servicio** y **Ministerio** ("Todavía no se habilita"), **Bautismo** ("Lo vas a poder pedir cuando empieces Vida Nueva"). Ninguna dice "Próximamente". Abajo se ve la barra con Inicio, Mi camino, Eventos, Avisos y Perfil. | |
| DEMO-03 | ⭐ | Persona de DEMO-01 | Igual que DEMO-02 | 1. En la tarjeta de Vida Nueva tocá "Quiero empezar Vida Nueva".<br>2. En "¿Qué días y horarios podés?" elegí **Martes**, desde **19:00** hasta **21:00**, y tocá "Agregar franja".<br>3. Tocá "Quiero empezar Vida Nueva". | Aparece el mensaje "Recibimos tu pedido de Vida Nueva." y la pantalla cambia a "Estamos buscando a tu Discipulador", con tus horarios y los botones "Editar horarios" y "Retirar el pedido". | |
| DEMO-04 | ⭐ | Persona de DEMO-01 | Pidió Vida Nueva | 1. Volvé a "Mi camino". | La tarjeta de Vida Nueva dice "Estamos buscando a tu Discipulador" y ofrece "Ver mi pedido". **No** ofrece "Ya lo hice", ni tampoco Vida de Servicio ni Ministerio (D235); Bautismo sí. | |
| DEMO-05 | ⭐ | Admin (compu) | Datos de demo cargados | 1. Abrí `localhost:3002/dev/entrar` y entrá con `demo-admin@example.com`.<br>2. Mirá la página de Inicio. | Se ven cuatro bloques con números (ninguno vacío): **"Esperan una respuesta"** (una línea por tipo, por ejemplo "N de Vida Nueva"), **"Pendientes"**, **"Cumpleaños de esta semana"** (al menos una persona que cumple hoy) y **"Cómo está la iglesia"** (personas activas, desde cuándo vienen, por Sede). | |
| DEMO-06 | ⭐ | Admin | Igual | 1. En "Esperan una respuesta", tocá la línea de Vida Nueva (o andá a "Solicitudes" y en "Tipo" elegí "Vida Nueva"). | Aparece la lista con la persona de DEMO-01 en estado "Pendiente", con "Desde hoy" en la columna Espera y "La Persona" en "La cargó". También están Sofía Molina y Héctor Ríos. | |
| DEMO-07 | ⭐ | Admin | Igual | 1. Tocá "Ver" en la fila de la persona de DEMO-01. | Se ve "Vida Nueva de …", sus horarios (martes 19 a 21) y el bloque **"Quién puede en sus horarios"**. Laura Gómez y/o Marcela Ruiz aparecen ahí, y una tiene la marca **"★ Sugerido"** (la que tiene menos carga: Laura). Jorge Acosta aparece abajo, en "No coinciden con sus horarios o con las reglas", con los motivos (entre ellos "Otro género"). Pablo Herrera (de vacaciones) no aparece como disponible. | |
| DEMO-08 | ⭐ | Admin | Igual | 1. Tocá "Elegir" junto a **Laura Gómez**.<br>2. Tocá "Proponer a Laura…" y confirmá con "Sí, proponer…". | Aparece "Le propusimos el discipulado a Laura…". La solicitud pasa a "Propuesta a Laura…, hace 0 días" y dice que espera su respuesta. | |
| DEMO-09 | ⭐ | Discipuladora Laura (celular) | Propuesta de DEMO-08 | 1. En otra ventana (incógnito), entrá a `localhost:3001/dev/entrar` con `demo-disc-laura@example.com`.<br>2. Andá a "Mis discipulados" (arriba de Mi camino está el selector "Mi camino · Mis discipulados").<br>3. En "Propuestas para vos", buscá a la persona de DEMO-01. | La tarjeta muestra nombre y edad, "Horarios en común con tu agenda" y "Coincide en horario y género". **No** se ve el teléfono de la persona todavía. También está la propuesta de Julieta Ferreyra. | |
| DEMO-10 | ⭐ | Laura | Igual | 1. Tocá "Aceptar a …" y confirmá con "Sí, acepto". | Aparece "Aceptaste. Ya podés ver los datos de contacto de …". La persona pasa a "Tus discipulados", con su teléfono y el botón para ver el discipulado. | |
| DEMO-11 | ⭐ | Persona de DEMO-01 (celular) | Laura aceptó | 1. Volvé a la ventana de la persona y abrí "Mi camino". | Vida Nueva dice "Estás haciendo Vida Nueva" / "Tu Discipulador es Laura…". En "Ver mi discipulado" están el teléfono de Laura y los botones "Escribirle por WhatsApp" y "Llamar". La tarjeta de **Bautismo** ahora dice "Podés pedir tu bautismo". | |
| DEMO-12 | ⭐ | Persona de DEMO-01 | Igual | 1. En la tarjeta de Bautismo tocá "Quiero bautizarme".<br>2. Tocá "Sí, pedir mi bautismo" sin elegir talle.<br>3. En "¿Qué talle de remera usás?" elegí uno (XS a XXXL), escribí algo en "¿Querés contarnos algo?" (opcional) y tocá "Sí, pedir mi bautismo". | Paso 2: no se envía; arriba aparece "Revisá esto antes de seguir:" con "Elegí un talle de remera de la lista." y el selector queda marcado. Paso 3: aparece "Listo: recibimos tu pedido." La tarjeta muestra "Recibimos tu pedido" y "Retirar el pedido", y **no** ofrece "Ya lo hice" (D235), y su encabezado dice "En revisión". En el backoffice, el detalle del pedido muestra el talle elegido. | |
| DEMO-13 | ⭐ | Admin | Igual | 1. En el backoffice, andá a "Personas" y tocá "Dar de alta una persona".<br>2. Completá apellido, nombre, género, fecha de nacimiento (adulto), teléfono, dirección, Sede, año en que empezó a venir, estado civil y profesión. **Dejá el email vacío** y escribí un DNI de 8 números (por ejemplo `30123456`).<br>3. Marcá la casilla de consentimiento y tocá "Dar de alta". | Aparece "Listo: … ya está cargada" y "Sin acceso a la app" (porque no tiene email). Al buscarla en Personas aparece, y en su perfil figura el DNI. | |
| DEMO-14 | ⭐ | Admin | Igual | 1. Andá a "Eventos" → "Crear un Evento".<br>2. Nombre "Noche de bienvenida", Sede La Plata, tipo General, fecha dentro de una semana, hora 20:00, una descripción.<br>3. En "Inscripción" marcá "La gente tiene que anotarse" y poné **Cupo 20**.<br>4. Tocá "Crear el Evento". | Aparece "Evento creado. Ahora podés compartir el QR o subir el flyer." Se ven el bloque "QR y link para anotarse" con "Copiar link" y "Descargar QR (PNG)". En la lista figura "0 de 20". | |
| DEMO-15 | ⭐ | Persona de DEMO-01 (celular) | Evento de DEMO-14 | 1. En la web app, tocá "Eventos" en la barra de abajo y abrí "Noche de bienvenida".<br>2. Tocá "Anotarme" y confirmá con "Sí, anotarme". | Ves "Quedan 20 lugares de 20" antes de anotarte; después, "¡Listo! Te esperamos el …". En el backoffice el Evento pasa a "1 de 20". | |
| DEMO-16 | ⭐ | Puede elegir Ministerio → Admin | `demo-apta@example.com` | 1. En la web app entrá con `demo-apta@example.com`. En Mi camino, tarjeta Ministerio, tocá "Elegir un Ministerio".<br>2. Elegí un Ministerio, escribí "¿Por qué te gustaría servir acá?" y tocá "Postularme".<br>3. En el backoffice (Admin), andá a Solicitudes → tipo "Postulación a un Ministerio", abrí la de esta persona y tocá "Aprobar" → "Sí, aprobar". | En la app: "Recibimos tu postulación…", y la tarjeta Ministerio dice **"En revisión"** / "Tu postulación está en revisión". Después de aprobar, al recargar Mi camino: "Estás sirviendo en {Ministerio}". | |
| DEMO-17 | ⭐ | Mujer adulta (celular) | Datos de demo: "Jornada de sanidad · Mujeres" | 1. En la web app entrá con `demo-nueva@example.com` (Florencia, 27 años) y tocá "Eventos" → "Jornada de sanidad · Mujeres".<br>2. Mirá "Para quién".<br>3. Tocá "Anotarme" y, sin responder nada, "Sí, anotarme".<br>4. En "¿Sos celíaca?" elegí **No**; en "¿Participaste alguna vez de una jornada de sanidad?" elegí **No, nunca**. Tocá "Sí, anotarme". | En "Para quién" dice, con un ícono de personas, "Este evento es para mujeres desde 15 años." En el paso 3 no se anota: arriba aparece "Revisá estas respuestas:" con "Respondé esta pregunta para poder anotarte.", y el mismo mensaje debajo de "¿Sos celíaca?". Debajo de esa pregunta, con un candado: "Solo lo ve el equipo que organiza; se borra 30 días después del evento." Al final: "Estás anotada", el costo con "Subir el comprobante" y el bloque "Tus respuestas". | |
| DEMO-18 | ⭐ | Varón (celular) | Igual | 1. En otra ventana (incógnito) entrá con `demo-vn-matias@example.com` (Matías Vera) y abrí "Jornada de sanidad · Mujeres". | En lugar del botón "Anotarme" se ve un recuadro con un ícono: **"Este evento es para mujeres desde 15 años."** y "Por eso no podés anotarte desde acá. Si creés que hay un error, escribile al equipo de la iglesia." No hay ningún botón para anotarse. | |

### 3.1. ⭐ Grupos de Extensión (GEX)

La otra historia del domingo: alguien que quiere sumarse a un grupo chico cerca de su casa, sin
escribirle al Admin. Hacé los casos en orden. Usá **dos ventanas** (una normal y una de incógnito)
para tener a la persona y a la líder a la vez. Florencia (`demo-nueva@…`) tiene 27 años: tiene que
ver solo los grupos de mujeres y los mixtos de su edad.

| ID | Prio | Rol | Partida | Pasos | Esperado | Resultado |
|---|---|---|---|---|---|---|
| GEX-01 | ⭐ | Recién registrada (celular) | `demo-nueva@example.com`, sin grupo | 1. En la web app entrá con `demo-nueva@example.com` y abrí "Mi camino".<br>2. Bajá hasta la tarjeta **"Mi grupo de extensión"** (está aparte, después de Bautismo) y tocá "Encontrá tu grupo".<br>3. En "Tu dirección" escribí `7 nro 1200` y tocá "Buscar grupos". | La tarjeta dice "Todavía no tenés grupo". Aparece "Grupos para vos" con los grupos **ordenados del más cercano al más lejano** ("A 1,2 km"). Están "Mujeres del centro", "Jóvenes en la iglesia" (Para todos), "Mujeres de Tolosa" y "Matrimonios de City Bell". **No** aparecen los de varones, ni "Mujeres de Gonnet" (desde 30 años) ni "Mujeres de Villa Elvira" (desde 40). Cada uno dice quién lo lidera, días y horario y la **zona**; ninguno muestra la calle y el número. | |
| GEX-02 | ⭐ | Igual | Igual | 1. En "Mujeres del centro" tocá "Quiero sumarme".<br>2. Leé el aviso y tocá "Sí, quiero sumarme". | Aparece "¡Listo! Le avisamos a quien lidera el grupo." La pantalla pasa a "Pediste sumarte a Mujeres del centro" / "Le avisamos a Carolina…", con el botón "Retirar el pedido". En Mi camino, la tarjeta dice lo mismo. | |
| GEX-03 | ⭐ | Líder (celular, otra ventana) | Pedido de GEX-02 | 1. En incógnito entrá a la web app con `demo-gex-lider@example.com`.<br>2. Abrí "Avisos".<br>3. Andá a Mi camino → selector de arriba → **"Mi grupo"**. | En Avisos hay uno nuevo: "Tenés un pedido nuevo para Mujeres del centro". En "Mi grupo", bajo "Quieren sumarse", están **Florencia Arias · 27 años** y Sofía Molina, cada una con su teléfono, su email, "Escribir por WhatsApp" y los botones "Aceptar" y "No es para este grupo". Abajo, "Integrantes" con su contacto. | |
| GEX-04 | ⭐ | Líder → Recién registrada | Igual | 1. Tocá "Escribir por WhatsApp" de Florencia (se abre WhatsApp con un saludo armado; volvé a la app).<br>2. Tocá "Aceptar" en Florencia.<br>3. Volvé a la ventana de Florencia y abrí "Mi camino". | Líder: "¡Listo! Florencia Arias ya forma parte del grupo…", y pasa a Integrantes. Florencia: en Avisos, "Ya formás parte del grupo Mujeres del centro". La tarjeta dice "Formás parte de Mujeres del centro" / "Martes a las 19:00 hs"; con "Ver mi grupo y cómo llegar" se ve la **dirección exacta** ("7 nro 1350 e/ 58 y 59"), la líder con "Llamar" y "Escribir por WhatsApp", y el botón **"Cómo llegar"**, que abre Google Maps en esa dirección. | |

---

## 4. P1: lo principal de cada módulo y los permisos

### 4.1. Registro e ingreso (REG)

| ID | Prio | Rol | Partida | Pasos | Esperado | Resultado |
|---|---|---|---|---|---|---|
| REG-01 | P1 | Persona nueva | Email nuevo (`prueba-2@example.com`) | 1. Entrá por `localhost:3001/dev/entrar` con el email nuevo.<br>2. En el paso 1 completá apellido, nombre y fecha, **pero no elijas Género**.<br>3. Tocá "Siguiente". | No avanza de paso. **Arriba del formulario** aparece el recuadro "Revisá estos campos:" con "Elegí una opción en Género." El mismo mensaje aparece debajo del campo Género. | |
| REG-02 | P1 | Persona nueva | Email nuevo, Mailpit abierto | 1. Abrí `localhost:3001/ingresar`.<br>2. En "Tu email" escribí `prueba-3@example.com` y tocá "Enviarme el código".<br>3. Abrí `localhost:8025`, buscá el mail "Tu código para entrar: …".<br>4. Escribí los 6 números y tocá "Entrar". | Después del paso 2: "Revisá tu mail" / "Te mandamos un código a … Vale por 15 minutos." Después del paso 4 arranca el registro ("Completá tus datos"). | |
| REG-03 | P1 | Persona nueva | Igual que REG-02, en la pantalla del código | 1. Escribí `000000` (u otro código que no sea el del mail) y tocá "Entrar". | Aparece "Ese código no coincide. Revisá el último mail que te mandamos, o pedí uno nuevo con «Enviarme otro código»." No entra. | |
| REG-04 | P1 | Persona nueva menor | Email nuevo | 1. Registrate como en DEMO-01, pero con una fecha de nacimiento de hace **15 años**.<br>2. En el paso 4 mirá el resumen y tocá "Registrarme". | En el resumen **no** aparece la casilla de consentimiento. Al registrarte, la pantalla dice "Todavía no podés ingresar" y explica que el equipo se va a comunicar con tu tutor. | |

### 4.2. Mi camino y "Ya lo hice" (CAM)

| ID | Prio | Rol | Partida | Pasos | Esperado | Resultado |
|---|---|---|---|---|---|---|
| CAM-01 | P1 | Recién registrada | `demo-nueva@example.com` | 1. Abrí Mi camino.<br>2. En la tarjeta **Vida de Servicio** tocá "Ya lo hice".<br>3. Escribí "La hice en 2019 en otra iglesia" y tocá "Sí, avisar a la iglesia". | Aparece "Listo: le avisamos a la iglesia." La tarjeta dice "Nos contaste que ya lo hiciste" y ofrece "Retirar". Ya no ofrece "Ya lo hice". | |
| CAM-02 | P1 | Admin | Después de CAM-01 | 1. En Solicitudes elegí el tipo "Ya lo hice" y abrí el de Florencia Arias.<br>2. Tocá "Confirmar" → "Sí, confirmar".<br>3. Entrá a la app como Florencia y mirá Mi camino. | En el backoffice se ve "Lo que contó". En la app, la tarjeta dice "Ya la hiciste · Registrado por la iglesia". En Avisos hay uno nuevo: "Confirmamos lo que nos contaste". | |
| CAM-03 | P1 | Admin | Una declaración pendiente (`demo-camino-declaro-vida-nueva@…`, María de las Mercedes) | 1. Abrí su "Ya lo hice" en Solicitudes.<br>2. Tocá "No confirmar", escribí un motivo y confirmá.<br>3. Entrá a la app como esa persona. | La tarjeta de Vida Nueva muestra "No pudimos confirmarlo", con "Lo que nos dijo el equipo: «…»" y el teléfono o la Sede para comunicarse. Vuelve a ofrecer "Ya lo hice". | |

### 4.3. Vida Nueva: pedido y bandeja (VN)

| ID | Prio | Rol | Partida | Pasos | Esperado | Resultado |
|---|---|---|---|---|---|---|
| VN-02 | P1 | Pidió Vida Nueva | `demo-vn-pendiente@example.com` con su pedido | 1. Tocá "Retirar el pedido" → "Sí, retirar el pedido". | Aparece "Retiraste tu pedido." y vuelve el formulario con "Retiraste tu pedido anterior. Podés volver a pedirlo cuando quieras." En la bandeja del Admin, el pedido figura "Retirada por la Persona". | |
| VN-03 | P1 | Discipuladora Laura → Admin | Propuesta de Julieta Ferreyra a Laura | 1. Entrá a la app como Laura → Mis discipulados.<br>2. En la propuesta de Julieta tocá "Declinar", escribí un motivo y "Sí, declinar".<br>3. En el backoffice abrí la solicitud de Julieta. | Laura ve "Declinaste la propuesta. El equipo ya lo sabe." En el backoffice la solicitud volvió a "Pendiente", reaparece "Quién puede en sus horarios", y en "Historial de propuestas" figura "Laura Gómez — La declinó" con el motivo. En Inicio, "Pendientes" cuenta una propuesta declinada. | |
| VN-04 | P1 | Admin | Una solicitud en "Propuesta a …" (por ejemplo, la de DEMO-08 antes de que Laura acepte, o una nueva) | 1. Abrí la solicitud.<br>2. Tocá "Retirar la propuesta" → "Sí, retirar la propuesta". | Aparece "Retiraste la propuesta. La Solicitud volvió a pendiente." La propuesta desaparece de "Propuestas para vos" de esa Discipuladora. | |
| VN-05 | P1 | Admin | Sofía Molina con pedido pendiente | 1. Abrí la solicitud de Sofía.<br>2. Tocá "Rechazar la Solicitud" → "Sí, rechazar la Solicitud".<br>3. Entrá a la app como Sofía y abrí Vida Nueva. | Backoffice: "Rechazaste la Solicitud." App: "Esta vez tu pedido no pudo avanzar. Si querés saber por qué, hablá con el equipo de tu sede…" y vuelve el formulario para pedir de nuevo. | |
| VN-06 | P1 | Admin | Héctor Ríos (sin email) existe | 1. En Solicitudes tocá "Pedir Vida Nueva en nombre de…".<br>2. Buscá un adulto sin email (por ejemplo la persona de DEMO-13), elegí un horario y confirmá. | Aparece "Cargamos el pedido de Vida Nueva de …". En la bandeja la fila dice, en "La cargó", el nombre del Admin (no "La Persona"). | |

### 4.4. Discipulador (DIS)

| ID | Prio | Rol | Partida | Pasos | Esperado | Resultado |
|---|---|---|---|---|---|---|
| DIS-01 | P1 | Discipuladora Marcela | Acompaña a Agustina Paz | 1. Mis discipulados → "Ver el discipulado de Agustina…".<br>2. Tocá "Registrar encuentro", dejá la fecha de hoy, en "Capítulos" escribí `3 y 4` y tocá "Guardar encuentro". | Aparece "Encuentro registrado." y en la lista figura la fecha, "Capítulos: 3 y 4" y "Vinieron todos". Ya se ven encuentros anteriores cargados por la demo. | |
| DIS-03 | P1 | Discipulador Jorge → Admin | Jorge acompaña a Matías | 1. Como Jorge, abrí el discipulado de Matías y tocá "Pedir la baja de Matías…" → escribí un motivo → "Sí, pedir la baja".<br>2. Como Admin, en Inicio → "Pendientes" tocá "baja pedida para confirmar" y confirmá con "Sí, dar de baja". | Jorge ve "Pediste su baja el … Falta que el Admin la confirme." Después de confirmar, el grupo se cierra (era la única persona) y Matías, en Mi camino, ve "Tu discipulado se dio de baja" y puede volver a pedir. | |
| DIS-04 | P1 | Admin | Jorge ya pidió dar por terminado el discipulado de Lucas (lo deja la demo) | 1. En Inicio → Pendientes, tocá "discipulado para dar por terminado".<br>2. Tocá "Confirmar que terminó" → "Sí, dar por terminado".<br>3. Entrá a la app como Lucas Godoy (`demo-vn-lucas@example.com`). | Lucas ve "¡Terminaste Vida Nueva!" y la tarjeta de **Vida de Servicio** ya se puede pedir. | |
| DIS-05 | P1 | Discipuladora Laura → Admin | Laura tiene horarios y está disponible | 1. Como Laura, andá a "Ver y cambiar mi disponibilidad" y tocá "Apagar mi disponibilidad".<br>2. Como Admin, abrí una solicitud de Vida Nueva pendiente de una mujer con martes a la tarde. | Laura ya no aparece en "Quién puede en sus horarios". Volvé a prenderla al terminar. | |

### 4.5. Personas (PER)

| ID | Prio | Rol | Partida | Pasos | Esperado | Resultado |
|---|---|---|---|---|---|---|
| PER-01 | P1 | Admin | La persona de DEMO-13 existe | 1. Personas → buscá a la persona → abrí su perfil.<br>2. Tocá "Editar datos", cambiá la dirección y tocá "Guardar cambios". | Aparece "Guardamos los cambios" y el perfil muestra la dirección nueva. | |
| PER-02 | P1 | Admin | Igual | 1. Andá a "Dar de alta una persona" y cargá otra con **el mismo DNI** que la de DEMO-13. | No deja crearla: "Ya hay una Persona con este DNI: … No se puede cargar dos veces…" con un enlace a su perfil. No hay opción de "crear igual". | |
| PER-03 | P1 | Admin | Igual | 1. Cargá otra persona sin DNI pero con **el mismo teléfono** que una que ya existe. | Aparece "Puede que esta persona ya esté cargada" con la coincidencia ("Coincide en: el teléfono") y el botón "Es otra persona, crear igual". | |
| PER-04 | P1 | Admin | `demo-nueva@example.com` sin roles de cargo | 1. Personas → buscá a Florencia Arias → "Cambiar roles".<br>2. En Discipulador/a tocá "Otorgar".<br>3. Entrá a la app como Florencia. | Backoffice: "Florencia… ahora tiene el rol de Discipulador/a." App: arriba de Mi camino aparece el selector con "Mis discipulados", y ahí "Todavía no cargaste tus horarios". | |
| PER-05 | P1 | Admin | Jorge tiene discipulados en curso | 1. "Cambiar roles" de Jorge Acosta → quitar Discipulador. | No se puede: "Todavía no se le puede quitar el rol de Discipulador, porque tiene a su cargo:" y la lista. | |

### 4.6. Menores y tutores (MEN)

| ID | Prio | Rol | Partida | Pasos | Esperado | Resultado |
|---|---|---|---|---|---|---|
| MEN-01 | P1 | Admin | `demo-pendiente-tutor@example.com` está pendiente | 1. Andá a "Pendientes tutor".<br>2. En el menor tocá "Activar", buscá a la tutora (`Zabala Quintero`, o cargá nombre y teléfono a mano) y confirmá.<br>3. Entrá a la app con el email del menor. | Backoffice: "…: caso activado." App: el menor entra y ve Mi camino (ya no "Todavía no podés ingresar"). | |

### 4.7. Vida de Servicio (VS)

| ID | Prio | Rol | Partida | Pasos | Esperado | Resultado |
|---|---|---|---|---|---|---|
| VS-01 | P1 | Terminó Vida Nueva | `demo-vn-terminada@example.com` | 1. Mi camino → tarjeta Vida de Servicio → "Quiero anotarme".<br>2. Elegí la edición (si hay una sola ya viene elegida) y tocá "Enviar mi pedido". | Aparece "Recibimos tu pedido." y la tarjeta dice "Recibimos tu pedido", con "Retirar mi pedido". | |
| VS-02 | P1 | Admin | Después de VS-01 | 1. Solicitudes → tipo "Vida de Servicio" → abrí el pedido.<br>2. "Aprobar inscripción" → elegí la edición → "Aprobar". | "Listo: … quedó inscripta." En la app, la tarjeta dice "Estás haciendo Vida de Servicio" con "Ver el material y mi asistencia". | |
| VS-03 | P1 | Líder de curso (celular) | `demo-vs-lider-1@example.com` | 1. Abrí "Mis grupos" y entrá a tu edición.<br>2. En una semana sin material, tocá "Cargar el material de la semana N".<br>3. Escribí un título y un texto, y tocá "Guardar material". | "Guardamos el material de la semana N." La semana aparece como cargada. | |
| VS-04 | P1 | Líder de curso | Igual | 1. En la edición tocá "Tomar asistencia".<br>2. Tocá a una persona para que quede "No vino" y "Guardar asistencia". | "Guardamos la asistencia del …". En "Inscriptos", esa persona suma una falta. | |

### 4.8. Ministerios (MIN)

| ID | Prio | Rol | Partida | Pasos | Esperado | Resultado |
|---|---|---|---|---|---|---|
| MIN-01 | P1 | Puede elegir Ministerio | Una persona apta sin postulación (por ejemplo, `demo-apta@…` si no hiciste DEMO-16, o `demo-ministerio-rechazada@…`) | 1. Mi camino → "Elegir un Ministerio".<br>2. Entrá a uno de "Requieren formación previa" (por ejemplo Niños) y postulate. | En el detalle se ve "Este ministerio requiere capacitación o audición: el equipo te va a contactar." Después de postularte, la tarjeta de Mi camino dice "En revisión" y repite ese aviso. | |
| MIN-02 | P1 | Admin | Postulación de MIN-01 | 1. Abrila desde Solicitudes.<br>2. Tocá "Rechazar", escribí un motivo y "Sí, rechazar".<br>3. Entrá a la app como esa persona. | Backoffice: se ve "Requiere capacitación o audición". App: "Tu postulación a … no avanzó esta vez…" **sin** mostrar el motivo, y puede volver a elegir. | |
| MIN-03 | P1 | Postulación en revisión | `demo-ministerio-pendiente@example.com` | 1. Mi camino → tarjeta Ministerio → "Retirar postulación" → "Sí, retirarla". | "Listo, retiraste tu postulación." La tarjeta cambia sin recargar y ofrece "Elegir un Ministerio". | |

### 4.9. Bautismo (BAU)

| ID | Prio | Rol | Partida | Pasos | Esperado | Resultado |
|---|---|---|---|---|---|---|
| BAU-01 | P1 | Admin | Pedido en revisión (`demo-bautismo-revision@…`, o el de DEMO-12) y un Evento de bautismo próximo | 1. Solicitudes → tipo "Bautismo" → abrí el pedido.<br>2. Tocá "Aceptar", elegí la fecha del Evento de bautismo y "Sí, aceptar".<br>3. Entrá a la app como esa persona. | App: "Ya tenés fecha para tu bautismo", con fecha, hora, lugar y los botones "No puedo ese día" y "Retirar el pedido". | |
| BAU-05 | P1 | Admin | El Evento de bautismo próximo de la demo ("Bautismos en el río — Punta Lara"), con tres asignadas | 1. Eventos → abrí el Evento de bautismo → sección Bautismo.<br>2. Abrí el pedido de una de las asignadas, cambiá el talle en "Cambiar el talle" y tocá "Guardar talle".<br>3. Volvé al Evento. | Paso 1: debajo de "Personas a bautizar (3)" dice "Remeras: S: 1 · L: 1 · Sin dato: 1", y cada persona muestra su talle ("talle S", "sin dato"). La descripción del Evento menciona la charla pre-bautismo a las 9 y qué traer. Paso 2: "Listo: el talle quedó en …". Paso 3: el resumen ya cuenta el talle nuevo. | |
| BAU-03 | P1 | Admin → Recién registrada | `demo-nueva@example.com` sin Vida Nueva | 1. En el perfil de Florencia, sección Bautismo, tocá "Habilitar el bautismo" → "Sí, habilitar".<br>2. Entrá a la app como Florencia. | Backoffice: "Listo: ya puede pedir el bautismo." App: la tarjeta de Bautismo dice "Podés pedir tu bautismo" **aunque no hizo Vida Nueva**, y el encabezado dice "La podés empezar" (no "Todavía no se habilita"). | |
| BAU-04 | P1 | Admin | Evento de bautismo **pasado** con personas asignadas (lo deja la demo) | 1. Eventos → filtro "Pasados" → abrí el Evento de bautismo.<br>2. En "¿Quiénes se bautizaron?" destildá a una persona y tocá "Confirmar bautismos". | Los tildados quedan bautizados (en la app ven "Te bautizaste"). El destildado vuelve a "Esperando fecha". | |

### 4.10. Eventos (EVE)

| ID | Prio | Rol | Partida | Pasos | Esperado | Resultado |
|---|---|---|---|---|---|---|
| EVE-01 | P1 | Cualquier miembro | Un Evento con cupo lleno y lista de espera (lo deja la demo) | 1. Eventos → abrí el que dice "Cupo completo: hay lista de espera".<br>2. Tocá "Anotarme en la lista de espera" y confirmá. | "Quedaste en el lugar N de la lista de espera…". En "Mis inscripciones" figura en espera. | |
| EVE-02 | P1 | Cualquier miembro con lugar en ese Evento | Igual | 1. Con una persona **confirmada** en ese Evento, abrí Eventos → Mis inscripciones → "Cancelar inscripción" → "Sí, cancelar inscripción". | "Cancelaste tu inscripción." La primera de la lista de espera pasa a confirmada y ve "¡Se liberó un lugar…!" en Avisos. | |
| EVE-03 | P1 | Miembro | Un Evento **con costo** (lo deja la demo) | 1. Anotate al Evento con costo.<br>2. Tocá "Subir el comprobante", completá monto, cómo pagaste, fecha, y elegí una imagen o PDF (hay ejemplos en `specs/revision-manual/imagenes-de-prueba/`).<br>3. "Enviar comprobante". | "Recibimos tu comprobante. El equipo lo revisa y te avisamos." | |
| EVE-04 | P1 | Admin | Pago de EVE-03 (o el que deja la demo) | 1. Solicitudes → tipo "Pago de un Evento" → abrí el pago.<br>2. Tocá "Descargar el comprobante" y después "Verificar pago". | Se descarga el archivo. "Pago verificado." En la app, la persona ve en Avisos "Recibimos tu pago de …". | |
| EVE-20 | P1 | Admin | Datos de demo (y DEMO-17 si ya lo hiciste) | 1. En el backoffice, Eventos → "Jornada de sanidad · Mujeres".<br>2. Bajá hasta "Inscripciones". | Arriba de las pestañas, "Respuestas a las preguntas": **"¿Sos celíaca?"** con un candado y "Dato sensible", y "Sí: 2 · No: 6" (No: 7 si hiciste DEMO-17); "¿Participaste alguna vez…?" con "Sí, hace mucho: 3 · No, nunca: 4" (5 con DEMO-17). En cada fila: la edad en años (al día del Evento), el teléfono, "Sirve en …" o "La acompaña …" cuando corresponde (Agustina Paz: "La acompaña Marcela Ruiz"), y la columna **Respuestas** con lo que contestó. | |
| EVE-21 | P1 | Admin | Ninguna | 1. Eventos → "Crear un Evento". Completá nombre, Sede, fecha y descripción.<br>2. En "Para quién es" elegí **Varones** y Edad mínima **18**.<br>3. Marcá "La gente tiene que anotarse".<br>4. En "Preguntas para la inscripción" tocá "Agregar una pregunta": "¿Venís con tu auto?", tipo **Sí / No**, marcá "Hay que responderla para anotarse".<br>5. "Crear el Evento". | Aparece "Evento creado…". En los datos, "Para quién" dice "Este evento es para varones desde 18 años." En "Inscripciones" aparece "Respuestas a las preguntas" con "¿Venís con tu auto?" y "Sí: 0 · No: 0". | |
| EVE-22 | P1 | Pastor | Datos de demo | 1. Entrá al backoffice con `demo-pastor@example.com` y abrí "Jornada de sanidad · Mujeres". | Ve la lista de inscriptas y el resumen de "¿Participaste alguna vez…?", pero **no** aparece "¿Sos celíaca?": ni en el resumen ni en la columna Respuestas. No ve botones para cambiar nada. | |
| EVE-23 | P1 | Menor de 15 (celular) | Datos de demo: "Noche de jóvenes" (de 15 a 30 años) | 1. En la web app entrá con `demo-menor-tomas@example.com` (Tomás, 14 años) y abrí "Noche de jóvenes". | "Para quién" dice "Este evento es para todas las personas desde 15 años hasta 30 años." y, en lugar del botón, el recuadro que explica que no puede anotarse desde acá. | |

### 4.11. Avisos, comentarios y catálogos (AVI, COM, CAT)

| ID | Prio | Rol | Partida | Pasos | Esperado | Resultado |
|---|---|---|---|---|---|---|
| AVI-01 | P1 | Admin en la app | `demo-admin@example.com` en la web app (tiene avisos leídos y sin leer) | 1. Tocá "Avisos" en la barra de abajo.<br>2. Abrí uno "Sin leer" y volvé.<br>3. Tocá "Marcar todos como leídos". | Se ven 20 por página con "Anterior"/"Siguiente". El que abriste deja de decir "Sin leer". Al final: "Listo, marcamos todos como leídos." | |
| AVI-02 | P1 | Admin | Mailpit abierto | 1. En el backoffice: Notificaciones → "Enviar un aviso".<br>2. Título y mensaje, "A todas las personas", marcá "Importante".<br>3. "Revisar y mandar" → "Mandar aviso". | Antes de mandar dice a cuántas personas les llega y cuántas por mail. Después: "Listo, mandamos el aviso." Aparece en la lista con "Leído por 0 de N". En Mailpit llegan mails con el botón "Ver en la app". | |
| COM-01 | P1 | Cualquiera (sin sesión) | — | 1. Abrí `localhost:3001/contanos` (o el enlace del pie de página).<br>2. Elegí "Una sugerencia", escribí algo y tocá enviar. | "¡Gracias! Lo vamos a leer." | |
| CAT-01 | P1 | Admin | — | 1. Catálogos → Sedes → abrí La Plata.<br>2. En **"WhatsApp de Secretaría"** escribí `221 555 0101` y guardá.<br>3. Abrí `localhost:3001/visitanos`. | En Visitanos aparece el botón **"Escribir por WhatsApp"** con el ícono de WhatsApp, y al tocarlo abre WhatsApp (`wa.me/…`). | |
| CAT-02 | P1 | Admin | Después de CAT-01 | 1. Borrá el WhatsApp de la Sede y guardá.<br>2. Recargá Visitanos. | El botón "Escribir por WhatsApp" ya no aparece; el resto de la información sigue igual. | |

### 4.12. Permisos: cada rol hace solo lo suyo (ROL)

| ID | Prio | Rol | Partida | Pasos | Esperado | Resultado |
|---|---|---|---|---|---|---|
| ROL-01 | P1 | Pastor | `demo-pastor@example.com` en el backoffice | 1. Recorré Inicio, Personas, Solicitudes, Eventos. | Ve todo, pero **sin botones de cambiar**: no hay "Dar de alta una persona", "Crear un Evento", "Enviar un aviso", ni "Proponer" en una Vida Nueva. | |
| ROL-02 | P1 | Pastor | Igual | 1. Escribí a mano `localhost:3002/eventos/nuevo`. | Aparece "No encontramos esta sección" (no se puede crear un Evento). | |
| ROL-04 | P1 | Discipuladora Laura | Laura en el **backoffice** | 1. Entrá a `localhost:3002/dev/entrar` con Laura. | Ve "Lo tuyo está en la app" con el botón "Ir a la app". No tiene menú. | |
| ROL-05 | P1 | Recién registrada | Florencia en el backoffice (si ya le diste Discipulador en PER-04, usá otra, por ejemplo `demo-vn-pendiente@…`) | 1. Entrá a `localhost:3002/dev/entrar` con esa persona. | "Tu cuenta no tiene acceso al backoffice". | |
| ROL-06 | P1 | Miembro común | `demo-vn-en-curso@example.com` en la app | 1. Escribí a mano `localhost:3001/mis-discipulados` y después `localhost:3001/mis-grupos`. | En los dos casos vuelve a Mi camino: no ve pantallas de Discipulador ni de Líder. | |


### 4.13. Grupos de Extensión (GEX)

| ID | Prio | Rol | Partida | Pasos | Esperado | Resultado |
|---|---|---|---|---|---|---|
| GEX-05 | P1 | Admin | Backoffice | 1. Andá a "Grupos de extensión" (menú) → "Crear un grupo".<br>2. Nombre "Grupo de prueba", en "Quién lo lidera" buscá `Hernán`, tocá "Elegir" en Hernán Coronel; marcá **jueves**, hora **18:30**.<br>3. Marcá "En la iglesia" y tocá "Crear el grupo". | Mientras elegís el líder aparece "Este grupo es para: Varones". Al crear, se abre el detalle con "Para: Varones", "Jueves a las 18:30 hs" y el lugar "En la iglesia (La Plata): …". En la lista figura con "0" integrantes. | |
| GEX-06 | P1 | Admin | Backoffice | 1. "Crear un grupo" con nombre, la líder `Natalia` (Ibáñez), sábado 15:00.<br>2. Calle `64`, número `820`, entre `11` y `12`, zona `Centro`.<br>3. En "Quién lo lidera" sumá también a `Federico` (Ibáñez). Crear. | Con los dos líderes dice "Este grupo es para: Mixto". El detalle muestra "64 nro 820 e/ 11 y 12" y la zona. Si la dirección no se pudo ubicar en el mapa, avisa "No pudimos ubicar la dirección…" y el grupo queda igual, marcado "Sin ubicar en el mapa". | |
| GEX-07 | P1 | Admin | "Mujeres de Gonnet" (completo, 4 de 4) | 1. Abrí el grupo.<br>2. Fijate en "Agregar a una persona".<br>3. Entrá a la app como `demo-vn-rocio@example.com` (36 años) y buscá con `15 nro 1100`. | Backoffice: dice "4 de 4" y **no** ofrece agregar. App: "Mujeres de Gonnet" aparece con **"Completo: no quedan lugares"**, sin botón "Quiero sumarme". | |
| GEX-08 | P1 | Admin → persona | "Mujeres de Tolosa" | 1. En el detalle, en "Agregar a una persona" buscá `Valeria` y tocá "Agregar al grupo" en Valeria Domínguez.<br>2. Después tocá "Quitar del grupo" en ella → "Sí, quitar". | Al agregarla: "Agregamos a Valeria… y le avisamos" (en su app ve el aviso "Te sumaron al grupo Mujeres de Tolosa" y la tarjeta con el grupo). Al quitarla, deja de figurar y en su app la tarjeta dice "Ya no figurás en Mujeres de Tolosa". | |
| GEX-09 | P1 | Admin | Pedido pendiente de Sofía (`demo-vn-pendiente@…`) | 1. Andá a Solicitudes → tipo **"Grupo de extensión"**.<br>2. Abrí el de Sofía. | Aparece en la bandeja con el tipo "Grupo de extensión", el grupo y su espera (pidió hace 2 días). El detalle muestra a Sofía (edad, teléfono, email), el grupo con sus lugares ocupados, y los botones "Aceptar" y "No es para este grupo". En el Inicio, "Pendientes" incluye la línea de pedidos de grupos de extensión. | |
| GEX-10 | P1 | Pastor y miembro | `demo-pastor@…` en el backoffice; `demo-vn-en-curso@…` en la app | 1. Pastor: abrí "Grupos de extensión" y un grupo.<br>2. Miembro: escribí a mano `localhost:3001/mi-grupo-extension`. | Pastor: ve todo con "Podés ver los grupos, pero no cambiarlos.", sin "Crear un grupo", "Editar", "Aceptar" ni "Quitar". Miembro: "Todavía no liderás ningún grupo de extensión…" (no ve pedidos de nadie). | |

---

## 5. P2: validaciones, casos borde, celular y modo oscuro

Acá lo importante es **que cada error diga qué está mal y cómo corregirlo**, debajo del campo y en
un recuadro arriba ("Revisá…") con enlace a cada campo. Anotá cualquier mensaje confuso.

### 5.1. Registro e ingreso (REG)

| ID | Prio | Rol | Partida | Pasos | Esperado | Resultado |
|---|---|---|---|---|---|---|
| REG-05 | P2 | Recién registrada | `demo-nueva@example.com` | 1. Entrá por `/dev/entrar` con ese email.<br>2. Abrí `localhost:3001/registro`. | No te pide los datos de nuevo: te lleva al Inicio de la app con "Ya estás registrada, no hace falta completarlo de nuevo." | |
| REG-10 | P2 | Persona nueva | Email nuevo, paso 1 | 1. Dejá todo vacío y tocá "Siguiente". | En el recuadro de arriba y debajo de cada campo: "Escribí tu apellido.", "Escribí tu nombre.", "Elegí una opción en Género." y el de la fecha ("…El año va con 4 números, por ejemplo 1965."). | |
| REG-11 | P2 | Persona nueva | Paso 2 | 1. Escribí el teléfono `abc` y tocá "Siguiente". | "Ingresá un teléfono con código de área, por ejemplo 221 555 1234." | |
| REG-12 | P2 | Persona nueva | Paso 3 | 1. En Profesión elegí "Otro" y dejá "¿Cuál?" vacío. "Siguiente". | Aparece el campo "¿Cuál?" y el error "Escribí a qué te dedicás." | |
| REG-13 | P2 | Persona nueva | Paso 4, adulto | 1. No marques el consentimiento y tocá "Registrarme". | "Necesitamos tu consentimiento para guardar tus datos." / "Tenés que marcar la casilla para continuar." No se registra. | |
| REG-15 | P2 | Persona nueva | Pantalla de ingreso | 1. En "Tu email" escribí `hola@` y "Enviarme el código". | "Escribí un email completo, por ejemplo nombre@hotmail.com." | |
| REG-16 | P2 | Persona nueva | Ya pediste un código (REG-02) | 1. Tocá "Enviarme otro código".<br>2. Probá el código **viejo**. | "Listo, te mandamos un código nuevo. El anterior ya no sirve." Con el viejo: "Este código ya no sirve…" o "Ese código no coincide…". | |
| REG-17 | P2 | Persona nueva | Pantalla de ingreso | 1. Pedí el código 6 veces seguidas para el mismo email. | La sexta vez: "Pediste muchos códigos seguidos. Probá de nuevo en N minutos." | |
| REG-18 | P2 | Recién registrada | Entrar por código con `demo-nueva@…` (y antes por `/dev/entrar`) | 1. Entrá por código con el email de Florencia. | Entra a **la misma** persona (Mi camino igual que antes), no arranca otro registro. | |

### 5.2. Mi camino (CAM)

| ID | Prio | Rol | Partida | Pasos | Esperado | Resultado |
|---|---|---|---|---|---|---|
| CAM-04 | P2 | Haciendo Vida Nueva | `demo-vn-en-curso@example.com` | 1. Abrí Mi camino. | Vida Nueva dice "Estás haciendo Vida Nueva" y **no** ofrece "Ya lo hice". Bautismo dice "Podés pedir tu bautismo". Vida de Servicio y Ministerio siguen sin habilitarse y **no** ofrecen "Ya lo hice" (D235). | |
| CAM-10 | P2 | Recién registrada | Florencia | 1. "Ya lo hice" en Bautismo, pegá un texto de más de 500 caracteres. | El contador marca el límite y aparece "Escribí hasta 500 caracteres." | |
| CAM-11 | P2 | Recién registrada | Una declaración pendiente (CAM-01) | 1. Tocá "Retirar" → "Sí, retirar". | "Listo, lo retiraste." Vuelve a ofrecer "Ya lo hice". | |
| CAM-12 | P2 | Declaró Vida Nueva | `demo-camino-declaro-vida-nueva@…` con la declaración pendiente | 1. Intentá pedir Vida Nueva desde la tarjeta. | No deja pedirla mientras la iglesia revisa lo que contó (lo dice la tarjeta). | |
| CAM-13 | P2 | Admin | Perfil de una persona | 1. Sección Etapas → "Registrar como hecha" en Vida Nueva, con una nota → "Sí, registrar".<br>2. Después "Anular" → "Sí, anular". | La persona ve en Mi camino "Ya la hiciste · Registrado por la iglesia" y, al anular, vuelve como estaba. | |
| CAM-14 | P2 | Haciendo Vida de Servicio | `demo-vs-activa-1@…` | 1. Mirá la tarjeta de Vida de Servicio. | El encabezado de la tarjeta dice "La estás haciendo", igual que lo de abajo ("Estás haciendo Vida de Servicio"); no ofrece "Ya lo hice". | |
| CAM-15 | P2 | Pidió el bautismo | `demo-bautismo-revision@…` | 1. Mirá la tarjeta de Bautismo. | El encabezado dice "En revisión" (no "La podés empezar" ni "Todavía no se habilita"), igual que lo de abajo ("Recibimos tu pedido"). | |
| CAM-16 | P2 | Bautismo con fecha | `demo-bautismo-fecha-1@…` | 1. Mirá la tarjeta de Bautismo. | El encabezado dice "Ya tenés fecha" / "Es el …", igual que lo de abajo; no ofrece "Ya lo hice". | |

### 5.3. Vida Nueva y Discipulador (VN, DIS)

| ID | Prio | Rol | Partida | Pasos | Esperado | Resultado |
|---|---|---|---|---|---|---|
| VN-01 | P2 | Pidió Vida Nueva | `demo-vn-pendiente@example.com` | 1. Abrí Mi camino → "Ver mi pedido".<br>2. Tocá "Editar horarios", agregá **Sábado 10:00 a 12:00** y tocá "Guardar horarios". | Aparece "Guardamos tus horarios." y en "Tus horarios" figura el sábado. | |
| DIS-02 | P2 | Agustina (app) | Después de DIS-01 | 1. Entrá como `demo-vn-en-curso@example.com` → Mi camino → "Ver mi discipulado". | Ve a su Discipuladora y su teléfono. **No** ve las notas de los encuentros. | |
| VN-10 | P2 | Persona nueva | Formulario de Vida Nueva | 1. Sin agregar ningún horario, tocá "Quiero empezar Vida Nueva". | "Elegí un día y un horario en el que la hora de fin sea después de la de inicio, y tocá "Agregar franja"." | |
| VN-11 | P2 | Persona nueva | Igual | 1. Martes de 19:00 a 19:30 → "Agregar franja". | "Cada horario tiene que durar al menos 1 hora…". | |
| VN-13 | P2 | Persona nueva | Igual | 1. Elegí día y horas pero **no** toques "Agregar franja"; tocá "Quiero empezar Vida Nueva". | Se envía igual con ese horario (no hace falta tocar "Agregar franja"). | |
| VN-16 | P2 | Pastor | Una solicitud de Vida Nueva pendiente | 1. Abrila. | Ve los datos y horarios, **no** ve el cruce de Discipuladores ni botones. | |
| DIS-11 | P2 | Discipuladora Marcela | Registrar encuentro | 1. Fecha de mañana → "Guardar encuentro". | "La fecha no puede ser posterior a hoy…". | |
| DIS-12 | P2 | Discipuladora Marcela | Registrar encuentro | 1. "Capítulos" vacío → guardar. | "Escribí qué capítulos vieron, por ejemplo "1 y 2"…". | |
| DIS-13 | P2 | Discipuladora | Propuesta que el Admin retiró mientras la mirabas (VN-04 con la pantalla de la Discipuladora abierta) | 1. Tocá "Aceptar". | "Esa propuesta ya no está vigente: ya se respondió o se retiró. Actualizamos la pantalla." | |
| DIS-14 | P2 | Admin | Reasignar: un discipulado en curso | 1. Grupos → abrí el de Agustina → "Cambiar de Discipulador" → elegí a Laura → "Sí, proponer". | "Propuesta enviada a Laura…". Hasta que acepte, sigue Marcela. | |
| DIS-15 | P2 | Admin | Pedido de baja de un Discipulador | 1. En vez de confirmar, tocá "Rechazar la baja de …" con un motivo. | El Discipulador ve en "Para revisar": "El equipo no confirmó la baja de…" con el motivo. | |
| DIS-16 | P2 | Admin y Laura | Después de DIS-14 (reasignación a Laura propuesta), con Mailpit abierto | 1. En el backoffice, en el discipulado de Agustina, tocá "Retirar la propuesta" → "Sí, retirar".<br>2. Entrá a la web app como `demo-disc-laura@example.com` y tocá "Avisos". | Laura tiene un aviso "Sin leer": "Ya no hace falta que respondas la propuesta". Al tocarlo la lleva a Mis discipulados, donde la propuesta ya no está. **No** le llega mail. Lo mismo pasa si el Admin retira una propuesta de Vida Nueva (VN-04). | |

### 5.4. Personas, menores y tutores (PER, MEN)

| ID | Prio | Rol | Partida | Pasos | Esperado | Resultado |
|---|---|---|---|---|---|---|
| PER-06 | P2 | Admin | Perfil de Agustina Paz | 1. Abrí su perfil. | Se ven las secciones Datos, Roles, Solicitudes, Grupos, Familia, Etapas, Vida de Servicio, Ministerio, Bautismo y Eventos. En Grupos figura el de Marcela. **No** aparecen las notas de los encuentros. | |
| MEN-02 | P2 | Admin | Tomás Ledesma (14) con tutora Silvina | 1. Abrí el perfil de Tomás. | Tiene la marca "Menor de edad" y en Datos/Familia figura su tutora con enlace a su perfil. | |
| PER-10 | P2 | Admin | Dar de alta | 1. Tocá "Dar de alta" sin completar nada. | Recuadro arriba con todos los errores y cada uno debajo de su campo (apellido, nombre, género, fecha, teléfono, dirección, Sede, estado civil, profesión, año, consentimiento). | |
| PER-11 | P2 | Admin | Dar de alta | 1. Fecha de nacimiento de hace 15 años, todo lo demás bien. | "Desde acá solo se dan de alta personas mayores de 18…". | |
| PER-12 | P2 | Admin | Dar de alta | 1. DNI `12.345.678` (con puntos). | "El DNI tiene que tener 7 u 8 números. Escribilo solo con números, sin puntos." | |
| PER-13 | P2 | Admin | Persona sin email (DEMO-13) | 1. En Personas, "Agregar email" → un email que ya usa otra persona. | "Ya existe una cuenta registrada con este email." Con uno libre: "Listo: … ya puede entrar a la app con ese email." | |
| PER-15 | P2 | Admin | Tu propio perfil | 1. "Cambiar roles" → quitarte Admin. | "No podés quitarte tu propio rol de Admin…". | |
| MEN-10 | P2 | Admin | Pendientes tutor | 1. En un caso tocá "Cerrar el caso" → confirmar. | "Caso cerrado." y desaparece de la lista. | |
| MEN-11 | P2 | Discipulador Jorge | Jorge acompaña a Tomás (14) | 1. Abrí el discipulado. | Muestra "Es menor de edad: coordiná también con su tutor o tutora." y los datos de la tutora. | |

### 5.5. Vida de Servicio, Ministerios y Bautismo (VS, MIN, BAU)

| ID | Prio | Rol | Partida | Pasos | Esperado | Resultado |
|---|---|---|---|---|---|---|
| VS-05 | P2 | Haciendo Vida de Servicio | `demo-vs-activa-1@example.com` | 1. Mi camino → "Ver el material y mi asistencia". | Se ven las semanas con su estado ("Disponible", "Próximamente"…) y "Viniste X de Y encuentros." Una semana con fecha futura no se puede abrir. | |
| VS-10 | P2 | Pidió Vida Nueva | `demo-vn-pendiente@…` | 1. Mirá la tarjeta de Vida de Servicio. | "Para anotarte primero tenés que hacer Vida Nueva." y "Ver Vida Nueva", sin botón de anotarse. | |
| VS-11 | P2 | Líder de curso | Cargar material | 1. Título vacío y nada más → "Guardar material". | Errores de título y "Agregá un texto, un archivo o un enlace." | |
| VS-12 | P2 | Líder de curso | Cargar material | 1. Subí una imagen y no completes "Qué muestra la imagen…". | Pide el texto alternativo de la imagen. | |
| VS-13 | P2 | Líder de curso | Detalle de la edición | 1. Tocá "Proponer baja de …" → "Dejó de venir sin avisar" → confirmá.<br>2. Como Admin, confirmá la baja. | La persona queda como "abandonó"; en la app ve "Dejaste la edición…". | |
| MIN-04 | P2 | Sirve en un Ministerio → Admin | `demo-miembro@example.com` | 1. Mi camino → "Quiero cambiar de Ministerio" → postulate a otro.<br>2. Como Admin abrí la postulación y tocá "Aprobar". | El Admin ve "Ya pertenece a …" y la confirmación "¿Confirmás el cambio?". Al confirmar, en la app dice "Estás sirviendo en {nuevo}". | |
| MIN-10 | P2 | Puede elegir Ministerio | Formulario de postulación | 1. Pegá más de 500 caracteres en "¿Por qué te gustaría servir acá?". | "Puede tener hasta 500 caracteres: acortalo un poco." | |
| MIN-11 | P2 | Postulación en revisión | `demo-ministerio-pendiente@…` | 1. Abrí otro Ministerio desde la lista. | "Ya tenés una postulación en revisión a …" y no deja postularse a otro. | |
| MIN-12 | P2 | Pastor | Una postulación | 1. Abrila. | "Ves esta postulación en modo lectura.", sin botones. | |
| MIN-14 | P2 | Haciendo Vida Nueva | `demo-vn-en-curso@…` | 1. Mi camino → tarjeta Ministerio. | "Primero, Vida de Servicio" y "Conocé los Ministerios". | |
| BAU-02 | P2 | Persona con fecha | La de BAU-01 | 1. Tocá "No puedo ese día" → "Sí, no puedo ese día". | "Listo: te avisamos la próxima fecha." La tarjeta vuelve a "¡Aceptamos tu pedido!" (sigue aceptado, sin fecha). | |
| BAU-10 | P2 | Pidió el bautismo | Con pedido en revisión | 1. "Retirar el pedido" → "Sí, retirar el pedido". | La tarjeta vuelve a "Podés pedir tu bautismo" con "Retiraste tu pedido anterior…". | |
| BAU-11 | P2 | Admin | Crear un Evento tipo "Bautismo" | 1. Marcá "Tiene costo" o "La gente tiene que anotarse". | No lo permite: el Evento de bautismo no lleva costo, aprobación, lista de espera ni recordatorio. | |
| BAU-12 | P2 | Cualquiera | Evento de bautismo próximo | 1. Abrí su página pública en `localhost:3001/eventos`. | Dice "Lo coordina el equipo" y **no** muestra nombres ni cuántas personas se bautizan. | |
| BAU-13 | P2 | Admin | Perfil de una persona sin Vida Nueva | 1. "Pedir el bautismo en su nombre", elegí el talle en "¿Qué talle de remera usa?" → "Sí, pedirlo". | Sin talle no se envía ("Elegí un talle de remera de la lista."). Con talle, el pedido aparece en la bandeja como cargado por el Admin y su detalle muestra el talle. | |

### 5.6. Eventos (EVE)

| ID | Prio | Rol | Partida | Pasos | Esperado | Resultado |
|---|---|---|---|---|---|---|
| EVE-05 | P2 | Admin | Un Evento con inscriptos | 1. Abrí el Evento → pestañas de inscriptos.<br>2. "Anotar a una Persona": buscá a alguien y anotalo. | La persona aparece en "Confirmadas" y recibe el aviso "Te anotaron en …". | |
| EVE-10 | P2 | Admin | Crear un Evento | 1. Tocá "Crear el Evento" sin completar nada. | "Escribí el nombre del Evento.", "Contá de qué se trata el Evento.", "Elegí una Sede.", "Completá el día, el mes y el año del inicio." | |
| EVE-11 | P2 | Admin | Crear un Evento con costo | 1. "Tiene costo" sin instrucciones de pago. | "Contá cómo se paga: alias, CBU o a quién." | |
| EVE-12 | P2 | Admin | Evento con 5 inscriptos | 1. Editalo y bajá el cupo a 3. | "El cupo no puede ser menor que la cantidad de lugares ya ocupados." | |
| EVE-13 | P2 | Admin | Evento con inscriptos | 1. "Eliminar". | "No se puede eliminar porque ya tiene inscripciones. Si no se va a hacer, cancelalo." | |
| EVE-14 | P2 | Admin | Evento próximo con inscriptos | 1. "Cancelar el Evento" → "Sí, cancelar el Evento". | El Evento figura "Cancelado"; los inscriptos reciben "Se canceló …". | |
| EVE-15 | P2 | Admin | Pago para verificar | 1. "Rechazar pago" sin motivo; después con motivo. | Sin motivo: "Escribí el motivo para que la Persona sepa qué corregir." Con motivo: "Pago rechazado. Se liberó el lugar." La persona ve el motivo y "Subir otro comprobante". | |
| EVE-16 | P2 | Miembro | Subir comprobante | 1. Elegí un archivo de más de 5 MB o un .docx. | "El archivo pesa más de 5 MB…" / "El comprobante tiene que ser JPG, PNG, WebP o PDF…". | |
| EVE-18 | P2 | Pastor | Bandeja | 1. Filtro "Tipo".<br>2. Escribí `localhost:3002/solicitudes?tipo=pago`. | El Pastor **no** ve "Pago de un Evento" ni pagos en la lista. *(Este caso depende del ajuste de "pagos del Pastor"; si todavía no entró, anotalo como pendiente.)* | |
| EVE-24 | P2 | Admin | Jornada con respuestas | 1. Abrí "Jornada de sanidad · Mujeres" → "Editar".<br>2. Mirá la pregunta "¿Sos celíaca?". Cambiale el texto a "¿Sos celíaca o tenés otra restricción?".<br>3. "Guardar cambios". | La pregunta dice "Ya la respondieron N personas: no se puede quitar ni cambiar de tipo."; "Quitar" y "Tipo de respuesta" están deshabilitados y "Dato sensible" no se puede desmarcar. Al cambiar el texto aparece "Las N personas que ya respondieron vieron el texto anterior." Guarda: "Cambios guardados." | |
| EVE-25 | P2 | Admin | Crear un Evento con inscripción | 1. En "Preguntas para la inscripción" agregá una pregunta de tipo "Una opción de una lista" con una sola opción.<br>2. "Crear el Evento". | No crea. En el resumen de arriba: "Escribí entre 2 y 10 opciones distintas, una por renglón, de hasta 100 caracteres." (con enlace al campo), y el mismo texto debajo de "Opciones". Con 10 preguntas, "Agregar una pregunta" queda deshabilitado con "Llegaste al máximo de 10 preguntas." | |
| EVE-26 | P2 | Admin | "Jornada de sanidad · Mujeres" | 1. "Anotar a una Persona" → buscá a **Matías Vera** → elegilo.<br>2. Respondé "¿Sos celíaca?" y tocá "Anotar".<br>3. Tocá "Sí, anotarla igual". | En el paso 2 aparece, con un ícono de advertencia, "Matías Vera no está entre los destinatarios" y "Este evento es para mujeres desde 15 años. ¿La anotás igual? Hacelo solo si es una excepción acordada." Después queda anotado y su fila dice "Anotada aunque no está entre los destinatarios". | |
| EVE-27 | P2 | Admin | Crear un Evento | 1. En "Para quién es" poné Edad mínima **30** y Edad máxima **18**.<br>2. "Crear el Evento". | No crea. "La edad máxima no puede ser menor que la mínima." arriba (con enlace) y debajo de "Edad máxima". | |
| EVE-28 | P2 | Mujer (celular, modo oscuro) | Perfil → Tema oscuro | 1. Abrí "Jornada de sanidad · Mujeres" con una cuenta que todavía no esté anotada (por ejemplo `prueba-demo-1@example.com` de la demo) y tocá "Anotarme". | Las preguntas, los círculos para elegir, el candado de "dato sensible" y los mensajes de error se leen bien en oscuro; no hay que deslizar de costado. | |
| EVE-29 | P2 | Admin | "Noche de jóvenes" (de 15 a 30 años) | 1. "Anotar a una Persona" → **Nicolás Peña** (22 años, cumple) → "Anotar".<br>2. "Editar" el Evento: en "Para quién es" elegí **Mujeres** y guardá.<br>3. Mirá la lista de inscriptos, pestaña Confirmadas. | Nicolás sigue anotado: no se dio de baja solo. Su fila dice, con un ícono de advertencia, **"Ya no está entre los destinatarios: si corresponde, dala de baja"**, y tiene el botón "Dar de baja". En el formulario, la ayuda de "Para quién es" avisa que esto pasa. | |

### 5.7. Avisos, comentarios, catálogos y otras pantallas (AVI, COM, CAT, PUB)

| ID | Prio | Rol | Partida | Pasos | Esperado | Resultado |
|---|---|---|---|---|---|---|
| AVI-10 | P2 | Admin | Enviar un aviso | 1. Sin título → "Revisar y mandar". | "Revisá estos campos:" con "Escribí un título." | |
| AVI-11 | P2 | Admin | Enviar un aviso | 1. "A un ministerio" sin elegir cuál. | "Elegí el grupo o el ministerio." | |
| AVI-12 | P2 | Miembro | Un aviso de otra persona | 1. Abrí a mano `localhost:3001/avisos/` + el número de un aviso ajeno (copialo de la sesión del Admin). | "No encontramos ese aviso". | |
| COM-10 | P2 | Sin sesión | `/contanos` | 1. Marcá "Pueden contactarme…" sin email ni teléfono y enviá. | "Para que te contactemos, dejanos un email o un teléfono…". | |
| COM-11 | P2 | Sin sesión | `/contanos` | 1. Enviá sin elegir problema o sugerencia. | "Elegí si es un problema o una sugerencia." | |
| COM-02 | P2 | Admin | Después de COM-01 | 1. En Inicio, bloque "Comentarios nuevos" → "Ver los comentarios".<br>2. Abrí el tuyo y tocá "Marcar como revisado". | El comentario está con los de la demo. Al marcarlo pasa a "Revisados". | |
| CAT-03 | P2 | Admin | — | 1. Catálogos → Ministerios → "Crear Ministerio".<br>2. Nombre, descripción, marcá "Requiere capacitación o audición" y crealo.<br>3. Abrí `localhost:3001/ministerios`. | Aparece en la página pública con la etiqueta "Requiere formación". | |
| CAT-10 | P2 | Admin | Sedes | 1. Editá La Plata y escribí en WhatsApp `123`. | Error debajo del campo que explica cómo escribir un celular argentino (con código de área). | |
| CAT-11 | P2 | Admin | Sedes | 1. Escribí el WhatsApp como `+54 9 221 555-0101` y guardá; volvé a abrir la Sede. | Se guarda y se muestra prolijo; el botón de Visitanos abre el mismo número. | |
| CAT-12 | P2 | Admin | Sede La Plata es la única activa | 1. "Inactivar" La Plata. | No deja: "Es la única Sede activa… Creá la nueva Sede primero…". | |
| PUB-01 | P2 | Cualquiera | — | 1. Recorré la portada, Nosotros, Visitanos, Ministerios, Eventos y Dar. | Ninguna página vacía ni rota. En Dar, "Copiar" muestra "… copiado". | |

### 5.8. Permisos (ROL)

| ID | Prio | Rol | Partida | Pasos | Esperado | Resultado |
|---|---|---|---|---|---|---|
| ROL-03 | P2 | Pastor | `demo-pastor@example.com` en el backoffice | 1. Abrí el perfil de una persona. | No aparece "Editar datos" ni "Cambiar roles". | |
| ROL-07 | P2 | Discipulador Jorge | Jorge y Marcela con sesión, en dos ventanas | 1. Copiá la dirección del discipulado de Agustina (de Marcela) desde la sesión de Marcela y abrila con Jorge. | "No encontramos este discipulado". | |
| ROL-10 | P2 | Pastor | Palabra Profética | 1. Andá a Palabra Profética y "Cargar una nueva". | **Sí** puede (es la única excepción del Pastor). | |
| ROL-11 | P2 | Líder de curso | `demo-vs-lider-1@…` | 1. Entrá al backoffice. | "Lo tuyo está en la app". | |

### 5.9. Celular y modo oscuro (UI)

| ID | Prio | Rol | Partida | Pasos | Esperado | Resultado |
|---|---|---|---|---|---|---|
| UI-01 | P2 | Cualquiera | Celular (o modo celular, 2.4) | 1. Recorré Mi camino, Vida Nueva, Eventos, Avisos y Perfil. | Nunca hay que mover la pantalla de costado (sin scroll horizontal). Los botones se tocan cómodo con el dedo. | |
| UI-02 | P2 | Cualquiera | Celular angosto (iPhone SE o 320 px) | 1. Abrí el registro y el formulario de Vida Nueva. | Nada se corta ni se superpone. | |
| UI-03 | P2 | Miembro | Perfil | 1. En "Colores de la app" elegí "Oscuro".<br>2. Recorré Mi camino, Eventos y Avisos.<br>3. Cerrá y volvé a entrar. | Todo se lee bien en oscuro (textos, botones, estados, enlaces). La preferencia se mantiene al volver a entrar. | |
| UI-04 | P2 | Admin | Backoffice, menú de usuario | 1. Pasá a modo oscuro y recorré Inicio, Solicitudes, Personas y Eventos. | Todo se lee bien, incluso al pasar el mouse por encima de botones y enlaces. | |
| UI-05 | P2 | Cualquiera | Las dos apps | 1. Fijate cómo se marcan estados ("Sin leer", "Pendiente", "En revisión") y enlaces. | Ningún estado se distingue **solo por el color**: siempre hay texto o ícono; los enlaces están subrayados. | |
| UI-06 | P2 | Cualquiera | — | 1. Apagá la API a propósito y recargá Mi camino o el Inicio del backoffice. | Aparece un mensaje de error claro con "Reintentar"; no una pantalla en blanco. | |


### 5.10. Grupos de Extensión (GEX)

| ID | Prio | Rol | Partida | Pasos | Esperado | Resultado |
|---|---|---|---|---|---|---|
| GEX-11 | P2 | Miembro | "Encontrá tu grupo" | 1. Tocá "Buscar grupos" sin escribir nada.<br>2. Escribí `calle que no existe 99999` y buscá. | 1: arriba "Revisá esto para buscar:" con el foco ahí y, debajo del campo, "Escribí tu dirección…". 2: debajo del campo, "No encontramos esa dirección. Escribí la calle y el número…". | |
| GEX-12 | P2 | Miembro (celular real) | "Encontrá tu grupo" | 1. Tocá "Usar mi ubicación" y aceptá el permiso.<br>2. Repetí negando el permiso. | 1: aparecen los grupos ordenados desde donde estás. 2: "No pudimos usar tu ubicación. Escribí tu dirección…". En ningún caso se guarda la dirección (no aparece en el perfil ni en el backoffice). | |
| GEX-13 | P2 | Miembro | Igual | 1. Marcá solo **sábado** y buscá. | Solo aparecen grupos que se reúnen los sábados (por ejemplo "Jóvenes en la iglesia"). Si no hay ninguno, lo dice y sugiere probar con otros días. | |
| GEX-14 | P2 | Líder | `demo-gex-lider@…` con el pedido de Sofía | 1. Tocá "No es para este grupo", escribí "Te conviene el de los jueves en Tolosa" y "Avisarle".<br>2. Entrá a la app como Sofía. | Sofía recibe el aviso "Sobre tu pedido para Mujeres del centro" y su tarjeta dice "Tu pedido para Mujeres del centro no siguió adelante" con "Encontrá tu grupo"; al entrar se ve el mensaje de la líder y el buscador para elegir otro. | |
| GEX-15 | P2 | Admin | Grupo con integrantes | 1. Tocá "Inactivar el grupo" → "Sí, inactivar". | No se inactiva: "El grupo tiene integrantes o pedidos esperando respuesta. Quitá a los integrantes…". Con el grupo vacío sí se inactiva, deja de aparecer en la app y se puede "Reactivar". | |

---

## 6. Cómo reportar una falla

Por cada falla, anotá:

1. **El ID del caso** (por ejemplo, `VN-03`). Si no está en el manual, contá en qué pantalla estabas.
2. **Con qué persona** estabas (el email de `/dev/entrar`) y **en qué app** (web app o backoffice).
3. **Los pasos** que hiciste, en orden, hasta que pasó.
4. **Qué esperabas** y **qué pasó** en realidad (el texto exacto del mensaje, si hubo).
5. **Una captura de pantalla** (en la compu: Windows + Shift + S; en Mac: Cmd + Shift + 4; en el
   celular, la captura de siempre).
6. **Celular o compu**, y **qué navegador** (Chrome, Safari, Firefox…). Si usaste el modo celular
   de Chrome, decí qué modelo elegiste.
7. **Modo claro u oscuro.**

Ejemplo:

> **VN-03** — Laura (`demo-disc-laura@example.com`), web app, celular Android con Chrome, modo
> claro. Toqué "Declinar", escribí "No puedo los martes" y "Sí, declinar". Esperaba el mensaje
> "Declinaste la propuesta…", pero quedó el botón girando y no pasó nada. Adjunto captura.

Si encontrás algo que no es una falla pero te parece confuso (un texto que no se entiende, un botón
difícil de encontrar), anotalo igual, como **"Sugerencia"**.

