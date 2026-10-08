'use client';

import type { ComponentType } from 'react';
import { useTranslations } from 'next-intl';
import { Ban, Circle, CircleCheck, CircleMinus, CircleX, Clock, Droplets, Hourglass, Send, Undo2 } from 'lucide-react';
import type { ExtraBandejaDiscipulado, SolicitudBandeja, SolicitudResumen, TipoSolicitud } from '@vida-sobrenatural/shared-types';
import { diasDesde } from './constantes';

/**
 * Ícono decorativo de cada estado, de todos los tipos (D81: va siempre junto
 * al texto). Un estado nuevo sin ícono acá cae en `Circle`, no rompe.
 */
const ICONO_ESTADO: Record<string, ComponentType<{ className?: string; 'aria-hidden'?: boolean }>> = {
  pendiente: Clock,
  pendiente_verificacion: Clock,
  propuesta: Send,
  aprobada: CircleCheck,
  confirmada: CircleCheck,
  verificado: CircleCheck,
  realizada: Droplets,
  rechazada: CircleX,
  rechazado: CircleX,
  retirada: Undo2,
  inactiva: CircleMinus,
  lista_espera: Hourglass,
  cancelada: Ban,
};

function TextoConIcono({ estado, children }: { estado: string; children: string }) {
  const Icono = ICONO_ESTADO[estado] ?? Circle;
  return (
    <span className="inline-flex items-start gap-1.5">
      <Icono aria-hidden className="mt-0.5 size-4 shrink-0" />
      <span>{children}</span>
    </span>
  );
}

/** El estado de una Solicitud de Discipulado (detalle de la 004): en `propuesta`, a quién y hace cuánto (FR-038). */
export function EstadoSolicitudTexto({ solicitud }: { solicitud: Pick<SolicitudResumen, 'estado' | 'propuestaVigente'> }) {
  const t = useTranslations('solicitudes.estados');
  const vigente = solicitud.propuestaVigente;
  return (
    <TextoConIcono estado={solicitud.estado}>
      {solicitud.estado === 'propuesta' && vigente
        ? t('propuesta', { nombre: `${vigente.discipulador.nombre} ${vigente.discipulador.apellido}`, dias: diasDesde(vigente.propuestaEn) })
        : t(solicitud.estado === 'propuesta' ? 'pendiente' : solicitud.estado)}
    </TextoConIcono>
  );
}

/**
 * El estado de una fila de la bandeja, traducido por tipo (FR-002, D84):
 * `bandeja.estados.<tipo>.<estado>`. Discipulado en `propuesta` sigue
 * diciendo "Propuesta a X, hace N días" (FR-008).
 */
export function EstadoBandeja({ solicitud }: { solicitud: Pick<SolicitudBandeja, 'tipo' | 'estado' | 'extra'> }) {
  const t = useTranslations('bandeja.estados');
  if (solicitud.tipo === 'discipulado') {
    const vigente = (solicitud.extra as ExtraBandejaDiscipulado | undefined)?.propuestaVigente ?? null;
    return <EstadoSolicitudTexto solicitud={{ estado: solicitud.estado as SolicitudResumen['estado'], propuestaVigente: vigente }} />;
  }
  const clave = `${solicitud.tipo}.${solicitud.estado}` as `${TipoSolicitud}.pendiente`;
  return <TextoConIcono estado={solicitud.estado}>{t.has(clave) ? t(clave) : solicitud.estado}</TextoConIcono>;
}
