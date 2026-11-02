# QA-REPORT: ronda 1

## Resumen

1. **Se puede seguir desarrollando encima.** No hay bloqueantes: ningún flujo principal se rompe.
2. Los dos bugs de severidad alta conviene arreglarlos primero, porque guardan datos falsos o dejan afuera a una persona adulta.
3. Hay 7 bugs: 2 de severidad alta, 4 media y 1 baja. Siguen presentes en `main` 87a3e85.
4. Salieron bien la demo completa, los permisos, el doble click en los envíos, las pantallas de error y la seguridad básica de la API.
5. Quedaron 125 de 187 casos del manual cerrados. Falta lo que lista la sección de cobertura, y los PR esperan un paso tuyo.

## Entorno

- Rama `qa/ronda-1`, web 4001, backoffice 4002, API 4333, bases `*_qa`, con `db:seed` y `db:seed-demo`.
- La ronda arrancó en `4ffe48b`. Al terminar, `main` había avanzado, así que QA pasó a `87a3e85` y se revalidaron los 7 bugs.
- **No se usó Playwright MCP:** no está disponible en esta sesión. Usé la librería Playwright del repo, con Chromium y un contexto limpio por persona, equivalente a un perfil aparte.
- Celular: 390 x 844 táctil, más 320 x 568 para pantallas chicas. Desktop: 1280 x 800. Solo Chromium, sin dispositivos reales ni Safari.
- Las pruebas de QA cambiaron datos de demo. Para repetir un caso puede hacer falta otra persona o volver a cargar la base.

## Bugs

### Severidad alta

#### BUG-01: el registro acepta fechas de nacimiento absurdas

- **Dónde:** registro, paso 1, web app, celular y desktop.
- **Pasos:**
  1. Entrá por `/dev/entrar` con un email nuevo.
  2. Completá el paso 1 con fecha de nacimiento 1 de enero de 2030.
  3. Completá el resto del registro.
- **Esperado:** error en la fecha, sin poder seguir.
- **Pasa:** deja seguir y muestra "Todavía no podés ingresar", porque la toma como menor. Con 1 de enero de 1800 entra como adulta activa.
- **Por qué importa:** un adulto que escribe 2096 en vez de 1996 queda bloqueado esperando a un tutor que no existe.

#### BUG-02: Vida Nueva sale con un horario que nadie eligió

- **Dónde:** `/mi-camino/vida-nueva`, web app. Caso VN-10 del manual.
- **Pasos:**
  1. Entrá con una persona recién registrada.
  2. Abrí Vida Nueva.
  3. Sin tocar nada, apretá "Quiero empezar Vida Nueva".
- **Esperado:** "Elegí un día y un horario…", sin enviar.
- **Pasa:** el pedido se envía con Martes 19:00 a 21:00, y pasa a "Estamos buscando a tu Discipulador".
- **Por qué importa:** el Admin asigna Discipulador con un horario inventado.
- **Pista:** `packages/ui/src/components/editor-de-franjas.tsx:92` arranca con esos valores, y el pedido toma la franja pendiente.

### Severidad media

#### BUG-03: dirección no ubicada cae en el mensaje genérico

- **Dónde:** "Encontrá tu grupo", web app. Caso GEX-11.
- **Pasos:**
  1. Entrá con cualquier persona.
  2. Abrí `/mi-camino/grupo-extension`.
  3. Escribí `calle que no existe 99999` y apretá "Buscar grupos".
- **Esperado:** "No encontramos esa dirección. Escribí la calle y el número…".
- **Pasa:** "No pudimos completar el pedido. Probá de nuevo en un momento."
- **Pista:** la API manda `DIRECCION_NO_UBICADA` por campo. `buscador.tsx:64` busca `errors.campos.DIRECCION_NO_UBICADA`, y el texto está en `errors.DIRECCION_NO_UBICADA`.
- **Revisar:** 22 códigos de la API están en `errors` y no en `errors.campos` en la web, y 20 en el backoffice. Solo comprobé este caso en pantalla.

