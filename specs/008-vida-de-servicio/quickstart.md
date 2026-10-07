# Quickstart: probar Vida de Servicio a mano

Base y servidores como dice `specs/revision-manual/COMO-ARRANCAR.md` (web 3001, backoffice 3002,
API 3333, D104). Después de `pnpm --filter api run db:seed-demo` hay una edición en curso con
cronograma a medio liberar, dos Líderes e inscriptos en los cuatro estados (FR-045).

1. **Abrir una edición** (backoffice, Admin): Grupos → filtro "Vida de Servicio" → "Crear una
   edición". 8 semanas desde el próximo miércoles; mirá que propone ocho miércoles; corregí uno;
   elegí dos Líderes. Probá guardar sin Líderes y con fechas desordenadas (errores por campo).
2. **Pedir inscripción** (web, Persona demo con Vida Nueva completada): Mi camino → Vida de Servicio
   → "Quiero anotarme" → elegí la edición → enviar. Con una Persona demo sin Vida Nueva, la card dice
   qué falta y no ofrece el botón. Cerrá la inscripción de todas las ediciones y probá "para la
   próxima edición".
3. **Aprobar** (backoffice): Solicitudes → filtro por tipo "Vida de Servicio" → abrir → mirar cómo
   cumple el prerrequisito → aprobar. La card de la Persona pasa a "En curso".
4. **Cargar material** (web, Líder, en el celular o con el viewport de celular): Mis grupos → la
   edición → semana con fecha futura → título + texto + un PDF + un enlace → guardar. La Persona ve
   "Se libera el …" sin contenido. Cargá una semana con fecha pasada: la Persona la ve enseguida y en
   el log de la API aparece `contenido_liberado`. Intentá abrir la URL del archivo con otra Persona:
   404.
5. **Asistencia** (web, Líder): "Tomar asistencia" → hoy → marcá dos ausentes → guardar. Repetí desde
   el otro Líder: corrige, no duplica. En inscriptos, quien llega a 2 faltas aparece con "2 faltas" e
   ícono.
6. **Baja** (web Líder → backoffice Admin): proponé "Dada de baja" → en el Inicio del backoffice
   aparece en pendientes → confirmá. La Persona ve "Tu inscripción a esta edición terminó" y conserva
   lo liberado hasta hoy.
7. **Finalización**: en una edición con la última semana ya alcanzada, el Líder propone; el Admin
   confirma. Las `activa` pasan a `completada` y en Personas aparece el rol Apto para Ministerio; la
   dada de baja no lo tiene. Probá confirmar con una baja propuesta pendiente: lo bloquea y la nombra.
8. **Pastor**: abrí la edición: ve todo, sin botones de gestión.
9. **Quitar `lider_curso`** a un Líder vigente: bloqueado, nombrando la edición con enlace.

Suites antes de cerrar (CLAUDE.md): `pnpm --filter api run test`, `pnpm --filter api run test:e2e`,
y los e2e de `apps/web` (incluido el proyecto `celular`) y `apps/backoffice`.
