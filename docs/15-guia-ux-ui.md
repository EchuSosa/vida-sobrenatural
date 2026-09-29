# Guía de UX/UI

> Reglas de comportamiento de la interfaz para `apps/web` y `apps/backoffice`. Decisiones: D94 (guía y convenciones) y D95 (modo oscuro en el MVP). Complementa `13-requisitos-no-funcionales.md` (accesibilidad), `14-navegacion.md` (menús) y `16-sistemas-transversales.md` (feedback de acciones, errores, notificaciones). La dirección visual (paleta, tipografías) sigue pendiente en `09-notas-identidad-visual.md`.

## Sistemas de referencia

No se inventa un sistema propio: se toman convenciones probadas.

| Referencia | Para qué se usa |
|---|---|
| **shadcn/ui + Radix** | Base de componentes y sus convenciones por defecto (variantes, diálogos, formularios). |
| **GOV.UK Design System** | Formularios, mensajes de error y lenguaje claro — pensado para personas con poca experiencia digital. |
| **Material Design 3 / Apple HIG** | Patrones de celular: barra inferior, zona del pulgar, objetivos táctiles. |
| **Heurísticas de Nielsen + Laws of UX** | Checklist para revisar cada pantalla (visibilidad del estado, prevención de errores, carga cognitiva). |

## Botones

**Orden (convención web común, la de shadcn por defecto):**
- **Escritorio / tablet:** botones alineados a la derecha; la acción **principal a la derecha**, la secundaria a su izquierda.
- **Celular:** botones apilados a todo el ancho; la acción **principal arriba**.
- Nunca se cambia este orden entre pantallas.

**Jerarquía (por forma, no solo por color — funciona con daltonismo):**

| Tipo | Estilo | Uso |
|---|---|---|
| Principal | Relleno, color de marca | **Una sola** por pantalla o diálogo |
| Secundario | Contorno | Alternativas a la principal |
| Terciario | Solo texto (link) | Volver, ver más, acciones menores |
| Destructivo | Relleno rojo + ícono | Dar de baja, rechazar, cancelar inscripción, desactivar |

**En una lista, el botón de cada ítem es de contorno** (Echu, merge de la 004): repetido en cada fila, el relleno deja de marcar cuál es la acción principal. El relleno queda para la acción principal de la pantalla.

**Textos:**
- Siempre un verbo concreto que describa el resultado: "Inscribirme", "Enviar solicitud", "Aprobar", "Rechazar postulación". Nunca "Aceptar", "OK" o "Sí" solos.
- **Evitar "Cancelar" como botón de cierre**, porque existe la acción de negocio "Cancelar inscripción". En diálogos: "Sí, cancelar inscripción" / "No, mantenerla". Para cerrar sin hacer nada: "Volver" o "Cerrar".
- Botones deshabilitados: explicar por qué al lado (ej. "Necesitás completar Vida Nueva para anotarte", D74), no dejar un botón gris sin contexto.
- Mientras una acción se procesa: botón en estado de carga y bloqueado, para evitar envíos duplicados.

**Acciones destructivas:**
- Siempre con diálogo de confirmación que nombre lo que se va a afectar.
- Confirmación reforzada (escribir el nombre) cuando hay datos relacionados activos (D38).
- Ofrecer "Deshacer" donde técnicamente sea posible (ej. toast con deshacer durante unos segundos).

## Estados de cada pantalla

Toda pantalla con datos contempla cuatro estados:
- **Cargando:** esqueletos con la forma del contenido, no spinners a pantalla completa ni pantallas en blanco.
- **Vacío:** mensaje amable + acción sugerida (ej. "Todavía no te anotaste a ningún evento — Ver eventos").
- **Error:** qué pasó en lenguaje simple + botón "Reintentar". Sin códigos técnicos (salvo el código de referencia para soporte, ver `16`).
- **Éxito:** confirmación clara. Los toasts son complementarios: la información importante queda también en la pantalla (ej. el estado de la solicitud). Toasts con `aria-live` y tiempo suficiente para leerlos.

Páginas especiales: 404 ("No encontramos esta página" + links a Inicio y Primeros pasos), error general, y página sin conexión de la PWA.

La matriz completa de qué feedback lleva cada tipo de acción está en `16-sistemas-transversales.md` (D102).

## Formularios (estilo GOV.UK)

