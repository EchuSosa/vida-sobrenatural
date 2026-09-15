# Alcance del MVP

## Dentro del alcance

**Información pública (sin login):**
- Bienvenida: institucional, próximos pasos tipo FAQ, cartelera de eventos, contacto.
- "En qué creemos": página institucional estática (declaración de fe/valores).
- Ministerios: listado público informativo.
- Ofrendas (versión estática): alias, CBU y datos de cuenta como contenido informativo — sin integración de pago real (Mercado Pago u otro servicio queda para Fase 2).

**Registro y perfil:**
- Registro con SSO, validación de edad y género, alta manual de menores (Flujo 2 y 7).
- Edición de perfil propio (datos de contacto, no fecha de nacimiento ni email) y gestión de Relaciones Familiares (Flujo 11).

**Discipulado (Vida Nueva):**
- Modalidad individual (1 a 1) y grupal (para personas que vienen de otra congregación) — ambas con registro de Encuentros, no contenido digital (Flujo 3).
- Solicitud de Discipulado in-app, asignación de Discipulador filtrada por disponibilidad (toggle manual + Bloqueos de Disponibilidad por fecha).
- Finalización en dos pasos (Discipulador propone, Admin confirma).

**Vida de Servicio:**
- Requiere haber completado Vida Nueva antes (individual o grupal) — el Admin puede destrabar esto con una Completitud Manual si corresponde una excepción.
- Inscripción por solicitud + aprobación del Admin, contenido semanal liberado por Líder de curso (Flujo 4).
- Asistencia con regla de 2 faltas (alerta, no baja automática), distinción entre `dada_de_baja` y `abandono`.
- Finalización en dos pasos → activa "Apto para Ministerio" automáticamente solo para quienes completaron.

**Ministerios:**
- Postulación in-app (con elección de Célula) para quien tenga el flag "Apto para Ministerio", revisada por el Admin (Flujo 5).

**Bautismo:**
- Solicitud de Bautismo in-app, revisada por el Admin (Flujo 6).

**Eventos:**
- Publicación con `cupo` opcional, `permite_lista_espera`, y `costo` opcional (para Campamentos y similares).
- Generación automática de código QR que lleva al formulario de inscripción.
- Inscripción con Pago (monto, medio de pago, comprobante adjunto, verificado por el Admin) cuando el Evento tiene costo.
- Cancelación de inscripción por la propia Persona **o por el Admin** (ej. si avisan por otro canal), con promoción automática desde lista de espera (Flujo 8).

**Notificaciones push** (requiere convertir la app en PWA):
- Manuales (Admin, a todos o a un segmento — Grupo o Ministerio específico).
- Automáticas: contenido nuevo liberado, Solicitud/Postulación resuelta (incluye promoción desde lista de espera), recordatorio de Evento próximo (a quien ya se inscribió), recordatorio de inscripción pendiente (a todos, configurable por Evento, para quien todavía no se anotó) (Flujo 10).

**Back office / Admin:**
- CRUD de catálogos (Sede, Curso, Ministerio, Célula) con soft delete (`activo`) y confirmación reforzada al desactivar registros con datos relacionados.
- Vista de perfil unificada por Persona (roles, historial de Inscripciones/Postulaciones/Solicitudes, Relaciones Familiares).
- Listado de cumpleaños del mes.
- Métricas básicas: cantidad de Personas activas, distribución por `tiempo_congregacion`, por Sede (el dashboard analítico completo queda en Fase 2).
- Un solo Admin por ahora, pensado para escalar a más roles después.

## Fuera de alcance (por ahora)

- No reemplaza el culto ni la comunicación presencial.
- No gestiona donaciones/diezmos de forma general — solo la sección estática de Ofrendas listada arriba (sin procesar pagos reales, salvo el caso puntual de Eventos con costo, que sí registra el pago).
- No controla asistencia general a cultos — solo la asistencia a Vida de Servicio, que sí está en el MVP.
- No es una app de mensajería (WhatsApp sigue existiendo en paralelo, ver `05-decisiones.md`).
- Escuelita y Grupos de Extensión quedan en Fase 2 (ver `08-roadmap-producto.md`).

## Identidad visual

Ver `09-notas-identidad-visual.md` para las referencias recopiladas (libro "Vida de Servicio", sitio web anterior, Instagram). Queda pendiente decidir, recién en la Sesión 6, entre el estilo editorial del libro, el estilo vibrante de Instagram, o un sistema propio — ninguna referencia se tomó todavía como decisión final.

---
*Sesión de origen: Sesión 1 (cerrado). Actualizado fuera de sesión formal a medida que se sumaron Eventos, Bautismo, Notificaciones, Vida Nueva Grupal, y mejoras de back office. Este documento refleja el estado más reciente del alcance MVP.*
