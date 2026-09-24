# Quickstart: Roles, permisos y acceso al backoffice

Prerrequisitos: entorno local levantado (`specs/revision-manual/COMO-ARRANCAR.md`), migraciones al
día (`pnpm --filter api run db:migrate`).

## 1. Admin sembrado + comando de recuperación (Historia 1)

```bash
pnpm --filter api run db:recrear-admin -- --email tu-email@example.com
```

**Esperado**: la Persona con ese email queda con rol `admin` y `adminSembrado = true`. Entrando al
backoffice con esa cuenta (SSO), verificar que **no** hay ninguna acción de "quitar rol admin" ni
"desactivar" disponible para esa Persona (FR-002) — ni siquiera desde su propia sesión.

Repetir el comando una segunda vez: debe informar que ya está en ese estado, sin duplicar nada
(idempotencia, ver contracts/cli-recrear-admin.md).

## 2. Catálogo de permisos (Historia 3)

```bash
grep -rn "@Roles(" apps/api/src/
```

**Esperado**: cero resultados (todos migrados a `@RequierePermiso`, FR-014, contracts/permisos-api.md).

Cambiar, a mano, en `packages/shared-types/src/permisos.ts`, la lista de roles de un permiso
existente (ej. agregar `pastor` a un permiso que hoy solo tiene `admin`) y verificar que el efecto
se ve **a la vez** en un endpoint de la API (Postman/curl) y en la pantalla del backoffice
correspondiente, sin haber tocado ningún otro archivo (SC-004).

## 3. Otorgar y quitar un rol de cargo (Historia 2)

Con la sesión de Admin:

1. Ir a la pantalla de Personas, buscar por nombre una Persona de prueba (sin rol de cargo).
2. Otorgarle el rol `lider_curso`. **Esperado**: aparece con ese rol de inmediato, sin ningún
   paso intermedio (FR-006).
3. Quitarle el rol `lider_curso`. **Esperado**: se quita, conserva sus demás roles si tenía
   alguno. (Se usa `lider_curso`, no `discipulador`, para probar el camino normal de
   otorgar/quitar sin chocar con la guarda del paso 5b.)
4. Repetir el otorgamiento con una Persona menor de edad de prueba (`fechaNacimiento` reciente).
   **Esperado**: el sistema rechaza el otorgamiento (FR-011) y esa Persona no aparece siquiera en
   el listado de búsqueda para ascender (FR-024).
5a. Otorgarle el rol `discipulador` a una Persona de prueba, sin ningún discipulado activo
    (spec 004 sin implementar todavía). Intentar quitárselo. **Esperado (H-127)**: el sistema
    **rechaza** la revocación de forma incondicional, con un mensaje que explique que todavía no
    puede verificar si tiene discipulados a cargo — no "no tiene ninguno". La guarda falla
    cerrada mientras la consulta real del spec 004 no exista, aunque en la práctica hoy ninguna
    Persona pueda tener un discipulado real asignado.
5b. **Una vez que el spec 004 esté implementado** (o con un fixture de prueba que simule su
    consulta real): repetir el intento de quitar `discipulador` a una Persona con discipulados
    activos asignados. **Esperado**: bloqueado, nombrando cuáles discipulados lo impiden (FR-009).
    Repetir con una Persona con rol `discipulador` pero sin discipulados activos. **Esperado**:
    permitido — la guarda deja de fallar cerrada en cuanto la consulta real puede responder.
6. Con la propia sesión de Admin, intentar quitarse a sí mismo el rol `admin`. **Esperado**:
   rechazado (FR-010). Intentar quitarse a sí mismo otro rol de cargo que tenga (ej.
   `lider_curso`). **Esperado**: permitido.

## 4. Protección por pantalla (Historia 4)

```bash
pnpm --filter backoffice run lint
```

**Esperado**: pasa mientras toda ruta bajo `apps/backoffice/src/app/**/page.tsx` tenga una entrada
en `NAV_BACKOFFICE` (`apps/backoffice/src/config/nav.ts`) — verificado por la regla de ESLint
`eslint-rules/pantalla-declara-permiso.mjs` (research.md #3), no un test de Jest (`apps/backoffice`
no tiene Jest configurado). Crear una `page.tsx` de prueba sin agregarla al registro y
verificar que el test falla (FR-017) — después borrar la página de prueba.

## 5. Acceso de solo lectura del Pastor (Historia 5)

Con una sesión de rol `pastor`: recorrer varias pantallas del backoffice y verificar que se ven,
pero ninguna ofrece una acción de crear/editar/gestionar — excepto Palabra Profética (D129), donde
sí puede editar.

## 6. Auditoría (Historia 6)

Después de los pasos 3.2 y 3.3 (otorgar y quitar un rol), consultar:

```bash
curl -H "Authorization: Bearer <token-admin>" http://localhost:3333/cambios-de-rol?personaId=<id>
```

**Esperado**: dos filas, una `otorgado` y una `quitado`, cada una con el email/id del Admin que la
ejecutó y la fecha.

## Suites completas (Governance, D114)

Antes de cerrar la fase: `pnpm --filter api run test`, `pnpm --filter api run test:e2e`, y los e2e
de `apps/web` y `apps/backoffice` — las cuatro en verde (docs/00-README.md).
