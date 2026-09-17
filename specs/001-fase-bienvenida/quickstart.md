# Quickstart: Fase de Bienvenida para Visitantes

Guía de validación manual/automatizada de que el feature funciona de punta a punta. No repite
detalles de contratos o modelo de datos — ver `contracts/` y `data-model.md`.

## Prerrequisitos

- Postgres local corriendo: `docker compose up -d` (raíz del repo).
- Variables de entorno seteadas en `apps/api/.env`, `apps/web/.env.local`,
  `apps/backoffice/.env.local`: `DATABASE_URL`, `NEXTAUTH_SECRET`, `INTERNAL_API_SECRET`,
  `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (ver `contracts/auth-integration.md`).
- Migraciones de Prisma aplicadas: `cd apps/api && npx prisma migrate dev`.
- Al menos una Sede activa cargada (seed o vía `POST /sedes` como Admin) — sin esto, Historia 1 no
  tiene nada que mostrar.

## Cómo recorrer esta guía (revisión manual)

- Cada escenario se prueba en **escritorio y en ancho de celular** (o en un celular real), y en **modo claro y oscuro**.
- Al menos una pasada completa con una **cuenta real de Google**, además del login de test.
- Anotá cada hallazgo en el archivo de revisión de la ronda (`specs/revision-manual/`), no solo los errores: también textos confusos o mejoras.
- Al terminar, completá el checklist de lector de pantalla: `specs/002-base-transversal/checklists/accesibilidad-manual.md`.

## Levantar las apps

```bash
pnpm --filter api start:dev        # http://localhost:3333 (PORT en apps/api/.env)
pnpm --filter web dev              # Visitante — http://localhost:3001
pnpm --filter backoffice dev       # Admin/Discipulador — http://localhost:3002
```

## Escenario de validación 1 — Historia 1 (ver Bienvenida y Sede, sin cuenta)

1. Abrir `apps/web` en una ventana sin sesión.
2. Navegar al contenido de "Primeros pasos" (`/primeros-pasos`) → debe explicar el proceso de
   integración sin pedir login, con el copy real de `docs/12-contenido-bienvenida.md` ("En qué
   creemos" y las fotos como placeholders pendientes — D98).
3. Navegar a "Visitanos" (`/visitanos`) → debe mostrar los datos de la Sede activa cargada en el
   prerrequisito, sin pedir login.
4. **Resultado esperado**: SC-001 (encontrar esta info en menos de 2 minutos sin ayuda).

*(actualización 2026-09-17: `/bienvenida` y `/sede` ya no existen — ver 002-base-transversal, D91/D92.)*

## Escenario de validación 2 — Historia 2 (registro adulto vía SSO) — flujo E2E crítico

Este es el único flujo que la Constitución exige cubrir con Playwright (Principio VI).

1. Desde `/primeros-pasos` o `/visitanos`, tocar "Registrarme".
2. Autorizar con una cuenta de Google de test (mayor de 18 en los datos que se completan después,
   email verificado — ver paso 7).
3. Completar el formulario obligatorio, ahora dividido en pasos cortos con indicador de progreso,
   volver a un paso anterior sin perder los datos cargados, y un resumen final antes de enviar
   (`POST /personas` — ver `contracts/personas-api.md`; FR-016). Probarlo también en ancho de
   celular y en modo oscuro: el indicador de progreso, los errores por campo y el resumen final
   deben verse y leerse bien; el teclado del celular no debe tapar el botón de avanzar.
4. **Resultado esperado**: la Persona queda `estado: "activa"`, con `consentimientoDatosFecha`/
   `consentimientoDatosOrigen: "app"` y `origenAlta: "autorregistro"`; la sesión refleja rol
   `miembro_registrado`; SC-002 (menos de 3 minutos).
5. Cerrar sesión y volver a autorizar con la misma cuenta de Google → debe entrar directo, sin
   repetir el formulario (`GET /personas/by-email` la encuentra ya `activa`).
6. Verificar que ningún link/contenido de la sesión lleva a Vida Nueva/Vida de Servicio/Ministerio
   (FR-012).
7. Verificar el caso de email no verificado (FR-017): las cuentas de Google **siempre** tienen el
   email verificado, así que no se puede reproducir con una cuenta real. Se valida con el login de
   test (`ALLOW_TEST_LOGIN=true`) o simulando la respuesta del proveedor sin `email_verified`, y
   está cubierto por el e2e dedicado. Resultado esperado: redirige a `/email-no-verificado` sin
   vincular ni crear ninguna Persona, con un mensaje claro de qué hacer.

## Escenario de validación 3 — Historia 2b (menor de edad)

1. Repetir el registro (paso 1-3 del Escenario 2) con una `fechaNacimiento` de menor de 18.
2. **Resultado esperado**: `POST /personas` responde `estado: "pendiente_tutor"`; intentar
   iniciar sesión de nuevo con esa cuenta no da acceso (FR-008).
3. Desde `apps/backoffice`, como Admin o Discipulador, ir a la cola de pendientes
   (`GET /personas/pendientes-tutor`) y verificar que el caso aparece.
4. Activar el caso (`PATCH /personas/:id/activar` con `tutorNombre`/`tutorTelefono`) →
   verificar que esa Persona ya puede iniciar sesión como `miembro_registrado`.
5. Repetir el registro con otra fecha de nacimiento de menor, y esta vez usar
   `PATCH /personas/:id/marcar-inactiva` → verificar que desaparece de la cola de pendientes y
   sigue sin poder iniciar sesión.

## Escenario de validación 4 — Historia 3 (Admin gestiona Sede)

1. Como Admin en `apps/backoffice`, crear una Sede (`POST /sedes`).
2. Verificar que aparece inmediatamente en `apps/web` (`GET /sedes` / Historia 1).
3. Editarla (`PATCH /sedes/:id`) y verificar que el cambio se refleja (SC-005).
4. Desactivarla (`PATCH /sedes/:id` con `activo: false`) siendo la única Sede activa → verificar
   que `apps/web` maneja el caso de "sin Sede activa" sin error.
5. Como usuario sin rol Admin, intentar `POST /sedes` → verificar `403`.

## Tests automatizados (Constitución, Principio VI)

- **Unit (Jest, `apps/api/test/unit`)**: cálculo de edad a partir de `fechaNacimiento`
  (límite exacto de 18 años), dedup por `email` en `POST /personas`, transición
  `pendiente_tutor → activa` y `pendiente_tutor → activo:false` en `PersonaService`.
- **Integración (Jest + Postgres de test, `apps/api/test/integration`)**: `POST /personas` de
  punta a punta contra la base (crea fila, respeta constraint de unicidad de `email`);
  `PATCH /sedes/:id` con `activo:false` (soft delete real).
- **E2E (Playwright, `apps/web/e2e`)**: Escenario de validación 2 completo (único flujo E2E
  exigido — el registro de Bienvenida es el flujo crítico de esta fase), con `@axe-core/playwright`
  en modo claro y oscuro (Constitución Principio VII) sobre cada paso del formulario.

*(actualización 2026-09-17, Fase 8 de `tasks.md`)*: se suman un unit test de la verificación de
`email_verified` (Historia 2, Acceptance Scenario 7) y se actualiza el E2E existente a los
selectores del formulario por pasos — ver `tasks.md`, Phase 8.
