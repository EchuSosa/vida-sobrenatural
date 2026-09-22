# Quickstart: Contenido institucional

Guía de validación manual end-to-end de las 4 historias del spec, sobre el entorno local ya descripto
en `specs/revision-manual/COMO-ARRANCAR.md`. No repite pasos de implementación — ver `data-model.md`
y `contracts/` para el detalle de cada endpoint/campo.

## Prerrequisitos

- Docker Compose levantado (Postgres) y las tres apps corriendo en sus puertos fijos (`apps/api`
  3333, `apps/web` 3001, `apps/backoffice` 3002, D104).
- `pnpm --filter shared-types run build` corrido después de sumar `error-code.ts`/`portada.ts` nuevos
  (H-33: `shared-types` se compila, hay que reconstruirlo si los servidores ya estaban levantados).
- Migraciones de Prisma aplicadas (`PalabraProfetica`, `Libro`) y seed corrido (`pnpm --filter api run
  seed`, FR-031: Palabra Profética vigente + 8 libros sin portada real).
- Una sesión de Admin y una de Pastor/Pastora en `apps/backoffice` (usuarios ya sembrados por el seed
  de specs anteriores).

## Escenario 1 — Nosotros con el contenido real (Historia 1, P1; entrada+tarjetas D122)

1. Sin sesión, entrar a `apps/web` → Nosotros.
2. Verificar la entrada corta ("Somos Familia", un par de líneas) y la grilla de seis tarjetas —
   Quiénes somos, Visión/misión/valores, Liderazgo, En qué creemos, Palabra Profética, Ediciones VS
   (D122) — cada una con su espacio de imagen reservado (FR-003a) aunque hoy no haya ninguna real.
3. Entrar a Quiénes somos: identidad, historia (31/10/2010, La Plata) y congregación local, con el
   fondo alternado entre secciones (FR-001, FR-003b).
4. Entrar a Visión/misión/valores: visión, misión, los cuatro valores, el sistema de trabajo
   (Bienvenida → Discipulado → Red con el detalle de cada etapa) y el llamado (Isaías 61:1-4 +
   referencia a Lucas 4:16-21) (FR-001, FR-003b).
5. Entrar a Liderazgo y a En qué creemos: mismo contenido que ya existía (equipo pastoral con
   placeholder, declaración de fe pendiente), sin cambios (FR-002).
6. Verificar en celular (o DevTools en modo responsive) que no hay scroll horizontal, en la entrada y
   en cada subpágina.
7. Repetir en modo oscuro.

**Resultado esperado**: SC-001 (toda la identidad/historia/visión/misión/valores sin salir de
Nosotros o sus subpáginas directas).

## Escenario 2 — Palabra Profética y Ediciones VS, solo lectura (Historia 2, P2)

Con el seed ya cargado (una Palabra Profética vigente, 8 libros activos sin portada):

1. Desde Nosotros, entrar a la subpágina de Palabra Profética por su tarjeta (no por el menú
   principal, que sigue en 4 ítems — FR-003). Su URL no cambió con D122.
2. Verificar año/título/texto, y que el video aparece como miniatura sin cargar el reproductor hasta
   hacer clic (FR-005) — inspeccionar que el iframe de YouTube no existe en el DOM antes del clic, y
   que al hacer clic embebe desde `youtube-nocookie.com`.
3. Entrar a la subpágina de Ediciones VS. Verificar introducción, cómo conseguir los libros (mención
   a Producciones Peniel/redes, sin botón de compra), y el listado de los 8 libros con
   `PlaceholderImagen aspecto="portada"` (sin portada real todavía), en el orden esperado (FR-007).
4. Verificar que cada subpágina tiene su propia URL y aparece en `apps/web/sitemap.xml` (FR-009).
5. (Estado vacío) Con la Palabra Profética vigente desmarcada temporalmente desde el backoffice (o en
   una base sin seed): la subpágina muestra un estado vacío amable, no un error (FR-006). Restaurar
   el estado del seed después de esta verificación puntual.

**Resultado esperado**: SC-004 (axe limpio en ambas subpáginas, claro y oscuro).

## Escenario 3 — Admin edita la Palabra Profética (Historia 3, P3)

1. Sesión Admin en `apps/backoffice` → Palabra Profética.
2. Crear una nueva con año/título/texto/URL de YouTube; probar primero con una URL que no es de
   YouTube (ej. un link cualquiera) → error debajo del campo, sin guardar (FR-011). Corregir y
   guardar.
3. Marcarla vigente → verificar en `apps/web` que ya es la que se muestra, y en el backoffice que la
   anterior aparece en el historial como no vigente, sin haber tocado ese registro a mano (FR-012,
   SC-006). Medir el tiempo total de esta acción (meta: bajo 3 minutos, SC-002).
4. Cambiar de sesión a Pastor/Pastora → verificar que ve el historial completo pero ningún campo ni
   botón de guardar está habilitado.

**Resultado esperado**: FR-013 (todo el historial sigue accesible, nada se borró).

## Escenario 4 — Admin gestiona el catálogo de Libros (Historia 4, P4)

1. Sesión Admin → Libros. Dar de alta un libro con título/autor/año (sin portada) → verificar que
   aparece activo en el listado y en Ediciones VS de inmediato.
