# Requisitos No Funcionales

> Accesibilidad, SEO, seguridad, performance e idiomas. Aplican a **todas** las specs (no son un módulo más): cada spec de Spec Kit debe tenerlos en cuenta desde el inicio, no revisarse al final. Se proponen como principios para la constitución del proyecto (`/speckit.constitution`).
>
> Estado: accesibilidad, SEO e idiomas confirmados (D81–D85). Seguridad y performance quedan como **base propuesta**, a confirmar en la Sesión 6; las decisiones abiertas están en `06-preguntas-abiertas.md`.

## 1. Accesibilidad (D81)

**Objetivo:** WCAG 2.2 nivel AA en `apps/web` y `apps/backoffice`. La Ley 26.653 apunta principalmente al Estado, así que acá es una decisión de calidad, no una obligación legal — pero se trata como requisito, no como opcional.

**Lectores de pantalla (personas ciegas o con baja visión):**
- HTML semántico (encabezados en orden, `main`/`nav`, listas, botones reales en vez de `div` clickeables).
- shadcn/ui (Radix) resuelve teclado y ARIA en componentes complejos, pero no reemplaza: labels en todos los campos, errores de formulario anunciados (`aria-live` / `aria-describedby`), textos alternativos.
- **Flyers de Eventos:** son imágenes con texto. El Evento tiene un campo obligatorio `descripcion_imagen`, y la información clave (fecha, lugar, costo, cupo) siempre se muestra también como texto (ver D83).
- **QR de Eventos:** siempre acompañado de un link/botón equivalente.
- Subida de comprobante de Pago operable con teclado y lector de pantalla.

**Daltonismo y color:**
- Ningún estado se comunica solo con color: `pendiente`, `confirmada`, `rechazada`, `lista_espera`, etc. llevan siempre texto + ícono.
- Contraste mínimo 4.5:1 para texto normal y 3:1 para texto grande y elementos de interfaz. Se mide cada par de colores al definir los tokens del sistema de diseño, en modo claro y oscuro (D95).
- Atención con la paleta de `09-notas-identidad-visual.md`: terracota y verde salvia se confunden con daltonismo rojo-verde (no usarlos para oponer estados); celeste sobre crema probablemente no alcanza el contraste para texto.

**Resto:**
- Foco visible en toda navegación por teclado; orden de tabulación lógico.
- Funciona con texto ampliado al 200% sin romper el layout.
- Objetivos táctiles de al menos 24×24 px (recomendado 44×44 px en acciones principales).
- Respeta `prefers-reduced-motion`.
- `lang` del documento según el idioma activo (`es-AR` en el MVP).
- Lenguaje claro y amable, pensado para alguien que recién llega y para personas mayores.

**Verificación:**
- `eslint-plugin-jsx-a11y` en el monorepo.
- `@axe-core/playwright` dentro de los tests e2e de flujos críticos (D79): el test falla si hay violaciones.
- Pasada manual con VoiceOver (iOS/macOS) o TalkBack (Android) sobre esos mismos flujos antes de cada presentación/lanzamiento.
- Lighthouse Accesibilidad ≥ 90 como referencia (no reemplaza la prueba manual).

## 2. SEO (D82)

**Alcance:** solo las páginas públicas — Inicio, Nosotros (incluye En qué creemos), Primeros pasos, Ministerios, Eventos, Visitanos, Dar. Todo lo que requiere login y todo el backoffice llevan `noindex` (también protege datos sensibles, ver D5).

**En Next.js:**
- Páginas públicas con SSG; Eventos con ISR (regeneración periódica).
- Metadata API (título y descripción por página), `sitemap.ts`, `robots.ts`, URLs canónicas.
- **Cada Evento tiene una página pública con URL propia** (el QR puede llevar ahí, con el botón de inscripción), con **Open Graph** completo: los eventos se comparten por WhatsApp y esto define la vista previa (imagen, título, fecha).
- Datos estructurados schema.org: `Church` para la iglesia (nombre, dirección Calle 23 N°1665, horarios de culto) y `Event` para cada evento.
- Core Web Vitals en verde (ver sección Performance).

**Fuera de la app (alto impacto para búsquedas locales):**
- Perfil de Google Business de la iglesia, con nombre/dirección/teléfono idénticos en todos lados.
- Dominio (D85): al definirlo, quitar el `noindex` si se reutiliza un dominio existente y configurar redirecciones 301 desde `vidasobrenatural.com`.

**Verificación:** Lighthouse SEO ≥ 90 y Google Search Console una vez publicado. El puntaje es una referencia, no una garantía de posicionamiento.

## 3. Seguridad (base propuesta)

**Checklist de referencia:** OWASP ASVS nivel 1 + OWASP API Security Top 10.

