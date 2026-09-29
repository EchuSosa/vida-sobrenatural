# Checklist de pantallas — lote B (T037g, T049, T054, T054e, T054g)

Verificación de las pantallas del lote B contra el "Checklist por pantalla" de
`docs/15-guia-ux-ui.md` (D114). Cada ítem dice **cómo** se verificó: a mano (lectura del código y de
la pantalla) o con un e2e. Lo que no cumple del todo va en **Observaciones**, no se arregla en
silencio.

Pantallas: `/mis-discipulados` (propuestas y discipulados), `/mis-discipulados/[id]`, `/grupos`,
`/grupos/[id]` y la tarjeta Pendientes de `/` (Inicio).

## `/mis-discipulados` — T037g (foco en Celular y en "qué pasa después")

- [x] **Acción principal con verbo concreto:** "Aceptar a {nombre}" en cada propuesta; "Declinar"
  es secundaria (contorno). Ver Observación 1.
- [x] **Orden de botones:** en celular apilados a todo el ancho, la principal arriba; en escritorio
  a la derecha (`flex-col` / `sm:flex-row-reverse`).
- [x] **Cuatro estados:** `loading.tsx` con la forma de las tarjetas, `error.tsx` con reintentar y
  código de referencia, vacío amable ("Todavía no acompañás a nadie…") y el aviso de FR-047 sin
  agenda con "Cargar mis horarios"; el éxito queda en pantalla (la propuesta pasa a discipulado),
  el toast es complementario.
- [x] **Reentrada (H-57):** `useEnvio` + `Button loading` en aceptar y en el panel de declinar.
- [x] **Se entiende qué pasa después:** la confirmación de aceptar dice "vas a ver su teléfono y su
  dirección…"; declinar dice "el equipo va a buscar a otra persona" y que el motivo solo lo ve el
  Admin; `PROPUESTA_NO_VIGENTE` se explica ("el Admin la retiró…") y la lista se recarga.
- [x] **Tono:** voseo, sin jerga (no dice "Propuesta `pendiente`" ni "Liderazgo").
- [x] **Celular:** 360 px primero, objetivos de 44 px (`size="xl"`, enlaces `min-h-11`), sin scroll
  horizontal — e2e `propuestas.spec.ts` en el proyecto `celular` (mide el alto del botón y el ancho
  del documento).
- [x] **Teclado y lector:** cada tarjeta es un `article` con su encabezado; el cumplimiento de las
  reglas va con texto e ícono (D81); el panel de declinar tiene etiqueta, ayuda asociada y resumen de
  errores con foco (H-50).
- [x] **Contraste claro y oscuro:** axe en los dos temas (e2e).

## `/mis-discipulados/[id]` — T049, T054, T054e

- [x] **Una acción principal:** "Registrar encuentro". Pedir terminar, pedir la baja y editar son
  secundarias.
- [x] **Cuatro estados:** esqueleto, error, "Todavía no registraste ningún encuentro…", `not-found`
  propio (lo ajeno se ve igual que lo inexistente, Principio V).
- [x] **Formulario estilo GOV.UK:** etiqueta arriba, ayuda debajo, opcionales marcados, validación
  al salir del campo y al enviar, resumen con enlaces y foco, mensajes que dicen cómo corregir, no
  se borra lo escrito — e2e `discipulado-encuentros.spec.ts` (enviar vacío → resumen enfocado y
  error debajo del campo).
- [x] **Teclado adecuado:** `type="date"` con `max` = hoy en Argentina; la asistencia son casillas
  de 44 px ("Faltó {nombre}"), todos presentes por defecto (FR-013a).
- [x] **Confirmación antes de lo que no se deshace (T054):** pedir terminar abre un diálogo que dice
  qué pasa ("el Admin lo revisa…, mientras tanto podés seguir registrando").