2. Subir una portada: probar primero con un archivo que no es JPG/PNG/WebP → error claro, nada
   guardado (FR-022, `PORTADA_TIPO_INVALIDO`). Probar con un archivo que supera el tamaño máximo →
   mismo criterio (`PORTADA_TAMANO_EXCEDIDO`). Subir una imagen válida sin completar el texto
   alternativo → no permite guardar (FR-025, `LIBRO_TEXTO_ALTERNATIVO_REQUERIDO`). Completar todo y
   guardar — medir el tiempo total incluyendo el reintento (meta: bajo 5 minutos, SC-003).
3. Subir una imagen apaisada o cuadrada a propósito → verificar que el resultado servido queda
   recortado centrado a 2:3, sin deformar ni dejar franjas (FR-024).
4. Reemplazar la portada por otra → verificar que la URL anterior deja de responder (410/404) y la
   nueva es la que se ve en la web pública (Acceptance Scenario 4). Quitar la portada → el libro
   vuelve a `PlaceholderImagen` (FR-027).
5. Inactivar el libro → desaparece de Ediciones VS pero sigue en el listado del backoffice con filtro
   "Todas", marcado inactivo; reactivarlo → vuelve a aparecer.
6. Eliminarlo (activo o inactivo) → desaparece de toda vista normal (backoffice y web pública);
   entrar a la papelera del backoffice y restaurarlo desde ahí (FR-019, FR-020: sin ningún bloqueo,
   a diferencia de Sede).
7. Cambiar a sesión Pastor/Pastora → ve el listado completo, incluida la papelera, pero ningún botón
   de acción está habilitado.
8. Con una sesión de otro rol (ej. Discipulador): verificar que ni Libros ni Palabra Profética
   aparecen en el menú, y que entrar a la URL directamente devuelve el mismo comportamiento que el
   resto del backoffice restringido (FR-030).

**Resultado esperado**: cierre de la Historia 4 sin tocar la Palabra Profética en ningún paso
(Independent Test del spec).

## Escenario 5 — La marca real en vez del texto/ícono por defecto (Historia 5, P5)

Con el origen de marca ya copiado a `packages/ui/src/assets/marca/` y los íconos de favicon/PWA ya
generados (`node scripts/generar-iconos-marca.mjs`, corrido una sola vez — `research.md` Decisiones
7-9):

1. Abrir cualquier página de `apps/web` y de `apps/backoffice` en el navegador → verificar que la
   pestaña muestra el isotipo como favicon, no el ícono por defecto de Next.js (FR-035).
2. En `apps/web`, verificar `manifest.ts` (o instalar la PWA si el navegador lo permite) → el ícono
   de instalación es el isotipo (FR-036).
3. Recorrer la barra de navegación pública de `apps/web` en escritorio → el logotipo reemplaza al
   nombre en texto, en la versión clara u oscura según el tema (FR-037). Repetir en el modo oscuro.
4. Reducir el viewport a 320 px (el mismo piso que ya cubre el smoke de `axe-todas-las-rutas.spec.ts`,
   H-62) → verificar que no aparece scroll horizontal y que en ese ancho se ve el isotipo solo o el
   logotipo con altura reducida, no la versión completa apaisada (FR-040).
5. Entrar a `apps/backoffice` con sesión → la cabecera del sidebar (hoy sin ninguna marca) muestra el
   logotipo (FR-038).
6. Revisar el pie de página de `apps/web` → muestra el logotipo (FR-039).
7. Compartir el enlace de cualquier página pública (ej. pegarlo en una herramienta de vista previa de
   Open Graph) → la imagen generada (1200×630) incorpora el logotipo en vez del texto plano anterior
   (FR-041).
8. Ver un libro o una foto de equipo sin imagen real → el `PlaceholderImagen` muestra el isotipo
   centrado al 20% de opacidad como marca de agua, en la versión según el tema (FR-034).
9. Correr `auditar()` (H-76) sobre las pantallas tocadas en este escenario → cada uso del logotipo o
   el isotipo tiene su texto alternativo o está marcado decorativo, nunca los dos ni ninguno (FR-042).

**Resultado esperado**: SC-007. Ningún paso de este escenario depende de que exista una Palabra
Profética vigente ni ningún Libro cargado (Independent Test de la Historia 5).

## Datos hostiles (D120, FR-032)

Con `seed-demo` corrido en vez del seed mínimo, repetir el Escenario 2 y verificar en el listado de
Ediciones VS:

- El libro de título larguísimo se lee completo, sin cortar el layout ni desbordar en celular.
- El libro con autor con tildes/ñ se ve correctamente (sin mojibake).
- El libro sin descripción no rompe el detalle (el campo simplemente no aparece).

## Cierre de fase (H-45, SC-005)

Con las pantallas nuevas navegables (Nosotros y sus seis subpáginas —cuatro nuevas de D122 más
Palabra Profética y Ediciones VS— y las dos secciones del backoffice), correr Lighthouse sobre las
siete páginas públicas en simulación de celular y anotar los tres números frente a las metas ya
fijadas en la Constitución: LCP < 2.5 s, INP < 200 ms, CLS < 0.1. Dejar los valores medidos
documentados (ver convención ya usada en hallazgos anteriores de `specs/revision-manual/`) — nadie
los había medido antes de este spec. Resultado: `lighthouse-resultados.md` (T061) — TBT (proxy de
INP) y CLS cumplen la meta en las siete; LCP no la cumple en ninguna, con la misma causa raíz en
todas (peso del bundle de cliente ya existente, no específico de D122/Historia 5) — queda para un
lote de performance aparte.

Antes de cerrar, correr las cuatro suites en verde (CLAUDE.md): `pnpm --filter api run test`,
`pnpm --filter api run test:e2e`, y los e2e de `apps/web` y `apps/backoffice`.