#### BUG-04: doble toque en "Siguiente" vuelve al paso 1 en celular

- **Dónde:** registro, web app, solo celular.
- **Pasos:**
  1. Completá bien el paso 1 en un celular.
  2. Tocá dos veces seguidas "Siguiente".
- **Esperado:** quedar en el paso 2.
- **Pasa:** vuelve al paso 1 sin aviso. En el paso 2, "Atrás" ocupa el lugar exacto donde estaba "Siguiente" (y = 765), así que el segundo toque cae ahí.
- **Por qué importa:** el público incluye gente mayor, y el doble toque es común.

#### BUG-05: el registro acepta nombres vacíos o enormes

- **Dónde:** registro, paso 1, web app.
- **Pasos:**
  1. Escribí solo espacios en Apellido y Nombre, o 5000 caracteres.
  2. Completá el resto y registrate.
- **Esperado:** error en los dos campos, sin poder seguir.
- **Pasa:** con espacios muestra "Escribí tu apellido." y aun así pasa al paso 2, con el error todavía arriba. Termina con "¡Listo, ya sos parte!" y la Persona queda guardada sin nombre. Los 5000 caracteres también se guardan.

#### BUG-06: un título sin espacios rompe la pantalla en celular

- **Dónde:** `/mi-camino/vida-de-servicio` y `/mis-grupos/:id/semanas/:n`, web app, celular.
- **Pasos:**
  1. Cargá en una semana un título de 120 caracteres sin espacios. La demo ya trae uno en la semana 1.
  2. Entrá en celular con `demo-vs-activa-1@example.com`.
- **Esperado:** el título se corta dentro de la tarjeta.
- **Pasa:** la página se ensancha 745 px, y 1465 px en el detalle de la semana. El encabezado fijo se estira y el botón "Más" queda fuera de la pantalla, en x = 1041 con un ancho de 390.

### Severidad baja

#### BUG-07: el formulario de Vida Nueva vuelve tras atrás y adelante

- **Pasos:**
  1. Pedí Vida Nueva.
  2. Tocá atrás y después adelante en el navegador.
- **Esperado:** "Estamos buscando a tu Discipulador".
- **Pasa:** aparece el formulario vacío. Si se reenvía, no se duplica: queda una sola solicitud y la pantalla se corrige.

## PR de cada bug

Cada rama sale de `main` 87a3e85, tiene un solo e2e marcado `test.fail` y ya está publicada. **Los PR todavía no existen:** `gh` no está instalado y el navegador de esta sesión no tiene tu sesión de GitHub. Cada enlace abre el PR con título y descripción listos; solo falta apretar "Create pull request".

