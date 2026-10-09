# Tasks: Grupos de Extensión (spec 014)

**Input**: spec.md, plan.md, data-model.md, contracts/api.md. Prioridad: el flujo principal (⭐) de
punta a punta con tests antes que los extras (congelamiento: sábado 10/10, 12 hs).

## Lote 1 — Modelo, reglas y API (P1)

- [ ] T001 Modelo Prisma (`GrupoExtension`, `LiderGrupoExtension`, `SolicitudGrupoExtension`, enums) y migración `grupos_extension` `--create-only` con índices parciales, CHECK y la vista `solicitudes_bandeja` con la rama `grupo_extension`.
- [ ] T002 `packages/shared-types/src/grupos-extension.ts`: tipos de respuesta, límites, `generoDelGrupo`, `esCompatible`, `edadEn`, `distanciaKm`, `formatearDistancia`, `ordenarPorDistancia`, `enlaceComoLlegar`, `direccionDelGrupo`; tests unit.
- [ ] T003 Sumas en shared-types: `RolDeCargo` (`lider_extension`), permisos (`grupos_extension.ver/gestionar`, `mi_grupo_extension.ver/gestionar`), `TIPOS_SOLICITUD`/`ESTADOS_*` (`grupo_extension`), códigos de error, avisos (`grupo_extension.solicitud_nueva`, `.solicitud_aceptada`, `.solicitud_rechazada`, `.agregada_por_admin`) con sus textos (web y mail) y datos de ejemplo de los tests del catálogo.
- [ ] T004 Geocodificador: interfaz, Georef, Nominatim, cadena, falso; selección por `GEOCODIFICADOR`; tests unit con `fetch` simulado.
- [ ] T005 API Admin: CRUD, inactivar/reactivar, líderes (rol `lider_extension` con `CambioDeRol`, D133), elegibles, agregar/quitar integrantes, aceptar/rechazar.
- [ ] T006 API persona: `me`, `buscar` (sin guardar ni loguear la dirección), pedir, retirar.
- [ ] T007 API líder: `liderados`, aceptar, rechazar (solo líderes vigentes del Grupo).
- [ ] T008 Avisos con `emitir(tx, …)` en cada transición; fuente `grupo_extension` de la bandeja y fila en Pendientes del Inicio.
- [ ] T009 Tests de integración: flujo completo persona → líder → persona; compatibilidad de género/edad y orden por distancia; privacidad (la respuesta no trae calle; nada se guarda); cupo; un pendiente/una aceptada; concurrencia de aceptar; permisos (Pastor sin acciones, líder ajeno 404); Admin agrega/quita; inactivar con integrantes; rol `lider_extension` otorgado/quitado; menor como líder rechazado; vista de la bandeja (test exhaustivo).

## Lote 2 — Pantallas (P1)

- [ ] T010 Web › card "Mi grupo de extensión" en Mi camino (`tarjeta-grupo-extension.tsx`).
- [ ] T011 Web › `/mi-camino/grupo-extension`: buscar (dirección / "Usar mi ubicación" / días), resultados, "Quiero sumarme", pedido pendiente con "Retirar", integrante con dirección, líderes, WhatsApp y "Cómo llegar"; `loading.tsx` / `error.tsx`.
- [ ] T012 Web › `/mi-grupo-extension` (líder): pedidos con "Escribir por WhatsApp", "Aceptar", "No es para este grupo" (mensaje opcional); integrantes con contacto; entrada en `SUBNAV_MI_CAMINO`.
- [ ] T013 Backoffice › `/grupos-extension` listado (activos/todos), `/grupos-extension/nuevo`, `/grupos-extension/[id]` (formulario con `CampoHora`, validación por campo, detalle con integrantes, pedidos, agregar, quitar, inactivar/reactivar); `nav.ts`.
- [ ] T014 Backoffice › `/solicitudes/grupo-extension/[id]` + ruta e ícono en `config/solicitudes.ts`.
- [ ] T015 Mensajes `next-intl` en los dos `es.json` (namespaces `grupoExtension`, `miGrupoExtension`, `gruposExtension`).

### Checklist de `docs/15` por pantalla (D114)

- [ ] T016 Checklist docs/15 — card de Mi camino (T010).
- [ ] T017 Checklist docs/15 — Encontrá tu grupo / mi grupo (T011).
- [ ] T018 Checklist docs/15 — Mi grupo del líder (T012).
- [ ] T019 Checklist docs/15 — listado, formulario y detalle del backoffice (T013).
- [ ] T020 Checklist docs/15 — detalle de la bandeja (T014).

## Lote 3 — Datos, e2e y docs

- [ ] T021 Seed demo `prisma/seed-demo/014-grupos-extension.ts` (8 Grupos ficticios, líder de demo, uno completo, un pedido pendiente) y fixtures `scripts/sembrar-e2e/014-grupos-extension.ts`; `limpiar-e2e.ts`.
- [ ] T022 e2e web: persona busca, pide, líder acepta, persona ve su grupo (axe claro/oscuro, `@celular`).
- [ ] T023 e2e backoffice: Admin crea un Grupo "En la iglesia", agrega y quita (axe claro/oscuro); el smoke de axe recorre las rutas nuevas de `nav.ts`.
- [ ] T024 Docs: `05-decisiones.md` (D219–D227), `04`, `08`, `02`, `03`, `23` (módulo GEX + tabla resumen), `COMO-ARRANCAR.md`.
- [ ] T025 Las tres suites en verde (CI) y PR con Preguntas para Echu.
