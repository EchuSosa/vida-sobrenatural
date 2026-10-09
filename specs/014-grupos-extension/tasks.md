# Tasks: Grupos de Extensión (spec 014)

**Input**: spec.md, plan.md, data-model.md, contracts/api.md. Prioridad: el flujo principal (⭐) de
punta a punta con tests antes que los extras (congelamiento: sábado 10/10, 12 hs).

## Lote 1 — Modelo, reglas y API (P1)

- [x] T001 Modelo Prisma (`GrupoExtension`, `LiderGrupoExtension`, `SolicitudGrupoExtension`, enums) y migración `grupos_extension` `--create-only` con índices parciales, CHECK y la vista `solicitudes_bandeja` con la rama `grupo_extension`.
- [x] T002 `packages/shared-types/src/grupos-extension.ts`: tipos de respuesta, límites, `generoDelGrupo`, `esCompatible`, `edadEn`, `distanciaKm`, `formatearDistancia`, `ordenarPorDistancia`, `enlaceComoLlegar`, `direccionDelGrupo`; tests unit.
- [x] T003 Sumas en shared-types: `RolDeCargo` (`lider_extension`), permisos (`grupos_extension.ver/gestionar`, `mi_grupo_extension.ver/gestionar`), `TIPOS_SOLICITUD`/`ESTADOS_*` (`grupo_extension`), códigos de error, avisos (`grupo_extension.solicitud_nueva`, `.solicitud_aceptada`, `.solicitud_rechazada`, `.agregada_por_admin`) con sus textos (web y mail) y datos de ejemplo de los tests del catálogo.
- [x] T004 Geocodificador: interfaz, Georef, Nominatim, cadena, falso; selección por `GEOCODIFICADOR`; tests unit con `fetch` simulado.
- [x] T005 API Admin: CRUD, inactivar/reactivar, líderes (rol `lider_extension` con `CambioDeRol`, D133), elegibles, agregar/quitar integrantes, aceptar/rechazar.
- [x] T006 API persona: `me`, `buscar` (sin guardar ni loguear la dirección), pedir, retirar.
- [x] T007 API líder: `liderados`, aceptar, rechazar (solo líderes vigentes del Grupo).
- [x] T008 Avisos con `emitir(tx, …)` en cada transición; fuente `grupo_extension` de la bandeja y fila en Pendientes del Inicio.
- [x] T009 Tests de integración: flujo completo persona → líder → persona; compatibilidad de género/edad y orden por distancia; privacidad (la respuesta no trae calle; nada se guarda); cupo; un pendiente/una aceptada; concurrencia de aceptar; permisos (Pastor sin acciones, líder ajeno 404); Admin agrega/quita; inactivar con integrantes; rol `lider_extension` otorgado/quitado; menor como líder rechazado; vista de la bandeja (test exhaustivo).

## Lote 2 — Pantallas (P1)

- [x] T010 Web › card "Mi grupo de extensión" en Mi camino (`tarjeta-grupo-extension.tsx`).
- [x] T011 Web › `/mi-camino/grupo-extension`: buscar (dirección / "Usar mi ubicación" / días), resultados, "Quiero sumarme", pedido pendiente con "Retirar", integrante con dirección, líderes, WhatsApp y "Cómo llegar"; `loading.tsx` / `error.tsx`.
- [x] T012 Web › `/mi-grupo-extension` (líder): pedidos con "Escribir por WhatsApp", "Aceptar", "No es para este grupo" (mensaje opcional); integrantes con contacto; entrada en `SUBNAV_MI_CAMINO`.
- [x] T013 Backoffice › `/grupos-extension` listado (activos/todos), `/grupos-extension/nuevo`, `/grupos-extension/[id]` (formulario con `CampoHora`, validación por campo, detalle con integrantes, pedidos, agregar, quitar, inactivar/reactivar); `nav.ts`.
- [x] T014 Backoffice › `/solicitudes/grupo-extension/[id]` + ruta e ícono en `config/solicitudes.ts`.
- [x] T015 Mensajes `next-intl` en los dos `es.json` (namespaces `grupoExtension`, `miGrupoExtension`, `gruposExtension`).

### Checklist de `docs/15` por pantalla (D114)

- [x] T016 Checklist docs/15 — card de Mi camino (T010). ✔ Acción principal "Encontrá tu grupo" / "Ver mi grupo y cómo llegar"; estados en texto + ícono (D81); vacío no aplica (siempre hay un estado); error = `error.tsx` de Mi camino; axe claro/oscuro y 360 px en el e2e.
- [x] T017 Checklist docs/15 — Encontrá tu grupo / mi grupo (T011). ✔ Acción principal "Buscar grupos" (44 px, D150) y "Quiero sumarme" con confirmación neutra (D151); `useEnvio` en los tres envíos (H-57); resumen + error por campo con foco (H-50); vacío con sugerencia de otros días; `loading.tsx`/`error.tsx`; "¿y ahora qué?" en el pedido y en el grupo; axe claro/oscuro, sin scroll a 360 px (e2e).
- [x] T018 Checklist docs/15 — Mi grupo del líder (T012). ✔ "Aceptar" principal, "No es para este grupo" secundario con mensaje opcional (DialogoTextoOpcional, neutro); WhatsApp como enlace con texto + ícono; vacío explica qué hacer; `loading.tsx`/`error.tsx`; axe claro/oscuro (e2e).
- [x] T019 Checklist docs/15 — listado, formulario y detalle del backoffice (T013). ✔ Listado con filtro en la URL y vacío con la acción; formulario con resumen y errores por campo (mismas reglas que la API), `CampoHora`, botones "Volver sin guardar" / "Crear el grupo"; detalle con acciones neutras (D151) y `useEnvio`; Pastor sin acciones; `loading`/`error`/`not-found`; axe claro/oscuro y sin scroll a 320/375 px (smoke de nav.ts).
- [x] T020 Checklist docs/15 — detalle de la bandeja (T014). ✔ Detalle con estado en texto, acciones solo con permiso y si está pendiente, aviso "solo lectura" para el Pastor; `loading`/`error`/`not-found`; axe claro/oscuro (smoke).

## Lote 3 — Datos, e2e y docs

- [x] T021 Seed demo `prisma/seed-demo/014-grupos-extension.ts` (8 Grupos ficticios, líder de demo, uno completo, un pedido pendiente) y fixtures `scripts/sembrar-e2e/014-grupos-extension.ts`; `limpiar-e2e.ts`.
- [x] T022 e2e web: persona busca, pide, líder acepta, persona ve su grupo (axe claro/oscuro, `@celular`).
- [x] T023 e2e backoffice: Admin crea un Grupo "En la iglesia", agrega y quita (axe claro/oscuro); el smoke de axe recorre las rutas nuevas de `nav.ts`.
- [x] T024 Docs: `05-decisiones.md` (D220–D228), `04`, `08`, `02`, `03`, `23` (módulo GEX + tabla resumen), `COMO-ARRANCAR.md`.
- [ ] T025 Las tres suites en verde (CI) y PR con Preguntas para Echu. (Local: unit 816 ✔, integración 528 ✔, e2e de GEX web y backoffice ✔ contra un entorno local sin reset; la corrida completa con `prisma migrate reset` la hace el CI.)
