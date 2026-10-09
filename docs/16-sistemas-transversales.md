# Sistemas Transversales: Notificaciones, Errores y Feedback

> Cómo se avisa, cómo se manejan los errores y cómo responde la interfaz a cada acción, en las tres apps. Decisiones: D96, D100, D101, D102. Complementa `13-requisitos-no-funcionales.md` y `15-guia-ux-ui.md`.

## 1. Sistema de notificaciones (D96, D100)

### Canales

| Canal | Para qué | Quién lo recibe |
|---|---|---|
| **Avisos (in-app)** | Historial completo de todo lo notificado, con estado leída/no leída | Toda Persona destinataria, **tenga o no acceso a la app hoy** (lo ve el día que entre, D200) |
| **Push** *(tanda siguiente, D149)* | Avisos inmediatos | Quien tenga una Suscripción a Notificación activa (en iPhone, solo con la app agregada a la pantalla de inicio) |
| **Email** | Solo avisos **importantes** | Toda Persona con email cargado — **incluso si no usa la app** (ej. alta hecha por el Admin, D97) |

### Qué es "importante" (va también por email)

- Resolución de una solicitud: Solicitud de Discipulado, inscripción a Vida de Servicio, Solicitud de Bautismo, Postulación a Ministerio, Inscripción a Evento pendiente (`solicitud_actualizada`).
- Promoción desde lista de espera a un Evento.
- Pago verificado o rechazado.
- Activación de una cuenta creada por el Admin (menor o adulto).
- Una propuesta de discipulado nuevo para el Discipulador (D201).
- La cancelación de un Evento, para sus inscriptos (D193).
- Grupos de Extensión (D228): el pedido nuevo para cada líder del Grupo, y la aceptación, el "no es para este grupo" o el alta directa por el Admin para la persona.
- Notificaciones manuales que el Admin marque explícitamente como importantes (opción al crearlas, con advertencia de usarla con moderación).

Todo lo demás (contenido liberado, recordatorios de eventos, cambios del proceso como una finalización confirmada — disparador `proceso_actualizado`, D199 —, cambios de fecha o lugar de un Evento) va solo por Avisos (y push cuando exista). **Los eventos dirigidos al Admin no generan avisos en esta tanda**: el Admin los ve en Pendientes del backoffice (D201). La lista completa de avisos automáticos es un catálogo único en el código (`CATALOGO_AVISOS`, `packages/shared-types/src/avisos.ts`, D198).

Los emails importantes son transaccionales: no se pueden desactivar en el MVP. Las preferencias de canal por Persona quedan para Fase 2.

### Funcionamiento

1. Un disparador (acción del sistema o del Admin) crea la **Notificación** con su `prioridad` (`normal` / `importante`). Las automáticas se crean con `NotificacionesService.emitir(tx, evento)` **dentro de la misma transacción** que el cambio de dominio: si el cambio se deshace, el aviso también (D197). Guardan el nombre del evento del catálogo y sus parámetros (solo ids y datos no personales), no el texto (D198).
2. El `NotificacionesService` resuelve los destinatarios según `alcance` + `alcance_id` (D72) y crea una **Entrega** por destinatario y canal.
3. Las entregas se envían en segundo plano (no bloquean la acción del usuario):
   - **Push:** a cada Suscripción activa. Si el servicio de push responde que la suscripción ya no existe (el usuario la revocó o desinstaló), la Suscripción se marca `activo = false`.
   - **Email:** vía `EmailService`, por un proceso aparte (`SKIP LOCKED`, sin duplicar). Si falla, se reintenta hasta 5 veces (1 min, 10 min, 1 h, 6 h); después queda `fallida` con el **tipo** de error (nunca el texto del servidor) y el Admin la ve en Notificaciones, con el nombre de la Persona, para avisarle por otro medio (D204).
   - **Avisos:** siempre queda registrada; se marca `leida_en` cuando la Persona la abre.
4. El texto se arma en el `idioma_preferido` del destinatario (D84) y **nunca incluye datos sensibles** en push ni en el asunto del email (ej. "Hay novedades sobre tu solicitud"; el detalle se ve dentro de la app o en el cuerpo del email).

### Email

- `EmailService` detrás de una interfaz simple (igual que `StorageService`), para poder cambiar de proveedor sin tocar la lógica.
- Proveedor transaccional con plan gratuito, conectado por SMTP; la elección se pospone con el hosting y el dominio, candidato preferido Resend (D140).
- Plantillas en español, con el logo, texto claro y un único botón que lleva a la app. Versión de texto plano incluida.
- Remitente del dominio de la iglesia cuando exista (D85), con SPF/DKIM configurados para no caer en spam.
- En desarrollo local, los emails se capturan con Mailpit (no se envían de verdad).

## 2. Sistema de errores (D101)

### Formato único en la API

Todos los errores de `apps/api` siguen **Problem Details (RFC 9457)**, con un código propio:

```json
{
  "type": "https://<dominio>/errores/cupo-lleno",
  "title": "Cupo completo",
  "status": 409,
  "code": "CUPO_LLENO",
  "detail": "El evento no tiene lugares disponibles.",
  "requestId": "a1b2c3",
  "errors": [{ "campo": "telefono", "code": "TELEFONO_INVALIDO" }]
}
```