- Etiqueta siempre visible arriba del campo; el placeholder nunca reemplaza a la etiqueta.
- Marcar los campos **opcionales** (son minoría); no llenar la pantalla de asteriscos.
- Texto de ayuda debajo de la etiqueta cuando el dato no es obvio (ej. por qué pedimos la dirección).
- Validación al salir del campo y al enviar; al enviar con errores, **resumen de errores arriba** con links a cada campo, y foco movido al resumen.
- Mensajes de error que digan cómo corregir ("Ingresá un teléfono con código de área, por ejemplo 221 555 1234"), no solo "Campo inválido".
- Tipos de campo correctos (`email`, `tel`, `number`) y atributos `autocomplete` para que el celular sugiera los datos. Teléfono con selector de país y profesión por categoría (D90).
- Fecha de nacimiento: tres campos (día / mes / año) o selector accesible — evitar calendarios que obligan a retroceder décadas.
- **Formularios largos en pasos:** el registro inicial (D53) se divide en pasos cortos con indicador ("Paso 2 de 4"), posibilidad de volver sin perder lo cargado, y resumen final antes de enviar.
- No borrar lo que la persona escribió si hay un error.

## "¿Y ahora qué?" — estados de las solicitudes

Cada Solicitud, Postulación o Inscripción muestra, además del estado, **qué pasa después**:

| Estado interno | Qué ve la persona |
|---|---|
| `pendiente` | "Recibimos tu solicitud. El equipo la revisa y te avisamos por notificación." |
| `aprobada` / `confirmada` | Qué sigue concretamente (ej. "Tu discipulador se va a comunicar con vos"). |
| `rechazada` | Mensaje amable + a quién consultar; nunca un "Rechazada" seco. |
| `lista_espera` | Posición o explicación de cómo funciona la lista. |

Los estados siempre llevan texto + ícono (nunca solo color, D81).

## Tono y vocabulario

- Español rioplatense con voseo ("Anotate", "Tu camino"), cálido y cercano, sin sonar informal de más (ver el tono de `12-contenido-bienvenida.md`).
- Frases cortas, una idea por oración. Sin jerga interna ni términos del modelo de datos (`apto_ministerio`, `alcance`).
- **Glosario de interfaz** (a completar en las specs): qué término ve la persona para cada concepto del modelo. Ej.: "Solicitud" en general; "Anotarme" para Eventos; "Primeros pasos" y "Mi camino" (D92).
- Todo texto sale de los archivos de `next-intl` (D84), lo que facilita revisar el tono en un solo lugar.

## Permisos y onboarding

- **Notificaciones push:** nunca pedir el permiso al abrir la app. Pedirlo en contexto, con explicación previa propia (ej. después de enviar una solicitud: "¿Querés que te avisemos cuando la revisen?").
- **iPhone:** las notificaciones solo funcionan con la app agregada a la pantalla de inicio. Mostrar instrucciones paso a paso cuando corresponda (Safari → Compartir → Agregar a inicio). Los avisos importantes llegan igual por email (D96).
- **Primer ingreso:** bienvenida breve que explique qué puede hacer la persona y la lleve a Mi camino.

## Celular

- Acciones principales en la zona del pulgar (mitad inferior de la pantalla).
- Objetivos táctiles de al menos 44×44 px (D81).
- Teclado adecuado a cada campo; el botón de envío no queda tapado por el teclado.
- Sin interacciones que dependan de pasar el mouse por encima.

## Backoffice

- Tablas con búsqueda, filtros y orden; paginación (ver performance en `13`). Aplica donde el volumen lo justifica —Personas, Solicitudes, Eventos—, no en catálogos de dos o tres filas (Principio IV). Cuando llegue la primera, se construye **una sola tabla compartida** en `packages/ui` y la usan todas (Principio XI), en vez de repetir el patrón por pantalla.
- **Inactivar y eliminar son distintas (D117, D119):**
  - **Inactivar** — el registro se sigue viendo en el listado, con su estado en texto + ícono y un filtro activas / todas; su detalle se puede abrir y existe "Reactivar". Es un estado del negocio, no una baja.
  - **Eliminar** — para corregir un error de carga. Sigue siendo borrado lógico, pero desaparece de las vistas normales y va a la papelera, desde donde el Admin puede restaurarlo. **No se puede eliminar un registro con datos relacionados**: ahí el botón queda deshabilitado, explicando por qué y ofreciendo inactivar.
