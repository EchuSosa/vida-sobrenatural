# Quickstart: probar la 013 a mano

Cómo levantar todo: `specs/revision-manual/COMO-ARRANCAR.md`. Después de las migraciones de esta spec:
`pnpm --filter api run db:reset-demo` (D120) y, si se tocó `packages/shared-types` con los servidores arriba,
reconstruirlo (H-33).

1. **Bandeja** — entrar como Admin a `http://localhost:3002/solicitudes`: aparecen las abiertas, la más vieja arriba;
   "Resueltas" muestra quién revisó; buscar un apellido vuelve a la página 1; el nombre lleva al perfil.
2. **Perfil** — `/personas` → una fila → perfil: foto o iniciales, datos, roles por clase, historial (Solicitudes y
   Grupos), Relaciones Familiares en las dos direcciones. Abrir el de un Discipulador: "Grupos a cargo". Abrir el de
   un menor activado: datos del tutor y vínculo.
3. **Inicio** — `/`: pendientes por tipo (cada uno a la bandeja filtrada), métricas (cotejar con
   `SELECT COUNT(*) FROM personas WHERE estado='activa' AND activo`), cumpleaños de la semana, comentarios sin
   revisar.
4. **Cumpleaños** — `/cumpleanos` y `/cumpleanos?mes=2` (la Persona del 29/2 en el 28 si el año no es bisiesto).
5. **Comentarios** — en `http://localhost:3001` (sin sesión) → pie → "Contanos qué te parece" → enviar un problema;
   el mail llega a Mailpit (`http://localhost:8025`); en el backoffice `/comentarios` aparece "Sin revisar"; marcarlo
   y deshacer. Mandar 6 seguidos sin sesión: el sexto avisa cuánto esperar.
6. **Catálogos** — `/catalogos` → Cursos: inactivar Vida Nueva grupal (confirmación simple), intentar inactivar Vida
   Nueva individual con Grupos en curso (pide escribir el nombre); con individual inactivo, aceptar una propuesta de
   discipulado nueva desde la pantalla del Discipulador (backoffice hoy, web app tras la 006) falla con el
   mensaje de Curso inactivo.
7. **Pastor** — repetir 1–6 con `loguearseComoPastorE2E` o el usuario de demo pastor: todo se ve, ningún botón de
   gestión, y los endpoints de escritura responden 403.
8. **Celular** — DevTools a 360 px: Inicio, perfil, cumpleaños y el formulario de comentarios sin scroll horizontal,
   letra de 16 px y botones de 44 px (D150).

Suites antes de cerrar cada lote (`CLAUDE.md`): `pnpm --filter api run test`, `pnpm --filter api run test:e2e`, y los
e2e de `apps/web` y `apps/backoffice`.
