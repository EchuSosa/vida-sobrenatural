'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { CalendarDays, MapPin } from 'lucide-react';
import { apiFetch, formatearInicioEvento, type MiInscripcionEvento } from '@vida-sobrenatural/shared-types';
import { Button, ConfirmDestructiveDialog, EstadoInscripcionBadge, mensajeDeError, useEnvio } from '@vida-sobrenatural/ui';
import { DialogoComprobante } from '../../../components/eventos/dialogo-comprobante';

/**
 * spec 011, T058/T064 — las tarjetas de "Mis inscripciones": estado con texto
 * + ícono, qué sigue (docs/15), y una acción principal por tarjeta. Cancelar
 * es reversible → confirmación neutra (D151) que no dice "Cancelar" a secas.
 */
export function MisInscripciones({ inscripciones, apiToken, pagar }: { inscripciones: MiInscripcionEvento[]; apiToken: string; pagar: string | null }) {
  const [pagando, setPagando] = useState<string | null>(inscripciones.some((i) => i.id === pagar && puedePagar(i)) ? pagar : null);
  const router = useRouter();
  const t = useTranslations('misEventos');
  const abierta = inscripciones.find((i) => i.id === pagando) ?? null;
  return (
    <>
      <ul className="flex flex-col gap-4">
        {inscripciones.map((i) => (
          <li key={i.id}>
            <TarjetaInscripcion inscripcion={i} apiToken={apiToken} onPagar={() => setPagando(i.id)} />
          </li>
        ))}
      </ul>
      {abierta && (
        <DialogoComprobante
          inscripcion={abierta}
          apiToken={apiToken}
          abierto
          onCerrar={() => setPagando(null)}
          onEnviado={() => {
            setPagando(null);
            toast(t('comprobante.enviado'));
            router.replace('/mis-eventos');
            router.refresh();
          }}
        />
      )}
    </>
  );
}

function puedePagar(i: MiInscripcionEvento): boolean {
  return i.estado === 'confirmada' && i.estadoPago === 'sin_pago';
}

function TarjetaInscripcion({ inscripcion, apiToken, onPagar }: { inscripcion: MiInscripcionEvento; apiToken: string; onPagar: () => void }) {
  const t = useTranslations('misEventos');
  const ti = useTranslations('eventos.inscripcion');
  const te = useTranslations('errors');
  const locale = useLocale();
  const router = useRouter();
  const { evento, estado, estadoPago, posicionEnLista } = inscripcion;
  const cuando = formatearInicioEvento(evento.inicio, evento.fin, locale);
  const [ahora] = useState(() => Date.now());
  const empezo = new Date(evento.inicio).getTime() <= ahora;
  const abierta = estado === 'confirmada' || estado === 'pendiente' || estado === 'lista_espera';

  const cancelar = useEnvio(async () => {
    try {
      await apiFetch(`/inscripciones-evento/${inscripcion.id}/cancelar`, { method: 'POST', headers: { Authorization: `Bearer ${apiToken}` } });
      toast(t('cancelada'));
      router.refresh();
    } catch (e) {
      toast.error(mensajeDeError(e, te, t));
    }
  });

  return (
    <article className="flex flex-col gap-3 rounded-lg border border-border p-4">
      <h3 className="text-lg font-semibold">
        <Link href={`/eventos/${evento.slug}`} className="underline underline-offset-4 hover:no-underline">
          {evento.nombre}
        </Link>
      </h3>
      <ul className="flex flex-col gap-1 text-base">
        <li className="flex items-start gap-2">
          <CalendarDays className="mt-1 size-4 shrink-0" aria-hidden="true" />
          {cuando}
        </li>
        <li className="flex items-start gap-2">
          <MapPin className="mt-1 size-4 shrink-0" aria-hidden="true" />
          {evento.lugar}
        </li>
      </ul>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-base">
        <EstadoInscripcionBadge estado={estado} texto={ti(`estado.${estado}`, { posicion: posicionEnLista ?? 0 })} />
        {estado === 'confirmada' && estadoPago !== 'no_aplica' && <EstadoInscripcionBadge estado={estadoPago} texto={ti(`pago.${estadoPago}`)} />}
      </div>
      {inscripcion.promovidaEn && abierta && <p className="text-base font-medium">{t('promovida')}</p>}
      {inscripcion.ultimoRechazoPago && estadoPago === 'sin_pago' && <p className="text-base">{t('pagoRechazado', { motivo: inscripcion.ultimoRechazoPago })}</p>}
      <p className="text-base">
        {estado === 'confirmada' && estadoPago === 'sin_pago'
          ? ti('queSigue.confirmadaConCosto')
          : ti(`queSigue.${estado}`, { cuando, lugar: evento.lugar, posicion: posicionEnLista ?? 0 })}
      </p>
      {estado === 'confirmada' && estadoPago === 'sin_pago' && evento.instruccionesPago && (
        <p className="whitespace-pre-line rounded-md bg-secondary p-3 text-base">{evento.instruccionesPago}</p>
      )}
      {(abierta && !empezo) || puedePagar(inscripcion) ? (
        <div className="flex flex-col gap-3 sm:flex-row">
          {puedePagar(inscripcion) && (
            <Button size="xl" className="text-base" onClick={onPagar}>
              {inscripcion.ultimoRechazoPago ? t('volverASubir') : t('subirComprobante')}
            </Button>
          )}
          {abierta && !empezo && (
            <ConfirmDestructiveDialog
              tono="neutro"
              trigger={
                <Button size="xl" variant="outline" className="text-base" loading={cancelar.enviando} loadingText={t('cancelando')}>
                  {t('cancelar')}
                </Button>
              }
              titulo={t('cancelarTitulo', { nombre: evento.nombre })}
              descripcion={estadoPago === 'verificado' ? t('cancelarTextoPago') : estado === 'lista_espera' ? t('cancelarTextoLista') : t('cancelarTexto')}
              textoConfirmar={t('cancelarSi')}
              textoCancelar={t('cancelarNo')}
              onConfirmar={() => void cancelar.ejecutar()}
            />
          )}
        </div>
      ) : null}
    </article>
  );
}
