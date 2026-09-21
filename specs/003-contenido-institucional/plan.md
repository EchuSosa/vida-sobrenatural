# Implementation Plan: Contenido institucional

**Branch**: `003-contenido-institucional` | **Date**: 2026-09-21 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-contenido-institucional/spec.md`

## Summary

Completar el contenido institucional real de la web pública (H-31/H-32) y su gestión desde el
backoffice. En `apps/web`: ampliar Nosotros con el contenido real (identidad, historia, visión,
misión, valores, sistema de trabajo, llamado, congregación local) vía `next-intl` (D84, sin tocar la
base de datos), y agregar Palabra Profética y Ediciones VS como subpáginas propias dentro de
Nosotros (D115: el menú público sigue en cuatro ítems). En `apps/api`: dos modelos de Prisma nuevos
(`PalabraProfetica`, sin papelera — historial por `vigente`; `Libro`, con papelera D119 pero sin
bloqueo por dependientes mientras hoy no los tenga, a diferencia de Sede — ver `data-model.md`) y la
primera implementación real de `StorageService`
(D110): interfaz `subir/descargar/eliminar` con un proveedor local para dev, detrás de la cual se
procesa la portada (redimensionar, recomprimir, recortar centrada a 2:3 si no es vertical) y se sirve
públicamente desde una ruta propia, sin exponer el endpoint de subida. En `apps/backoffice`: edición
de Palabra Profética (un formulario, sin archivos) y CRUD de Libro reutilizando `TablaDatos` y el
patrón ya construido para Sedes (alta en modal, detalle editable, inactivar/reactivar, papelera),
ambos con permisos Admin-edita/Pastor-lee (D64). Los tipos MIME y el tamaño máximo de portada son
constantes compartidas en `packages/shared-types` (Principio XI). Además, aplica los archivos de
marca ya entregados (documentados en `docs/marca/README.md`, movidos a `packages/ui/src/assets/marca/`
como único lugar del repo donde existen — Principio XI) donde hoy falta la identidad real: favicon e
ícono de PWA derivados del isotipo, marca de agua en `PlaceholderImagen`, el logotipo en reemplazo
del nombre escrito en la navegación y el pie de página de las dos apps, y la imagen de Open Graph —
con su texto alternativo o
marca decorativa según el contexto (Principio VII). Ver `research.md` para el detalle de cada
decisión técnica.

## Technical Context

**Language/Version**: TypeScript (ya así en specs 001/002, sin cambios) — TS ^6.0.2 en `apps/api`,
TS ^5 en `apps/web`/`apps/backoffice`/`packages/*`.

**Primary Dependencies**: NestJS 12 + Prisma 7 (`apps/api`, ya en uso); Next.js 16 (App Router) +
React 19 (`apps/web`, `apps/backoffice`, ya en uso); `packages/ui` (Base UI + shadcn, tokens de
`theme.css`, `TablaDatos`, `PlaceholderImagen` con `aspecto: 'portada'` ya listo) y
`packages/shared-types`, ambos ya en uso. Nuevas para este spec: `sharp` (redimensionar, recomprimir
y recortar centrado la portada al subir — único procesador de imagen del stack, sin decisión previa
que lo fije, ver `research.md` Decisión 1), `@nestjs/platform-express` + `multer`/`@types/multer` (ya
viene con `@nestjs/platform-express`, que `apps/api` ya usa — solo se suma el interceptor de archivo,
ver Decisión 2) para `FileInterceptor` en la subida de portada. El video embebido usa
`youtube-nocookie.com` con una miniatura (`next/image`) sin librería adicional (mismo patrón D93 ya
usado en el resto de la app). Marca (`packages/ui/src/assets/marca/`, único origen en el repo desde
que se movieron los PNG que llegaron a `docs/marca/`): sin librería nueva en los frontends. La barra
de navegación, el pie de página y el sidebar importan el PNG directo desde `packages/ui` (resuelto
por `transpilePackages`, sin copia — `research.md` Decisión 7); `sharp` (ya sumado para portadas)
deriva, en un script chico corrido a mano cuando cambia el isotipo fuente (no en cada build), los
tamaños que sí son genuinamente distintos del original — favicon/ícono de iOS/íconos de PWA
(Decisión 8) —; y `next/og`, ya usado por `apps/web`, incorpora el logotipo a la imagen de Open Graph
existente leyendo el archivo origen directo del filesystem del monorepo (Decisión 9). Sin copias
sincronizadas ni test de hash: ninguno de los tres consumidores lo necesita (`research.md` Decisión
7, revisada).

**Storage**: PostgreSQL vía Prisma (ya en uso) — dos migraciones nuevas (`PalabraProfetica`, `Libro`).
Primer uso real de almacenamiento de archivos del proyecto: `StorageService` con proveedor local en
dev (carpeta fuera del control de versiones, servida por `apps/api` en una ruta pública propia — ver
Decisión 3 de `research.md`), migrable a un proveedor S3-compatible sin tocar la lógica de negocio
(D110, docs/10-stack-tecnico.md) — la migración de proveedor queda fuera de alcance de este spec.
**Consecuencia, no sólo arquitectura**: mientras la decisión de hosting siga pospuesta (D75), esas
portadas no son durables — en la mayoría de las plataformas candidatas el disco del contenedor es
efímero y cada despliegue nuevo lo borra, StorageService y todo. Por eso este spec **no carga
todavía ninguna portada real** de los 8 libros del catálogo: quedan con `PlaceholderImagen` hasta
que exista almacenamiento persistente (S3-compatible u otro) — cargarlas antes sería subir un
archivo que el próximo deploy borra sin aviso. El botón de subir portada funciona en dev igual
(FR-021 a FR-027 se implementan y se prueban), pero usarlo con material real de la iglesia queda
para cuando D75 se resuelva.

**Testing**: Jest (unit + integración, `apps/api`, ya en uso) y Playwright (e2e, `apps/web` y
`apps/backoffice`, ya en uso), incluyendo `auditar()` (H-76) para los e2e nuevos en vez de
`AxeBuilder` directo. Nuevo en este spec: tests unitarios para la validación/extracción de id de
YouTube y para el procesamiento de imagen (redimensionar/recomprimir/recortar), y de integración
para la subida de portada (tipo/tamaño inválido, reemplazo, quitar) y el toggle de `vigente` de
Palabra Profética.

**Target Platform**: Navegador (desktop y celular) para `apps/web` (páginas públicas nuevas) y
`apps/backoffice`; Node.js para `apps/api` (archivos de portada servidos desde el propio proceso en
dev, sin CDN todavía — D75/D110, decisión de hosting pospuesta).

**Project Type**: Web application — mismo monorepo de los specs 001/002 (`apps/api`, `apps/web`,
`apps/backoffice`, `packages/shared-types`, `packages/ui`), sin paquetes nuevos.

**Performance Goals**: Las metas de Core Web Vitals ya fijadas en la Constitución (LCP < 2.5 s,
INP < 200 ms, CLS < 0.1) se miden por primera vez con Lighthouse sobre las páginas públicas nuevas al
cerrar la fase (H-45, SC-005) — hasta ahora nadie las había medido. El patrón miniatura+clic del video
(FR-005) y el procesamiento de portada al subir (nunca servir el original) son las dos decisiones de
este spec que más pesan sobre esas metas.

**Constraints**: Puertos fijos sin cambios (`apps/web` 3001, `apps/backoffice` 3002, `apps/api` 3333,
D104). Portada: máx. 5 MB, tipos JPG/PNG/WebP (D110) — valores compartidos en `packages/shared-types`
(Principio XI), no repetidos entre `apps/api` y `apps/backoffice`. El endpoint de subida requiere rol
Admin; el archivo resultante se sirve público, sin sesión (D110). Ninguna venta ni pago dentro de la
app (D67, fuera de alcance).

**Scale/Scope**: 1 página ampliada (Nosotros) + 2 subpáginas nuevas en `apps/web`; 2 secciones nuevas
en `apps/backoffice` (Palabra Profética, Libros con su papelera); 2 modelos de Prisma nuevos; ~10-12
endpoints nuevos en `apps/api` (CRUD de ambas entidades + subida/eliminación de portada + servido
público del archivo); 1 implementación nueva (`StorageService`, primera vez en el proyecto); 6
archivos fuente de marca (2 isotipo + 4 logotipo) derivados a favicon/ícono de PWA/marca de
agua/logotipo, aplicados en 2 apps.
Cubre las 5 historias de `spec.md`.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Evaluado contra `.specify/memory/constitution.md` v1.2.0 (11 principios):

| Principio | Cumple | Cómo |
|---|---|---|
| I. Spec-First | ✅ | Este plan sigue a `spec.md` (FR-001 a FR-042), que a su vez cita H-31/H-32/H-62, y las decisiones D5, D47, D64, D67, D82-D84, D93, D95, D106, D109, D110, D112, D114, D115, D119, D120, D121; la Historia 5 usa exclusivamente los archivos de marca ya entregados (documentados en `docs/marca/README.md`), sin inventar el vectorial ni el swoosh que todavía faltan. Nada se implementa sin spec previa. |
| II. Consistencia terminológica y de dominio | ✅ | Se reutilizan los nombres canónicos de `docs/04-dominio-entidades.md` (Libro, Palabra Profética, Ediciones VS, Nosotros) sin inventar sinónimos; `orden`, `vigente`, `activo` ya están definidos ahí. |
| III. Soft delete obligatorio | ✅ | `Libro` usa `activo` + `eliminadoEn`/`eliminadoPor` (D119), igual que `Sede`. `PalabraProfetica` no tiene borrado en absoluto (append-only vía `vigente`, FR-013) — no es una excepción al principio, es que nunca se elimina un registro, ni física ni lógicamente. |
| IV. Simplicidad / no artefactos prematuros | ✅ | `Libro` no copia el bloqueo por "datos relacionados" de Sede porque hoy no tiene dependientes reales en el modelo (FR-020) — evita una regla de negocio sin ningún caso que la dispare todavía; queda explícito que es una condición del estado actual, no una decisión permanente (el backlog de Ventas de Ediciones VS, `docs/08-roadmap-producto.md`, la reactivaría el día que exista esa entidad). El proveedor S3-compatible de `StorageService` queda como interfaz, no como implementación: no se construye antes de necesitarse. |
| V. Seguridad | ✅ | Alta/edición/subida/borrado de ambas entidades exigen rol Admin (`RolesGuard`), Pastor/Pastora queda en solo lectura (D64, FR-028/FR-029); cualquier otro rol no accede ni por URL directa (FR-030). El endpoint de subida de portada requiere sesión Admin; el archivo servido es público mientras el endpoint que lo genera no lo es (D110, distinto del caso de comprobantes de Pago, que son privados con URL firmada). |
| VI. Testing pragmático por capas | ✅ | Validación/extracción de id de YouTube y procesamiento de portada reciben test unitario (lógica pura, sin estado); la regla "una sola vigente a la vez" es una invariante de transacción contra la base real, así que se prueba en integración (T028) y no en unitario — simularla con un mock de Prisma probaría el simulacro, no la regla (Principio VI: el nivel se elige por capa, no todo pasa por unitario). Endpoints de creación/edición/subida reciben test de integración; los e2e nuevos cubren las 5 historias con `auditar()` (H-76). |
| VII. Accesibilidad e inclusión | ✅ | Texto alternativo obligatorio en cuanto hay portada (D83, FR-025); el video con miniatura+clic no depende solo de color para indicar que es interactivo; `PlaceholderImagen` ya lleva `role="img"` + `aria-label`, y su nueva marca de agua queda decorativa para no competir con ese texto (FR-034); el logotipo lleva su propio texto alternativo salvo que un título vecino ya diga el nombre (FR-042); SC-004 exige axe en claro y oscuro sobre las 5 pantallas nuevas más los usos transversales de marca. |
| VIII. Experiencia consistente | ✅ | Cuatro estados (cargando/vacío/error/éxito) en cada pantalla nueva desde el principio (D114) — vacío explícito para "sin Palabra Profética vigente" (FR-006) y "sin libros activos" (FR-008); `useEnvio` (H-57) en los formularios de ambas secciones del backoffice. |
| IX. Preparada para varios idiomas | ✅ | Todo el contenido institucional nuevo de Nosotros vive en `next-intl` (D84), no en la base — la base solo guarda los datos variables (Palabra Profética, Libros). |
| X. Errores y observabilidad | ✅ | Códigos nuevos al catálogo compartido (`YOUTUBE_URL_INVALIDA`, `PORTADA_TIPO_INVALIDO`, `PORTADA_TAMANO_EXCEDIDO`, `LIBRO_TEXTO_ALTERNATIVO_REQUERIDO`) en `packages/shared-types/src/error-code.ts`, con su título en `all-exceptions.filter.ts` y su traducción en `apps/backoffice/src/messages/es.json` — mismo mecanismo ya usado para `TUTOR_INVALIDO` (H-74). |
| XI. Una sola fuente de verdad en el código | ✅ | Tipos MIME y tamaño máximo de portada como constantes en `packages/shared-types`, consumidas por `apps/api` (validación real) y `apps/backoffice` (validación de UI antes de subir) sin repetirlas; el CRUD de Libro reutiliza `TablaDatos`/el patrón de Sedes de `packages/ui` en vez de duplicar componentes (FR-018). Acceso a datos: `select` explícito y paginación en los listados nuevos, índice en `Libro.orden` y en `PalabraProfetica.vigente` (H-42). Los archivos de marca viven en un único lugar del repo, `packages/ui/src/assets/marca/` — los PNG que llegaron a `docs/marca/` se movieron ahí (no se copiaron); `docs/marca/` conserva solo su `README.md`, documentación de la marca sin los archivos. Ningún consumidor de esta historia necesita además una copia en `public/` (`research.md` Decisión 7, revisada) — el principio se cumple sin tener el problema, en vez de vigilarlo con un script y un test. |

Sin violaciones — no hace falta completar Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/003-contenido-institucional/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md         # Phase 1 output (/speckit-plan command)
├── quickstart.md         # Phase 1 output (/speckit-plan command)
├── contracts/
│   ├── palabra-profetica-api.md  # CRUD + vigente
│   ├── libros-api.md              # CRUD + papelera + subida/eliminación de portada
│   └── portadas-storage.md        # Contrato de StorageService y de la ruta pública de archivo
└── tasks.md              # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

Monorepo ya existente (pnpm + Turborepo) — este spec extiende `apps/api`, `apps/web`,
`apps/backoffice` y `packages/shared-types`, sin paquetes nuevos:

```text
apps/api/
├── src/
│   ├── storage/                          # NUEVO módulo
│   │   ├── storage.service.ts             # interfaz subir/descargar/eliminar (D110)
│   │   ├── storage.module.ts
│   │   ├── local-storage.provider.ts      # implementación de dev (proveedor detrás de la interfaz)
│   │   └── imagen-portada.service.ts      # sharp: redimensionar/recomprimir/recortar a 2:3
│   ├── palabra-profetica/                 # NUEVO módulo
│   │   ├── palabra-profetica.controller.ts
│   │   ├── palabra-profetica.service.ts   # marcar vigente = transacción (nueva vigente + anterior no-vigente)
│   │   └── dto/
│   │       ├── crear-palabra-profetica.dto.ts
│   │       └── actualizar-palabra-profetica.dto.ts
│   ├── libro/                              # NUEVO módulo, mismo patrón que sede/
│   │   ├── libro.controller.ts             # + POST/DELETE .../portada
│   │   ├── libro.service.ts
│   │   └── dto/
│   │       ├── crear-libro.dto.ts
│   │       └── actualizar-libro.dto.ts
│   ├── common/errors/all-exceptions.filter.ts  # + TITULOS de los 4 códigos nuevos
│   └── main.ts                              # + ruta estática pública para portadas servidas (D110)
├── prisma/
│   ├── schema.prisma                        # + models PalabraProfetica, Libro
│   ├── seed.ts                              # + Palabra Profética vigente y 8 libros (FR-031)
│   ├── seed-demo.ts                         # + libro con título larguísimo, autor con tildes, sin descripción (FR-032, D120)
│   └── migrations/<timestamp>_palabra_profetica_libro/
└── test/
    ├── unit/
    │   ├── youtube-url.spec.ts               # extracción/validación de id
    │   └── imagen-portada.spec.ts             # redimensionar/recomprimir/recorte a 2:3
    └── integration/
        ├── palabra-profetica.integration-spec.ts
        └── libros.integration-spec.ts         # incluye subida de portada (tipo/tamaño/reemplazo/quitar)

apps/web/
├── src/
│   ├── app/
│   │   ├── (publica)/nosotros/
│   │   │   ├── page.tsx                      # + contenido real (identidad/historia/visión/misión/valores/llamado)
│   │   │   ├── palabra-profetica/page.tsx    # NUEVO — vacío si no hay vigente
│   │   │   ├── ediciones-vs/page.tsx         # NUEVO — listado de libros activos, vacío si no hay ninguno
│   │   │   └── opengraph-image.tsx           # + logotipo (research.md Decisión 9), reemplaza el texto plano
│   │   ├── icon.png                          # NUEVO — favicon generado del isotipo (reemplaza favicon.ico, research.md Decisión 8)
│   │   ├── apple-icon.png                    # NUEVO — ícono iOS, generado
│   │   └── manifest.ts                       # NUEVO — ícono de instalación de la PWA (D47), sirve sus PNG desde public/icons/
│   ├── components/
│   │   ├── nav-publica-header.tsx            # logotipo importado de packages/ui (FR-037), isotipo o alto chico en celular (FR-040)
│   │   └── footer-publico.tsx                # + logotipo importado de packages/ui (FR-039)
│   └── messages/es.json                      # + todo el contenido institucional nuevo (D84) + alt de marca
├── public/icons/                              # NUEVO — sólo los íconos del manifest de PWA (192/512), generados; nada de packages/ui se copia acá
└── e2e/
    ├── nosotros.spec.ts                       # ampliado con el contenido nuevo + auditar()
    ├── palabra-profetica.spec.ts               # NUEVO
    ├── ediciones-vs.spec.ts                    # NUEVO
    └── marca.spec.ts                           # NUEVO — favicon/nav/footer/OG, alt vs. decorativo (FR-042)

apps/backoffice/
├── src/
│   ├── app/
│   │   ├── palabra-profetica/
│   │   │   ├── page.tsx, loading.tsx, error.tsx
│   │   │   └── palabra-profetica-cliente.tsx   # formulario + historial, sin archivos
│   │   ├── libros/                              # mismo árbol que sedes/ (Project Structure de 002)
│   │   │   ├── page.tsx, loading.tsx, error.tsx, libros-cliente.tsx
│   │   │   ├── papelera/page.tsx, loading.tsx, error.tsx, papelera-cliente.tsx
│   │   │   └── [id]/page.tsx, loading.tsx, error.tsx, not-found.tsx, libro-detalle-cliente.tsx
│   │   └── icon.png                             # NUEVO — favicon generado del isotipo (research.md Decisión 8)
│   ├── components/backoffice-shell.tsx           # + logotipo importado de packages/ui, cabecera del sidebar (FR-038, hoy sin marca)
│   ├── config/nav.ts                             # + dos entradas nuevas (Admin y Pastor, FR-028/030)
│   └── messages/es.json                          # + errores nuevos + textos de ambas secciones + alt de marca
└── e2e/
    ├── palabra-profetica.spec.ts                 # NUEVO
    ├── libros.spec.ts                             # NUEVO — mismo patrón que sedes.spec.ts
    └── marca.spec.ts                              # NUEVO — favicon/sidebar, alt vs. decorativo

packages/shared-types/src/
├── error-code.ts                                 # + 4 códigos nuevos (ver Constitution Check, Principio X)
└── portada.ts                                     # NUEVO — MIME_TIPOS_PORTADA_PERMITIDOS, PORTADA_TAMANO_MAXIMO_BYTES, PORTADA_ASPECTO

packages/ui/
├── package.json                                    # + exports["./assets/marca/*"] (research.md Decisión 7 — subrutas restringidas hoy)
└── src/
    ├── assets/marca/                                # NUEVO — los 6 PNG movidos desde docs/marca/ (no copiados); único lugar del repo donde existen
    └── components/placeholder-imagen.tsx             # + marca de agua del isotipo al 20%, según tema, importado de ./assets/marca/ (FR-034)

scripts/
└── generar-iconos-marca.mjs                       # NUEVO — corrido a mano cuando cambia el isotipo fuente, no en cada build (research.md Decisión 8)
```

**Structure Decision**: Se mantiene íntegra la estructura de monorepo de los specs 001/002 — sin
paquetes de workspace nuevos. `apps/api` suma tres módulos siguiendo el mismo patrón ya usado por
`sede/` (controller + service + dto), más un módulo `storage/` transversal del que `libro/` es el
primer consumidor real. `apps/backoffice` reutiliza el árbol de páginas ya usado por `sedes/`
(list + papelera + detalle) para `libros/`, y agrega una sección más simple (`palabra-profetica/`,
un solo formulario con historial, sin papelera ni subida de archivo) — ambas nuevas entradas en
`config/nav.ts` con el mismo filtro por rol ya usado para Sedes. `apps/web` agrega dos subpáginas
como rutas anidadas bajo `(publica)/nosotros/`, consistente con D115 (subpáginas de una página de
sección, no ítems nuevos del menú). Los archivos de marca (Historia 5) no agregan un paquete nuevo:
`packages/ui` gana una carpeta de assets como único origen importable, consumida directo por los
componentes de navegación/pie/sidebar de las dos apps vía `transpilePackages` (sin copia a
`public/`, `research.md` Decisión 7, revisada); un script chico en la raíz del repo genera —no
sincroniza— los íconos de favicon/PWA a partir de ese mismo origen, corrido a mano cuando cambia el
isotipo, no en cada build; y ambos frontends aplican la convención de archivo de Next.js para
favicon/ícono/manifest en vez de configuración manual.

## Complexity Tracking

*Sin violaciones de la Constitución — sección no aplica (ver tabla de Constitution Check arriba).*
