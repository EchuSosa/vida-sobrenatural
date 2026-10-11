'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { ArrowRightLeft, UserPlus } from 'lucide-react';
import { ApiError, apiFetch, type CelulaCatalogo, type DetalleDecisionMembresia } from '@vida-sobrenatural/shared-types';
import { AvisoEstado, Button } from '@vida-sobrenatural/ui';
import { BuscarPersonaGex, type PersonaElegibleGex } from '../../grupos-extension/buscar-persona';

/**
 * spec 015 (D243): la primera carga de los equipos — el Admin agrega a quien
 * ya sirve en este Ministerio, sin postulación. Elige el área (si el
 * Ministerio tiene) y busca a la persona. Si ya sirve en otro ministerio, la
 * API pide decidir (D241): sumarlo (si queda lugar) o reemplazar uno.
 */
export function AgregarMiembro({ ministerioId, ministerio, celulas, apiToken }: { ministerioId: string; ministerio: string; celulas: CelulaCatalogo[]; apiToken: string }) {
  const t = useTranslations('ministerios.agregarMiembro');
  const te = useTranslations('errors');
  const router = useRouter();
  const activas = celulas.filter((c) => c.activo);
  const [celulaId, setCelulaId] = useState(activas[0]?.id ?? '');
  const [decidir, setDecidir] = useState<{ persona: PersonaElegibleGex; detalle: DetalleDecisionMembresia } | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function agregar(persona: PersonaElegibleGex, decision: { sumar?: boolean; reemplazaId?: string } = {}) {
    if (enviando) return;
    setEnviando(true);
    try {
      await apiFetch(`/ministerios/${ministerioId}/miembros`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiToken}` },
        body: JSON.stringify({ personaId: persona.id, celulaId: activas.length > 0 ? celulaId : null, ...decision }),
      });
      setDecidir(null);
      toast.success(t('agregado', { nombre: `${persona.nombre} ${persona.apellido}`, ministerio }));
      router.refresh();
    } catch (error) {
      if (error instanceof ApiError && error.code === 'POSTULACION_REQUIERE_CONFIRMAR_CAMBIO') {
        setDecidir({ persona, detalle: error.extensiones as unknown as DetalleDecisionMembresia });
        return;
      }
      const code = error instanceof ApiError ? error.code : null;
      toast.error(code && te.has(code) ? te(code) : t('errorGenerico'));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <details className="rounded-md border border-border p-3">
      <summary className="flex min-h-11 cursor-pointer items-center gap-2 font-medium">
        <UserPlus aria-hidden className="size-4" />
        {t('titulo')}
      </summary>
      <div className="mt-3 flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">{t('ayuda')}</p>
        {activas.length > 0 && (
          <div className="flex flex-col gap-1">
            <label htmlFor="agregar-area" className="text-sm font-medium">
              {t('area')}
            </label>
            <select
              id="agregar-area"
              value={celulaId}
              onChange={(e) => setCelulaId(e.target.value)}
              disabled={enviando}
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 sm:w-72"
            >
              {activas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>
        )}
        <BuscarPersonaGex
          id="agregar-miembro-buscar"
          apiToken={apiToken}
          textoElegir={t('agregar')}
          ariaElegir={(nombre) => t('agregarAria', { nombre })}
          onElegir={(p) => agregar(p)}
          deshabilitado={enviando}
        />
        {decidir && (
          <AvisoEstado role="note" icono={<ArrowRightLeft className="text-primary" />} titulo={t('decidirTitulo', { nombre: `${decidir.persona.nombre} ${decidir.persona.apellido}`, actuales: decidir.detalle.ministeriosActuales.map((a) => a.ministerio.nombre).join(' y ') })} className="rounded-md border border-border p-3">
            <span className="mt-2 flex flex-wrap gap-2">
              {decidir.detalle.puedeSumar && (
                <Button type="button" size="sm" loading={enviando} onClick={() => void agregar(decidir.persona, { sumar: true })}>
                  {t('sumar')}
                </Button>
              )}
              {decidir.detalle.ministeriosActuales.map((a) => (
                <Button key={a.postulacionId} type="button" size="sm" variant="outline" disabled={enviando} onClick={() => void agregar(decidir.persona, { reemplazaId: a.postulacionId })}>
                  {t('reemplazar', { ministerio: a.ministerio.nombre })}
                </Button>
              ))}
              <Button type="button" size="sm" variant="ghost" disabled={enviando} onClick={() => setDecidir(null)}>
                {t('cancelar')}
              </Button>
            </span>
          </AvisoEstado>
        )}
      </div>
    </details>
  );
}
