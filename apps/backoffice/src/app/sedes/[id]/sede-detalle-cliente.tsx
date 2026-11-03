'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { type Sede, type ErrorCode, type ErrorDeCampo, apiFetch, ApiError, erroresPorCampo } from '@vida-sobrenatural/shared-types';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  ButtonLink,
  ConfirmDestructiveDialog,
  EstadoActivoBadge,
  MigaDePan,
  useEnvio,
} from '@vida-sobrenatural/ui';
import { toast } from 'sonner';
import { FormularioSede, sedeAValoresFormulario, datosSedeParaEnviar, type ValoresSede } from '../../../components/formulario-sede';

/**
 * H-60 (revisión manual ronda 7): `sede` llega ya cargada desde page.tsx
 * (Server Component) — isla de cliente: el formulario de edición y
 * Desactivar/Reactivar (D119, H-51). `router.refresh()` después de cada
 * mutación vuelve a pedir la Sede al servidor sin perder el estado de
 * cliente (el diálogo de "única Sede activa", por ejemplo) — mismo
 * mecanismo que ya usa error.tsx (H-04).
 */
export function SedeDetalleCliente({
  sede,
  apiToken,
  puedeGestionar,
}: {
  sede: Sede;
  apiToken: string;
  /** H-133: `sedes.gestionar` — sin él, ni Desactivar/Reactivar ni el formulario editable. */
  puedeGestionar: boolean;
}) {
  const router = useRouter();
  const [errorGuardar, setErrorGuardar] = useState<string | null>(null);
  const [erroresCampoGuardar, setErroresCampoGuardar] = useState<ErrorDeCampo[] | null>(null);
  const [avisoUnicaActiva, setAvisoUnicaActiva] = useState(false);
  const te = useTranslations('errors');
  const tcat = useTranslations('catalogos');
  const ts = useTranslations('sedes');
  const t = useTranslations('sedes.detalle');

  const { enviando, ejecutar: guardar } = useEnvio(async (valores: ValoresSede) => {
    setErrorGuardar(null);
    setErroresCampoGuardar(null);
    try {
      await apiFetch(`/sedes/${sede.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiToken}` },
        body: JSON.stringify(datosSedeParaEnviar(valores)),
      });
      toast(t('guardados'));
      router.refresh();
    } catch (e) {
      const campos = erroresPorCampo(e);
      if (campos) {
        setErroresCampoGuardar(campos);
      } else {
        setErrorGuardar(e instanceof ApiError ? te(e.code as ErrorCode) : t('errorGuardar'));
      }
    }
  });

  const { enviando: desactivando, ejecutar: desactivar } = useEnvio(async () => {
    try {
      await apiFetch(`/sedes/${sede.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiToken}` },
        body: JSON.stringify({ activo: false }),
      });
      toast(t('desactivada'));
      router.refresh();
    } catch (e) {
      if (e instanceof ApiError && e.code === 'SEDE_UNICA_ACTIVA') {
        setAvisoUnicaActiva(true);
        return;
      }
      toast.error(e instanceof ApiError ? te(e.code as ErrorCode) : t('errorDesactivar'));
    }
  });

  const { enviando: reactivando, ejecutar: reactivar } = useEnvio(async () => {
    try {
      await apiFetch(`/sedes/${sede.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiToken}` },
        body: JSON.stringify({ activo: true }),
      });
      toast(t('reactivada'));
      router.refresh();
    } catch (e) {
      if (e instanceof ApiError && e.code === 'SEDE_NOMBRE_DUPLICADO') {
        toast.error(t('nombreDuplicado'));
        return;
      }
      toast.error(e instanceof ApiError ? te(e.code as ErrorCode) : t('errorReactivar'));
    }
  });

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-16">
      {/* H-103/docs/15-guia-ux-ui.md: la miga de pan es el único sistema de
          ubicación — reemplaza al "← Volver a Sedes" escrito a mano. */}
      <MigaDePan
        tramos={[{ label: tcat('titulo'), href: '/catalogos' }, { label: ts('titulo'), href: '/sedes' }, { label: sede.nombre }]}
        LinkComponente={Link}
      />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">{sede.nombre}</h1>
          <EstadoActivoBadge activo={sede.activo} />
        </div>

        {!puedeGestionar ? null : sede.activo ? (
          <ConfirmDestructiveDialog
            trigger={
              <Button
                variant="outline"
                className="text-destructive"
                loading={desactivando}
                loadingText={t('desactivando')}
              >
                {t('desactivar')}
              </Button>
            }
            titulo={t('desactivarTitulo', { nombre: sede.nombre })}
            descripcion={t('desactivarDescripcion')}
            textoConfirmar={t('siDesactivar')}
            textoCancelar={t('volver')}
            onConfirmar={desactivar}
          />
        ) : (
          <ConfirmDestructiveDialog
            trigger={
              <Button loading={reactivando} loadingText={t('reactivando')}>
                {t('reactivar')}
              </Button>
            }
            titulo={t('reactivarTitulo', { nombre: sede.nombre })}
            descripcion={t('reactivarDescripcion')}
            textoConfirmar={t('siReactivar')}
            textoCancelar={t('volver')}
            onConfirmar={reactivar}
          />
        )}
      </div>

      <FormularioSede
        key={sede.id}
        valoresIniciales={sedeAValoresFormulario(sede)}
        onGuardar={guardar}
        enviando={enviando}
        textoBoton={t('guardar')}
        textoEnviando={t('guardando')}
        error={errorGuardar}
        erroresCampo={erroresCampoGuardar}
        soloLectura={!puedeGestionar}
      />

      <AlertDialog open={avisoUnicaActiva} onOpenChange={setAvisoUnicaActiva}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('unicaActivaTitulo')}</AlertDialogTitle>
            <AlertDialogDescription>{te('SEDE_UNICA_ACTIVA')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('volver')}</AlertDialogCancel>
            {/* H-100/H-01: navegación real (un <a> de verdad, packages/ui),
                no una acción in-place — no un AlertDialogAction.
                AlertDialogCancel ya cierra el diálogo; acá no hace falta
                ningún manejo de cierre propio. H-109: "Crear una Sede"
                nombra un verbo — tiene que ejecutarlo, no dejar a la
                persona en el listado para que lo busque. */}
            <ButtonLink render={<Link href="/sedes?crear=1" />}>{t('crearUna')}</ButtonLink>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