- **Alta en modal:** crear un registro abre un diálogo; al cerrarse, el nuevo registro aparece en el listado. Las filas del listado llevan al detalle, y la edición vive ahí.
- **Una sola tabla para todos los listados** (`TablaDatos` de `packages/ui`, H-69): columnas configurables, orden por columna, columna de acciones, estado vacío y esqueleto de carga incluidos, y `<table>` real con encabezados. Búsqueda y filtros son opcionales por pantalla; el orden, los filtros y la búsqueda se reflejan en la URL.
- **Cómo colapsa la tabla en celular:** cada columna declara su propia clase responsive — no hay un punto de corte global. El orden de prioridad, de lo que nunca se oculta a lo primero que se va:
  1. La columna que **identifica** la fila (el nombre) y la de **acciones**: siempre visibles.
  2. El dato que más ayuda a **distinguir dos filas** entre sí (la dirección, en Sedes).
  3. Los secundarios, de mayor a menor utilidad.
  4. Lo que un filtro activo ya vuelve redundante (con el filtro en "Activas", la columna Estado no aporta nada).
  Dos reglas que no se negocian: **nunca hay scroll horizontal** (el smoke de rutas lo verifica a 320 px), y **ningún dato vive solo en una columna que se oculta** — si desaparece en celular, tiene que estar en el detalle.
- Acciones en lote donde tenga sentido (ej. aprobar varias inscripciones a un Evento).
- Filtros y búsqueda reflejados en la URL, para poder volver o compartir la vista.
- Indicar claramente cuando el Admin está actuando **en nombre de otra Persona** (D97), con el nombre visible durante toda la acción.
- Atajos de teclado para acciones frecuentes (opcional, sin reemplazar los botones).
- Densidad de información mayor que en la app de la Persona, pero con la misma jerarquía de botones.
- **Una acción que nombra un verbo ejecuta ese verbo** (revisión manual, H-107/H-108/H-109): "Crear una Sede" abre el formulario de alta, no un listado desde donde hay que buscarlo; renombrar la acción a algo más vago ("Ir a Sedes") no es una alternativa válida, dejaría el trabajo a medias igual. Y **cuando una acción deja algo a medio terminar, la confirmación ofrece el paso siguiente y el listado muestra lo que falta**: crear un Libro sin portada ofrece "Subir portada" al confirmar, y el listado marca (texto + ícono, D81) cuáles la tienen pendiente — no alcanza con que el placeholder de la portada se vea prolijo (eso es correcto en la web pública, D118, pero en el backoffice un placeholder sin más marca no se distingue de un pendiente real). Mismo criterio para un estado sin nombre: si el orden manual de una tabla no tiene nombre ("Orden propio"), no se lo puede señalar ni ofrecer la vuelta cuando otro orden lo reemplaza.

## Tokens de diseño

Definidos en `packages/ui` como variables CSS (formato de shadcn), para modo claro y oscuro:
- **Color:** semánticos (fondo, texto, primario, secundario, destructivo, éxito, advertencia, borde, foco), no nombres de color. Contrastes verificados en ambos modos (D81).
- **Tipografía** *(actualización 2026-09-18, revisión manual H-07)*: una sola familia (Geist, vía `next/font`, token `--font-sans`) para títulos y texto — dentro del máximo de dos que define D94; no hay todavía una familia de títulos separada porque la identidad visual (`09-notas-identidad-visual.md`) sigue pendiente. Escala fija de tamaños (tokens `text-*` de Tailwind, sin valores sueltos):

  | Uso | Clase | Peso |
  |---|---|---|
  | Título de página (h1) | `text-2xl` / `text-3xl` | `font-semibold` |
  | Título de sección (h2) | `text-xl` | `font-medium` |
  | Subtítulo (h3) | `text-lg` | `font-medium` |
  | Texto de cuerpo | `text-base` / `text-sm` | `font-normal` |
  | Texto secundario/ayuda | `text-sm` | `font-normal`, color `muted-foreground` |
  | Etiquetas de formulario, botones | `text-sm` | `font-medium` |
- **Espaciado:** escala de Tailwind (múltiplos de 4 px), sin valores sueltos.
- **Bordes redondeados, sombras y duración de animaciones:** pocos valores fijos. Animaciones cortas y desactivadas con `prefers-reduced-motion`.
- **Íconos:** Lucide (el set de shadcn), siempre con texto visible o `aria-label`.

## Modo oscuro (D95)

