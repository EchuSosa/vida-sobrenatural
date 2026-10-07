'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { apiFetch, ApiError, type Cruce, type DiscipuladorEnCruce } from '@vida-sobrenatural/shared-types';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  Skeleton,
  useEnvio,
} from '@vida-sobrenatural/ui';
import { CruceDiscipuladores, type EtiquetasCruce } from '../../../components/cruce';
import { mensajeDeError } from '../../mis-discipulados/comun';

/**
 * specs/004, T052 (FR-030): cambiar de Discipulador PROPONE, no asigna. El
 * panel pide el cruce de reasignación (T028) y lo muestra con el mismo
 * componente que la propuesta de una Solicitud (`components/cruce.tsx`, lote
 * 0 — Principio XI). Elegir abre la confirmación; ante
 * `DISCIPULADOR_NO_DISPONIBLE` se recarga el cruce y se dice por qué.
 */
export function PanelReasignar({
  abierto,
  onCerrar,
  onPropuesta,
  grupoId,
  apiToken,
  actual,
}: {
  abierto: boolean;
  onCerrar: () => void;
  onPropuesta: () => void;
  grupoId: string;
  apiToken: string;
  /** Nombre de quien lo acompaña hoy. */
  actual: string;
}) {
  const t = useTranslations('grupos');
  const tf = useTranslations('franjas');
  const tc = useTranslations('comun');
  const te = useTranslations('errors');
  const [cruce, setCruce] = useState<Cruce | null>(null);
  const [errorCruce, setErrorCruce] = useState(false);
  const [elegido, setElegido] = useState<DiscipuladorEnCruce | null>(null);

  // Se monta al abrir (el padre lo renderiza solo entonces); `intento` vuelve a pedir el cruce.
  const [intento, setIntento] = useState(0);
  useEffect(() => {
    let vigente = true;
    apiFetch<Cruce>(`/grupos/discipulados/${grupoId}/cruce`, { headers: { Authorization: `Bearer ${apiToken}` } })
      .then((c) => {
        if (!vigente) return;
        setCruce(c);
        setErrorCruce(false);
      })
      .catch(() => {
        if (vigente) setErrorCruce(true);
      });
    return () => {
      vigente = false;
    };
  }, [grupoId, apiToken, intento]);

  function recargar() {
    setCruce(null);
    setIntento((n) => n + 1);
  }

  const { enviando, ejecutar: proponer } = useEnvio(async (d: DiscipuladorEnCruce) => {
    const nombre = `${d.nombre} ${d.apellido}`;
    try {
      await apiFetch(`/grupos/discipulados/${grupoId}/reasignar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiToken}` },
        body: JSON.stringify({ discipuladorId: d.id }),
      });
      toast(t('reasignacion.exito', { nombre }));
      setElegido(null);
      onPropuesta();
    } catch (e) {
      toast.error(mensajeDeError(e, te, t));
      setElegido(null);
      if (e instanceof ApiError && e.code === 'DISCIPULADOR_NO_DISPONIBLE') recargar();
      if (e instanceof ApiError && (e.code === 'REASIGNACION_YA_PROPUESTA' || e.code === 'DISCIPULADO_NO_EN_CURSO')) onPropuesta();
    }
  });

  const dias = tf.raw('dias') as EtiquetasCruce['dias'];
  const etiquetas: EtiquetasCruce = {
    dias,
    sinDisponibles: t('cruce.sinDisponibles'),
    ningunoCoincide: t('cruce.ningunoCoincide'),
    tituloNoCoinciden: t('cruce.tituloNoCoinciden'),
    sugerido: t('cruce.sugerido'),
    elegir: t('cruce.elegir'),
    sumarAlGrupo: t('cruce.sumarAlGrupo'),
    razones: { horario: t('cruce.razones.horario'), genero: t('cruce.razones.genero') },
    lugar: (g) => t('cruce.lugarGrupo', { personas: g.personas.join(', '), ocupado: g.ocupado, maximo: g.maximo }),
    coincideHorario: t('cruce.coincideHorario'),
    noCoincideHorario: t('cruce.noCoincideHorario'),
  };

  function elegir(id: string) {
    if (!cruce) return;
    const todos = [...cruce.franjas.flatMap((f) => f.coinciden), ...cruce.noCoinciden];
    setElegido(todos.find((d) => d.id === id) ?? null);
  }

  return (
    <>
      {/* Un solo overlay por vez (H-51/H-52): mientras se confirma, el panel se
          oculta; si se vuelve atrás, reaparece con el cruce ya cargado. */}
      <Sheet open={abierto && elegido === null} onOpenChange={(a) => !a && onCerrar()}>
        <SheetContent side="right" etiquetaCerrar={tc('cerrarPanel')} className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{t('reasignacion.titulo')}</SheetTitle>
            <SheetDescription>{t('reasignacion.texto', { nombre: actual })}</SheetDescription>
          </SheetHeader>
          <div className="flex flex-col gap-4 px-4 pb-6" aria-busy={!cruce && !errorCruce}>
            {errorCruce ? (
              <p role="alert" className="text-sm text-destructive">
                {t('reasignacion.errorCruce')}
              </p>
            ) : !cruce ? (
              <div className="flex flex-col gap-3">
                <p className="sr-only">{t('reasignacion.cargando')}</p>
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : (
              <CruceDiscipuladores cruce={cruce} etiquetas={etiquetas} onElegir={elegir} disabled={enviando} />
            )}
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={elegido !== null} onOpenChange={(a) => !a && setElegido(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('reasignacion.confirmarTitulo', { nombre: elegido ? `${elegido.nombre} ${elegido.apellido}` : '' })}</AlertDialogTitle>
            <AlertDialogDescription>{t('reasignacion.confirmarTexto')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('volver')}</AlertDialogCancel>
            <Button loading={enviando} loadingText={t('reasignacion.proponiendo')} onClick={() => elegido && void proponer(elegido)}>
              {t('reasignacion.confirmarBoton')}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
