import type { ComponentType } from 'react';
import { CalendarCheck, Droplets, HandHelping, History, Receipt, Sprout, Users } from 'lucide-react';
import type { TipoSolicitud } from '@vida-sobrenatural/shared-types';

/**
 * Bandeja unificada (D178, spec 013 `contracts/bandeja-api.md`, pasos 4 y 5).
 * Lote 0 global: los siete tipos ya están acá, así ninguna spec edita este
 * archivo para conectarse — cada una crea su pantalla de detalle en la ruta
 * de abajo (una carpeta propia bajo `app/solicitudes/`), y la 013 (lote 1)
 * usa este mapa en la bandeja. Los textos son `bandeja.tipos.<tipo>` y
 * `bandeja.estados.<tipo>.<estado>` del backoffice, también ya cargados.
 */
export const RUTA_DETALLE_SOLICITUD: { readonly [T in TipoSolicitud]: (id: string) => string } = {
  discipulado: (id) => `/solicitudes/${id}`, // 004, ya existe
  historial: (id) => `/solicitudes/historial/${id}`, // 006, lote B
  vida_de_servicio: (id) => `/solicitudes/vida-de-servicio/${id}`, // 008, lote A
  postulacion: (id) => `/solicitudes/postulacion/${id}`, // 009, lote B
  bautismo: (id) => `/solicitudes/bautismo/${id}`, // 010, lote B
  inscripcion_evento: (id) => `/solicitudes/inscripcion-evento/${id}`, // 011, lote D
  pago: (id) => `/solicitudes/pago/${id}`, // 011, lote D
};

/** Ícono decorativo de cada tipo: va siempre junto al texto del tipo (D81). */
export const ICONO_TIPO_SOLICITUD: { readonly [T in TipoSolicitud]: ComponentType<{ className?: string }> } = {
  discipulado: Sprout,
  historial: History,
  vida_de_servicio: HandHelping,
  postulacion: Users,
  bautismo: Droplets,
  inscripcion_evento: CalendarCheck,
  pago: Receipt,
};
