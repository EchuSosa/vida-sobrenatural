# Checklist de pantallas — lote 6 (T071a, T076, T077)

Verificación contra el "Checklist por pantalla" de `docs/15-guia-ux-ui.md` (D114). Cómo: a mano (pantalla
levantada con el seed demo, claro y oscuro, Admin y Pastor) y con `cursos.spec.ts` y
`pastor-solo-lectura.spec.ts` (axe en los dos temas).

## `/catalogos` — T076

- [x] Una tarjeta por catálogo que existe (Sedes, Cursos), cada una un enlace real con su título subrayado,
  descripción y "N activos de M"; nunca una tarjeta de lo que todavía no existe (Principio IV). Si el resumen
  no carga, las tarjetas siguen y un aviso lo dice. Textos a next-intl.

## `/cursos` (listado) — T076

- [x] **Acción principal:** "Agregar un Curso" (relleno), solo con `cursos.gestionar`; "Ver" por fila de
  contorno; "Papelera" fantasma, solo con `cursos.papelera.ver`.
- [x] **Cuatro estados:** `loading`, `error` con código y "Reintentar", vacío ("No hay Cursos activos."),
  tabla. Sin paginar ni buscar: pocos registros (docs/15).
- [x] **Alta en modal:** combinación reconocida (o "está en la papelera: se recupera"), nombre y descripción
  con etiqueta arriba y ayuda; errores por campo con resumen enfocado (H-50); `useEnvio` (H-57); toast y el
  Curso aparece en la lista; si ya están todos, el panel lo dice.
- [x] **Estado:** "Activo"/"Inactivo" con ícono (`EstadoActivoBadge`, D81); filtro Activos/Todos en la URL.
- [x] **Celular:** sin scroll; la combinación se repite debajo del nombre cuando su columna se va.

## `/cursos/[id]` — T076

- [x] Editar nombre y descripción (Guardar con `useEnvio`, errores por campo); el Pastor ve los campos de
  solo lectura y ningún botón.
- [x] **Inactivar** es reversible: confirmación neutra (D151); con Grupos en curso, reforzada: el botón se
  habilita solo con el nombre exacto (D38, e2e). **Reactivar** neutro.
- [x] **Eliminar** (rojo, confirmación destructiva) solo sin Grupos; con Grupos queda deshabilitado con la
  explicación y la oferta de inactivar a la vista (D119, docs/15).
- [x] Miga `Catálogos › Cursos › Nombre`; `not-found` propio sin miga.

## `/cursos/papelera` — T076

- [x] Lista con fecha de eliminación y "Recuperar" (de contorno, con nombre accesible propio por fila y
  carga mientras recupera); vacío "La papelera está vacía."; miga `Catálogos › Cursos › Papelera`.

## Mis discipulados (web app, Discipulador) — T071a

- [x] Solo cambia el mensaje cuando el Curso está inactivo: el toast de error de "Aceptar" dice qué pasó y qué
  sigue con palabras del Discipulador ("el equipo lo pausó", "la propuesta sigue esperándote"), sin pedirle
  algo que no puede hacer (reactivar el Curso es del Admin). El texto sale de `errors.CURSO_INACTIVO` de la web
  app (next-intl). El botón sigue con `useEnvio` (H-57) y la lista se refresca: la propuesta queda pendiente.

## Sedes — T077

- [x] **Navegación:** Sedes ya no es un ítem del menú lateral (D213); se entra por la tarjeta de Catálogos. En
  `/sedes`, `/sedes/[id]` y `/sedes/papelera` (y en Cursos) el ítem Catálogos queda marcado con
  `aria-current="page"` además del resaltado (no solo color, D81).
- [x] **Miga:** `Catálogos › Sedes` en el listado (antes no tenía), `Catálogos › Sedes › Nombre` en el detalle y
  `Catálogos › Sedes › Papelera`; "Catálogos" sale de next-intl. El resto de las pantallas no cambió.
- [x] e2e: `cursos.spec.ts` (menú sin Sedes, `aria-current`, migas) y `sedes.spec.ts` (miga del detalle).
