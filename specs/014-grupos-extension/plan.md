# Implementation Plan: Grupos de Extensión

**Branch**: `014-grupos-extension` | **Date**: 2026-10-09 | **Spec**: [spec.md](spec.md)

## Summary

Grupos de Extensión entra al MVP (D220). El Admin carga los Grupos en el backoffice (lugar "En la
iglesia" o dirección al estilo de La Plata, geocodificada al guardar por un `Geocodificador`
configurable: Georef → Nominatim). La persona, desde la card "Mi grupo de extensión" de Mi camino,
busca por dirección o ubicación (que no se guarda) y ve los Grupos de su género y edad ordenados por
distancia, sin la dirección exacta; pide sumarse. Cada líder recibe un aviso y resuelve desde "Mi grupo"
en la web app. La pertenencia **es** la Solicitud `aceptada` (mismo patrón que la Postulación, D170);
índices únicos parciales garantizan un pendiente y una aceptada por persona. Los pendientes entran a la
bandeja unificada como tipo `grupo_extension`.

## Technical Context

TypeScript 5 / Node 22; NestJS + Prisma 7 (`apps/api`), Next.js App Router + next-intl (`apps/web`,
`apps/backoffice`), `packages/shared-types`, `packages/ui`. PostgreSQL: tres tablas nuevas
(`grupos_extension`, `lideres_grupo_extension`, `solicitudes_grupo_extension`), dos enums, índices
parciales y CHECK a mano en la migración `grupos_extension` (`--create-only`), y la vista
`solicitudes_bandeja` con su rama nueva (`CREATE OR REPLACE VIEW` del archivo completo). Tests: Jest
unit + integración (geocodificador falso inyectado), Playwright con axe claro/oscuro y `@celular`. Escala:
decenas de Grupos, cientos de pedidos: la distancia se calcula en memoria (haversine) sobre los Grupos
compatibles, sin PostGIS.

## Constitution Check

| Principio | Cómo se cumple | Estado |
|---|---|---|
| I. Spec-First | Decisiones de Echu (D220–D228) + Assumptions + Preguntas para Echu. | ✅ |
| II. Terminología | Grupo de Extensión, Líder de extensión, Solicitud (patrón común de docs/04). | ✅ |
| III. Soft delete | Grupo con `activo`; Solicitudes nunca se borran (estados terminales). Líderes: fila con `hasta`. | ✅ |
| IV. Simplicidad | Sin PostGIS ni mapa embebido; distancia en memoria; sin tabla de miembros. | ✅ |
| V. Seguridad/privacidad | Dirección de la persona ni se guarda ni se loguea (el DTO no pasa por logs; el geocodificador loguea solo "resolvió/no resolvió"); dirección exacta del Grupo solo a integrantes, líderes y backoffice; contacto de la persona solo a sus líderes y backoffice. | ✅ |
| VI. Testing | Unit: compatibilidad, género, distancia, reglas; integración: flujo completo, permisos, cupo, concurrencia, privacidad; e2e: persona → líder → persona y backoffice. | ✅ |
| VII. Accesibilidad | Texto + ícono (D81), 44 px (D150), axe claro/oscuro. | ✅ |
| VIII. Consistencia | `loading.tsx`/`error.tsx`, `useEnvio`, validación por campo, checklist de docs/15 por pantalla. | ✅ |
| IX. Idiomas | Todo por next-intl. | ✅ |
| X. Errores | Códigos propios en `error-code.ts`. | ✅ |
| XI. Una sola fuente | Reglas puras (`generoDelGrupo`, `esCompatible`, `distanciaKm`, `formatearDias`) en `shared-types/src/grupos-extension.ts`. | ✅ |

## Project Structure

```text
packages/shared-types/src/grupos-extension.ts      # tipos, límites, reglas puras
packages/shared-types/src/{permisos,avisos,bandeja,error-code}.ts   # sumas de esta spec
apps/api/prisma/migrations/2026100912xxxx_grupos_extension/
apps/api/prisma/vistas/solicitudes_bandeja.sql     # rama grupo_extension
apps/api/src/grupo-extension/
  geocodificador.ts            # interfaz + Georef + Nominatim + cadena
  grupo-extension.module.ts    # registra fuente de bandeja y pendientes
  grupos-admin.controller.ts / grupos-admin.service.ts   # backoffice
  grupos-persona.controller.ts / grupos-persona.service.ts  # buscar, pedir, retirar, mi grupo
  grupos-lider.controller.ts / grupos-lider.service.ts      # Mi grupo del líder
  solicitudes.service.ts       # aceptar/rechazar/agregar/quitar (compartido líder/Admin)
  roles-lider.ts               # otorgar/quitar lider_extension con CambioDeRol
  fuente-bandeja.ts
apps/api/prisma/seed-demo/014-grupos-extension.ts
apps/api/scripts/sembrar-e2e/014-grupos-extension.ts
apps/web/src/app/(app)/mi-camino/tarjeta-grupo-extension.tsx
apps/web/src/app/(app)/mi-camino/grupo-extension/      # Encontrá tu grupo / mi grupo
apps/web/src/app/(app)/mi-grupo-extension/             # líder
apps/backoffice/src/app/grupos-extension/              # listado, nuevo, [id]
apps/backoffice/src/app/solicitudes/grupo-extension/[id]/
```

### Pantallas (cada una con su tarea de checklist de docs/15)

1. Web › card "Mi grupo de extensión" en Mi camino (modificada).
2. Web › `/mi-camino/grupo-extension` (buscar / mi pedido / mi grupo).
3. Web › `/mi-grupo-extension` (líder).
4. Backoffice › `/grupos-extension` (listado).
5. Backoffice › `/grupos-extension/nuevo` y `/grupos-extension/[id]` (formulario + detalle con integrantes y pedidos).
6. Backoffice › `/solicitudes/grupo-extension/[id]` (detalle desde la bandeja).

## Decisiones nuevas (D220–D228 en `docs/05-decisiones.md`)

D220 GEX al MVP y el flujo; D221 Grupo y lugar; D222 género calculado; D223 geocodificación;
D224 búsqueda y privacidad; D225 pedido y pertenencia; D226 el líder en la web; D227 Admin destraba y
bandeja; D228 avisos.

## Cambios a docs

`docs/04` (entidades nuevas), `docs/08` (pasa al MVP), `docs/02` (alcance), `docs/03` (rol Líder de
extensión), `docs/23` (módulo GEX), `COMO-ARRANCAR.md` (líder de demo), `IMPLEMENTACION.md` no (la 014
no corre en paralelo con otras).

## Excepciones a IMPLEMENTACION.md

La 014 llegó después del lote 0: tiene que tocar archivos "de nadie" — `app.module.ts` (registrar su
módulo), `TIPOS_SOLICITUD`/`ESTADOS_*` de `bandeja.ts` y la vista (tipo nuevo), `RolDeCargo`,
`limpiar-e2e.ts`, el seed demo y el de e2e (`main`), `nav-app.ts` y `page.tsx` de Mi camino (la card
aparte de las etapas). Son sumas de una línea o un bloque.

## Lotes

1. **Lote 1 (flujo principal, P1)**: modelo + migración, shared-types, geocodificador, API completa
   (Admin CRUD, persona, líder, Admin destraba), avisos, bandeja; tests unit + integración.
2. **Lote 2 (pantallas)**: web (card, buscar, mi grupo, líder) y backoffice (listado, formulario,
   detalle, detalle de bandeja), mensajes, nav.
3. **Lote 3**: seeds (demo y e2e), e2e con axe, docs (05, 04, 08, 02, 03, 23, COMO-ARRANCAR).
