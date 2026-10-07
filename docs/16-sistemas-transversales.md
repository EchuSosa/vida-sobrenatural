# Sistemas Transversales: Notificaciones, Errores y Feedback

> Cómo se avisa, cómo se manejan los errores y cómo responde la interfaz a cada acción, en las tres apps. Decisiones: D96, D100, D101, D102. Complementa `13-requisitos-no-funcionales.md` y `15-guia-ux-ui.md`.

## 1. Sistema de notificaciones (D96, D100)

### Canales

| Canal | Para qué | Quién lo recibe |
|---|---|---|
| **Avisos (in-app)** | Historial completo de todo lo notificado, con estado leída/no leída | Toda Persona con acceso a la app |
| **Push** | Avisos inmediatos | Quien tenga una Suscripción a Notificación activa (en iPhone, solo con la app agregada a la pantalla de inicio) |
| **Email** | Solo avisos **importantes** | Toda Persona con email cargado — **incluso si no usa la app** (ej. alta hecha por el Admin, D97) |

### Qué es "importante" (va también por email)

- Resolución de una solicitud: Solicitud de Discipulado, inscripción a Vida de Servicio, Solicitud de Bautismo, Postulación a Ministerio, Inscripción a Evento pendiente (`solicitud_actualizada`).
- Promoción desde lista de espera a un Evento.
- Pago verificado o rechazado.
- Activación de una cuenta creada por el Admin/Discipulador (menor o adulto).
- Notificaciones manuales que el Admin marque explícitamente como importantes (opción al crearlas, con advertencia de usarla con moderación).

Todo lo demás (contenido liberado, recordatorios de eventos) va solo por push + Avisos.

Los emails importantes son transaccionales: no se pueden desactivar en el MVP. Las preferencias de canal por Persona quedan para Fase 2.

### Funcionamiento

1. Un disparador (acción del sistema o del Admin) crea la **Notificación** con su `prioridad` (`normal` / `importante`).
2. El `NotificacionService` resuelve los destinatarios según `alcance` + `alcance_id` (D72) y crea una **Entrega** por destinatario y canal.
3. Las entregas se envían en segundo plano (no bloquean la acción del usuario):
   - **Push:** a cada Suscripción activa. Si el servicio de push responde que la suscripción ya no existe (el usuario la revocó o desinstaló), la Suscripción se marca `activo = false`.
   - **Email:** vía `EmailService`. Si falla, se reintenta algunas veces con espera creciente; después queda `fallida` y se registra el error.
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

- Enlace en el pie de página (web), en Perfil (app) y en el menú de usuario (backoffice).
- Formulario corto: tipo (**problema** / **sugerencia**), texto, y opcionalmente permitir contacto. Se guarda automáticamente la página desde donde se envió, el navegador y el `requestId` más reciente (sin datos sensibles).
- Se guarda como **Comentario de la app** y se envía un email a la desarrolladora. El Admin los ve en el backoffice (sección de pendientes del Inicio).
- Disponible también sin login, con límite de envíos (rate limiting) para evitar spam.

---
*Creado fuera de sesión formal, antes de la Sesión 6.*
