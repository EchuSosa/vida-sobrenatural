# Quickstart: validar Ministerios y Células (postulación)

Cómo comprobar la 009 de punta a punta. Levantar el entorno y dejar la base en condiciones:
`specs/revision-manual/COMO-ARRANCAR.md`. Contratos en `contracts/`, modelo en `data-model.md`; esta
guía no los repite.

## Prerrequisitos

- `docker compose up -d`, `pnpm --filter api run db:migrate`, `pnpm --filter api run db:seed` y
  `pnpm --filter api run db:seed-demo` (siembra Ministerios, Células y Postulaciones en todos los
  estados, FR-040).
- Las tres apps levantadas (web 3001, backoffice 3002, API 3333 — D104). `ALLOW_TEST_LOGIN=true` en los
  `.env.local` para entrar como otra Persona en `apps/web`.
- Si tocaste `packages/shared-types`, reconstruilo con los servidores levantados (H-33).
- **Dependencia**: el rol `apto_ministerio` lo escribe la spec 008. Si no está mergeada, seed-demo se
  lo asigna directamente a `demo-apta@…` y `demo-miembro@…` (marcado en el seed como provisorio).

## Personas que hacen falta (seed-demo)

1. Admin del seed. 2. Un Pastor. 3. `demo-no-apta@…` (sin `apto_ministerio`). 4. `demo-apta@…` (apta,
sin Postulación). 5. `demo-miembro@…` (aprobada en "Vida en Acción", Célula "Comedor"). 6. Una Persona
sin email, apta (para la Historia 5).

## Escenarios

| # | Qué hacer | Qué tiene que pasar | Requisitos |
|---|---|---|---|
| 1 | Como `demo-no-apta`, abrir Mi camino a 360 px. | Card de Ministerio: explica que primero va Vida de Servicio, enlace "Conocé los Ministerios"; la lista se ve, el detalle no tiene formulario. | FR-010, FR-011, US1-5 |
| 2 | Como `demo-apta`, Mi camino → "Elegí un Ministerio" → "Vida en Acción" → Célula "Familia", motivación de 501 caracteres → Postularme. | Error debajo del campo y en el resumen, foco al resumen, texto conservado. | FR-007, H-50 |
| 3 | Acortar y enviar; tocar dos veces rápido. | Una sola Postulación; card "Recibimos tu postulación a Vida en Acción…" con ícono. | FR-001, FR-003, FR-008 |
| 4 | Intentar postularse a "Bienvenida". | El detalle dice que ya tiene una en revisión; un POST directo da `POSTULACION_YA_PENDIENTE`. | FR-003, FR-010 |
| 5 | "Retirar postulación" → confirmar (diálogo neutro). | Card vuelve a "Elegí un Ministerio" con "Retiraste tu postulación…", sin recargar. | FR-006, FR-013, D151 |
| 6 | Postularse de nuevo a "Vida en Acción". Como Admin, bandeja → filtro tipo "Postulaciones". | Aparece con tipo en texto; la URL lleva el filtro. | FR-005, FR-015 |
| 7 | Abrir el detalle y aprobar. | Sin advertencia; `aprobada`; Mi camino de `demo-apta` dice "Estás sirviendo en Vida en Acción, en la Célula Familia". Log: `postulacion_aprobada`. | FR-016–FR-018, FR-035 |
| 8 | Como `demo-miembro`, postularse a "Bienvenida". Como Admin, abrir el detalle. | El detalle muestra "Ya pertenece a Vida en Acción" antes de tocar nada; al aprobar, diálogo "Esta persona ya pertenece al Ministerio Vida en Acción. ¿Confirmás el cambio?". Confirmar: la vieja `inactiva`, la nueva `aprobada`. | FR-017 |
| 9 | `POST /postulaciones/:id/aprobar` sin `confirmarCambio` para un caso como el 8. | 409 `POSTULACION_REQUIERE_CONFIRMAR_CAMBIO` con `ministerioActual`. | FR-017 |
| 10 | Rechazar una Postulación con motivo. | La Persona ve el texto amable sin el motivo; el Admin ve el motivo en el historial; el Pastor no. | FR-014, FR-019 |
| 11 | Catálogos → Ministerios → "Crear un Ministerio" con nombre "vida en accion". | Error de nombre duplicado (sin distinguir mayúsculas ni tildes). | FR-026 |
| 12 | Crear "Jóvenes" → la confirmación ofrece "Agregar Células" → agregar dos. | Listado con 2 Células activas. | FR-027, FR-033 |
| 13 | Inactivar "Vida en Acción" (tiene miembros). | Diálogo con cuántos miembros y pendientes; pide el nombre exacto. Queda en el listado "todos" como inactivo; no aparece en la app ni en `/ministerios`. El miembro ve el aviso en Mi camino. Reactivar. | FR-028, FR-031, FR-012, FR-034 |
| 14 | Inactivar la Célula "Comedor"; intentar aprobar una pendiente a esa Célula. | 409 con explicación; rechazar sí se puede. | FR-021 |
| 15 | Intentar eliminar "Vida en Acción"; eliminar "Jóvenes" tras eliminar sus Células; restaurar desde la papelera. | Botón deshabilitado con motivo y oferta de inactivar; "Jóvenes" va a la papelera y vuelve. | FR-030 |
| 16 | Detalle de "Bienvenida" → miembros → "Dar de baja del Ministerio" a `demo-miembro`. | `inactiva (baja)`; Mi camino: "Ya no figurás en Bienvenida…", "Elegí un Ministerio". | FR-025, FR-032 |
| 17 | Como Admin, postular en nombre de la Persona sin email. | Nombre visible durante toda la acción; la bandeja dice "Creada por … en nombre de …". | FR-024 |
| 18 | Como Pastor, recorrer bandeja, detalle y Catálogos → Ministerios. | Todo visible, ninguna acción; la API rechaza un POST con 403. | FR-023 |
| 19 | Inicio del backoffice. | La tarjeta de pendientes muestra "Postulaciones pendientes: N" con enlace a la bandeja filtrada. | FR-041 |
| 20 | Abrir `/ministerios` sin sesión. | Ministerios activos con sus Células; con ninguno activo, el estado vacío. | FR-034 |

## Suites

```bash
pnpm --filter api run test        # unit: reglas de creación, estado de la card, eventos, normalizar nombre
pnpm --filter api run test:e2e    # integración: concurrencia (pendiente y aprobada), cambio, inactivar, eliminar, bandeja mezclada
pnpm --filter web exec playwright test ministerios       # incluye @celular y axe claro/oscuro
pnpm --filter backoffice exec playwright test ministerios postulaciones
```
