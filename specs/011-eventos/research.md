# Research — 011 Eventos

Fase 0 de `/speckit-plan`. Cada decisión: qué se eligió, por qué, y qué se descartó. No quedan
`NEEDS CLARIFICATION` técnicos; las dudas de producto están en `spec.md` → Preguntas para Echu.

## 1. El cupo se garantiza con un bloqueo de la fila del Evento

**Decisión**: toda operación que crea una Inscripción a Evento o cambia su estado de/a uno que
ocupa lugar (`confirmada`, `pendiente`) corre en una transacción interactiva de Prisma que empieza
con `SELECT id FROM eventos WHERE id = $1 FOR UPDATE`. Dentro de ese bloqueo se cuentan los
ocupados, se decide el estado y se promueve desde la lista (research #3). Mismo patrón que D137
(bloquear la fila de la Persona para serializar Liderazgos).

**Por qué**: el caso real es el QR en el culto: muchas personas tocando "Anotarme" en el mismo
minuto. Sin serializar, dos transacciones cuentan 9 de 10 y las dos confirman. Un `CHECK` no puede
contar filas de otra tabla, y un nivel `SERIALIZABLE` global obliga a reintentos en toda la app.

**Descartado**: contador `ocupados` en `Evento` con `UPDATE … WHERE ocupados < cupo` (rápido, pero
es estado derivado que hay que mantener en cinco transiciones y en la promoción, con riesgo de
desincronizarse — mismo motivo que D137 para no guardar un contador); `SERIALIZABLE` (reintentos).

## 2. Un índice único parcial impide dos Inscripciones abiertas

**Decisión**: `CREATE UNIQUE INDEX inscripciones_evento_una_abierta ON inscripciones_evento
("personaId", "eventoId") WHERE estado IN ('confirmada','pendiente','lista_espera')`, en SQL dentro
de la migración (patrón H-140). La API traduce la violación a `INSCRIPCION_EVENTO_YA_ABIERTA`.
Igual para Pago: `pagos_uno_pendiente_por_inscripcion … WHERE estado = 'pendiente_verificacion'`.

**Por qué**: la regla de no duplicados (D60) tiene que valer aunque dos pedidos lleguen a la vez
(doble toque en el celular); `useEnvio` evita la mayoría, la base garantiza el resto.

## 3. Lista de espera: orden por `enListaDesde`, promoción dentro de la misma transacción

**Decisión**: `InscripcionEvento.enListaDesde DateTime?` se completa al entrar a `lista_espera`; el
orden es `(enListaDesde, id)`. La posición que ve la Persona se calcula (cuántas están antes), no se
guarda. Una función `promoverDesdeLista(tx, eventoId)` — la **única** — se llama al final de toda
transacción que libera lugar (cancelar, rechazar inscripción, rechazar pago, editar cupo): mientras
haya lugar y el Evento no haya empezado ni esté cancelado, toma la primera y la pasa a `confirmada`
o `pendiente` (según `requiereAprobacion`), con `promovidaEn = now()`, y acumula un suceso
`inscripcion_promovida` por cada una para emitir después del commit.

**Por qué**: Principio XI (una sola implementación de la promoción, que usan seis caminos) y SC-004
(cero lugares libres con lista no vacía). Guardar la posición obligaría a renumerar en cada salida.

## 4. Estado de pago derivado, no guardado

**Decisión**: `estadoPago(inscripcion, pagos, evento)` → `no_aplica | sin_pago |
pendiente_verificacion | verificado`, más `ultimoRechazo` si hubo, en `packages/shared-types`
(lo usan la API para filtrar y las dos apps para mostrar). La API lo calcula con un `select` de los
Pagos de la Inscripción.

**Por qué**: es una función de datos que ya existen; guardarlo duplicaría el estado de Pago.

## 5. Rechazar un Pago cancela la Inscripción con motivo propio

**Decisión**: en la misma transacción (con el bloqueo de #1): `Pago.estado = rechazado` con
`motivoRechazo`; `InscripcionEvento.estado = cancelada`, `motivoCancelacion = pago_rechazado`,
`canceladaPorId = admin`; luego `promoverDesdeLista`. Sucesos: `pago_rechazado` (a la Persona) y,
si corresponde, `inscripcion_promovida`.

**Por qué**: es literal D148 ("si lo rechaza, se libera el lugar"). `cancelada` con motivo, y no
`rechazada`, porque `rechazada` en `docs/04` es la respuesta del Admin a una inscripción que
requiere aprobación; mezclar los dos haría que "Rechazada" diga dos cosas distintas en pantalla.

**Descartado**: un estado nuevo `pago_rechazado` en la Inscripción (agrega un estado al enum de
`docs/04` para algo que es un motivo, no un estado del ciclo).

## 6. Almacenamiento: áreas públicas y privadas detrás del mismo `StorageService`

**Decisión**: `StorageService.subir` recibe un `area: 'portadas' | 'flyers' | 'comprobantes'`; se
agrega `leer(area, ruta): Promise<{ stream, mimeType }>`. `LocalStorageProvider` mapea cada área a
una carpeta bajo `STORAGE_DIR` (`portadas/` conserva su ruta actual, sin migrar archivos); solo
`portadas/` y `flyers/` se sirven como estáticos en `main.ts` (`/archivos/flyers/`). `comprobantes/`
**nunca** se monta como estático: se lee por `GET /pagos/:id/comprobante`, que valida dueño o
permiso `pagos.verificar` en cada pedido y responde con `Content-Disposition: inline`,
`Cache-Control: private, no-store` y `X-Content-Type-Options: nosniff`. En S3 esto es un bucket
privado + URL firmada corta (`docs/13`); la interfaz ya lo permite.

**Por qué**: D110 y `docs/13` ya fijaron la abstracción y la regla (público = flyers/portadas,
privado = comprobantes); el comentario de `storage.service.ts` deja el `descargar` para "el día que
un comprobante lo necesite": es hoy.

**Validación del comprobante**: JPG/PNG/WebP/PDF hasta 5 MB, tipo detectado por los primeros bytes
(firma del archivo) y no por la extensión ni el `Content-Type` del cliente; las imágenes se
re-codifican con `sharp` (descarta metadatos EXIF, incluida la ubicación); los PDF se guardan tal
cual. Constantes (`MIME_TIPOS_COMPROBANTE_PERMITIDOS`, `COMPROBANTE_TAMANO_MAXIMO_BYTES`) en
`packages/shared-types` para que el `accept` del input y la API no diverjan.

## 7. El flyer reutiliza el procesamiento de imágenes de las portadas

**Decisión**: se generaliza `ImagenPortadaService` en `ImagenPublicaService.procesar(buffer,
{ anchoMaximo, altoMaximo, ladoCortoMinimo })` con `fit: 'inside'` (sin recorte, D110 enmendada) y
`withoutEnlargement`; portadas sigue con sus valores actuales y flyers usan 1080×1350 máximo
(formato de flyer de Instagram, 4:5) con lado corto mínimo 600. Los tests de portadas existentes
tienen que seguir verdes sin cambios.

**Por qué**: Principio XI; los flyers vienen de Instagram (1:1, 4:5, 9:16) y recortarlos se come
texto, mismo problema que tuvo D110.

## 8. QR generado al vuelo, sin guardarlo

**Decisión**: dependencia nueva `qrcode` (MIT, sin binarios nativos) en `apps/backoffice`. El
detalle del Evento genera el SVG en el servidor a partir de `${WEB_PUBLIC_URL}/eventos/${slug}`
(D85) y ofrece "Descargar QR" como PNG de 1024 px (para proyectar o imprimir) y "Copiar link". No
se guarda en la base ni en el almacenamiento: el slug no cambia (#9), así que el QR es siempre el
mismo.

**Por qué**: costo mínimo y nada que mantener sincronizado. El QR lleva a la página pública (no a
un formulario aparte), que es lo que pide el Flujo 8 paso 3.

## 9. `slug` fijo, generado una vez

**Decisión**: `slugDeEvento(nombre)` en la API: NFD sin diacríticos, minúsculas, `[^a-z0-9]+ → -`,
recorte a 60 caracteres; si existe (incluidos eliminados), sufijo `-2`, `-3`… Se calcula al crear y
**no** se recalcula al editar. Columna `@unique`.

**Por qué**: los QR se imprimen y los links se comparten por WhatsApp; cambiar el slug los rompe.

## 10. Páginas públicas con ISR y el estado propio en el cliente

**Decisión**: `/eventos` y `/eventos/[slug]` son Server Components con `export const revalidate =
60` y `dynamicParams = true`; la API expone `GET /eventos/publicos` y `GET /eventos/publicos/:slug`
(sin sesión, con límite de pedidos: hoy la API no tiene `@nestjs/throttler`; si la 007 lo agrega para el código por email se reutiliza, si no se agrega acá para los endpoints públicos y las subidas, como pide `docs/13`). La parte que depende de quién mira — "Ya estás anotada",
el botón "Anotarme" y los lugares en vivo — es una isla cliente (`AccionInscripcion`) que consulta
`GET /eventos/:id/mi-inscripcion` con la sesión. `generateMetadata` arma título, descripción y Open
Graph; un `<script type="application/ld+json">` con `Event` (`eventStatus`
`EventCancelled`/`EventScheduled`, `location`, `offers` si hay costo). `sitemap.ts` suma los
Eventos publicados no eliminados.

**Por qué**: `docs/13` pide ISR para Eventos; 60 s es aceptable para la información del Evento, y
la disponibilidad real la decide la API al anotarse (FR-016), no la página.

**Descartado**: revalidación on-demand disparada desde la API (acopla la API a la web y agrega un
secreto más para ganar menos de un minuto).

## 11. Volver al Evento después de ingresar

**Decisión**: el botón "Anotarme" sin sesión lleva a la pantalla de ingreso con
`?destino=/eventos/{slug}?anotarme=1`. `destinoSeguro(valor)` en `packages/shared-types` acepta solo
rutas que empiezan con una sola `/`, sin `//`, sin `\`, sin esquema, y cae a `/inicio` si no. El
`callbackUrl` del proveedor apunta a `/ingresar?destino=…`; `IngresarPage` redirige a `destino` si
la Persona está `activa`; si va al registro, el `destino` viaja en la URL de los pasos y
`/registro/listo` ofrece "Seguir con la inscripción". Con `?anotarme=1`, la isla abre el paso de
confirmación (no inscribe sola: la Persona confirma).

**Por qué**: Flujo 8 paso 3 y SC-001. Validar el destino evita un redirect abierto.

**Coordinación**: la spec 007 rehace la pantalla de ingreso (código por email + Google). El
`destino` tiene que sobrevivir a los dos caminos; se anota en el plan como punto de coordinación
con la 007.

## 12. La bandeja de Solicitudes pasa a tener "fuentes" por tipo

**Decisión**: se extrae `GET /solicitudes` del controller de Discipulado a un
`BandejaSolicitudesService` que combina **fuentes**, una por tipo, cada una con
`contar(filtros)` y `listar(filtros, orden, limite)` sobre su propia tabla. Con un tipo filtrado,
pagina directo sobre esa fuente; con "Todos", pide a cada fuente las primeras `skip + take` filas
en el mismo orden, las mezcla y corta — correcto para cualquier página (no filtra en memoria una
página parcial, `docs/15` §Listados paginados) y barato a esta escala (decenas de pendientes). Esta
spec agrega las fuentes `inscripcion_evento` (las `pendiente`) y `pago` (los
`pendiente_verificacion`), y `TipoSolicitud` suma esos dos valores. La resolución sigue siendo
específica por tipo (clarificación de la 004).

**Por qué**: la bandeja unificada es de `docs/14`; la 004 dejó la estructura del filtro por tipo
lista "para cuando haya un segundo tipo".

**Coordinación**: la spec 010 (Bautismo) también agrega un tipo. Si mergea antes con otra forma de
extender la bandeja, esta spec se adapta a la suya en vez de imponer otra (Principio XI).

## 13. Costura de avisos: `SucesoEvento`, igual que `EventoDiscipulado`

**Decisión**: tipo `SucesoEvento` en `packages/shared-types/src/sucesos-evento.ts` y
`SucesosEventoService.emitir()` en la API, que hoy loguea `nombre`, tipo de destinatario e ids
(nunca nombres ni montos) — mismo patrón que `EventoDiscipulado` (004, `contracts/eventos.md`).
Cada servicio acumula los sucesos durante la transacción y los emite **después** del commit. La
lista está en `contracts/eventos-dominio.md`. Se llama "suceso" para no chocar con la palabra
Evento del dominio.

**Por qué**: la 012 construye el `NotificacionService` en paralelo; dejar una costura con nombre y
forma estables es lo que le permite conectarse sin tocar esta lógica.

## 14. Persona `activa` y sin rol: inscribirse no pide permiso del catálogo

**Decisión**: los endpoints de la propia Persona (`POST /eventos/:id/inscripciones/me`,
`/mis-inscripciones-evento`, cancelar la propia, subir su pago, ver su comprobante) exigen sesión
con Persona `activa` y se autorizan **por registro** (la Inscripción es suya), sin permiso de
`CATALOGO_PERMISOS` — igual que `discipulado/solicitudes/me`. Las acciones del Admin usan permisos
nuevos: `eventos.gestionar`, `eventos.papelera.ver`, `inscripciones_evento.gestionar`,
`pagos.verificar` (todos `['admin']`). `eventos.ver` (Admin, Pastor) ya existe.

## 15. Fechas en la zona de la iglesia

**Decisión**: `inicio` y `fin` son `timestamptz`. El formulario del backoffice carga fecha + hora
locales (`CampoFecha` + `CampoHora` de `packages/ui`) y se convierten a instante en
`America/Argentina/Buenos_Aires` con una función de `shared-types` (`instanteEnArgentina(fecha,
hora)`) en `formato.ts`, junto a la `diaCivilEnArgentina()` existente. "Ya empezó" = `now() >= inicio`. Se muestra
siempre en esa zona.

**Por qué**: una sola implementación de la zona (Principio XI, research #7 de la 004).

## 16. Celular en los e2e de `apps/web`

**Decisión**: `apps/web/playwright.config.ts` suma un proyecto `celular` (`devices['Pixel 7']`,
`grep: /@celular/`), como ya tiene el backoffice. Los e2e de anotarse, Mis eventos y subir
comprobante llevan `@celular`. Los tamaños de D150 (16 px en etiquetas y ayudas, `Button` de 44 px
en `apps/web`) se verifican en esas pantallas; si la tarea que implementa D150 no llegó a `main`,
esta spec no la hace: la nombra como dependencia y usa el `Button` que haya.

## 17. Seed

**Decisión**: `db:seed` no agrega nada (los Eventos no son mínimos para arrancar).
`db:seed-demo` (D120) agrega: un Evento informativo, uno con cupo lleno y lista de espera (D99),
un campamento con costo y Pagos en los tres estados, uno con aprobación con pendientes, uno
cancelado, uno pasado, uno eliminado, uno de bautismo con dos Personas, y datos hostiles (nombre de
Evento de 120 caracteres, descripción larga con saltos, flyer apaisado y uno 9:16, lugar de dos
renglones, costo con centavos). Los e2e usan fixtures `e2e-` propios.
