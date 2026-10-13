# Tasks — spec 016

- [ ] T001 Migración `lideres_ministerio`; modelo Prisma.
- [ ] T002 shared-types: `lider_ministerio` en `RolDeCargo`, permiso `mi_ministerio.ver`, tipos
      (`LiderMinisterioVista`, `lideres` en `MinisterioCatalogo`, `MinisterioLiderado`,
      `MinisterioLideradoDetalle`, `lideraMinisterios` en el Perfil), aviso `ministerio.lider_asignado` + unit.
- [ ] T003 API: `rol-lider-ministerio.ts`; asignar/quitar; `lideres` en listar/detalle; inactivar/
      reactivar/eliminar; `liderados`; Perfil + integración.
- [ ] T004 Backoffice: sección "Líderes" en el detalle, columna en la lista, Perfil + e2e.
- [ ] T005 Web: `/mi-ministerio` y `/mi-ministerio/[id]`, subnav + e2e (axe, `@celular`).
- [ ] T006 Seeds demo y e2e (un líder de Bienvenida); `limpiar-e2e`.
- [ ] T007 Docs: D244 (enmienda D14 en lo que hace a ver el equipo), docs/03, docs/04, docs/08,
      manual (LMI-01 a LMI-03). Checklist de docs/15 revisado en cada pantalla: cuatro estados,
      `useEnvio`, textos en `next-intl`, colores de tokens, estado en texto + ícono, 44 px, axe.
