# Checklist de pantallas — lote 5 (T068, T068a, T069)

Verificación contra el "Checklist por pantalla" de `docs/15-guia-ux-ui.md` (D114) y D150. Cómo: leyendo el código y
con los e2e `apps/web/e2e/contanos.spec.ts` y `apps/backoffice/e2e/comentarios.spec.ts` (axe en claro y oscuro,
`@celular` en la web), más `/comentarios` y `/comentarios/[id]` en el smoke de axe del backoffice. Los e2e los corre
el CI del PR (los agentes no corren `prisma migrate reset`).

## `/contanos` (web) y el panel del menú de usuario (backoffice) — T068

- [x] **Una sola acción principal, con verbo concreto:** "Enviar". En la confirmación, "Mandar otro comentario" y
  la salida ("Volver a donde estabas" en la web, "Cerrar" en el panel).
- [x] **Cuatro estados:** `loading.tsx` y `error.tsx` (con código y "Reintentar") en `/contanos`; vacío no aplica
  (es un formulario); el éxito es la confirmación en un `role="status"` con qué pasa después ("Cada comentario lo
  lee alguien del equipo…", y si aceptó contacto, "te vamos a contactar").
- [x] **Botón bloqueado y sin reentrada (H-57):** `useEnvio` + `Button` con "Enviando…"; el e2e hace doble clic.
- [x] **Errores por campo (H-50):** tipo, texto (vacío o más de 2000), contacto (con la casilla y sin email ni
  teléfono) y el formato de cada uno; resumen arriba con enlaces y foco; lo escrito no se borra (e2e H5.3, H5.4).
  El límite (H5.5) dice cuánto esperar en minutos, en palabras ("Probá de nuevo en 12 minutos").
- [x] **Sin sesión vs. con sesión:** con sesión no se piden datos de contacto y se explica que se usan los del
  perfil (H5.2); el panel del backoffice siempre es con sesión.
- [x] **Tono:** voseo, sin jerga ("Contanos", "Pueden contactarme para preguntarme más"); todo desde `next-intl`
  (`comentarios.formulario`, el mismo texto en las dos apps a través de `textosFormularioComentario`).
- [x] **Celular, teclado y lector:** tipo como radios con etiqueta y ayuda dentro de un `fieldset` con leyenda;
  contador asociado al texto (`aria-describedby`, `aria-live`); contacto en su `fieldset`; a 375 px sin scroll
  horizontal (e2e `@celular`); controles de 44 px.
- [x] **Contraste claro y oscuro:** solo tokens; axe en los dos temas en ambos e2e.
- [x] **D150 (`noindex`):** `/contanos` no se indexa (`robots: { index: false }`) y no está en el sitemap.

## Pie de página y Perfil de la web (modificados) — T068a

- [x] "Contanos qué te parece" es un enlace real (`/contanos?desde=<pantalla>`), con subrayado permanente (D81),
  foco visible del navegador y 44 px de alto (`min-h-11`). En el pie va en `text-foreground`, el contraste de
  texto normal de los dos temas (`docs/17`).
- [x] El `?desde=` lleva solo el path (sin query), así la página de origen nunca guarda datos de la Persona.

## Comentarios (listado y detalle, backoffice) — T069

- [x] **Una sola acción principal:** en el listado no hay acciones (cada comentario es un enlace a su detalle);
  en el detalle, "Marcar como revisado" o "Deshacer", solo con `comentarios.gestionar` (el Pastor no lo ve, H5.8).
- [x] **Cuatro estados:** `loading.tsx` y `error.tsx` en las dos; vacío que dice qué falta según el filtro ("No
  hay comentarios sin revisar."); `not-found` propio del detalle con salida al listado. El bloque del Inicio tiene
  sus cuatro estados (`Bloque`, D209) y su vacío "No hay comentarios nuevos.".
- [x] **Feedback (`docs/16`):** marcar y deshacer muestran un toast y la pantalla se actualiza; bloqueado mientras
  se guarda (H-57).
- [x] **Filtros con enlaces reales:** estado (por defecto "Sin revisar") y tipo, con `aria-current` marcado
  también con borde y negrita; paginado de a 20 con `Paginacion`; un filtro inválido redirige al listado.
- [x] **Nada solo con color (D81):** tipo, "Revisado"/"Sin revisar" y "Acepta que la contacten" van con texto e
  ícono.
- [x] **Texto literal (FR-048):** el comentario se muestra como texto plano (`whitespace-pre-wrap`); `<b>` se ve
  tal cual (e2e).
- [x] **Miga de pan:** Comentarios › <fecha> en el detalle (arranca en la sección).
- [x] **Celular, teclado y lector:** lista (no tabla) que se apila; datos en `dl`; enlaces `mailto:`/`tel:` de 44 px.
- [x] **Contraste claro y oscuro:** solo tokens; axe en los dos temas.

## Observaciones

1. El envío pasa por el servidor de Next de cada app (acción de servidor) y la API exige `X-Internal-Secret`: así
   el límite por origen usa la IP que ve el servidor y no se saltea mandando otro header desde el navegador.
2. El navegador se guarda resumido ("Chrome 141 · Android") y la IP nunca: solo su huella.