- `code`: identificador estable que el frontend traduce (D84). `title`/`detail` son solo para desarrolladores.
- `errors`: lista por campo, solo para errores de validación (`VALIDACION`).
- `requestId`: identificador de la petición, también presente en los logs y en Sentry.

### Catálogo de códigos

- Los códigos viven en `packages/shared-types` (un enum compartido por las tres apps) y cada uno tiene su mensaje amable en los archivos de `next-intl`.
- Ejemplos: `NO_AUTENTICADO`, `SIN_PERMISO`, `NO_ENCONTRADO`, `VALIDACION`, `CUPO_LLENO`, `SOLICITUD_PENDIENTE_EXISTENTE` (D60), `PRERREQUISITO_NO_CUMPLIDO` (D74), `ARCHIVO_INVALIDO`, `VERIFICACION_LOGIN_FALLIDA` (D88), `ERROR_INTERNO`.
- Cada spec que agregue una regla de negocio agrega su código al catálogo.

### Manejo

- **API (NestJS):** un filtro global de excepciones convierte todo error (de negocio, de validación de `class-validator`, de Prisma o inesperado) al formato anterior. Los errores inesperados devuelven `ERROR_INTERNO` sin detalles técnicos.
- **Frontends (Next.js):**
  - `error.tsx` / `global-error.tsx` para errores inesperados, `not-found.tsx` para 404, página sin conexión en la PWA (ver `15`).
  - El cliente de API traduce `code` → mensaje; los errores `VALIDACION` se muestran junto a cada campo.
  - Ante `ERROR_INTERNO`, el mensaje incluye un **código de referencia** (`requestId`) para poder buscar el problema si la persona lo reporta.
- **Logs:** estructurados (JSON) en la API, con `requestId`, sin datos personales sensibles.

### Monitoreo: Sentry (D101)

- **Qué es:** un servicio que captura automáticamente los errores de la app (backend y frontend) y los agrupa, con el contexto necesario para reproducirlos (qué pantalla, qué navegador, qué pasó antes). Avisa por email cuando aparece un error nuevo. Es el estándar de la industria y tiene plan gratuito para proyectos chicos.
- **Integración:** SDK oficial para Next.js (`apps/web`, `apps/backoffice`) y para NestJS (`apps/api`), con source maps para ver el código original.
- **Privacidad (obligatorio, D5):** sin envío de datos personales (`sendDefaultPii: false`), filtro que elimina emails, teléfonos, direcciones y cuerpos de formularios antes de enviar, sin grabación de sesiones. Solo se identifica al usuario por su ID interno.
- **Entornos:** desactivado en local; activo en staging/producción con la etiqueta del entorno.
- **Uso en la demo:** permite enterarse de un error antes (o durante) la presentación sin depender de que alguien lo reporte.

## 3. Feedback de acciones (D102)

### Qué respuesta visual lleva cada acción

| Situación | Feedback | Ejemplo |
|---|---|---|
| Error en un campo | Mensaje debajo del campo (+ resumen arriba al enviar) | "Ingresá un teléfono con código de área" |
| Acción en curso | Botón en estado de carga y bloqueado | "Enviando…" |
| Guardar un cambio simple | Toast breve + el cambio visible en pantalla | Editar teléfono en Perfil |
| Enviar una solicitud | Pantalla o bloque de confirmación con "qué pasa después" | "Recibimos tu solicitud de bautismo…" |
| Acción destructiva | Diálogo de confirmación → toast con "Deshacer" cuando sea posible | Cancelar inscripción |
| Acción del Admin sobre otra persona | Toast + cambio de estado visible en la lista/bandeja | Aprobar postulación |
| Acción en lote | Resumen del resultado ("5 aprobadas, 1 no se pudo") | Aprobar varias inscripciones |
| Error del servidor | Mensaje con "Reintentar" y código de referencia | Falla de conexión |
| Sin conexión | Aviso persistente arriba + acciones deshabilitadas | PWA offline |

Reglas generales (detalle en `15-guia-ux-ui.md`): nunca depender solo del toast para información importante; toasts con `aria-live`; mismo patrón en web y backoffice.

### "Contanos qué te parece"

Concreto (D211, spec 013): página pública `/contanos` (con `noindex`), enlace en el pie, en Perfil y en el menú de usuario del backoffice. Límite por origen: **5 por hora sin sesión** (por huella HMAC de la IP — nunca la IP en claro, el mismo mecanismo de la 007) y **20 por hora con sesión** (por Persona); el sexto responde `DEMASIADOS_PEDIDOS` con cuándo reintentar. El email a la desarrolladora va a una dirección configurable (`EMAIL_COMENTARIOS_DESTINO`) y si falla el comentario igual se guarda.

- Enlace en el pie de página (web), en Perfil (app) y en el menú de usuario (backoffice).
- Formulario corto: tipo (**problema** / **sugerencia**), texto, y opcionalmente permitir contacto. Se guarda automáticamente la página desde donde se envió, el navegador y el `requestId` más reciente (sin datos sensibles).
- Se guarda como **Comentario de la app** y se envía un email a la desarrolladora. El Admin los ve en el backoffice (sección de pendientes del Inicio).
- Disponible también sin login, con límite de envíos (rate limiting) para evitar spam.

---
*Creado fuera de sesión formal, antes de la Sesión 6.*
