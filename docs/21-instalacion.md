# Instalar el sistema para una iglesia

Este documento es para quien **instala** Vida Sobrenatural para una iglesia: la primera vez, o
cuando esa iglesia se quedó sin nadie que pueda entrar al backoffice. No es para trabajar en el
código — para eso está `specs/revision-manual/COMO-ARRANCAR.md`, que usa atajos
(`SEED_ADMIN_EMAIL`, datos de demostración) que **no** se usan en una instalación real.

Por qué hay dos documentos separados (D130): cada iglesia tiene su propia instalación — su base de
datos, su dominio y su Admin. Si el camino para instalar una iglesia fuera "el seed de desarrollo",
llevar el sistema a una segunda iglesia sería desarmar atajos de desarrollo; escrito como
instalador, es un despliegue.

## Lo que hay que tener antes

- Una base de datos PostgreSQL vacía, **solo para esta iglesia** (D130: nunca compartida con otra).
- Las tres aplicaciones desplegadas (`apps/api`, `apps/web`, `apps/backoffice`) con sus variables
  de entorno. Las de la API están explicadas una por una en `apps/api/.env.example`;
  `NEXTAUTH_SECRET` e `INTERNAL_API_SECRET` tienen que ser **el mismo valor** en las tres apps.
- Credenciales de Google (OAuth) a nombre de la iglesia: la gente entra con su cuenta de Google,
  no hay contraseñas propias (Constitución, Principio V).
- El email de Google de la persona que va a ser el **primer Admin** de la iglesia, y su nombre,
  apellido, género y fecha de nacimiento reales (tiene que ser mayor de edad).

Todos los comandos de abajo se corren desde la raíz del repositorio, con `DATABASE_URL` apuntando
a la base de **esta** iglesia.

## Primera instalación

### 1. Crear las tablas

```bash
pnpm --filter api exec prisma migrate deploy
```

Aplica las migraciones sin generar ninguna nueva (`db:migrate` es para desarrollo: crea
migraciones, no se usa acá).

### 2. Sede

Toda Persona pertenece a una Sede, así que la primera tiene que existir antes que el Admin.

> **Pendiente conocido (spec 005, reportado al cerrar la Historia 1):** todavía no hay un paso de
> instalación que cree **solo** la primera Sede. `db:seed` la crea, pero con los datos de la sede
> de La Plata y junto con Personas, Palabra Profética y Libros de ejemplo — sirve para desarrollo,
> no para la base real de una iglesia. Hasta que exista ese paso, la Sede se carga directamente en
> la base (tabla `sedes`: `nombre`, `direccion`, `horarios`, `activo = true`) y después se completa
> desde el backoffice, en **Sedes**.

### 3. Sembrar el primer Admin

Si la persona **todavía no se registró** en la app:

```bash
pnpm --filter api run db:recrear-admin -- --email admin@iglesia.example \
  --nombre Marta --apellido Pérez --genero femenino --fecha-nacimiento 1980-04-02
```

Se pide nombre, apellido, género y fecha de nacimiento porque son los datos que después **no**
puede corregir desde su Perfil. Teléfono, dirección, estado civil y profesión quedan como
"A completar": al entrar, que los complete desde su Perfil.

Si la persona **ya se registró** desde la web (el camino más prolijo, porque carga todos sus datos
y da su propio consentimiento), alcanza con el email:

```bash
pnpm --filter api run db:recrear-admin -- --email admin@iglesia.example
```

En los dos casos, esa Persona queda como **Admin sembrado**: tiene el rol `admin` y nadie se lo
puede quitar desde el backoffice — ni otro Admin ni ella misma (FR-002). Es la garantía de que la
iglesia nunca se queda sin alguien que pueda administrar.

El comando no le otorga el rol a una Persona menor de edad ni a una dada de baja: termina con un
error y no cambia nada.

### 4. Nombrar al resto del equipo

Desde acá ya no hace falta la línea de comandos. Cada persona del equipo se registra normalmente
desde la web, y el Admin la busca en el backoffice, en **Personas**, y le otorga su rol (`admin`,
`pastor`, `discipulador` o `lider_curso`). Un Admin puede nombrar a otros Admin; esos sí se pueden
quitar desde el backoffice.

## Recuperar el acceso

Si la iglesia se quedó sin ningún Admin que pueda entrar (la persona que tenía el rol dejó la
iglesia, perdió su cuenta de Google, etc.), se corre **el mismo comando** con el email de quien va
a administrar ahora:

```bash
pnpm --filter api run db:recrear-admin -- --email nuevo-admin@iglesia.example
```

(con `--nombre`, `--apellido`, `--genero` y `--fecha-nacimiento` si todavía no se registró).

- No necesita que la API esté funcionando: se conecta directo a la base de datos. Es a propósito —
  es justo lo que puede estar roto cuando hace falta recuperar el acceso.
- Se puede correr las veces que haga falta: si esa Persona ya es el Admin sembrado, no cambia nada
  y lo avisa.
- No le quita nada a nadie: si ya tenía otros roles, los conserva.
