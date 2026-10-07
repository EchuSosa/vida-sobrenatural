# Quickstart — validar 011 Eventos a mano

Cómo levantar todo: `specs/revision-manual/COMO-ARRANCAR.md`. Después de `db:seed-demo`, los
escenarios de demo ya existen (research #17). Puertos: web 3001, backoffice 3002, API 3333 (D104).
Cada escenario dice qué requisito valida.

1. **Cartelera** (FR-001, FR-002, FR-003): sin sesión, abrir `http://localhost:3001/eventos`. Se
   ven los próximos en orden; el pasado, el cancelado y el eliminado no. Entrar a uno: fecha, hora,
   lugar, costo y cupo están como texto; el flyer tiene `alt`.
2. **Vista previa** (FR-006): ver el código de `/eventos/{slug}`: `og:title`, `og:image`,
   `application/ld+json` con `"@type": "Event"`. `/sitemap.xml` lista el Evento.
3. **Cancelado y pasado** (FR-005): abrir el link del Evento cancelado y del pasado de la demo:
   dicen "Cancelado" / "Ya pasó", sin "Anotarme". El eliminado da 404 (FR-043).
4. **Crear con QR** (FR-010 a FR-013): Admin en `http://localhost:3002/eventos` → "Crear un
   Evento", con inscripción, cupo 2, lista de espera, costo e instrucciones de pago, y un flyer.
   Sin texto alternativo no guarda. En el detalle: QR, "Copiar link", "Descargar QR".
5. **Slug fijo** (FR-011): cambiarle el nombre; la URL pública sigue igual.
6. **Anotarse y lista de espera** (FR-015 a FR-017): con tres Personas `demo-`, anotarse al Evento
   del paso 4: las dos primeras quedan "Confirmada — falta el pago", la tercera "Estás en el lugar
   1 de la lista de espera". Con el cupo lleno y sin lista, el botón dice "Cupo completo".
7. **Volver después de ingresar** (FR-020): en una ventana privada, abrir el Evento, tocar
   "Anotarme", ingresar; vuelve al mismo Evento con el paso de confirmar abierto. Probar también
   `?destino=https://ejemplo.com` en `/ingresar`: cae en `/inicio`.
8. **Cancelar y promoción** (FR-018, FR-022): la primera cancela desde `/mis-eventos` (diálogo
   neutro, "Sí, cancelar inscripción" / "No, mantenerla"); la tercera pasa a confirmada. En el
   detalle del Evento del backoffice aparece marcada "Subió desde la lista de espera". En el log de
   la API, un `inscripcion_promovida` sin nombres.
9. **Pago** (FR-030 a FR-033): la segunda sube un PDF como comprobante; un `.exe` renombrado a
   `.pdf` se rechaza. El Admin lo ve en `/solicitudes` con el filtro "Pago", lo abre (se ve inline),
   lo verifica; la Persona ve "Pago verificado".
10. **Comprobante privado** (FR-032, SC-005): con la sesión de otra Persona, pedir
    `GET /pagos/{id}/comprobante` → 404. Sin sesión → 401. No hay ninguna ruta `/archivos/comprobantes`.
11. **Rechazar pago** (FR-035): con lista de espera no vacía, el Admin rechaza un pago con motivo:
    la Inscripción queda cancelada ("Rechazamos el comprobante: …, podés volver a anotarte"), y la
    primera de la lista pasa a confirmada.
12. **Aprobación en lote** (FR-026): en el Evento con aprobación de la demo, seleccionar tres
    pendientes y aprobarlas; con una que otra pestaña ya rechazó, el resumen dice "2 aprobadas, 1
    no se pudo".
13. **En nombre de** (FR-027, FR-036): inscribir a la Persona sin acceso de la demo; la pantalla
    dice "Estás anotando a …" durante toda la acción. Registrarle un pago en efectivo sin
    comprobante: queda verificado por el Admin.
14. **Editar con inscriptos** (FR-014): bajar el cupo por debajo de los ocupados, apagar la lista
    con gente esperando, cambiar el costo con pagos: tres errores que explican qué hacer. Subir el
    cupo en 1 con lista: pasa la primera (FR-018).
15. **Cancelar, reactivar, eliminar** (FR-040 a FR-042): cancelar un Evento con inscriptos (el
    diálogo dice cuántos); su página dice "Cancelado"; reactivarlo. Eliminar uno sin inscripciones,
    verlo en la papelera y restaurarlo; en uno con inscripciones, "Eliminar" está deshabilitado y
    explica por qué.
16. **Bautismo** (FR-045 a FR-048): crear un Evento tipo "Bautismo": los campos de costo, lista y
    aprobación no aparecen. Su página pública no tiene "Anotarme" y enlaza a Mi camino. Inscribir a
    una Persona desde el backoffice: la Persona lo ve en Mis eventos como confirmado.
    `POST /eventos/{id}/inscripciones/me` → 403 `EVENTO_SOLO_INSCRIBE_ADMIN`.
17. **Pastor** (FR-009): con la sesión del Pastor, Eventos y su detalle sin ningún botón de
    acción; "Ver comprobante" no aparece (Assumption).
18. **Celular** (D150, research #16): a 360 px, `/eventos/{slug}`, `/mis-eventos` y "Subir
    comprobante": sin scroll horizontal, botones de 44 px, etiquetas de 16 px, la acción principal
    arriba.
19. **Accesibilidad** (SC-006): axe en claro y oscuro sobre la página del Evento, Mis eventos y el
    detalle del backoffice; el subir comprobante se completa solo con teclado.
