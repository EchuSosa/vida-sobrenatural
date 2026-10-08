'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  apiFetch,
  COMPROBANTE_TAMANO_MAXIMO_BYTES,
  diaCivilEnArgentina,
  MEDIOS_PAGO,
  MIME_TIPOS_COMPROBANTE_PERMITIDOS,
  type MedioPago,
  type MiInscripcionEvento,
} from '@vida-sobrenatural/shared-types';
import {
  Button,
  CampoArchivo,
  CampoFecha,
  MensajeErrorCampo,
  ResumenErrores,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  mensajeDeError,
  mensajesDeCampo,
  useEnvio,
  useValidacionCampos,
} from '@vida-sobrenatural/ui';

/**
 * spec 011, T064 (FR-024, FR-030, FR-031) — subir el comprobante de pago desde
 * Mis eventos (también se llega desde el resultado de anotarse, con
 * `/mis-eventos?pagar={id}`). Muestra las instrucciones del Evento, pide
 * monto (por defecto el costo), medio, fecha y el archivo; errores por campo
 * con resumen; al enviar, "qué pasa después".
 */
export function DialogoComprobante({
  inscripcion,
  apiToken,
  abierto,
  onCerrar,
  onEnviado,
}: {
  inscripcion: MiInscripcionEvento;
  apiToken: string;
  abierto: boolean;
  onCerrar: () => void;
  onEnviado: () => void;
}) {
  const t = useTranslations('misEventos.comprobante');
  const tm = useTranslations('misEventos');
  const tc = useTranslations('comun');
  const tf = useTranslations('campoFecha');
  const te = useTranslations('errors');
  const [monto, setMonto] = useState(inscripcion.evento.costo ? String(Number(inscripcion.evento.costo)) : '');
  const [medio, setMedio] = useState<MedioPago>('transferencia');
  const [fecha, setFecha] = useState(() => diaCivilEnArgentina(new Date()));
  const [archivo, setArchivo] = useState<File | null>(null);
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const validacion = useValidacionCampos();
  const m = validacion.mensajes;

  function locales(): Record<string, string> {
    const e: Record<string, string> = {};
    if (!(Number(monto.replace(',', '.')) > 0)) e.monto = t('errorMonto');
    if (!fecha) e.fechaPago = t('errorFecha');
    if (!archivo) e.comprobante = t('errorArchivo');
    else if (!MIME_TIPOS_COMPROBANTE_PERMITIDOS.includes(archivo.type as (typeof MIME_TIPOS_COMPROBANTE_PERMITIDOS)[number])) e.comprobante = t('errorTipo');
    else if (archivo.size > COMPROBANTE_TAMANO_MAXIMO_BYTES) e.comprobante = t('errorTamano');
    return e;
  }

  const enviar = useEnvio(async () => {
    setErrorGeneral(null);
    const errores = locales();
    if (Object.keys(errores).length) {
      validacion.reemplazar(errores);
      return;
    }
    const datos = new FormData();
    datos.append('monto', monto.replace(',', '.'));
    datos.append('medio', medio);
    datos.append('fechaPago', fecha);
    datos.append('comprobante', archivo!);
    try {
      await apiFetch(`/inscripciones-evento/${inscripcion.id}/pagos`, { method: 'POST', headers: { Authorization: `Bearer ${apiToken}` }, body: datos });
      onEnviado();
    } catch (e) {
      const campos = mensajesDeCampo(e, te, tm);
      if (campos) validacion.reemplazar(campos);
      else setErrorGeneral(mensajeDeError(e, te, tm));
    }
  });

  return (
    <Sheet open={abierto} onOpenChange={(abrir) => !abrir && onCerrar()}>
      <SheetContent side="bottom" etiquetaCerrar={tc('cerrarPanel')} className="max-h-[90dvh] overflow-y-auto sm:mx-auto sm:max-w-lg sm:rounded-t-lg">
        <SheetHeader>
          <SheetTitle className="text-xl">{t('titulo')}</SheetTitle>
          <SheetDescription className="text-base">{t('descripcion', { nombre: inscripcion.evento.nombre })}</SheetDescription>
        </SheetHeader>
        <form
          noValidate
          className="flex flex-col gap-5 px-4 pb-6"
          onSubmit={(e) => {
            e.preventDefault();
            void enviar.ejecutar();
          }}
        >
          {inscripcion.evento.instruccionesPago && (
            <div className="flex flex-col gap-1">
              <p className="text-base font-semibold">{t('instrucciones')}</p>
              <p className="whitespace-pre-line rounded-md bg-secondary p-3 text-base">{inscripcion.evento.instruccionesPago}</p>
            </div>
          )}
          {errorGeneral && (
            <p role="alert" className="rounded-md border border-destructive bg-destructive/10 px-3 py-2 text-base text-foreground">
              {errorGeneral}
            </p>
          )}
          <ResumenErrores errores={validacion.resumen} foco={validacion.foco} />

          <div className="flex flex-col gap-1">
            <label htmlFor="campo-monto" className="text-base font-medium">
              {t('monto')}
            </label>
            <input
              id="campo-monto"
              inputMode="decimal"
              value={monto}
              onChange={(e) => {
                setMonto(e.target.value);
                validacion.limpiar('monto');
              }}
              aria-invalid={m.monto ? true : undefined}
              aria-describedby={m.monto ? 'campo-monto-error' : undefined}
              className="h-11 w-48 rounded-md border border-input bg-transparent px-3 text-base aria-invalid:border-destructive dark:bg-input/30"
            />
            <MensajeErrorCampo id="campo-monto-error" mensaje={m.monto} />
          </div>

          <fieldset className="flex flex-col gap-1">
            <legend className="mb-1 text-base font-medium">{t('medio')}</legend>
            <div className="flex flex-wrap gap-x-5">
              {MEDIOS_PAGO.map((mp, i) => (
                <label key={mp} className="flex min-h-11 items-center gap-2 text-base">
                  <input id={i === 0 ? 'campo-medio' : undefined} type="radio" name="medio" className="size-5" checked={medio === mp} onChange={() => setMedio(mp)} />
                  {t(`medios.${mp}`)}
                </label>
              ))}
            </div>
            <MensajeErrorCampo id="campo-medio-error" mensaje={m.medio} />
          </fieldset>

          <CampoFecha
            id="campo-fechaPago"
            etiqueta={t('fecha')}
            value={fecha}
            onChange={(v) => {
              setFecha(v);
              validacion.limpiar('fechaPago');
            }}
            etiquetas={{ dia: tf('dia'), mes: tf('mes'), anio: tf('anio'), meses: tf.raw('meses') as string[] }}
            error={Boolean(m.fechaPago)}
            idError="campo-fechaPago-error"
          />
          <MensajeErrorCampo id="campo-fechaPago-error" mensaje={m.fechaPago} />

          <CampoArchivo
            id="campo-comprobante"
            etiqueta={t('archivo')}
            ayuda={t('archivoAyuda')}
            textoBoton={t('elegir')}
            textoSinArchivo={t('sinArchivo')}
            accept={MIME_TIPOS_COMPROBANTE_PERMITIDOS.join(',')}
            archivo={archivo}
            onElegir={(f) => {
              setArchivo(f);
              validacion.limpiar('comprobante');
            }}
            error={m.comprobante}
            tamanoTexto="base"
          />

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button type="submit" size="xl" className="text-base" loading={enviar.enviando} loadingText={t('enviando')}>
              {t('enviar')}
            </Button>
            <Button type="button" size="xl" variant="outline" className="text-base" onClick={onCerrar}>
              {t('cerrar')}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
