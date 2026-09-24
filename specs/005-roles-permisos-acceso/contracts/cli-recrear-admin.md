# Contrato: comando CLI para el Admin sembrado (Historia 1)

No es un endpoint HTTP — es un contrato de **línea de comandos** (FR-001/FR-003/FR-004), parte del
camino de instalación de una iglesia (D130/D131), no una utilidad de desarrollo.

## Invocación

```bash
pnpm --filter api run db:recrear-admin -- --email admin@iglesia.example
```

(el nombre exacto del script y de la variable/flag se fija en `tasks.md`; este contrato fija el
comportamiento, no la sintaxis literal).

## Comportamiento (idempotente, mismo criterio que `sembrar-e2e-admin.ts`)

1. Si no existe una Persona con ese email: la crea, con el rol `admin` y `adminSembrado = true`.
2. Si existe pero no tiene el rol `admin`: se lo agrega (acumulativo, no reemplaza otros roles) y
   marca `adminSembrado = true`.
3. Si ya tiene `admin` y `adminSembrado = true`: no hace nada, informa que ya está en ese estado.
4. En los tres casos, corre sin necesitar que `apps/api` esté levantada — se conecta directo a
   Postgres vía Prisma, igual que los demás scripts de `apps/api/scripts/` (funciona incluso en el
   escenario de "se perdió el acceso de todos los Admin" con la API caída).

## Dónde se documenta (FR-004)

Como parte de instalar el sistema para una iglesia — **no** en
`specs/revision-manual/COMO-ARRANCAR.md` (ese documento es explícitamente el atajo de entorno de
desarrollo, con `SEED_ADMIN_EMAIL`, H-12). El documento/sección exacto donde vive se decide en
`tasks.md` (ver research.md #4, nota para tasks.md) — este contrato solo fija que debe existir un
lugar así, distinto del de desarrollo.

## Sin contraparte HTTP

Deliberado (research.md #4): un endpoint de bootstrap protegido por secreto se descartó porque
requiere que la API esté accesible por red, justo lo que puede no ser cierto en el escenario que
este comando existe para resolver.