- [x] **Confirmación reforzada de la baja (T054e):** el panel nombra a la Persona, dice que sigue
  siendo parte de la iglesia y puede volver a empezar, y usa el estilo destructivo. Ver
  Observación 2.
- [x] **Estados con texto e ícono:** en curso / terminado, baja pedida, rechazos con su motivo.
- [x] **Celular, teclado, lector, contraste:** e2e en `celular`, claro y oscuro con axe.

## `/grupos` y `/grupos/[id]` — T049, T054, T054e

- [x] **Listado paginado (H-101):** `TablaDatos` + `Paginacion`, `estado`, `pendiente`, `dir` y
  `pagina` en la URL; `?pagina=` fuera de rango redirige a la más cercana.
- [x] **Colapso en celular:** quedan Personas, Pendiente y "Ver"; lo demás está en el detalle (ningún
  dato vive solo en una columna oculta). Smoke de 320/375 px (`axe-todas-las-rutas.spec.ts`).
- [x] **Qué tiene pendiente, con texto e ícono (D81):** "Pidió terminarlo", "Baja pedida", "Cambio
  propuesto a {nombre}".
- [x] **Detalle sin notas (D134):** "Las notas de cada encuentro son del Discipulador: no se muestran
  acá." — e2e busca el texto de la nota y no lo encuentra; test de integración lo busca en el JSON.
- [x] **Una acción principal:** "Confirmar que terminó" cuando hay pedido; confirmar una baja es
  destructiva (relleno rojo suave + ícono); rechazar y cambiar de Discipulador, secundarias.
- [x] **Confirmación antes de lo que no se deshace:** confirmar la finalización y la baja piden
  confirmación que nombra lo afectado; rechazar abre el panel con motivo que ve el Discipulador.
- [x] **Reasignar con el cruce del lote 0:** `components/cruce.tsx` (Principio XI); elegir abre la
  confirmación ("le va a llegar como propuesta…"); un solo overlay por vez (H-51/H-52).
- [x] **El Pastor no ve ninguna acción (D64):** e2e `discipulado-encuentros.spec.ts`.
- [x] **Contraste:** axe claro y oscuro en listado y detalle (e2e).

## Tarjeta Pendientes del Inicio — T054g

- [x] Solo para `solicitudes.aprobar` o `grupos.gestionar` (`tienePermisoSesion`, D132).
- [x] Cada fila: cantidad, texto e ícono, y enlace al listado filtrado (e2e sigue el de bajas hasta
  `/grupos?pendiente=baja`).
- [x] Vacío: "No tenés nada pendiente."; error: la tarjeta lo dice y el resto del Inicio sigue.
  Ver Observación 3.

## Observaciones (para Echu)

1. **Varias propuestas = varias acciones principales.** Con dos propuestas en pantalla hay dos
   "Aceptar" rellenos. Cada tarjeta es una unidad de decisión y en celular se ven de a una, pero la
   regla de docs/15 dice "una sola por pantalla". Alternativa: "Aceptar" en contorno y solo la
   primera tarjeta rellena. No lo cambié sin preguntar.
2. **Confirmación reforzada de la baja.** docs/15 pide "escribir el nombre" cuando hay datos
   relacionados activos (D38). La baja no borra datos (la Persona sigue y puede volver a pedir), así
   que usé una confirmación que nombra a la Persona y explica la consecuencia, sin escribir el
   nombre. Si se quiere el tipeo, es un cambio chico en el diálogo.
3. **La tarjeta muestra solo las filas con algo.** T054g dice "cuatro filas"; muestro solo las que
   tienen cantidad > 0 (una fila en cero sería un enlace a un listado vacío) y, si todas son cero,
   el vacío. Fácil de volver a las cuatro fijas.
4. **"Pedir Vida Nueva en nombre de…" (T046, FR-002)** no está en `/mis-discipulados`: el componente
   es del lote A. Queda `TODO(merge)` en `mis-discipulados-cliente.tsx`.
