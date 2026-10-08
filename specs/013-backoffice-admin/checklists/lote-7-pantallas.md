# Checklist de pantallas — lote 7 (T084)

Verificación contra el "Checklist por pantalla" de `docs/15-guia-ux-ui.md` (D114) para **Editar datos de una
Persona** (`/personas/[id]/editar`) y el botón "Editar datos" sumado al perfil. Cómo: leyendo el código y con
`apps/backoffice/e2e/persona-editar.spec.ts` (axe en claro y oscuro, `@celular`) y la ruta en el smoke
`axe-todas-las-rutas.spec.ts` con un id real. Los e2e los corre el CI del PR (los agentes no corren
`prisma migrate reset`).

## `/personas/[id]/editar` — T082, T083

- [x] **Una sola acción principal, con verbo concreto:** "Guardar cambios"; la secundaria es "Cancelar"
  (enlace al perfil, `ghost`), a la izquierda en escritorio y debajo en celular — el mismo orden que el alta.
- [x] **Cuatro estados:** `loading.tsx` (miga, título y las tres secciones), `error.tsx` con código y
  "Reintentar" + salida a Personas, `not-found` del perfil para un id que no existe, y el éxito: toast
  "Guardamos los cambios" y vuelta al perfil ya actualizado (H7.4, matriz de `docs/16`: acción con
  resultado visible → toast). "Vacío" no aplica (siempre hay datos); guardar sin cambiar nada dice "No
  cambiaste ningún dato…" en un `role="status"`, sin llamar a la API.
- [x] **Botón bloqueado y sin reentrada (H-57):** `useEnvio` + `Button` con `loading`/"Guardando…"; el
  e2e hace doble clic.
- [x] **Errores por campo (H-50):** los mismos mensajes que el alta (`CamposPersona` y
  `useMensajeCampoPersona`, un solo lugar), resumen arriba con enlaces y foco al resumen, sin borrar lo
  escrito. Los de la API también: D133 explica qué hacer ("Primero quitale el rol desde su perfil y
  después corregí la fecha", H7.2), email de otra Persona en su campo (H7.3), DNI repetido con enlace al
  perfil de quien lo tiene (D215).
- [x] **Se entiende qué pasa después:** la descripción dice que lo que no se toca queda igual; al guardar,
  el perfil muestra el dato nuevo.
- [x] **Tono:** voseo y sin jerga ("Editar los datos de Rosa…", "Guardar cambios", "Guardamos los
  cambios"). Todo sale de `next-intl` (`personasEditar`).
- [x] **Miga de pan:** Personas › <nombre> › Editar datos (arranca en la sección).
- [x] **Celular, teclado y lector:** campos con etiqueta visible y `aria-describedby` a ayuda y error;
  fecha en tres campos; teléfono con selector de país (D90); a 360 px sin scroll horizontal (e2e
  `@celular`); controles de 44 px (`h-11`, `size="xl"`).
- [x] **Contraste claro y oscuro:** solo tokens (`border-border`, `text-muted-foreground`,
  `border-destructive`); axe en los dos temas en el e2e y en el smoke de todas las rutas.
- [x] **Permisos:** la página exige `personas.editar` (`requerirPermiso`); el Pastor no ve el botón ni
  llega al formulario y la API le responde 403 (H7.5, e2e e integración).

## Perfil (`/personas/[id]`) — modificado

- [x] "Editar datos" es un enlace real (`ButtonLink`, 44 px) al final de la sección Datos, solo con
  `personas.editar`. El resto del perfil no cambia.

## Observaciones

1. Solo se mandan los campos que cambiaron: un dato viejo que no cumple una regla nueva (por ejemplo, un
   teléfono cargado antes del formato actual) no bloquea corregir otro dato.
2. La ayuda de la fecha de nacimiento cambia respecto del alta: el alta solo carga mayores (FR-031); en la
   edición la regla de la edad es D133 y la decide la API, que conoce los roles.
3. Si la Sede de la Persona ya no está activa, aparece elegida con "(ya no está activa)" para no perderla
   al guardar otro dato; se puede cambiar por una activa.
