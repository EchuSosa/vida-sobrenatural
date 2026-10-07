# Quickstart: validar Notificaciones (Avisos + email)

Guía de verificación de punta a punta. Cómo levantar todo: `specs/revision-manual/COMO-ARRANCAR.md`.

## Prerrequisitos

- Spec 007 en `main` (o en la base de esta rama): `EmailService`, Mailpit en `docker-compose.yml`
  (SMTP `localhost:1025`, web `http://localhost:8025`).
- Variables nuevas en `apps/api/.env`: `WEB_URL=http://localhost:3001` (para los botones de los
  mails) y, opcional, `TAREAS_PROGRAMADAS=true` (en tests: `false`).
- `pnpm --filter api exec prisma migrate dev` (migración `notificaciones`) y
  `pnpm --filter api run db:seed-demo`.
- Servidores en sus puertos fijos (D104): web 3001, backoffice 3002, API 3333.

## Escenarios

| # | Qué probar | Cómo | Resultado esperado |
|---|---|---|---|
| 1 | Lista de Avisos (US1) | Entrar a la web como la Persona de demo con avisos | Pestaña Avisos con número; lista paginada; "Sin leer" con texto + ícono |
| 2 | Abrir un aviso (US1) | Tocar un aviso automático sin leer | Lleva a Mi camino; al volver, ya no dice "Sin leer" y el número bajó |
| 3 | Aviso manual completo (US1) | Tocar el aviso de mensaje largo | Pantalla con el texto entero y los saltos de línea |
| 4 | Marcar todos (US1) | "Marcar todos como leídos" | Sin número en la pestaña; mensaje breve |
| 5 | Aviso desde la 004 (US2) | Backoffice: proponer un discipulado; aceptarlo como Discipulador (en el backoffice hoy, en la web app con la 006) | El Discipulador tuvo su aviso; la Persona tiene "Ya tenés Discipulador" |
| 6 | Mail importante (US3) | Escenario 5 con una Persona con email | En Mailpit, un mail: asunto genérico, botón a `http://localhost:3001/mi-camino`, versión texto |
| 7 | Reintentos (US3) | `docker compose stop mailpit`; rechazar una Solicitud; esperar 1 min; `start` | La Entrega pasa por `intentos = 1` y sale en el reintento |
| 8 | Aviso manual (US4) | Backoffice como Admin → Notificaciones → "Enviar un aviso" a un Grupo, importante | Conteo previo; confirmación; aparece en el historial; llega a los inscriptos y a Mailpit |
| 9 | Pastora (US4) | Backoffice como Pastora → Notificaciones | Ve historial y detalle; no ve "Enviar un aviso" |
| 10 | Recordatorios (US5, requiere 011) | Evento mañana con inscriptos; `pnpm --filter api run tareas:correr recordatorios` dos veces | Un solo aviso "Mañana es …" por confirmado |
| 11 | Modo oscuro y 360 px | Repetir 1–4 con tema oscuro y viewport de 360 px | Contraste correcto, letra de 16 px, sin scroll horizontal |

## Suites

```bash
pnpm --filter api run test          # unitarios (catálogo, plantilla, reintentos, resolución)
pnpm --filter api run test:e2e      # integración (emitir en tx, reparto, SKIP LOCKED, endpoints)
pnpm --filter web exec playwright test e2e/avisos.spec.ts
pnpm --filter backoffice exec playwright test e2e/notificaciones.spec.ts
```

Los e2e leen los mails de Mailpit con el helper de la 007 (`leerCodigoDeMailpit` se generaliza a
`leerMailsDeMailpit(para)`), y corren `axe` en claro y oscuro.