- Entra en el MVP: con shadcn + variables CSS el costo es bajo si se contempla desde el inicio.
- **Por defecto, tema claro** en las dos apps (D106) — no se sigue `prefers-color-scheme`. La persona puede elegir entre **Claro y Oscuro** desde Perfil (en el backoffice y en el header público, desde el menú de usuario), y esa preferencia se guarda.
- **Dos opciones, no tres (D116):** "Sistema" se saca de la interfaz — nadie entendió qué era, y desde D106 ya no es el default de nadie. Cada opción lleva ícono **y** texto (nunca el ícono solo, D81), bajo un rótulo sin jerga: "Colores de la app".
- Cada token de color se define para ambos modos y se verifica su contraste en los dos.
- Logo: usar la versión blanca sobre fondos oscuros y la negra sobre fondos claros (la iglesia ya tiene ambas, ver `09`).
- Flyers, fotos e imágenes de contenido no se alteran; se evita que queden "flotando" con bordes o fondos neutros. Los placeholders de "foto pendiente" también se definen para ambos modos.
- Los tests e2e con axe corren en ambos modos para los flujos críticos.

## Validación con personas

- Pruebas de usabilidad rápidas con el prototipo: 3 a 5 personas, idealmente incluyendo alguien mayor, alguien con poca experiencia digital y alguien brasileño.
- Se les pide completar tareas concretas (ej. "Anotate al próximo evento") sin ayudarlas, y se anota dónde se traban.
- No contradice D8: no valida el problema ni la idea con la iglesia, solo si la interfaz se entiende.

## Checklist por pantalla (para las specs)

- [ ] Una sola acción principal, con verbo concreto.
- [ ] Orden de botones según la convención.
- [ ] Estados de carga, vacío, error y éxito definidos.
- [ ] Los botones que disparan una acción quedan bloqueados y con indicador de carga mientras se procesa, y el envío se protege de la reentrada (H-57).
- [ ] Feedback de cada acción según la matriz de `16`.
- [ ] Se entiende qué pasa después de cada acción.
- [ ] Textos en el tono definido, sin jerga interna.
- [ ] Funciona en celular, con teclado y con lector de pantalla.
- [ ] Contraste verificado en modo claro y oscuro.

## Miga de pan — el único sistema de ubicación (H-81, H-95, H-103)

Aprobado por Echu el 2026-09-23, durante la verificación de la ronda 10. Está escrito acá **como
patrón y no como una lista de pantallas**, porque aplicarlo a una lista es lo que hizo que quedara
a medias dos veces.

1. **Es una ruta, no un "volver".** Se lee "dónde estoy, dentro de qué": `Nosotros › Ediciones VS`.
   El tramo anterior **es** el enlace de vuelta, y dice el nombre del destino — informa más que la
   palabra "Volver".
2. **Separador `›`.** La barra `/` se lee como parte de una dirección web; el chevrón se lee como
   "adentro de". El público de esta app no es técnico y esa diferencia importa.
3. **Arranca en la sección, no en Inicio.** Un tramo "Inicio ›" adelante no agrega claridad —el
   logo y el menú ya llevan al inicio— y suma un escalón que nadie usa.
4. **El último tramo es dónde estás: sin enlace**, en color de texto normal y con
   `aria-current="page"`. Que no se pueda clickear es parte de lo que lo vuelve entendible.
5. **Va siempre arriba del `<h1>`**, pegada al contenido. Así la persona lee dónde está antes de
   leer qué está mirando, y el `<h1>` sigue siendo el primer encabezado del documento.
6. **La ruta se deriva de la jerarquía del contenido, nunca del historial.** Ni `document.referrer`
   ni un query param: la misma URL tiene que mostrar siempre la misma ruta, si no deja de servir
   para orientarse. `/ministerios` dice "Primeros pasos › Ministerios" se llegue de donde se llegue.
7. **En el backoffice, igual:** `Sedes › La Plata`, `Libros › Papelera`. Cuando el último tramo es
   largo (títulos de libro), se recorta con puntos suspensivos en pantallas chicas: no es enlace y
   el `<h1>` de abajo dice el nombre completo.

**Dónde NO va, y no hay una tercera opción:**

- Pantallas de **no encontrado** y de **error**: no hay jerarquía que mostrar (no se sabe qué era
  ese id). Va un enlace suelto y explícito.
- **Finales de flujo** (`registro/listo`): es el cierre de un recorrido, no una hoja de un árbol.

