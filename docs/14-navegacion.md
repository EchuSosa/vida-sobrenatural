# Navegación y Arquitectura de Información

> Define los menús de las tres superficies de la app. Decisiones: D91 (estructura de menús), D92 (nombres visibles), D93 (YouTube en el MVP). Las reglas de accesibilidad y SEO de `13-requisitos-no-funcionales.md` aplican a toda la navegación.

## Punto de partida

La web anterior (vidasobrenatural.com) tenía un único menú informativo: **Iglesia, Palabra Profética, Eventos, Visitanos, Contacto, Liderazgo**. La app nueva tiene además un área privada y un backoffice, por lo que se definen **tres menús distintos**, uno por tipo de usuario.

## 1. Web pública (sin login) — `apps/web`

| Ítem | Contenido | Origen en la web vieja |
|---|---|---|
| **Nosotros** | Quiénes somos ("Somos Familia") · Identidad (cristianos, evangélicos, bautistas) · Historia · Visión y Misión · Valores · Sistema de trabajo (Bienvenida → Discipulado → Red) · Nuestro llamado (Isaías 61) · En qué creemos · Liderazgo (D109) | Iglesia + Liderazgo |
| **Primeros pasos** | Cómo integrarse (Vida Nueva, Vida de Servicio, Ministerios), bautismo, preguntas frecuentes | Nuevo — es el corazón del Problem Statement |
| **Ministerios** | Listado público de Ministerios | Nuevo |
| **Palabra Profética** | Palabra del año: texto + video de YouTube, editable por el Admin (D109) | Palabra Profética |
| **Ediciones VS** | Libros publicados por la iglesia: portada, título y autor/a (D109) | Nuevo (del sitio actual) |
| **Eventos** | Cartelera + página pública de cada Evento (D82) | Eventos |
| **Visitanos** | Dirección (Calle 23 N°1665 e/ 66 y 67, La Plata), horarios de culto (presencial y online), mapa, WhatsApp de Secretaría, contacto ("Queremos conocerte") | Visitanos + Contacto |

El contenido de cada sección sale de `12-contenido-bienvenida.md` cuando existe.

**Acciones destacadas** (botones, a la derecha del menú):
- **Dar** → Ofrendas (versión estática, D67). Se usa "Dar", el mismo nombre que ya usa la iglesia en su link-in-bio.
- **Ingresar** → login SSO.

**Qué no va en el menú:**
- **Palabra Profética:** además de su sección propia (D109), se destaca como banner en el Inicio, porque es lo que la iglesia comunica todo el año.
- **Redes sociales:** sección **"Seguinos"** en el Inicio (últimos videos de YouTube en el MVP; Instagram en Fase 2) + íconos en el pie de página.

**Celular:** mismas secciones dentro de un menú hamburguesa; "Dar" e "Ingresar" siguen visibles.

**Pie de página:** repite las secciones + dirección, horarios, teléfono y redes (nombre/dirección/teléfono idénticos en todos lados, ayuda al SEO local) + enlace "Contanos qué te parece" (D102).

## 2. App con sesión iniciada (Persona) — `apps/web`

Barra de pestañas inferior (patrón de app nativa, usable con una mano):

| Pestaña | Contenido |
|---|---|
| **Inicio** | Novedades, próximos pasos sugeridos, Palabra Profética, Seguinos |
| **Mi camino** | Discipulado (Vida Nueva), Vida de Servicio, Ministerio, Bautismo — cada Persona ve solo lo que aplica a su etapa y roles |
| **Eventos** | Cartelera + mis inscripciones y pagos (URL `/mis-eventos`: Next.js no permite que la pantalla de la app y la página pública resuelvan `/eventos`; mismo patrón que `/mi-camino`) |
| **Avisos** | Historial de notificaciones con leídas/no leídas (cada una lleva a su entidad relacionada, D59, D100) |
| **Perfil** | Mis datos (con foto de Google si existe, D87), Relaciones Familiares, tema Claro/Oscuro/Sistema (D95), "Contanos qué te parece", cerrar sesión (y selector de idioma cuando exista, D84) |

- Las páginas públicas (Nosotros, Primeros pasos, Ministerios, Visitanos, Dar) siguen accesibles desde un menú secundario.
- En pantallas grandes, la barra inferior pasa a ser una barra superior o lateral con los mismos ítems.
- La visualización de progreso dentro de Mi camino (línea de tiempo del proceso) queda en Fase 2; en el MVP la sección existe y agrupa los procesos.

## 3. Backoffice — `apps/backoffice`

Menú lateral, filtrado por rol (la API igual valida cada permiso, ver seguridad en `13`):

| Rol | Ítems |
|---|---|
| **Admin** | Inicio (métricas básicas, cumpleaños del mes, pendientes, comentarios de la app) · Personas (incluye alta de adultos, D97) · Solicitudes · Grupos · Eventos · Notificaciones · Catálogos |
| **Discipulador** | Mis discipulados (Encuentros) · Alta de Personas (D97) · Mi disponibilidad |
| **Líder de curso** | Mis grupos (Contenido semanal, Asistencia, propuesta de finalización) |
| **Pastor/Pastora** | Los mismos ítems que el Admin, en modo solo lectura (D64) |

- **Solicitudes** es una bandeja unificada: Solicitudes de Discipulado, inscripciones a Vida de Servicio, Solicitudes de Bautismo, Postulaciones a Ministerio, Inscripciones a Evento pendientes y Pagos a verificar — con filtro por tipo.
- **Catálogos** agrupa Sedes, Cursos, Ministerios y Células.
- Una Persona con varios roles (ej. Discipulador y Líder) ve la unión de sus ítems.
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
