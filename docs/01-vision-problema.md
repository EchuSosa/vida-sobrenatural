# Visión y Problema

## Visión

Construir una aplicación web (responsive: celular, tablet, PC) que resuelva un problema real vivido por un miembro nuevo de la iglesia: la información necesaria para integrarse (quiénes son, cómo contactarlos, en qué proceso avanzar) está fragmentada entre el culto presencial, un banner en la entrada, Instagram y grupos de WhatsApp. Esto genera que personas tímidas o ausentes en un domingo puntual se pierdan pasos clave de su propio proceso de integración.

La app se presenta como una ofrenda/aporte a la iglesia, no como un producto comercial. Objetivo: mostrarle a los pastores un problema concreto y real, resuelto con una solución concreta y real.

## Problem Statement

> **Definición:** La iglesia comunica información crítica para la integración de una persona (qué es la iglesia, cómo contactarse, cursos disponibles, requisitos para el bautismo, cronograma de actividades) principalmente a través de canales informales y dependientes de terceros — anuncios presenciales, WhatsApp uno a uno con una persona administrativa, Instagram — en lugar de un canal público, autónomo y siempre disponible. Esto genera dos síntomas de un mismo problema: (a) quienes no se animan a exponerse socialmente (levantar la mano, acercarse a preguntar) quedan sin acceso a la información inicial; y (b) incluso quienes sí logran contactarse dependen de preguntar activamente lo correcto para enterarse de cada paso siguiente, en vez de que esa información esté disponible de forma proactiva.

**No es un problema de falta de proceso** — la iglesia ya tiene un proceso claro (Bienvenida → Vida Nueva/Discipulado → Vida de Servicio → Ministerio). El problema es que ese proceso vive en canales frágiles y depende de la iniciativa de la persona nueva, en vez de estar disponible de forma centralizada y progresiva.

**Naturaleza de este problem statement:** es una **hipótesis basada en experiencia personal del autor**, no un problema validado formalmente con la administración de la iglesia ni con los pastores. La estrategia deliberada es construir primero un prototipo/MVP funcional y presentarlo después, en vez de validar antes de construir (ver `05-decisiones.md`).

**Criterio de éxito:** una persona puede obtener información clave (ej: cómo bautizarse, próximos eventos, contacto, ministerios disponibles) de forma inmediata y autónoma, sin depender de que alguien responda un mensaje de WhatsApp — incluyendo fines de semana o fuera de horario administrativo.

## Proceso real de integración (relevado de la experiencia del usuario)

1. **Visitante llega por primera vez** → se pregunta en el culto si hay visitantes → la persona debe levantar la mano o acercarse a una mesa de bienvenida (barrera: vergüenza).
2. **Consigue el contacto de la iglesia** (ej. WhatsApp) por su cuenta.
3. **Se le asigna un discipulador** → cursa **Vida Nueva** (1 a 1, con el libro "Vida Nueva", un capítulo por semana).
4. **Se bautiza** (evento comunicado, históricamente, por WhatsApp).
5. **Cursa Vida de Servicio** (grupal, 9 domingos, con guía semanal enviada los miércoles vía WhatsApp por líderes de curso).
6. **Se integra a un Ministerio** (ej: Vida en Acción — comedor; Bienvenida — recepción y orden en la iglesia). Hay múltiples ministerios, con líderes propios.
7. Además, existen eventos puntuales (jornadas de sanidad, conferencias, encuentros por edad/género) comunicados igual de forma dispersa (culto + Instagram).

---
*Sesión de origen: Sesión 1 (cerrada).*