Un enlace "Volver a X" escrito a mano en cualquier otro lado es un defecto, no una variante.

## Listados paginados — el patrón para que uno nuevo no nazca con "cargar más" (H-101)

Cierre de la revisión manual, antes de la spec 004 (que trae cinco listados nuevos). Escrito **como
patrón, no como lista de pantallas** — mismo motivo que la Miga de pan arriba: aplicado pantalla por
pantalla, dos veces terminó a medias.

1. **El paginado lo resuelve la API, nunca el cliente.** `skip`/`take` (o su equivalente) viajan en
   cada pedido; el cliente nunca trae todo y filtra en memoria. Esto no es una preferencia de
   performance — es lo único que hace que la búsqueda y el orden sigan siendo correctos cuando el
   listado crece más allá de una pantalla (ver el punto 5, más abajo).
2. **La búsqueda y el orden también los resuelve la API**, por el mismo motivo que el paginado: filtrar
   u ordenar solo la página que ya está en el cliente da un resultado incompleto o un orden roto en
   cuanto hay una segunda página. Los tres (paginado, búsqueda, orden) van juntos — no tiene sentido
   resolver uno server-side y los otros dos en memoria.
3. **La página vive en la URL, 1-based** (`?pagina=2`) — es lo que ve la persona, aunque la API reciba
   un `skip` calculado a partir de eso (`(página - 1) × tamaño`). Query param propio, igual que `q`
   (búsqueda) y `orden`/`dir` — se puede compartir, sobrevive a un F5 y al botón de atrás.
4. **Cambiar la búsqueda o el orden vuelve a la página 1.** Si no, buscar algo con pocos resultados
   estando en una página avanzada muestra vacío en vez de lo que corresponde — un defecto que aparece
   siempre que se prueba esto a mano, y nunca en el camino feliz de un test que no lo piensa.
5. **Un `?pagina=` inválido o fuera de rango no es un 404.** Cae en la página válida más cercana (1 si
   no es un número válido; la última real si pide una que no existe) — más amable que un error para el
   caso real: volver a un link viejo después de que el listado se vació un poco, o una acción (cerrar,
   eliminar) que deja vacía la página en la que se estaba. La URL se corrige con un redirect real, no
   solo el contenido — un F5 después tiene que seguir mostrando lo mismo.
6. **Los controles de página son enlaces de verdad, nunca botones con `onClick`.** El punto entero de
   que la página esté en la URL se pierde si no se puede abrir en pestaña nueva, compartir, o si el
   botón de atrás del navegador hace cualquier cosa.
7. **En palabras, no solo números** — "Página 2 de 7", Anterior/Siguiente con su texto (no solo
   flechas), áreas de click generosas: mismo criterio de diseño para personas grandes que el resto de
   la app (`Botones`, arriba).
8. **Un componente agnóstico en `packages/ui` (`Paginacion`) + quien lo usa arma la URL** — mismo
   criterio de capas que `ControlesTabla`/`useControlesTablaUrl` (H-88/D126, sección `Backoffice`):
   `packages/ui` no depende de Next, así que no sabe construir un `next/link` ni leer `useSearchParams`;
   el componente recibe cómo armar cada enlace (mismo patrón que `ButtonLink` con su prop `render`), y
   quien lo usa (`apps/backoffice`) decide la URL real.

**Primera implementación real, para mirar el código:** Pendientes de tutor (H-101) —
`apps/backoffice/src/app/pendientes-tutor/`. Reemplazó a un "cargar más" que acumulaba estado en
cliente.

**Dónde este patrón TODAVÍA no llegó, a propósito:** Sedes, Libros, Palabra Profética y sus dos
papeleras siguen trayendo todo el listado y filtrando en memoria — hoy funciona porque todo entra en
una pantalla, pero es un riesgo silencioso: mientras el volumen sea chico, la búsqueda cubre todos los
registros por CIRCUNSTANCIA (entran todos en memoria), no porque el mecanismo lo garantice. El día que
uno de esos cinco crezca, la búsqueda pasa a ser "sobre lo que ya se cargó" sin que ningún test lo note
— nada en el mecanismo actual distingue "estoy viendo todo" de "estoy viendo una parte". Migrarlos
necesita que sus endpoints acepten `skip`/`take` — fuera de este lote, se solapa con la spec 004.

---
*Creado fuera de sesión formal, antes de la Sesión 6.*
