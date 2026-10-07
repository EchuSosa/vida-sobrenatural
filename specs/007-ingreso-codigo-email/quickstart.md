# Quickstart: validar el ingreso con código por email

Guía para comprobar la 007 de punta a punta en local. Cómo levantar todo en general:
`specs/revision-manual/COMO-ARRANCAR.md`.

## Requisitos

- `docker compose up -d` levanta **Postgres y Mailpit** (Mailpit se suma en esta spec).
  Interfaz de Mailpit: <http://localhost:8025>. SMTP: `localhost:1025`.
- `apps/api/.env` con las variables nuevas (ver `apps/api/.env.example`): `CODIGO_INGRESO_SECRET`,
  `SMTP_HOST=localhost`, `SMTP_PORT=1025`, `SMTP_SEGURO=false`,
  `EMAIL_REMITENTE="Vida Sobrenatural <no-responder@localhost>"`.
- Migraciones al día (`pnpm --filter api run db:migrate`) y `shared-types` recompilado (H-33).
- API en 3333, web en 3001, backoffice en 3002 (D104).

## Escenarios

| # | Historia | Pasos | Resultado esperado |
|---|---|---|---|
| 1 | H1 | En <http://localhost:3001/ingresar>, escribir el email de una Persona `activa` que no es de Google y tocar "Enviarme el código". Abrir Mailpit, copiar el código, escribirlo. | Entra a `/inicio` como esa Persona. |
| 2 | H1 | Escribir un código equivocado. | Mensaje debajo del campo y en el resumen, diciendo cómo seguir; el email sigue escrito. |
| 3 | H1 | Equivocarse 5 veces con el mismo código. | Al quinto: "Probaste muchas veces…"; el código correcto ya no sirve. |
| 4 | H1 | Pedir un código, después "Enviarme otro código", y escribir el primero. | El primero no sirve; el segundo sí. |
| 5 | H2 | Pedir código con un email que no existe (ej. `nuevo+007@example.com`). | Pantalla idéntica a la del escenario 1. Con el código, entra al registro de 4 pasos con el email cargado y no editable. |
| 6 | H2 | Completar el registro con fecha de nacimiento de menor. | Queda en `pendiente_tutor` y ve la pantalla de espera. |
| 7 | H3 | Entrar con código usando `ANA@Hotmail.com ` cuando la Persona tiene `ana@hotmail.com`. | Entra a la misma Persona. |
| 8 | H3 | Con una Persona registrada por Google, entrar con código con el mismo email. | Misma Persona (mismo id en `/perfil`). |
| 9 | H4 | Crear en el backoffice un menor pre-cargado y activarlo (D35); entrar con código con su email. | Entra sin pasar por la validación de edad. |
| 10 | H5 | En <http://localhost:3002>, entrar con código con el email de una Persona con rol `admin`. | Ve el backoffice con sus permisos. |
| 11 | H5 | En el backoffice, pedir código con un email sin rol. | Mismo mensaje que el escenario 10; llega el mismo mail; con el código ve "no tenés acceso". |
| 12 | H6 | Abrir el mail en Mailpit, pestañas HTML y Text. | Asunto con el código; código grande; "Vale por 15 minutos"; "Si no fuiste vos, ignorá este mail"; sin nombre ni datos. |
| 13 | FR-009 | Pedir 6 códigos seguidos para el mismo email. | El sexto: "Pediste muchos códigos seguidos. Probá de nuevo en N minutos." |
| 14 | FR-015 | Con la API apagada, escribir un código. | Pantalla de error de verificación (D88). |
| 15 | FR-016 | Mirar la cookie de sesión en las herramientas del navegador. | Vence en 30 días en la web y en 7 en el backoffice. |

## Suites

```bash
pnpm --filter api run test        # unitarias: generación, huella, límites, plantilla
pnpm --filter api run test:e2e    # integración: endpoints contra la base de test, EmailServiceFalso
pnpm --filter web exec playwright test ingreso-codigo      # necesita Mailpit arriba
pnpm --filter backoffice exec playwright test ingreso-codigo
```

Los e2e de las dos apps corren `axe` en modo claro y oscuro sobre las pantallas de ingreso.
