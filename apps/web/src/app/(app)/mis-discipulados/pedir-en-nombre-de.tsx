'use client';

import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { ApiError, apiFetch, type BusquedaPersona } from '@vida-sobrenatural/shared-types';
import { PedirEnNombreDe as PedirEnNombreDeUi, type EtiquetasEditorFranjas } from '@vida-sobrenatural/ui';

/**
 * spec 006, T069 (FR-020, FR-026, FR-029, D143): "Pedir Vida Nueva en nombre
 * de…" del Discipulador en la web app — la pieza de `packages/ui` con los
 * textos de `misDiscipulados.pedirEnNombre` y las llamadas con el token de la
 * sesión. La búsqueda solo trae Personas sin acceso a la app (Pregunta 5); si
 * no la encuentra, el texto remite al equipo (sin alta). Los rechazos de la
 * API (pedido abierto, en curso, "Ya lo hice" en revisión…) se muestran arriba
 * del formulario con el porqué.
 */
export function PedirEnNombreDe({ apiToken, onCreado }: { apiToken: string; onCreado?: () => void }) {
  const t = useTranslations('misDiscipulados.pedirEnNombre');
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
      enviar={(personaId, f) => apiFetch<{ id: string }>('/discipulado/solicitudes', { method: 'POST', headers, body: JSON.stringify({ personaId, franjas: f }) })}
      mensajeDeError={(error) => (error instanceof ApiError && te.has(error.code) ? te(error.code) : t('errorGenerico'))}
      onCreado={() => {
        toast.success(t('creado'));
        onCreado?.();
      }}
    />
  );
}
