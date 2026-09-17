# Checklist: Revisión manual de accesibilidad (Base Transversal)

**Propósito**: cubrir lo que `@axe-core/playwright` (T053/T054) no puede detectar automáticamente
— semántica de color y experiencia real de teclado/lector de pantalla — antes de cerrar la
Historia 2 (`spec.md`) y su tarea T055. Axe verifica contraste numérico y ARIA mal formado; **no**
verifica si el significado de un estado depende solo del color, ni si el orden de tabulación tiene
sentido para una persona real.

**Cómo usarlo**: marcar cada ítem como `[x]` recién cuando se verificó a mano (no alcanza con "el
código lo implementa así" — hay que probarlo). Si un ítem falla, no tickearlo y anotar el problema
debajo antes de cerrar T055.

## 1. Ningún estado se comunica solo con color (FR-012, Constitución Principio VII)

- [ ] El ítem de menú activo (público, con sesión, backoffice) se distingue sin mirar el color —
      hay texto/negrita/subrayado/ícono además de cualquier cambio de color (`aria-current="page"`
      ya lo resuelve para tecnología asistiva; esto verifica que también se vea a simple vista).
- [ ] Los mensajes de error de formulario (`/registro`) no dependen solo de un borde o texto rojo —
      llevan también el texto del error.
- [ ] Los toasts de éxito/error (`sonner`, T059) se distinguen por texto/ícono, no solo por el color
      de fondo.
- [ ] El estado "sin conexión" (T068) se anuncia con texto, no solo con un color de fondo distinto.

## 2. Orden de tabulación y foco — las tres superficies (FR-011)

- [ ] **Menú público** (`apps/web/src/app/(publica)/layout.tsx`): tabular desde el principio de la
      página recorre skip-link → logo/inicio → ítems del menú en el orden visual → Dar → Ingresar,
      sin saltos raros ni elementos invisibles enfocables.
- [ ] **Menú hamburguesa** (celular): al abrirlo, el foco entra a su primer ítem; Tab/Shift+Tab
      recorren solo los ítems del menú (no se "escapa" al contenido de atrás); Escape lo cierra y
      devuelve el foco al botón que lo abrió (ver también T049).
- [ ] **Barra con sesión** (`apps/web/src/app/(app)/layout.tsx`): las 5 pestañas (Inicio, Mi camino,
      Eventos, Avisos, Perfil) son alcanzables y activables por teclado en orden lógico (izquierda a
      derecha o de arriba a abajo según el layout).
- [ ] **Sidebar del backoffice** (`apps/backoffice/src/app/layout.tsx`): los ítems visibles para el
      rol de la Persona logueada son alcanzables por teclado en el orden en que se muestran;
      ninguna acción requiere el mouse.
- [ ] En ninguna de las tres superficies el foco queda "perdido" (invisible) en algún punto del
      recorrido — siempre hay un indicador de foco visible.

## 3. Saltar al contenido (FR-010)

- [ ] El enlace "Saltar al contenido" es el primer elemento enfocable al entrar por teclado, en la
      web pública, en la sección con sesión y en el backoffice.
- [ ] Activarlo mueve el foco realmente al `<main>` de la página (no solo hace scroll visual).

## 4. Lector de pantalla, en ambos temas (Historia 2, FR-013)

Repetir esta sección completa una vez en modo claro y una vez en modo oscuro (VoiceOver en
macOS/iOS o TalkBack en Android):

- [ ] **Primeros pasos** (`/primeros-pasos`): el contenido se lee en un orden que tiene sentido; los
      encabezados están anidados correctamente (no saltan de H1 a H3).
- [ ] **Visitanos** (`/visitanos`): los datos de la Sede (dirección, horarios, contacto) se anuncian
      como texto, no quedan mudos ni se leen como "imagen sin descripción".
- [ ] **Registro** (`/registro`, spec 001): cada campo anuncia su etiqueta; un error de validación
      se anuncia automáticamente (no hay que buscarlo a ciegas).
- [ ] En los tres casos, cambiar entre modo claro y oscuro no cambia lo que el lector de pantalla
      anuncia (la experiencia auditiva es la misma; solo cambia lo visual).

## Resultado

- **Fecha de la revisión**: \_\_\_\_
- **Hecha por**: \_\_\_\_
- **Ítems que fallaron** (si los hubo, con el detalle del problema):
