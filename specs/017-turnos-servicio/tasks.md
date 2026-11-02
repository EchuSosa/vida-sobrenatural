# Tasks — spec 017 (Turnos de servicio)

## Entrega 1 — Modelo y Admin (US1)

- [ ] T001 Migración: `dias_de_servicio`, `fechas_de_servicio`, `turnos`, `cupoTurno` en
  `ministerios` y `celulas` (data-model.md).
- [ ] T002 shared-types `turnos.ts`: constantes y `fechasDeServicio` + unitarios (Argentina, segundo
  domingo, último sábado, cambio de mes/año).
- [ ] T003 Permisos `turnos.gestionar` y `turnos.ver` en el catálogo + unitario.
- [ ] T004 API reglas: `GET/POST/DELETE /ministerios/:id/dias-de-servicio` + integración (repetida
  409, sin permiso 403).
- [ ] T005 API cupos (`PATCH` Ministerio/Célula, 1–20) + integración.
- [ ] T006 API suspender / volver a habilitar fecha + integración.
- [ ] T007 Seed de demo: reglas de Bienvenida, Ceremonial y Vida en Acción; Células "Atención a
  quienes ministran" y "Limpieza" en Bienvenida (D254).
- [x] T008 Backoffice "Días de servicio" y cupo por Célula (cuatro estados, H-50, useEnvio).
- [x] T009 e2e backoffice US1: caso feliz + regla repetida + cupo inválido + API caída + doble
  envío; axe claro/oscuro.
- [x] T010 Checklist de `docs/15` para la pantalla del Ministerio (D114).
  - [x] Una sola acción principal, con verbo concreto: "Agregar día" (el resto, por fila: "Quitar", "Guardar", "Este día no hay").
  - [x] Orden de botones según la convención: confirmaciones con "Volver" y la acción a la derecha (`ConfirmDestructiveDialog`, tono neutro: todo se puede deshacer).
  - [x] Cuatro estados: cargando y error con `loading.tsx`/`error.tsx` de `ministerios/[id]`; vacío con "Todavía no tiene días de servicio" y "Cuando cargues un día…"; éxito con aviso y la lista al día.
  - [x] Botones bloqueados y con indicador mientras se procesa, envío protegido de la reentrada (`useEnvio`; e2e de tres toques).
  - [x] Feedback según `16`: aviso de éxito; errores de validación por campo con resumen (H-50); fallas de la API con aviso que dice qué pasó.
  - [x] Se entiende qué pasa después: la descripción de "Este día no hay" dice que avisa a quien tenía turno y que se puede volver a habilitar.
  - [x] Textos en el tono definido, con voseo y sin jerga ("En armado", "Este día no hay").
  - [x] Celular (e2e a 390 px sin desborde), teclado (e2e con Enter) y lector de pantalla (sección con `aria-labelledby`, `aria-invalid`/`aria-describedby`, botones con nombre que incluye la fecha o la regla).
  - [x] Contraste: solo tokens; `axe` en claro y oscuro en el e2e.

## Entrega 2 — Rol del líder, avisos e Inicio (US2, US3)

- [x] T011 API grilla `GET /ministerios/:id/turnos` (fechas, Células, cupos, faltantes, conteos).
- [x] T012 API asignar / quitar / copiar anterior, con advertencia de otro Ministerio.
- [x] T013 API publicar + avisos en la transacción + aviso a quien entra y sale.
- [x] T014 Tarea diaria del recordatorio (`DIAS_RECORDATORIO_TURNO`).
- [x] T015 API `GET /turnos/me`.
- [x] T016 Integración de T011–T015 (permisos, 409, avisos una sola vez).
- [ ] T017 packages/ui `GrillaTurnos` (celular: una fecha por vez).
- [ ] T018 Web `/mi-ministerio/[id]/turnos` + backoffice pestaña "Turnos" (Pastor sin botones).
- [ ] T019 Web tarjeta "Tu próximo turno" en `/inicio` y `/mis-turnos`.
- [ ] T020 e2e web US2 (feliz + API caída + doble toque en Publicar) y US3 (feliz + API caída en la
  tarjeta); `@celular`, axe.
- [ ] T021 Checklist de `docs/15` para la grilla, el Inicio y "Mis turnos" (D114).

## Entrega 3 — "No puedo ir" y casos borde (US4)

- [ ] T022 API `POST /turnos/:id/cancelacion` + aviso a líderes (sin motivo) + integración (ya
  empezó 409).
- [ ] T023 Baja de integrante, regla quitada y Ministerio inactivo: turnos a "Falta cubrir" con aviso
  + integración.
- [ ] T024 Web "No puedo ir" en "Mis turnos" + e2e (feliz + doble toque + API caída).
- [ ] T025 Checklist de `docs/15` (D114). PROGRESS.md: línea del ítem 5.
