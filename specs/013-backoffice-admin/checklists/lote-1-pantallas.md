# Checklist de pantallas — lote 1 (T027)

Verificación de la bandeja unificada contra el "Checklist por pantalla" de `docs/15-guia-ux-ui.md`
(D114). Cada ítem dice **cómo** se verificó: a mano (lectura del código y la pantalla levantada con
datos, a 1280 y 360 px, claro y oscuro) o con un e2e. Lo que no cumple del todo va en
**Observaciones**.

## `/solicitudes` (bandeja) — T027

- [x] **Una sola acción principal, con verbo concreto:** la bandeja no resuelve nada (FR-006). Para
  quien tiene `solicitudes.crear_en_nombre`, la principal es "Pedir Vida Nueva en nombre de…" (de la
  004, sin cambios); el "Ver" de cada fila es de contorno (docs/15: el botón repetido por fila no
  lleva relleno). El Pastor no tiene ninguna acción además de "Ver" (e2e H1.6).
- [x] **Orden de botones:** sin grupos de botones nuevos.
- [x] **Cuatro estados:** `loading.tsx` con la forma de la tabla (textos por next-intl), `error.tsx`
  con código de referencia y "Reintentar", vacío por filtro ("No hay nada esperando una respuesta."
  en Abiertas, "No hay solicitudes con este filtro." en el resto, y el de búsqueda con el término) y
  éxito (la tabla).
- [x] **Reentrada (H-57):** la pantalla no dispara acciones propias; el panel de "Pedir en nombre de"
  ya usa `useEnvio`.
- [x] **Feedback / qué pasa después:** cambiar un filtro cambia la URL y vuelve a la página 1 (e2e
  H1.8); el resultado dice cuántas hay ("20 solicitudes").
- [x] **Tono:** voseo y sin jerga: "Abiertas: esperan una respuesta", "Hace N días", "No espera", "La
  cargó". Los estados de cada tipo salen de `bandeja.estados.<tipo>.<estado>`.
- [x] **Celular:** a 360 y 320 px sin scroll horizontal (verificado a mano y e2e); Persona, Estado y
  "Ver" nunca se ocultan; el tipo y la espera se repiten dentro de esas celdas cuando sus columnas se
  van; Pedida, La cargó y Revisada por están también en el detalle de cada tipo.
- [x] **Teclado y lector de pantalla:** `<table>` real con `caption`; los filtros son `<select>` con
  etiqueta; "Ver" tiene nombre accesible "Ver la solicitud de <nombre>" (empieza con el texto visible);
  los íconos de tipo y estado son `aria-hidden` y van siempre con su texto (D81).
- [x] **Contraste claro y oscuro:** axe sin violaciones en los dos temas (e2e `bandeja.spec.ts` y a
  mano con los datos de demo). Los colores son los tokens de `TablaDatos`, `ControlesTabla` y
  `ButtonLink` (D118), sin colores nuevos.

## Observaciones

1. **El nombre de la Persona todavía no enlaza al perfil** (FR-006, H1.4 segunda mitad): el perfil
   es del lote 2. En este lote cada fila lleva al detalle por "Ver"; el lote 2 convierte el nombre en
   enlace (con avatar) y suma el caso al e2e.
2. **T027a (detalle de Discipulado con el nombre enlazado)** pasa al lote 2 por lo mismo: en este
   lote el detalle no cambió (solo el import de `EstadoSolicitudTexto`).
