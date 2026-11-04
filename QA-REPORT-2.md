# QA-REPORT: ronda 2

## Resumen

1. **Se puede seguir desarrollando encima.** No hay bloqueantes: turnos de servicio y baja de la app funcionan en sus flujos principales.
2. Hay 11 bugs nuevos: ninguno de severidad alta, 6 media y 5 baja. Los dos más urgentes son de avisos de turnos en casos borde (BUG-08 y BUG-09): alguien puede no ir, o ir de más, sin enterarse.
3. Los 7 bugs de la ronda 1 están arreglados en `main`: sus e2e ya no llevan `test.fail` y la CI pasa.
4. Los 62 casos abiertos de la ronda 1 corrieron: 59 salieron bien, 2 encontraron un bug y 1 quedó parcial.
5. La baja de la app borra de verdad: un barrido de la base no encontró el nombre, el email ni el teléfono viejos. Los PR de cada bug esperan un paso tuyo.

## Entorno

- Rama `qa/ronda-1`, web 4001, backoffice 4002, API 4333, bases `*_qa`, con `prisma migrate deploy` en las tres, `prisma generate`, `db:seed` y `db:seed-demo`.
- **La CI de `main` estuvo en rojo en `f0d5542`:** cayó el e2e de BUG-06 (`qa-titulo-largo-celular.spec.ts:42`), que esperaba 5 s el campo "Título" mientras `next dev` compilaba la ruta. Esperé el commit siguiente: QA corrió sobre `111f2b2`, con la CI en verde. Después `main` pasó a `ee3fb38`, que solo cambia tests (#95 arregla ese e2e), y las ramas de bugs salen de ahí.
- La migración `20261010022809` ya está commiteada en `main`: se aplicó en las tres bases QA con el resto.
- Igual que en la ronda 1: Playwright como librería con Chromium, un contexto limpio por persona, celular 390 x 844 y 360 x 780, desktop 1280 x 800.
- Las pruebas crean personas `qa2-…` y cambian datos de demo. Para repetir un caso puede hacer falta otra persona.
- **Dato de QA cambiado a propósito:** el teléfono de contacto de La Plata en `vidasobrenatural_qa` quedó en "221 555 0000", porque el del seed no deja guardar la Sede (BUG-12).
- `caffeinate` se cortó una vez a mitad de la ronda, parado por vos o por la app. Lo volví a arrancar.

## Bugs

### Severidad media

#### BUG-08: quitar un día de servicio no avisa que suspende lo publicado

- **Dónde:** backoffice, Ministerio → "Días de servicio" → "Quitar".
- **Pasos:**
  1. Cargá "Todos los domingos" en un Ministerio, asigná a alguien el próximo domingo y publicá la fecha.
  2. En "Días de servicio" tocá "Quitar" en esa regla.
- **Esperado:** el diálogo dice que la fecha publicada se suspende y que se avisa a quien tenía turno (spec 017, casos borde).
- **Pasa:** el diálogo dice "Dejan de salir esas fechas. Lo que ya se publicó no se borra." Al confirmar, la fecha publicada se suspende y la persona recibe "ese día no hay servicio".
- **Por qué importa:** el Admin confirma creyendo que el rol armado queda, y la gente recibe una cancelación.

#### BUG-09: volver a habilitar una fecha no le avisa a quien tenía turno

- **Dónde:** backoffice, "Días de servicio" → "Este día no hay" → "Volver a habilitar".
- **Pasos:**
  1. Publicá una fecha con una persona asignada.
  2. Tocá "Este día no hay" en esa fecha y confirmá. La persona recibe el aviso de suspensión.
  3. Tocá "Volver a habilitar".
- **Esperado:** la persona se entera de que vuelve a servir.
- **Pasa:** el turno reaparece publicado en su Inicio y en "Mis turnos", pero no le llega ningún aviso nuevo. Su último aviso sigue diciendo que ese día no hay servicio.

#### BUG-10: el WhatsApp de la líder no dice su nombre

- **Dónde:** web, "Mi grupo de extensión", "Encontrá tu grupo" y "Mi ministerio".
- **Pasos:**
  1. Entrá por código de email como `demo-gex-lider@example.com`.
  2. Abrí "Mi grupo" y mirá el enlace "Escribir por WhatsApp a Sofía".
- **Esperado:** "Hola Sofía, soy Carolina, del grupo de extensión Mujeres del centro…".
- **Pasa:** "Hola Sofía, soy , del grupo de extensión Mujeres del centro…". Con `/dev/entrar` dice "soy Visitante de Test".
- **Pista:** `yo` sale de `session.user.givenName ?? session.user.name`, y `autorizarCodigoEmail` (`packages/shared-types/src/auth-server.ts:175`) devuelve `name: null`. Lo usan `mi-grupo-extension/page.tsx:25`, `mi-camino/grupo-extension/page.tsx:35` y `mi-ministerio/[id]/page.tsx:84`.

#### BUG-11: buscar por nombre y apellido juntos no encuentra a nadie

- **Dónde:** backoffice, Personas. Pasa también en Pendientes tutor y en "Agregar a una persona" de un grupo de extensión.
- **Pasos:**
  1. En Personas escribí `Valeria Domínguez`.
  2. Después escribí solo `Valeria`.
- **Esperado:** Valeria Domínguez aparece las dos veces.
- **Pasa:** con nombre y apellido hay 0 resultados. Con `Valeria` hay 8. Lo mismo pasa por la API con `GET /personas?buscar=Valeria%20Domínguez`.
- **Por qué importa:** es lo primero que escribe cualquiera, y la pantalla dice que no existe.

#### BUG-12: la Sede La Plata del seed no se puede guardar

- **Dónde:** backoffice, Sedes → La Plata → "Ver detalle". Caso CAT-01 del manual.
- **Pasos:**
  1. Con una base recién sembrada, abrí La Plata.
  2. Escribí el WhatsApp de Secretaría y tocá "Guardar cambios".
- **Esperado:** "Cambios guardados."
- **Pasa:** "Revisá estos campos: Ingresá un teléfono con código de área…", en el teléfono de contacto, que nadie tocó. La API responde `CONTACTOTELEFONO_INVALIDO`.
- **Pista:** `apps/api/prisma/seed.ts:77` carga `+54 9 221 000-0000`, y la validación de la API no lo acepta. Los e2e de Sedes no lo ven porque crean sus propias Sedes.

#### BUG-13: el grupo "En la iglesia" no propone la Sede de quien lo lidera

- **Dónde:** backoffice, "Crear un grupo" de extensión. Caso GEX-05.
- **Pasos:**
  1. Elegí a Hernán Coronel, de La Plata, como líder.
  2. Marcá "En la iglesia" y creá el grupo sin tocar nada más, como dice el manual.
- **Esperado:** "En la iglesia (La Plata)".
- **Pasa:** el selector de Sede arranca en "Buenos Aires", la primera alfabética. El grupo queda en Buenos Aires y "Sin ubicar en el mapa". En "Encontrá tu grupo" la tarjeta dice solo "En la iglesia" con "Distancia sin calcular", sin nombrar la Sede.
- **Por qué importa:** alguien de La Plata se suma pensando que es su iglesia.

### Severidad baja

#### BUG-14: las bajas de Vida de Servicio se cuentan como bajas de discipulado

- **Dónde:** backoffice, Inicio → Pendientes.
- **Pasos:**
  1. Proponé la baja de una inscripta de Vida de Servicio desde "Mis grupos".
  2. Mirá el Inicio del backoffice y tocá "1 baja pedida para confirmar".
- **Esperado:** esa línea cuenta solo discipulados de Vida Nueva. La baja de Vida de Servicio ya tiene su propia línea.
- **Pasa:** la baja aparece en las dos líneas. El enlace lleva a `/grupos?pendiente=baja`, que filtra Vida Nueva y queda vacío.
- **Pista:** `pendientes-admin.service.ts:39` cuenta inscripciones de cualquier curso, y `grupos.service.ts:95` filtra `categoria: 'vida_nueva'`.

#### BUG-15: con el pago rechazado el Evento dice "Cancelaste tu inscripción"

- **Dónde:** web, página del Evento. Caso EVE-15.
- **Pasos:**
  1. Anotate a un Evento con costo y subí el comprobante.
  2. Como Admin, rechazá el pago con un motivo.
  3. Volvé a la página del Evento como la persona.
- **Esperado:** dice que el equipo no pudo verificar el pago, con el motivo.
- **Pasa:** "Inscripción cancelada. Cancelaste tu inscripción. Si querés, podés volver a anotarte." Sin el motivo. En "Mis eventos" el motivo sí aparece, pero seguido de la misma frase.

#### BUG-16: si la baja falla no dice que no se borró nada

- **Dónde:** web, Perfil → "Darme de baja de la app".
- **Pasos:**
  1. Escribí BAJA y tocá "Darme de baja" con la API caída: error 500 o red cortada.
- **Esperado:** "No pudimos darte de baja y no se borró nada…" (spec 018, US1 escenario 4). El texto ya existe en `perfil.baja.errorGenerico`.
- **Pasa:** "Ocurrió un error inesperado. Podés reintentar en unos segundos." Para una acción que no se deshace, la persona no sabe si perdió sus datos.
- **Pista:** `formulario-baja.tsx:41` usa el texto del código de error si existe, y el código interno siempre tiene traducción.

#### BUG-17: la charla le habla a la líder como si fuera la persona

- **Dónde:** web, Mis grupos → Elección de ministerio → la charla con una persona. Caso ELM-03.
- **Pasos:**
  1. Entrá como `demo-vs-lider-1@example.com` y abrí la charla con Ana.
- **Esperado:** "Todavía no tiene grupo de extensión", "Ya eligió 2 ministerios".
- **Pasa:** "Todavía no tenés grupo de extensión" y "Ya elegiste 2 ministerios. Para elegir otro, sacá uno…", dichos a Marta sobre Ana.

#### BUG-18: la miga de la grilla de turnos mide 20 px en celular

- **Dónde:** web, Mi ministerio → Turnos, en celular.
- **Esperado:** 44 px de alto en lo que se toca (spec 017, SC-004).
- **Pasa:** "Mi ministerio" y el nombre del Ministerio miden 20 px de alto, en claro y en oscuro.

## PR de cada bug

Cada rama sale de `main` ee3fb38, tiene un solo e2e marcado `test.fail` y ya está publicada. **Los PR todavía no existen:** sigue sin haber `gh` en esta Mac. Cada enlace abre el PR con título y descripción listos.

| Bug | Severidad | Título | Rama | PR |
|---|---|---|---|---|
| BUG-08 | Media | Quitar un día de servicio no avisa que suspende lo publicado | `qa/turnos-quitar-regla-publicada` | [Crear PR](https://github.com/EchuSosa/vida-sobrenatural/compare/main...qa/turnos-quitar-regla-publicada?expand=1&title=e2e%3A%20Quitar%20un%20d%C3%ADa%20de%20servicio%20no%20avisa%20que%20suspende%20lo%20publicado%20%28BUG-08%29&body=El%20di%C3%A1logo%20dice%20que%20lo%20publicado%20no%20se%20borra%2C%20pero%20la%20fecha%20se%20suspende%20y%20a%20la%20gente%20le%20llega%20que%20no%20hay%20servicio.%0A%0AReproduce%20BUG-08%20de%20la%20ronda%202%20de%20QA%20con%20un%20e2e%20marcado%20%60test.fail%60.%20No%20arregla%20el%20producto%3A%20cuando%20se%20arregle%2C%20Playwright%20avisa%20y%20se%20saca%20la%20marca.%0A%0AEl%20e2e%20fall%C3%B3%20por%20el%20motivo%20esperado%20contra%20el%20entorno%20QA%2C%20sobre%20%60main%60%20111f2b2.%0A%0A%F0%9F%A4%96%20Generated%20with%20%5BClaude%20Code%5D%28https%3A//claude.com/claude-code%29) |
| BUG-09 | Media | Volver a habilitar una fecha no le avisa a quien tenía turno | `qa/turnos-rehabilitar-sin-aviso` | [Crear PR](https://github.com/EchuSosa/vida-sobrenatural/compare/main...qa/turnos-rehabilitar-sin-aviso?expand=1&title=e2e%3A%20Volver%20a%20habilitar%20una%20fecha%20no%20le%20avisa%20a%20quien%20ten%C3%ADa%20turno%20%28BUG-09%29&body=El%20turno%20vuelve%20publicado%20y%20el%20%C3%BAltimo%20aviso%20de%20la%20persona%20dice%20que%20ese%20d%C3%ADa%20no%20hay%20servicio.%0A%0AReproduce%20BUG-09%20de%20la%20ronda%202%20de%20QA%20con%20un%20e2e%20marcado%20%60test.fail%60.%20No%20arregla%20el%20producto%3A%20cuando%20se%20arregle%2C%20Playwright%20avisa%20y%20se%20saca%20la%20marca.%0A%0AEl%20e2e%20fall%C3%B3%20por%20el%20motivo%20esperado%20contra%20el%20entorno%20QA%2C%20sobre%20%60main%60%20111f2b2.%0A%0A%F0%9F%A4%96%20Generated%20with%20%5BClaude%20Code%5D%28https%3A//claude.com/claude-code%29) |
| BUG-10 | Media | El WhatsApp de la líder no dice su nombre | `qa/whatsapp-saludo-sin-nombre` | [Crear PR](https://github.com/EchuSosa/vida-sobrenatural/compare/main...qa/whatsapp-saludo-sin-nombre?expand=1&title=e2e%3A%20El%20WhatsApp%20de%20la%20l%C3%ADder%20no%20dice%20su%20nombre%20%28BUG-10%29&body=Con%20el%20ingreso%20por%20c%C3%B3digo%20el%20mensaje%20sale%20%22soy%20%2C%20del%20grupo%E2%80%A6%22.%0A%0AReproduce%20BUG-10%20de%20la%20ronda%202%20de%20QA%20con%20un%20e2e%20marcado%20%60test.fail%60.%20No%20arregla%20el%20producto%3A%20cuando%20se%20arregle%2C%20Playwright%20avisa%20y%20se%20saca%20la%20marca.%0A%0AEl%20e2e%20fall%C3%B3%20por%20el%20motivo%20esperado%20contra%20el%20entorno%20QA%2C%20sobre%20%60main%60%20111f2b2.%0A%0A%F0%9F%A4%96%20Generated%20with%20%5BClaude%20Code%5D%28https%3A//claude.com/claude-code%29) |
| BUG-11 | Media | Buscar por nombre y apellido juntos no encuentra a nadie | `qa/buscar-nombre-completo` | [Crear PR](https://github.com/EchuSosa/vida-sobrenatural/compare/main...qa/buscar-nombre-completo?expand=1&title=e2e%3A%20Buscar%20por%20nombre%20y%20apellido%20juntos%20no%20encuentra%20a%20nadie%20%28BUG-11%29&body=%22Valeria%20Dom%C3%ADnguez%22%20da%200%20resultados%3B%20%22Valeria%22%20da%208.%0A%0AReproduce%20BUG-11%20de%20la%20ronda%202%20de%20QA%20con%20un%20e2e%20marcado%20%60test.fail%60.%20No%20arregla%20el%20producto%3A%20cuando%20se%20arregle%2C%20Playwright%20avisa%20y%20se%20saca%20la%20marca.%0A%0AEl%20e2e%20fall%C3%B3%20por%20el%20motivo%20esperado%20contra%20el%20entorno%20QA%2C%20sobre%20%60main%60%20111f2b2.%0A%0A%F0%9F%A4%96%20Generated%20with%20%5BClaude%20Code%5D%28https%3A//claude.com/claude-code%29) |
| BUG-12 | Media | La Sede La Plata del seed no se puede guardar | `qa/sede-telefono-semilla` | [Crear PR](https://github.com/EchuSosa/vida-sobrenatural/compare/main...qa/sede-telefono-semilla?expand=1&title=e2e%3A%20La%20Sede%20La%20Plata%20del%20seed%20no%20se%20puede%20guardar%20%28BUG-12%29&body=El%20tel%C3%A9fono%20que%20carga%20db%3Aseed%20no%20pasa%20la%20validaci%C3%B3n%20de%20la%20API%20y%20frena%20cualquier%20cambio%20en%20la%20Sede.%0A%0AReproduce%20BUG-12%20de%20la%20ronda%202%20de%20QA%20con%20un%20e2e%20marcado%20%60test.fail%60.%20No%20arregla%20el%20producto%3A%20cuando%20se%20arregle%2C%20Playwright%20avisa%20y%20se%20saca%20la%20marca.%0A%0AEl%20motivo%20se%20comprob%C3%B3%20a%20mano%20contra%20QA%20sobre%20%60main%60%20111f2b2%3A%20la%20API%20responde%20CONTACTOTELEFONO_INVALIDO.%20En%20QA%20el%20e2e%20ya%20no%20falla%20porque%20ese%20tel%C3%A9fono%20se%20corrigi%C3%B3%20durante%20la%20ronda%3B%20en%20la%20base%20de%20e2e%20sigue%20el%20valor%20del%20seed.%0A%0A%F0%9F%A4%96%20Generated%20with%20%5BClaude%20Code%5D%28https%3A//claude.com/claude-code%29) |
| BUG-13 | Media | El grupo "En la iglesia" no propone la Sede de quien lo lidera | `qa/gex-sede-por-defecto` | [Crear PR](https://github.com/EchuSosa/vida-sobrenatural/compare/main...qa/gex-sede-por-defecto?expand=1&title=e2e%3A%20El%20grupo%20%22En%20la%20iglesia%22%20no%20propone%20la%20Sede%20de%20quien%20lo%20lidera%20%28BUG-13%29&body=El%20selector%20arranca%20en%20la%20primera%20Sede%20alfab%C3%A9tica%20y%20la%20tarjeta%20p%C3%BAblica%20no%20dice%20cu%C3%A1l%20es.%0A%0AReproduce%20BUG-13%20de%20la%20ronda%202%20de%20QA%20con%20un%20e2e%20marcado%20%60test.fail%60.%20No%20arregla%20el%20producto%3A%20cuando%20se%20arregle%2C%20Playwright%20avisa%20y%20se%20saca%20la%20marca.%0A%0AEl%20e2e%20fall%C3%B3%20por%20el%20motivo%20esperado%20contra%20el%20entorno%20QA%2C%20sobre%20%60main%60%20111f2b2.%0A%0A%F0%9F%A4%96%20Generated%20with%20%5BClaude%20Code%5D%28https%3A//claude.com/claude-code%29) |
| BUG-14 | Baja | Las bajas de Vida de Servicio se cuentan como bajas de discipulado | `qa/inicio-bajas-vida-de-servicio` | [Crear PR](https://github.com/EchuSosa/vida-sobrenatural/compare/main...qa/inicio-bajas-vida-de-servicio?expand=1&title=e2e%3A%20Las%20bajas%20de%20Vida%20de%20Servicio%20se%20cuentan%20como%20bajas%20de%20discipulado%20%28BUG-14%29&body=El%20Inicio%20dice%20%221%20baja%20pedida%20para%20confirmar%22%20y%20el%20enlace%20lleva%20a%20una%20lista%20vac%C3%ADa.%0A%0AReproduce%20BUG-14%20de%20la%20ronda%202%20de%20QA%20con%20un%20e2e%20marcado%20%60test.fail%60.%20No%20arregla%20el%20producto%3A%20cuando%20se%20arregle%2C%20Playwright%20avisa%20y%20se%20saca%20la%20marca.%0A%0AEl%20e2e%20fall%C3%B3%20por%20el%20motivo%20esperado%20contra%20el%20entorno%20QA%2C%20sobre%20%60main%60%20111f2b2.%0A%0A%F0%9F%A4%96%20Generated%20with%20%5BClaude%20Code%5D%28https%3A//claude.com/claude-code%29) |
| BUG-15 | Baja | Con el pago rechazado el Evento dice "Cancelaste tu inscripción" | `qa/pago-rechazado-cancelaste` | [Crear PR](https://github.com/EchuSosa/vida-sobrenatural/compare/main...qa/pago-rechazado-cancelaste?expand=1&title=e2e%3A%20Con%20el%20pago%20rechazado%20el%20Evento%20dice%20%22Cancelaste%20tu%20inscripci%C3%B3n%22%20%28BUG-15%29&body=La%20persona%20no%20cancel%C3%B3%20nada%20y%20la%20p%C3%A1gina%20del%20Evento%20no%20muestra%20el%20motivo.%0A%0AReproduce%20BUG-15%20de%20la%20ronda%202%20de%20QA%20con%20un%20e2e%20marcado%20%60test.fail%60.%20No%20arregla%20el%20producto%3A%20cuando%20se%20arregle%2C%20Playwright%20avisa%20y%20se%20saca%20la%20marca.%0A%0AEl%20e2e%20fall%C3%B3%20por%20el%20motivo%20esperado%20contra%20el%20entorno%20QA%2C%20sobre%20%60main%60%20111f2b2.%0A%0A%F0%9F%A4%96%20Generated%20with%20%5BClaude%20Code%5D%28https%3A//claude.com/claude-code%29) |
| BUG-16 | Baja | Si la baja falla no dice que no se borró nada | `qa/baja-error-no-se-borro` | [Crear PR](https://github.com/EchuSosa/vida-sobrenatural/compare/main...qa/baja-error-no-se-borro?expand=1&title=e2e%3A%20Si%20la%20baja%20falla%20no%20dice%20que%20no%20se%20borr%C3%B3%20nada%20%28BUG-16%29&body=Spec%20018%2C%20US1%20escenario%204%3A%20el%20texto%20existe%20pero%20nunca%20se%20muestra.%0A%0AReproduce%20BUG-16%20de%20la%20ronda%202%20de%20QA%20con%20un%20e2e%20marcado%20%60test.fail%60.%20No%20arregla%20el%20producto%3A%20cuando%20se%20arregle%2C%20Playwright%20avisa%20y%20se%20saca%20la%20marca.%0A%0AEl%20e2e%20fall%C3%B3%20por%20el%20motivo%20esperado%20contra%20el%20entorno%20QA%2C%20sobre%20%60main%60%20111f2b2.%0A%0A%F0%9F%A4%96%20Generated%20with%20%5BClaude%20Code%5D%28https%3A//claude.com/claude-code%29) |
| BUG-17 | Baja | La charla le habla a la líder como si fuera la persona | `qa/charla-segunda-persona` | [Crear PR](https://github.com/EchuSosa/vida-sobrenatural/compare/main...qa/charla-segunda-persona?expand=1&title=e2e%3A%20La%20charla%20le%20habla%20a%20la%20l%C3%ADder%20como%20si%20fuera%20la%20persona%20%28BUG-17%29&body=%22Todav%C3%ADa%20no%20ten%C3%A9s%20grupo%20de%20extensi%C3%B3n%22%20y%20%22Ya%20elegiste%202%20ministerios%22%20hablan%20de%20otra%20persona.%0A%0AReproduce%20BUG-17%20de%20la%20ronda%202%20de%20QA%20con%20un%20e2e%20marcado%20%60test.fail%60.%20No%20arregla%20el%20producto%3A%20cuando%20se%20arregle%2C%20Playwright%20avisa%20y%20se%20saca%20la%20marca.%0A%0AEl%20e2e%20fall%C3%B3%20por%20el%20motivo%20esperado%20contra%20el%20entorno%20QA%2C%20sobre%20%60main%60%20111f2b2.%0A%0A%F0%9F%A4%96%20Generated%20with%20%5BClaude%20Code%5D%28https%3A//claude.com/claude-code%29) |
| BUG-18 | Baja | La miga de la grilla de turnos mide 20 px en celular | `qa/miga-chica-celular` | [Crear PR](https://github.com/EchuSosa/vida-sobrenatural/compare/main...qa/miga-chica-celular?expand=1&title=e2e%3A%20La%20miga%20de%20la%20grilla%20de%20turnos%20mide%2020%20px%20en%20celular%20%28BUG-18%29&body=Spec%20017%2C%20SC-004%20pide%2044%20px%20en%20celular.%0A%0AReproduce%20BUG-18%20de%20la%20ronda%202%20de%20QA%20con%20un%20e2e%20marcado%20%60test.fail%60.%20No%20arregla%20el%20producto%3A%20cuando%20se%20arregle%2C%20Playwright%20avisa%20y%20se%20saca%20la%20marca.%0A%0AEl%20e2e%20fall%C3%B3%20por%20el%20motivo%20esperado%20contra%20el%20entorno%20QA%2C%20sobre%20%60main%60%20111f2b2.%0A%0A%F0%9F%A4%96%20Generated%20with%20%5BClaude%20Code%5D%28https%3A//claude.com/claude-code%29) |

Los 11 e2e pasaron lint y tipos. Los corrí contra QA con una copia temporal que usa personas demo, y 10 fallaron en la aserción esperada. El de BUG-12 pasa en QA porque ese teléfono ya está corregido; el motivo lo comprobé a mano. **No corrieron con la configuración completa de Playwright:** su `globalSetup` hace `prisma migrate reset` y la base `e2e_qa` está vacía. La CI de cada PR es la primera corrida completa.

## Turnos de servicio (spec 017)

35 casos propios, armados desde la spec porque el manual todavía no los tiene: 30 bien, 3 con bug, 1 parcial y 1 sin concluir.

- **Líder (web):** la grilla arranca en la próxima fecha en borrador. Lista solo integrantes del área, con el conteo y "Ese día ya sirve en Ministerio Ceremonial". Sumar, quitar, copiar la fecha anterior, publicar y cambiar una fecha publicada funcionan, con los avisos y mails a quien entra y a quien sale.
- **Persona:** "Tu próximo turno" y "Mis turnos" muestran solo fechas publicadas. "No puedo ir" con motivo deja "Falta cubrir", le avisa a la líder sin el motivo, y el motivo no lo ven otras personas. El día del turno no hay botón, y la API responde `TURNO_YA_EMPEZO`.
- **Admin y Pastor (backoffice):** reglas semanales y mensuales bien calculadas, incluido "el último sábado" con cambio de año. También funcionan regla repetida, campos vacíos y cupo fuera de 1 a 20 con error por campo, y suspender una fecha con aviso. El Pastor ve todo sin botones, y la API le responde 403.
- **Casos borde:** si alguien deja el Ministerio, sus turnos quedan para cubrir y la líder recibe aviso. Un Ministerio inactivo saca sus fechas y las devuelve al reactivarlo.
- **Errores:** tres toques en "Sí, publicar", en "Agregar día" y en "No puedo ir", y doble toque en "Sumar a…", mandan un solo pedido. Con la API caída hay aviso con "Reintentar" y nada a medias. Dos pestañas: la segunda recibe "ya tiene turno ese día" en la celda.
- **Celular:** a 360 px la grilla muestra una fecha por vez, sin scroll horizontal y sin violaciones de `axe` en claro ni en oscuro, salvo BUG-18.
- **Parcial:** con la API caída, la tarjeta del Inicio avisa y "Reintentar" la trae. "Mis turnos" se arma en el servidor, y mi simulación de caída no la alcanza.
- **Sin concluir:** "cuántas veces sirvió" cuenta fechas pasadas, y no hay cómo crear turnos en el pasado.
- **Sin correr:** el recordatorio de `DIAS_RECORDATORIO_TURNO`, porque es una tarea diaria sin forma de dispararla.

## Baja de la app (spec 018)

9 casos propios: 8 bien y 1 con bug (BUG-16).

- **Web:** la pantalla explica qué se borra, qué se cierra y que no se deshace. Vacío y "BAJA." dan error en el campo con foco en el resumen. "baja" en minúsculas vale. El doble toque hace una sola baja. Termina en la despedida, y "atrás" y Perfil llevan a ingresar.
- **Efectos:** la sesión vieja recibe 401 y el turno publicado queda para cubrir. La líder recibe `turno.no_puede` sin el nombre, el liderazgo de Multimedia se cierra y la persona no aparece buscando nombre, apellido, email ni teléfono.
- **Barrido de la base:** un `pg_dump` de `vidasobrenatural_qa` después de la baja no tiene el apellido, el email ni el teléfono viejos en ninguna tabla.
- **Mismo email:** entrar de nuevo lleva al registro como alguien nuevo.
- **Backoffice:** el Admin da de baja con motivo interno, con o sin email, también en celular. Vuelve al listado y una segunda baja responde 404. El Pastor no ve el botón y la API le responde 403. La inscripción a un Evento queda sin nombre y no cambia los conteos.
- **Sin correr:** la "única Admin" tiene su propio test de integración y la base QA tiene varias. Tampoco corrieron la baja de una Discipuladora con discipulados en curso ni la de un menor a pedido del tutor.

## Sugerencias (no son bugs)

- **Cupo excedido:** con el cupo completo, la grilla sigue ofreciendo sumar gente. La spec no lo prohíbe, pero "Completa" y una persona de más se ven raro.
- **Recargar la grilla** vuelve a la primera fecha y pierde la elegida.
- **Mismo estado, dos nombres:** en el detalle del Ministerio, "En armado" en Días de servicio y "Borrador" en la grilla. En Sedes, "Inactivar" en el menú y "Desactivar" en el detalle.
- **"Anotar a una Persona"** lista homónimos, como dos "Matías Pérez", sin edad ni email para distinguirlos.
- **Género fijo:** "Matías quedó dada de baja de este discipulado" y "Joaquín… quedó inscripta".
- **URL directa:** con la declaración de Vida Nueva en revisión, `/mi-camino/vida-nueva` muestra el formulario. La API lo frena con `HISTORIAL_VIDA_NUEVA_EN_REVISION`.
- **Textos viejos:** el backoffice dice "empieza el 11 de octubre" de una edición en curso. Con Vida de Servicio registrada y sirviendo, la tarjeta dice "pronto vas a poder elegir uno desde acá".
- **Robustez:** `/grupos/<id de una edición de Vida de Servicio>` del backoffice la muestra como discipulado, con "4 de 1 lugares" y "Cambiar de Discipulador". Solo se llega escribiendo la URL.
- **Datos de prueba en QA:** las ediciones `e2e-qa-titulo-…` de los e2e de la ronda 1 le aparecen a Marta en "Mis grupos" de la base QA.

## Diferencias con el manual

- **CAT-03:** la página pública de Ministerios no muestra "Requiere formación". La spec 009 (T055) decidió mostrar solo nombre y línea pública.
- **EVE-13:** "Eliminar" queda deshabilitado con la explicación, como en la ronda 1.
- **EVE-15:** el manual espera "Subir otro comprobante", pero el producto cancela la inscripción y libera el lugar, como dice el diálogo. Ver BUG-15.
- **AVI-02:** el botón del mail dice "Ver el aviso", no "Ver en la app". La lista muestra "0 de 349" en la columna "Leído por".
- **YAS-01:** "¿Desde qué año servís?" es opcional y aparece recién al elegir un área.
- **ELM-05:** Diego no estaba en la bandeja de elecciones porque todavía no había elegido. Su charla se hizo en ELM-03.
- **Manual:** sigue sin casos de turnos y baja. Los de este informe se pueden sumar al manual.

## Lo que salió bien

- **Bugs de la ronda 1:** los 7 están arreglados. BUG-02 se vio en QA: sin horario elegido, Vida Nueva pide "Elegí un día y un horario…".
- **Avisos y mails:** publicar, cambiar, suspender, "No puedo ir" y dejar el Ministerio avisan una sola vez. Los mails llegan en tandas de unos 30 s.
- **Doble toque:** ningún envío nuevo de turnos ni de baja se duplica.
- **Permisos:** un integrante que no lidera recibe 403 en la grilla. El Pastor recibe 403 al gestionar turnos y al dar de baja.
- **Accesibilidad:** sin violaciones graves de `axe` en la grilla, Mis turnos, la baja y la despedida, en claro y en oscuro.

## Cobertura de los casos abiertos de la ronda 1

| Estado | Casos |
|---|---|
| Bien | 59 |
| Con bug | 2 |
| Parcial | 1 |
| **Total** | **62** |

- **Con bug:** EVE-15 (BUG-15) y GEX-05 (BUG-13). CAT-01 y CAT-11 pasaron después de corregir el teléfono de La Plata (BUG-12).
- **Parcial:** BAU-04, porque el Evento de bautismo pasado tiene una sola persona y no se pudo probar destildar a una.
- **GEX-12** corrió en Chromium con la ubicación emulada, con y sin permiso, no en un celular real.
- **Bugs encontrados de paso:** BUG-10 en GEX-14, BUG-11 en MEN-01 y GEX-08, BUG-14 en DIS-03 y BUG-17 en ELM-03.
