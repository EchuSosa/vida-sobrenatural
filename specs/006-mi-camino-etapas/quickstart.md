# Quickstart: validar la 006 a mano

Cómo levantar todo: `specs/revision-manual/COMO-ARRANCAR.md` (web 3001, backoffice 3002, API
3333, D104). Base: `pnpm --filter api run db:reset-demo`. Variable nueva del backoffice:
`NEXT_PUBLIC_WEB_APP_URL=http://localhost:3001`. Las sesiones de prueba salen de `/dev/entrar` de
cada app.

Los escenarios de la web app se prueban **en el celular** (DevTools, 375 px de ancho) y en
escritorio; los del backoffice, en escritorio. En cada uno: modo claro y oscuro.

## A. Mi camino por etapas (Historia 1)

1. Entrar como una Persona sin pedido. Mi camino muestra cuatro cards: Vida Nueva (disponible,
   "Quiero empezar Vida Nueva"), Vida de Servicio, Ministerio y Bautismo ("Próximamente", con su
   explicación). El subtítulo de cada una es el de Primeros pasos (abrir `/primeros-pasos` y
   comparar); el de Bautismo está marcado provisorio.
2. Tocar la card de Vida Nueva → `/mi-camino/vida-nueva`, con el formulario de franjas de la 004.
   Pedir → volver a Mi camino: la card dice que estamos buscando quién te acompañe.
3. Entrar como la Persona con discipulado en curso del seed → card "en curso"; al tocarla, nombre
   y teléfono del Discipulador.
4. Entrar como la menor de 12 del seed → la card explica que lo pide su tutor, sin botón ni "Ya lo
   hice".
5. Con lector de pantalla (VoiceOver/NVDA): cada card se lee con título, explicación y estado; las
   "Próximamente" no se anuncian como enlace.

## B. Historial previo (Historia 2)

1. Persona sin nada → "Ya lo hice" en Bautismo, comentario de 500 caracteres con tildes → confirmar
   (diálogo neutro, no rojo). La card pasa a "La iglesia lo está revisando" con "Retirar".
2. Retirar → vuelve a "Próximamente" con "Ya lo hice".
3. Declarar Vida Nueva → la card ya no ofrece pedir. Intentar `POST /discipulado/solicitudes/me`
   (desde la consola o Swagger) → 409 `HISTORIAL_VIDA_NUEVA_EN_REVISION`.
4. Backoffice como Admin → Solicitudes → filtro "Historial previo" → abrir la declaración → ver el
   contexto → "Confirmar". En la web, la card dice "Completada · Registrado por la iglesia".
5. Otra declaración → "No confirmar" con motivo → en la web, mensaje amable con el motivo y el
   WhatsApp de Secretaría, y "Ya lo hice" otra vez disponible.
6. Backoffice → Personas → una Persona sin acceso a la app → "Etapas" → registrar Bautismo con nota
   → aparece completada; "Anular" → deja de estarlo; registrar de nuevo → funciona.
7. Como Pastor: ver la bandeja y el detalle sin botones; `POST …/confirmar` → 403.

## C. El Discipulador en la web app (Historia 3)

1. Web app como la Discipuladora 1 (celular). Mi camino muestra el selector "Mi camino · Mis
   discipulados"; la pestaña Mi camino queda marcada en las dos.
2. Si tiene una propuesta pendiente: el Inicio muestra "Tenés 1 cosa para revisar…". Tocar → Mis
   discipulados con la propuesta arriba → aceptar.
3. Abrir el discipulado → registrar un Encuentro, marcar una ausencia con un toque → guardar →
   editarlo. Proponer finalizar.
4. Mis discipulados → Mi disponibilidad: cargar una franja de 45 min (error debajo del campo),
   una válida, un período, prender el toggle, cambiar el máximo por Grupo.
5. Sin scroll horizontal en 375 px; botones de 44 px; letra de 16 px en etiquetas.
6. Backoffice con la misma sesión → pantalla "Lo tuyo está en la app" con "Ir a la app". Abrir
   `http://localhost:3002/mi-disponibilidad` → redirige a `http://localhost:3001/mi-disponibilidad`.
7. Web app como una Persona sin rol de Discipulador → no hay selector; `/mis-discipulados` →
   vuelve a Mi camino.
8. Admin en el backoffice: el menú no tiene "Mis discipulados", "Mi disponibilidad" ni "Mis
   grupos".

## D. Pedir en nombre de (Historia 4)

1. Discipuladora 1 en Mis discipulados (web) → "Pedir Vida Nueva en nombre de…" → buscar a una
   Persona sin email del seed → cargar dos franjas → enviar.
2. Admin → bandeja: el pedido figura "pedido por" la Discipuladora 1.
3. Buscar a alguien que no existe → el texto remite al equipo, sin botón de alta.
4. `POST /personas/alta` con el token de la Discipuladora → 403.

## E. Alta de adultos (Historia 5)

1. Admin → Personas → "Dar de alta una persona" → enviar vacío: errores debajo de cada campo y
   resumen arriba con enlaces; el foco va al resumen.
2. Completar sin email, consentimiento marcado → creada; mensaje de qué sigue; en Personas figura
   "Sin acceso a la app".
3. Otra alta con el mismo teléfono escrito distinto (`+54 221 5550101`) → aviso "Puede que esta
   persona ya esté cargada" con la coincidencia y "Es otra persona, crear igual" → crea sin
   recargar datos.
4. Alta de "Jose Perez" con la misma fecha que "José Pérez" → aviso por nombre + apellido + fecha.
5. Alta con un email ya usado → error en el campo email.
6. Alta con fecha de nacimiento de 16 años → error en el campo, remitiendo a Pendientes de tutor.
7. Doble toque rápido en "Dar de alta" → una sola Persona.
8. "Agregar email" a la Persona sin email → deja de figurar "Sin acceso a la app".
9. Como Pastor: Personas sin "Dar de alta" ni "Agregar email".

## Suites (antes de cerrar cada lote)

```bash
pnpm --filter api run test
pnpm --filter api run test:e2e
pnpm --filter web exec playwright test
pnpm --filter backoffice exec playwright test
```