| Bug | Severidad | Título | Rama | PR |
|---|---|---|---|---|
| BUG-01 | Alta | El registro acepta fechas de nacimiento absurdas | `qa/fecha-nacimiento-absurda` | [Crear PR](https://github.com/EchuSosa/vida-sobrenatural/compare/main...qa/fecha-nacimiento-absurda?expand=1&title=e2e%3A%20El%20registro%20acepta%20fechas%20de%20nacimiento%20absurdas%20(BUG-01)&body=Un%20a%C3%B1o%20mal%20tipeado%20bloquea%20a%20una%20persona%20adulta%20como%20menor.%0A%0AReproduce%20BUG-01%20de%20la%20ronda%201%20de%20QA%20con%20un%20e2e%20marcado%20%60test.fail%60.%20No%20arregla%20el%20producto%3A%20cuando%20se%20arregle%2C%20Playwright%20avisa%20y%20se%20saca%20la%20marca.%0A%0AEl%20e2e%20fall%C3%B3%20por%20el%20motivo%20esperado%20contra%20el%20entorno%20QA%2C%20sobre%20%60main%60%2087a3e85.%0A%0A%F0%9F%A4%96%20Generated%20with%20%5BClaude%20Code%5D(https%3A%2F%2Fclaude.com%2Fclaude-code)) |
| BUG-02 | Alta | Vida Nueva sale con un horario que nadie eligió | `qa/vida-nueva-horario-no-elegido` | [Crear PR](https://github.com/EchuSosa/vida-sobrenatural/compare/main...qa/vida-nueva-horario-no-elegido?expand=1&title=e2e%3A%20Vida%20Nueva%20sale%20con%20un%20horario%20que%20nadie%20eligi%C3%B3%20(BUG-02)&body=El%20pedido%20se%20env%C3%ADa%20con%20Martes%2019%3A00%20a%2021%3A00%20aunque%20la%20persona%20no%20haya%20elegido%20nada.%0A%0AReproduce%20BUG-02%20de%20la%20ronda%201%20de%20QA%20con%20un%20e2e%20marcado%20%60test.fail%60.%20No%20arregla%20el%20producto%3A%20cuando%20se%20arregle%2C%20Playwright%20avisa%20y%20se%20saca%20la%20marca.%0A%0AEl%20e2e%20fall%C3%B3%20por%20el%20motivo%20esperado%20contra%20el%20entorno%20QA%2C%20sobre%20%60main%60%2087a3e85.%0A%0A%F0%9F%A4%96%20Generated%20with%20%5BClaude%20Code%5D(https%3A%2F%2Fclaude.com%2Fclaude-code)) |
| BUG-03 | Media | Dirección no ubicada cae en el mensaje genérico | `qa/gex-direccion-no-ubicada` | [Crear PR](https://github.com/EchuSosa/vida-sobrenatural/compare/main...qa/gex-direccion-no-ubicada?expand=1&title=e2e%3A%20Direcci%C3%B3n%20no%20ubicada%20cae%20en%20el%20mensaje%20gen%C3%A9rico%20(BUG-03)&body=La%20persona%20ve%20%22No%20pudimos%20completar%20el%20pedido%22%20en%20vez%20de%20c%C3%B3mo%20corregir%20la%20direcci%C3%B3n.%0A%0AReproduce%20BUG-03%20de%20la%20ronda%201%20de%20QA%20con%20un%20e2e%20marcado%20%60test.fail%60.%20No%20arregla%20el%20producto%3A%20cuando%20se%20arregle%2C%20Playwright%20avisa%20y%20se%20saca%20la%20marca.%0A%0AEl%20e2e%20fall%C3%B3%20por%20el%20motivo%20esperado%20contra%20el%20entorno%20QA%2C%20sobre%20%60main%60%2087a3e85.%0A%0A%F0%9F%A4%96%20Generated%20with%20%5BClaude%20Code%5D(https%3A%2F%2Fclaude.com%2Fclaude-code)) |
| BUG-04 | Media | Doble toque en Siguiente vuelve al paso 1 en celular | `qa/registro-doble-toque` | [Crear PR](https://github.com/EchuSosa/vida-sobrenatural/compare/main...qa/registro-doble-toque?expand=1&title=e2e%3A%20Doble%20toque%20en%20Siguiente%20vuelve%20al%20paso%201%20en%20celular%20(BUG-04)&body=%22Atr%C3%A1s%22%20aparece%20debajo%20del%20dedo%20y%20el%20registro%20parece%20no%20avanzar.%0A%0AReproduce%20BUG-04%20de%20la%20ronda%201%20de%20QA%20con%20un%20e2e%20marcado%20%60test.fail%60.%20No%20arregla%20el%20producto%3A%20cuando%20se%20arregle%2C%20Playwright%20avisa%20y%20se%20saca%20la%20marca.%0A%0AEl%20e2e%20fall%C3%B3%20por%20el%20motivo%20esperado%20contra%20el%20entorno%20QA%2C%20sobre%20%60main%60%2087a3e85.%0A%0A%F0%9F%A4%96%20Generated%20with%20%5BClaude%20Code%5D(https%3A%2F%2Fclaude.com%2Fclaude-code)) |
| BUG-05 | Media | El registro acepta nombres vacíos o enormes | `qa/nombre-sin-validar` | [Crear PR](https://github.com/EchuSosa/vida-sobrenatural/compare/main...qa/nombre-sin-validar?expand=1&title=e2e%3A%20El%20registro%20acepta%20nombres%20vac%C3%ADos%20o%20enormes%20(BUG-05)&body=Se%20guardan%20Personas%20con%20nombre%20de%20espacios%20o%20de%205000%20caracteres.%0A%0AReproduce%20BUG-05%20de%20la%20ronda%201%20de%20QA%20con%20un%20e2e%20marcado%20%60test.fail%60.%20No%20arregla%20el%20producto%3A%20cuando%20se%20arregle%2C%20Playwright%20avisa%20y%20se%20saca%20la%20marca.%0A%0AEl%20e2e%20fall%C3%B3%20por%20el%20motivo%20esperado%20contra%20el%20entorno%20QA%2C%20sobre%20%60main%60%2087a3e85.%0A%0A%F0%9F%A4%96%20Generated%20with%20%5BClaude%20Code%5D(https%3A%2F%2Fclaude.com%2Fclaude-code)) |
| BUG-06 | Media | Un título sin espacios rompe la pantalla en celular | `qa/titulo-largo-celular` | [Crear PR](https://github.com/EchuSosa/vida-sobrenatural/compare/main...qa/titulo-largo-celular?expand=1&title=e2e%3A%20Un%20t%C3%ADtulo%20sin%20espacios%20rompe%20la%20pantalla%20en%20celular%20(BUG-06)&body=La%20p%C3%A1gina%20se%20ensancha%20y%20el%20bot%C3%B3n%20%22M%C3%A1s%22%20queda%20fuera%20de%20la%20pantalla.%0A%0AReproduce%20BUG-06%20de%20la%20ronda%201%20de%20QA%20con%20un%20e2e%20marcado%20%60test.fail%60.%20No%20arregla%20el%20producto%3A%20cuando%20se%20arregle%2C%20Playwright%20avisa%20y%20se%20saca%20la%20marca.%0A%0AEl%20e2e%20fall%C3%B3%20por%20el%20motivo%20esperado%20contra%20el%20entorno%20QA%2C%20sobre%20%60main%60%2087a3e85.%0A%0A%F0%9F%A4%96%20Generated%20with%20%5BClaude%20Code%5D(https%3A%2F%2Fclaude.com%2Fclaude-code)) |
| BUG-07 | Baja | El formulario de Vida Nueva vuelve tras atrás y adelante | `qa/vida-nueva-atras-adelante` | [Crear PR](https://github.com/EchuSosa/vida-sobrenatural/compare/main...qa/vida-nueva-atras-adelante?expand=1&title=e2e%3A%20El%20formulario%20de%20Vida%20Nueva%20vuelve%20tras%20atr%C3%A1s%20y%20adelante%20(BUG-07)&body=La%20pantalla%20muestra%20el%20formulario%20vac%C3%ADo%20aunque%20el%20pedido%20ya%20existe.%0A%0AReproduce%20BUG-07%20de%20la%20ronda%201%20de%20QA%20con%20un%20e2e%20marcado%20%60test.fail%60.%20No%20arregla%20el%20producto%3A%20cuando%20se%20arregle%2C%20Playwright%20avisa%20y%20se%20saca%20la%20marca.%0A%0AEl%20e2e%20fall%C3%B3%20por%20el%20motivo%20esperado%20contra%20el%20entorno%20QA%2C%20sobre%20%60main%60%2087a3e85.%0A%0A%F0%9F%A4%96%20Generated%20with%20%5BClaude%20Code%5D(https%3A%2F%2Fclaude.com%2Fclaude-code)) |

Los 7 e2e fallaron por el motivo esperado contra QA, leyendo el error real de cada uno. **No los corrí con la configuración completa de Playwright:** su `globalSetup` hace `prisma migrate reset`, y eso pide tu consentimiento. La CI de cada PR es la primera corrida completa. El de BUG-06 lo validé con personas demo en lugar de las `e2e-`.

## Sugerencias (no son bugs)

- **Recargar en el registro pierde todo:** en el paso 2 vuelve al paso 1 vacío. En un celular eso también puede pasar al cambiar de app.
- **Atrás del navegador saca del registro:** no vuelve al paso anterior y se pierde lo cargado.
- **Evento con fecha pasada:** el backoffice lo crea sin avisar.
- **Consola:** en `/mis-grupos` apareció una vez `Failed to execute 'measure' on 'Performance'`. Parece propio del modo desarrollo de React, y puede volver inestable un e2e.
- **Sesión compartida:** apps en `localhost` comparten cookies entre puertos, y QA usa el mismo `NEXTAUTH_SECRET`. Una sesión de 4001 apareció en 4002. Usá un perfil de navegador aparte para QA.

## Diferencias con el manual

- **PER-12:** el DNI con puntos no da error. Se guarda limpio, `12345678`, y es mejor que lo que pide el manual.
- **MIN-03:** la tarjeta dice "Elegí un Ministerio", no "Elegir un Ministerio".
- **EVE-13:** con inscriptos, "Eliminar" queda deshabilitado con una explicación. El manual espera el mensaje al tocarlo.
- **Pantallas:** el manual usa los puertos 3001 y 3002, y `/dev/entrar` muestra "Admin de Test" en vez de Mónica Cabrera.

## Lo que salió bien

- **Doble click:** registro, contanos, Vida Nueva, franjas, eventos, anotarse, "Ya lo hice", alta de persona y encuentros no duplican nada, verificado contando filas en la base. Mismo resultado en celular, salvo BUG-04.
- **Permisos:** un miembro recibe rechazo en las rutas de Admin probadas. Sin token, 401. El Pastor no ve datos sensibles ni pagos, y no pudo escribir en las rutas probadas.
- **HTML en nombres:** `<img onerror>` se guarda como texto y no se ejecuta.
- **Barrido:** 726 visitas por rol y viewport, sin respuestas 5xx y sin violaciones graves de `axe` en tema claro. En oscuro se revisaron Mi camino, Eventos, Avisos, Perfil y el backoffice.
- **Celular chico:** sin scroll horizontal a 320 px en las pantallas principales.
- **API caída:** todas las pantallas revisadas muestran un error claro con "Reintentar".

## Cobertura del manual

| Estado | Casos |
|---|---|
| Cerrados | 125 |
| Parciales | 17 |
| Sin concluir por mi automatización | 13 |
| Sin correr | 32 |
| **Total** | **187** |

- **Celular y desktop:** la demo, las pantallas de solo lectura y el doble click corrieron en los dos. Recarga y atrás corrieron solo en celular. El resto corrió en el viewport que indica el manual.
- **Parciales:** CAM-02, VN-06, BAU-01, ELM-03, ELM-04, ELM-05, YAS-01, AVI-02, COM-02, GEX-05, GEX-07, GEX-09, MEN-10, DIS-03, DIS-04, DIS-05, EVE-12.
- **Sin concluir:** GEX-14, EVE-03, EVE-13, EVE-14, EVE-15, EVE-25, CAT-03, CAT-10, CAT-11, LMI-01, LMI-03, PER-05, PER-13. Fallaron mis selectores o los datos ya estaban usados, así que no indican un bug.
- **Sin correr:** CAM-03, VN-04, MEN-01, VS-02, BAU-04, EVE-04, CAT-01, CAT-02, GEX-06, GEX-08, ELM-01, YAS-02, YAS-03, REG-18, CAM-11, CAM-12, CAM-13, DIS-02, DIS-13, DIS-14, DIS-15, DIS-16, VS-12, VS-13, MIN-04, MIN-15, EVE-05, EVE-26, EVE-28, EVE-29, CAT-12, GEX-12.
- **GEX-12** necesita un celular real con permiso de ubicación.
