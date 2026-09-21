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
- **Lo dado de baja se ve y se puede reactivar (D117):** los listados incluyen los registros inactivos, con su estado en texto + ícono y un filtro activas / todas; su detalle se puede abrir y existe la acción "Reactivar". Un borrado lógico que desaparece de la pantalla es, para quien lo usa, un borrado.
- **Alta en modal:** crear un registro abre un diálogo; al cerrarse, el nuevo registro aparece en el listado. Las filas del listado llevan al detalle, y la edición vive ahí.
- Acciones en lote donde tenga sentido (ej. aprobar varias inscripciones a un Evento).
- Filtros y búsqueda reflejados en la URL, para poder volver o compartir la vista.
- Indicar claramente cuando el Admin está actuando **en nombre de otra Persona** (D97), con el nombre visible durante toda la acción.
- Atajos de teclado para acciones frecuentes (opcional, sin reemplazar los botones).
- Densidad de información mayor que en la app de la Persona, pero con la misma jerarquía de botones.

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
- [ ] Feedback de cada acción según la matriz de `16`.
- [ ] Se entiende qué pasa después de cada acción.
- [ ] Textos en el tono definido, sin jerga interna.
- [ ] Funciona en celular, con teclado y con lector de pantalla.
- [ ] Contraste verificado en modo claro y oscuro.

---
*Creado fuera de sesión formal, antes de la Sesión 6.*
