# Navegación y Arquitectura de Información

> Define los menús de las tres superficies de la app. Decisiones: D91 (estructura de menús), D92 (nombres visibles), D93 (YouTube en el MVP). Las reglas de accesibilidad y SEO de `13-requisitos-no-funcionales.md` aplican a toda la navegación.

## Punto de partida

La web anterior (vidasobrenatural.com) tenía un único menú informativo: **Iglesia, Palabra Profética, Eventos, Visitanos, Contacto, Liderazgo**. La app nueva tiene además un área privada y un backoffice, por lo que se definen **tres menús distintos**, uno por tipo de usuario.

## 1. Web pública (sin login) — `apps/web`

| Ítem | Contenido | Origen en la web vieja |
|---|---|---|
| **Nosotros** | Página de sección: Quiénes somos ("Somos Familia") · Identidad (cristianos, evangélicos, bautistas) · Historia · Visión y Misión · Valores · Sistema de trabajo (Bienvenida → Discipulado → Red) · Nuestro llamado (Isaías 61) · En qué creemos · Liderazgo · **Palabra Profética** · **Ediciones VS** (D109, D115) | Iglesia + Liderazgo + Palabra Profética |
| **Primeros pasos** | Página de sección: cómo integrarse (Vida Nueva, Vida de Servicio y **Ministerios**, que es la última etapa), bautismo, preguntas frecuentes (D115) | Nuevo — es el corazón del Problem Statement |
| **Eventos** | Cartelera + página pública de cada Evento (D82) | Eventos |
| **Visitanos** | Dirección (Calle 23 N°1665 e/ 66 y 67, La Plata), horarios de culto, mapa, WhatsApp de Secretaría, contacto ("Queremos conocerte") | Visitanos + Contacto |

El contenido de cada sección sale de `12-contenido-bienvenida.md` cuando existe.

**Cuatro ítems fijos y ningún submenú desplegable (D115).** Nosotros y Primeros pasos son páginas de sección que enlazan a sus subpáginas; cada subsección mantiene su URL propia (D82). Los desplegables quedan descartados: no funcionan con el dedo y desorientan a quien no está acostumbrado a navegar.

**Acciones destacadas** (botones, a la derecha del menú):
- **Dar** → Ofrendas (versión estática, D67). Se usa "Dar", el mismo nombre que ya usa la iglesia en su link-in-bio.
- **Ingresar** → login SSO. Con sesión activa se reemplaza por **"Ir a la app"** (D91, H-19).
- **Con sesión activa**, además, un **menú de usuario** con Perfil, colores de la app (Claro / Oscuro, D116) y cerrar sesión — igual que el del backoffice (H-38). En celular, esos ítems van dentro del panel del menú hamburguesa. Sin este menú, para cerrar sesión hay que entrar a la app primero.

**Qué no va en el menú:**
- **Palabra Profética:** además de su sección propia (D109), se destaca como banner en el Inicio, porque es lo que la iglesia comunica todo el año.
- **Redes sociales:** sección **"Seguinos"** en el Inicio (últimos videos de YouTube en el MVP; Instagram en Fase 2) + íconos en el pie de página.

**Celular:** mismas secciones dentro de un menú hamburguesa; "Dar" e "Ingresar" siguen visibles.

**Pie de página:** repite las secciones + dirección, horarios, teléfono y redes (nombre/dirección/teléfono idénticos en todos lados, ayuda al SEO local) + enlace "Contanos qué te parece" (D102).

## 2. App con sesión iniciada (Persona) — `apps/web`

Barra de pestañas inferior (patrón de app nativa, usable con una mano):

| Pestaña | Contenido |
|---|---|
| **Inicio** | Novedades, próximos pasos sugeridos, Palabra Profética, Seguinos; para el Discipulador, un **aviso de pendientes** (propuestas por responder, rechazos de finalización o baja) con enlace a Mis discipulados (D156) |
| **Mi camino** | Las **cuatro etapas siempre** — Vida Nueva, Vida de Servicio, Ministerio, Bautismo — cada una con su estado (disponible, en curso, completada, próximamente, bloqueada con su requisito) y su "Ya lo hice" (D144, D153). Arriba, para quien tiene permisos de cargo, un **selector "Mi camino · Mis discipulados · Mis grupos"** (D156): Mis discipulados (con Mi disponibilidad adentro) para el Discipulador y Mis grupos para el Líder de curso, en la web app (D142). |
| **Eventos** | Cartelera + mis inscripciones y pagos (URL `/mis-eventos`: Next.js no permite que la pantalla de la app y la página pública resuelvan `/eventos`; mismo patrón que `/mi-camino`) |
| **Avisos** | Historial de notificaciones con leídas/no leídas y contador en la pestaña; cada aviso es un enlace real que lo marca leído y lleva a su destino (`/avisos/{id}/ir`, D59, D100, D206) |
| **Perfil** | Mis datos (con foto de Google si existe, D87), Relaciones Familiares, colores de la app — Claro / Oscuro (D116), "Contanos qué te parece", cerrar sesión (y selector de idioma cuando exista, D84) |

