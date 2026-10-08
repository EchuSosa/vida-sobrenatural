'use client';

import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { ApiError, apiFetch, type BusquedaPersona, type Franja } from '@vida-sobrenatural/shared-types';
import { PedirEnNombreDe as PedirEnNombreDeUi, type EtiquetasEditorFranjas, type PersonaElegible } from '@vida-sobrenatural/ui';

/**
 * spec 006, T018: "Pedir Vida Nueva en nombre de…" vive en `packages/ui`
 * (lo comparten el Admin y el Discipulador, Principio XI). Esto es solo el
 * pegamento del backoffice: sus textos (`solicitudes.pedirEnNombre`) y las
 * llamadas a la API con el token de la sesión. Misma firma que antes, así la
 * bandeja de Solicitudes no cambia.
 */
export function PedirEnNombreDe({
  apiToken,
  persona,
  onCreado,
}: {
  apiToken: string;
  persona?: PersonaElegible;
  onCreado?: (solicitudId: string) => void;
}) {
  const t = useTranslations('solicitudes.pedirEnNombre');
  const tc = useTranslations('comun');
  const tf = useTranslations('franjas');
  const te = useTranslations('errors');
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${apiToken}` };

  const franjas: EtiquetasEditorFranjas = {
    dias: tf.raw('dias') as EtiquetasEditorFranjas['dias'],
    dia: tf('dia'),
    desde: tf('desde'),
    hasta: tf('hasta'),
    hora: tf('hora'),
    minutos: tf('minutos'),
    agregar: tf('agregar'),
    quitar: tf('quitar'),
    sinFranjas: tf('sinFranjas'),
    errorRango: tf('errorRango'),
    errorMuyCorta: te('campos.FRANJA_MUY_CORTA'),
    errorRepetida: te('campos.FRANJA_REPETIDA'),
    errorSuperpuesta: te('campos.FRANJA_SUPERPUESTA'),
    separador: tf('separador'),
  };

  return (
    <PedirEnNombreDeUi
      etiquetas={{
        boton: t('boton'),
        titulo: t('titulo'),
        tituloCon: (nombre) => t('tituloCon', { nombre }),
        descripcion: t('descripcion'),
        buscar: t('buscar'),
        buscarAyuda: t('buscarAyuda'),
        buscarPlaceholder: t('buscarPlaceholder'),
        sinResultados: (q) => t('sinResultados', { q }),
        enNombreDe: (nombre) => t('enNombreDe', { nombre }),
        cambiar: t('cambiar'),
        franjasTitulo: t('franjasTitulo'),
        personaRequerida: t('personaRequerida'),
        franjasRequeridas: t('franjasRequeridas'),
        resumenErrores: t('resumenErrores'),
        pedir: t('pedir'),
        pidiendo: t('pidiendo'),
        cerrarPanel: tc('cerrarPanel'),
        edad: (edad) => t('edad', { edad }),
        franjas,
      }}
      buscar={(q) => apiFetch<BusquedaPersona[]>(`/personas/buscar?q=${encodeURIComponent(q)}`, { headers })}
      enviar={(personaId, f: Franja[]) =>
        apiFetch<{ id: string }>('/discipulado/solicitudes', { method: 'POST', headers, body: JSON.stringify({ personaId, franjas: f }) })
      }
      mensajeDeError={(error) => (error instanceof ApiError && te.has(error.code) ? te(error.code) : t('errores.generico'))}
      persona={persona}
      onCreado={(id, nombre) => {
        toast.success(t('creado', { nombre }));
        onCreado?.(id);
      }}
    />
  );
}