1. **Autorización por registro, no solo por rol** (riesgo principal). Tener el rol Discipulador no alcanza: la API valida que *ese* discípulo esté asignado a *ese* Discipulador; igual para Líder↔Grupo y Persona↔sus propias Solicitudes/Pagos. Se implementa con guards/policies de NestJS y tiene tests específicos (intentar acceder a un recurso ajeno cambiando el ID debe fallar). La UI oculta lo que no corresponde, pero la seguridad vive en la API.
2. **Validación de sesión entre NextAuth y NestJS** — decisión abierta (ver `06-preguntas-abiertas.md`). Ante un error inesperado en esa verificación, el login se bloquea (fail-closed, D88).
3. **Email verificado en el SSO.** El vínculo por email (D35 menores, D97 adultos dados de alta por el Admin) solo se acepta si el proveedor garantiza el email verificado (Google lo hace; con Facebook hay que chequearlo y, si no está verificado, no vincular).
4. **Archivos (comprobantes de Pago, Contenido):** nunca en carpeta pública; se sirven solo vía API a quien tiene permiso (dueño + Admin; Contenido a inscriptos del Grupo). Validación de tipo y tamaño al subir. En un proveedor S3-compatible: bucket privado + URLs firmadas de corta duración.
5. **Notificaciones push y emails:** las push se ven con el celular bloqueado. Nunca incluir datos sensibles en el texto de una push ni en el asunto de un email (ej. "Tenés una novedad sobre tu solicitud" en vez de "Tu solicitud de bautismo fue aprobada").
6. **Básicos:**
   - Validación de entrada con `class-validator` (`whitelist` + `forbidNonWhitelisted`).
   - `helmet` y Content-Security-Policy.
   - CORS limitado a los orígenes de `apps/web` y `apps/backoffice`.
   - Rate limiting con `@nestjs/throttler`, especialmente en endpoints públicos (incluido "Contanos qué te parece") y de subida de archivos.
   - Prisma sin `$queryRawUnsafe`.
   - Secretos solo en variables de entorno (nunca en el repo); claves VAPID, API key de YouTube y DSN de Sentry incluidos.
   - `pnpm audit` / Dependabot cuando exista el remoto.
   - HTTPS obligatorio en cualquier entorno publicado.
   - Logs y Sentry sin datos personales sensibles (D101).
7. **Registro de auditoría mínimo** para acciones sensibles del Admin — decisión abierta (ver `06-preguntas-abiertas.md`).

Se complementa con los pendientes de privacidad (Ley 25.326) de `06-preguntas-abiertas.md`.

## 4. Performance (base propuesta)

**Contexto:** la mayoría entra desde el celular (Android de gama media, datos móviles). El volumen es chico (cientos a pocos miles de Personas): no se agrega infraestructura de caché (Redis, etc.) sin una necesidad medida.

**Objetivos (Core Web Vitals, medidos en celular):**
- LCP < 2.5 s
- INP < 200 ms
- CLS < 0.1

**Frontend:**
- Páginas públicas con SSG/ISR (mismo criterio que SEO).
- React Server Components por defecto; componentes de cliente solo donde hay interacción.
- Flyers e imágenes: redimensionados y comprimidos al subir, servidos con `next/image`.
- Videos de YouTube con carga diferida: solo miniatura hasta que la persona hace clic (D93).
- Tipografías con `next/font`, máximo dos familias (títulos + texto).
- Service worker de la PWA: cachea la estructura de la app y el contenido público; **nunca datos privados**.

**Backend:**
- Paginación en todos los listados (Personas, inscriptos, Solicitudes).
- Índices en PostgreSQL para claves foráneas y campos de filtro frecuentes (`estado`, `Evento.fecha`, `Persona.email`).
- Evitar consultas N+1 con Prisma (`select`/`include` explícitos), con especial cuidado en la vista de perfil unificado (D61).
- Envíos de notificaciones y llamadas a servicios externos en segundo plano, sin bloquear la respuesta al usuario (D100).

**Infraestructura:** al retomar la decisión de hosting (D75), elegir región lo más cercana posible a Argentina (ej. São Paulo).

**Verificación:** Lighthouse CI con presupuestos de performance cuando exista GitHub Actions (D80).

## 5. Idiomas / internacionalización (D84)

**MVP:** la app queda **preparada** para varios idiomas, pero se lanza solo en **español (rioplatense)**.
- Librería: `next-intl`. Ningún texto de interfaz escrito directo en los componentes: todo sale de archivos de mensajes (`messages/es.json`).
- `Persona.idioma_preferido` (default `es`) desde el MVP: las notificaciones y emails se arman en el servidor y necesitan saber en qué idioma enviarse.
- La API devuelve **códigos** de error (ej. `CUPO_LLENO`), no mensajes en español; cada frontend los traduce (D101).
- Los valores de listas predefinidas (estado civil, profesión, tiempo de congregación, estados) se guardan como claves y se traducen en la interfaz.
- Fechas, horas y moneda con `Intl` según el idioma (la moneda siempre es ARS).
- Diseño tolerante a textos más largos (el portugués suele ocupar más que el español).
- El routing por idioma (`/es`, `/pt`, `/en`) y `hreflang` se activan recién cuando haya un segundo idioma.

**Fase 2:** portugués e inglés. Motivo: hay una comunidad brasileña importante en la iglesia; la mayoría se maneja bien en español, así que es un gesto de bienvenida, no una necesidad bloqueante.
- Interfaz de `apps/web` en `pt` y `en`, con selector manual (sugerencia por idioma del navegador, sin redirección automática).
- Traducción del contenido que carga el Admin (Eventos, Ministerios, Cursos, "En qué creemos", notificaciones, emails): tabla de traducciones por entidad, con fallback al español. El sistema puede sugerir una traducción automática que el Admin revisa.
- Contenido doctrinal y versículos: revisión humana (idealmente alguien de la iglesia que hable portugués); las versiones bíblicas difieren por idioma.
- Figuras no equivalentes entre países (ej. concubinato / união estável): revisar con alguien brasileño.
- `apps/backoffice` queda solo en español (lo usa el equipo local).

## 6. Dominio (D85)

Decisión pospuesta; el candidato es `vidasobrenatural.org.ar` (registro vía NIC Argentina, verificando requisitos para `.org.ar` — la iglesia está constituida como ISAIAS 61 Asociación Civil). Mientras tanto, la URL base sale siempre de variables de entorno: `metadataBase`/sitemap, `NEXTAUTH_URL`, URLs de retorno configuradas en Google/Facebook, orígenes de CORS y enlaces de los emails.

---
*Creado fuera de sesión formal, antes de la Sesión 6. Ver D81–D85 en `05-decisiones.md`.*
