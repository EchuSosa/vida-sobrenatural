# Quickstart: validar Vida Nueva / Discipulado

Cómo comprobar que la 004 funciona de punta a punta. Para levantar el entorno y dejar la base en
condiciones: `specs/revision-manual/COMO-ARRANCAR.md`. Los contratos están en `contracts/` y el
modelo en `data-model.md`. Esta guía no los repite.

## Prerrequisitos

- `docker compose up -d`, `pnpm --filter api run db:migrate` y
  `SEED_ADMIN_EMAIL=… pnpm --filter api run db:seed`. El seed ahora también crea el Curso "Vida
  Nueva" individual (`data-model.md` → Curso).
- Las tres apps levantadas (web 3001, backoffice 3002, API 3333, D104).
- `ALLOW_TEST_LOGIN=true` en los `.env.local` para entrar como otra Persona en `apps/web`.
- Si tocaste `packages/shared-types`, reconstruilo con los servidores levantados (H-33).

## Personas que hacen falta

1. Tu cuenta con `admin` (la del seed).
2. Una Persona adulta con rol `discipulador`: se lo otorgás desde **Personas → Cambiar roles**
   (mecanismo del 005).
3. Una Persona activa sin Vida Nueva, por ejemplo `demo-activa@example.com`.

## Escenarios

| # | Qué hacer | Qué tiene que pasar | Requisitos |
|---|---|---|---|
| 1 | Como el Discipulador, **Mi disponibilidad** → marcarse disponible. | La pantalla dice en palabras que hoy el Admin lo ve como disponible. | FR-015 |
| 2 | Como la Persona, en `apps/web` **Mi camino** → "Quiero empezar Vida Nueva". | Ve "pendiente de revisión". Un segundo intento no crea otra Solicitud y explica por qué. | FR-001, FR-026, Historia 1 escenario 3 |
| 3 | Como Admin, **Solicitudes** → abrir la pendiente → aprobar eligiendo al Discipulador. | El listado solo muestra disponibles sin bloqueo. Se crea el Grupo. La bandeja ya no la muestra como pendiente. | FR-003 a FR-006 |
| 4 | La Persona vuelve a Mi camino. | Ve "en curso" y el nombre de su Discipulador. No ve notas ni capítulos. | FR-027, FR-029 |
| 5 | Como el Discipulador, **Mis discipulados** → abrir → registrar un Encuentro con capítulos y una nota, sin tocar "Faltó". | Queda en el historial con presente. Ve teléfono y dirección de la Persona. | FR-009, FR-011, FR-013a |
| 6 | Como Admin (y después como Pastor), **Grupos** → abrir el discipulado. | Ven la fecha, los capítulos y la cantidad de Encuentros. **No** ven el texto de la nota. El Pastor no tiene botones de acción. | FR-010, D134, D64 |
| 7 | Como Admin, **Personas** → quitarle `discipulador` al Discipulador. | Se bloquea con un mensaje que nombra el discipulado activo (antes se bloqueaba siempre). | FR-009 del 005, H-127 |
| 8 | Otorgar `discipulador` a una segunda Persona, marcarla disponible y **Grupos** → reasignar. | El nuevo Discipulador ve el discipulado con sus Encuentros. El anterior deja de verlo. Ahora sí se le puede quitar el rol al primero. | FR-030, D137 |
| 9 | Como el Discipulador vigente, proponer la finalización. Como Admin, rechazarla con un motivo. | El discipulado sigue en curso y el Discipulador ve el rechazo y el motivo. | FR-019a |
| 10 | Volver a proponer; como Admin, confirmar. | La Persona ve "terminado" en Mi camino. `apto_ministerio` no aparece en ningún lado. | FR-021, FR-022, FR-028 |
| 11 | Como el Discipulador, cargar un período con fin anterior al inicio; después uno que cubra hoy. | El primero se rechaza con el error debajo del campo. Con el segundo, la pantalla dice que hoy no aparece, y en la aprobación de una Solicitud nueva no figura. | FR-016, FR-017 |

## Suites

Antes de cerrar (definición de terminado, D114):

```bash
pnpm --filter api run test        # unit: guardas, transiciones, "hoy", puedeQuitarRol
pnpm --filter api run test:e2e    # integración: aprobar, reasignar, confirmar, carreras, sin notas
pnpm --filter backoffice run test:e2e
pnpm --filter web run test:e2e
```

Los e2e de flujos críticos (pedir → aprobar → registrar Encuentro → finalizar) corren `axe` en
modo claro y oscuro (Principio VII).
