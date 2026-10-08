'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { CircleCheck, CircleX, Download, ReceiptText } from 'lucide-react';
import { apiFetch, formatearFechaLarga, formatearInicioEvento, formatearMoneda, type PagoEnBandeja } from '@vida-sobrenatural/shared-types';
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
  MensajeErrorCampo,
  MigaDePan,
  mensajeDeError,
  useEnvio,
} from '@vida-sobrenatural/ui';

/**
 * spec 011, T069/T071 — el panel de verificación de un Pago: datos, el
 * comprobante (imagen en línea o PDF embebido, siempre con "Descargar"),
 * "Verificar pago" como acción principal y "Rechazar pago" con motivo
 * obligatorio y la consecuencia explicada (se libera el lugar, FR-035).
 */
export function PagoDetalleCliente({ pago, apiToken }: { pago: PagoEnBandeja; apiToken: string }) {
  const t = useTranslations('eventos.pagos');
  const te = useTranslations('errors');
  const tb = useTranslations('bandeja');
  const locale = useLocale();
  const router = useRouter();
  const [rechazando, setRechazando] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [errorMotivo, setErrorMotivo] = useState<string | null>(null);
  const nombre = `${pago.persona.nombre} ${pago.persona.apellido}`;
  const auth = { Authorization: `Bearer ${apiToken}` };
  const urlComprobante = `/api/comprobantes/${pago.id}`;
  const pendiente = pago.estado === 'pendiente_verificacion';

  const verificar = useEnvio(async () => {
    try {
      await apiFetch(`/pagos/${pago.id}/verificar`, { method: 'POST', headers: auth });
      toast(t('verificado'));
      router.refresh();
    } catch (e) {
      toast.error(mensajeDeError(e, te, t));
    }
  });

  const rechazar = useEnvio(async () => {
    if (!motivo.trim()) {
      setErrorMotivo(t('motivoRequerido'));
      document.getElementById('campo-motivo')?.focus();
      return;
    }
    try {
      await apiFetch(`/pagos/${pago.id}/rechazar`, {
        method: 'POST',
        headers: { ...auth, 'Content-Type': 'application/json' },
        body: JSON.stringify({ motivo }),
      });
      setRechazando(false);
      toast(t('rechazado'));
      router.refresh();
    } catch (e) {
      setErrorMotivo(mensajeDeError(e, te, t));
    }
  });

  const IconoEstado = pago.estado === 'verificado' ? CircleCheck : pago.estado === 'rechazado' ? CircleX : ReceiptText;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-10">
      <MigaDePan tramos={[{ label: tb('titulo'), href: '/solicitudes' }, { label: t('miga') }]} LinkComponente={Link} />
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">{t('titulo', { nombre })}</h1>
        <span className="inline-flex items-center gap-1.5 text-sm font-medium">
          <IconoEstado className="size-4" aria-hidden="true" />
          {t(`estados.${pago.estado}`)}
        </span>
      </div>

      <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-[max-content_1fr]">
        <dt className="font-medium">{t('persona')}</dt>
        <dd>{nombre}</dd>
        <dt className="font-medium">{t('evento')}</dt>
        <dd>
          <Link href={`/eventos/${pago.evento.id}`} className="underline underline-offset-2 hover:no-underline">
            {pago.evento.nombre}
          </Link>{' '}
          · {formatearInicioEvento(pago.evento.inicio, null, locale)}
        </dd>
        <dt className="font-medium">{t('monto')}</dt>
        <dd>{formatearMoneda(Number(pago.monto), locale)}</dd>
        <dt className="font-medium">{t('medio')}</dt>
        <dd>{t(`medios.${pago.medio}`)}</dd>
        <dt className="font-medium">{t('fecha')}</dt>
        <dd>{formatearFechaLarga(pago.fechaPago, locale)}</dd>
        <dt className="font-medium">{t('cargadoPor')}</dt>
        <dd>{pago.creadoPor ? `${pago.creadoPor.nombre} ${pago.creadoPor.apellido}` : t('laPersona')}</dd>
      </dl>
      {pago.verificadoPor && <p className="text-sm text-muted-foreground">{t('revisadoPor', { nombre: `${pago.verificadoPor.nombre} ${pago.verificadoPor.apellido}` })}</p>}
      {pago.motivoRechazo && <p className="text-sm">{t('motivoRechazo', { motivo: pago.motivoRechazo })}</p>}

      <section aria-labelledby="titulo-comprobante" className="flex flex-col gap-3">
        <h2 id="titulo-comprobante" className="text-lg font-semibold">
          {t('comprobante')}
        </h2>
        {!pago.tieneComprobante ? (
          <p className="text-sm text-muted-foreground">{t('sinComprobante')}</p>
        ) : pago.comprobanteMime === 'application/pdf' ? (
          <object data={urlComprobante} type="application/pdf" title={t('pdfTitulo')} className="h-[70vh] w-full rounded-md border border-border">
            <p className="p-4 text-sm">{t('pdfTitulo')}</p>
          </object>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- comprobante privado, servido por el route handler con permiso
          <img src={urlComprobante} alt={t('comprobanteAlt', { nombre })} className="max-h-[70vh] w-full rounded-md border border-border bg-secondary object-contain" />
        )}
        {pago.tieneComprobante && (
          <ButtonLink variant="outline" className="w-fit" render={<a href={`${urlComprobante}?descargar=1`} download aria-label={t('descargar')} />}>
            <Download aria-hidden="true" />
            {t('descargar')}
          </ButtonLink>
        )}
      </section>

      {pendiente && (
        <div className="flex flex-wrap gap-3 border-t border-border pt-6">
          <Button loading={verificar.enviando} loadingText={t('verificando')} onClick={() => void verificar.ejecutar()}>
            {t('verificar')}
          </Button>
          <Button variant="outline" className="text-destructive" onClick={() => setRechazando(true)}>
            {t('rechazar')}
          </Button>
        </div>
      )}

      <AlertDialog open={rechazando} onOpenChange={setRechazando}>
        <AlertDialogContent data-tono="destructivo">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('rechazarTitulo', { nombre })}</AlertDialogTitle>
            <AlertDialogDescription>{t('rechazarTexto')}</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col gap-1">
            <label htmlFor="campo-motivo" className="text-sm font-medium">
              {t('motivo')}
            </label>
            <p id="campo-motivo-ayuda" className="text-sm text-muted-foreground">
              {t('motivoAyuda')}
            </p>
            <textarea
              id="campo-motivo"
              rows={3}
              maxLength={500}
              value={motivo}
              onChange={(e) => {
                setMotivo(e.target.value);
                setErrorMotivo(null);
              }}
              aria-invalid={errorMotivo ? true : undefined}
              aria-describedby={`campo-motivo-ayuda${errorMotivo ? ' campo-motivo-error' : ''}`}
              className="rounded-md border border-input bg-transparent px-3 py-2 text-sm aria-invalid:border-destructive dark:bg-input/30"
            />
            <MensajeErrorCampo id="campo-motivo-error" mensaje={errorMotivo ?? undefined} />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('volver')}</AlertDialogCancel>
            <Button variant="destructive" loading={rechazar.enviando} loadingText={t('rechazando')} onClick={() => void rechazar.ejecutar()}>
              {t('rechazarSi')}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