- Las páginas públicas (Nosotros, Primeros pasos, Ministerios, Visitanos, Dar) siguen accesibles desde un **menú secundario** (H-37):
  - **Celular:** la app tiene una barra superior delgada con el logo (lleva a Inicio) y un botón "Más" que abre el mismo panel lateral del menú público, con las cinco secciones y "Dar".
  - **Escritorio:** esas secciones entran en la barra superior de la app, agrupadas bajo "Más" si no entran cómodas.
  - Al abrir una pantalla pública desde la app, se ofrece volver (D107). Salir a lo público es una decisión de la persona, no algo que pase sin querer.
- En pantallas grandes, la barra inferior pasa a ser una barra superior o lateral con los mismos ítems.
- El selector de Mi camino es **subnavegación de una sección**, no un segundo sistema de ubicación: la pestaña Mi camino queda marcada en `/mi-camino`, `/mis-discipulados`, `/mi-disponibilidad` y `/mis-grupos` (D156).
- La visualización de progreso dentro de Mi camino (línea de tiempo del proceso) queda en Fase 2; en el MVP la sección existe y agrupa los procesos.

## 3. Backoffice — `apps/backoffice`

Menú lateral, filtrado por rol (la API igual valida cada permiso, ver seguridad en `13`):

| Rol | Ítems |
|---|---|
| **Admin** | Inicio (pendientes por tipo, métricas básicas, cumpleaños **de la semana** con enlace al listado del mes, comentarios sin revisar — D208, D210) · Personas (incluye alta de adultos, D97, D145; cada Persona tiene su **perfil** por secciones, D209) · Solicitudes · Grupos · Eventos · Notificaciones · Catálogos · Palabra Profética · Libros · Pendientes de tutor |
| **Pastor/Pastora** | Los mismos ítems que el Admin, en modo solo lectura (D64, D142), salvo la Palabra Profética, que edita (D129) |

**El backoffice es del Admin y el Pastor (D142, D157).** Discipuladores y Líderes de curso trabajan en la web app (§2): Mis discipulados, Mi disponibilidad y Mis grupos ya no están acá. Sus rutas viejas del backoffice redirigen a la web app, y quien entra sin ningún ítem aterriza en una pantalla terminal **"Lo tuyo está en la app"**, con un botón "Ir a la app" (nunca un error ni un bucle, H-134).

- **Solicitudes** es una bandeja unificada: Solicitudes de Discipulado, Historial previo ("Ya lo hice"), inscripciones a Vida de Servicio, Solicitudes de Bautismo, Postulaciones a Ministerio, Inscripciones a Evento pendientes y Pagos a verificar — con **filtro por tipo** visible desde que hay más de un tipo, filtro Abiertas / Resueltas / Todas (abiertas por defecto, D208) y orden por defecto "más tiempo esperando". Cada fila lleva al detalle de su tipo (D178).
- El detalle de un **Evento de bautismo** tiene la sección "Personas a bautizar" (con "Esperando fecha" y "Confirmar bautismos") en lugar de la lista genérica de inscriptos (D181, D180).
- **Cumpleaños** (del mes) y **Comentarios** ("Contanos qué te parece") se abren desde el Inicio; no son ítems del menú.
- **Catálogos** agrupa Sedes, Cursos, Ministerios y Células (D213): dejan de ser ítems propios del menú; su miga de pan arranca en Catálogos.
- Una Persona con varios roles ve la unión de sus ítems (en el backoffice, solo Admin y Pastor tienen ítems).
- Menú de usuario (arriba a la derecha): tema, "Contanos qué te parece", cerrar sesión.

## Nombres visibles vs. nomenclatura oficial (D92)

La iglesia llama a su proceso **Bienvenida → Discipulado → Red** (ver `09-notas-identidad-visual.md`). En la interfaz se usan nombres más descriptivos para alguien que recién llega:
- **Primeros pasos** (sección pública) — explica el proceso completo.
- **Mi camino** (sección privada) — el proceso propio de cada Persona.

Dentro de esas secciones se mantienen los nombres propios de la iglesia para cada curso o etapa (Vida Nueva, Vida de Servicio, Ministerios, Bautismo). El modelo de datos no cambia.

## Accesibilidad de la navegación (D81)

- Menús dentro de `<nav>` con `aria-label` distinto para cada uno (principal, pie de página, pestañas).
- Enlace "Saltar al contenido" como primer elemento enfocable.
- Página actual marcada con `aria-current="page"` (no solo con color).
- Menú hamburguesa: botón real con `aria-expanded`, cierre con Escape y foco atrapado mientras está abierto.
- Pestañas inferiores con ícono + texto visible (nunca solo ícono) y objetivos táctiles de al menos 44×44 px.
- Enlaces reales (`<a href>`) para que los buscadores recorran el sitio (D82).

---
*Creado fuera de sesión formal, antes de la Sesión 6.*
