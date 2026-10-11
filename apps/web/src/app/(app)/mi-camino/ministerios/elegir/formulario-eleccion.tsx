'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Send } from 'lucide-react';
import {
  ELECCION_COMENTARIO_MAX,
  apiFetch,
  erroresPorCampo,
  ApiError,
  type EleccionVistaPersona,
  type GuardarMiEleccion,
  type MinisterioParaElegir,
} from '@vida-sobrenatural/shared-types';
import { Button, MensajeErrorCampo, ResumenErrores, useEnvio, useValidacionCampos } from '@vida-sobrenatural/ui';
import { SelectorMinisterios, opcionesDe, seleccionDe, type SeleccionMinisterios } from '../../../../../components/eleccion/selector-ministerios';

const CLASE_TEXTO =
  'min-h-24 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:bg-input/30';

/**
 * spec 015 (D239): el formulario de la persona. La regla vive en la API
 * (`validarEleccionMinisterio`); acá se adelanta lo obvio (nada elegido) y
 * se muestran los errores por campo con resumen y foco (H-50). El envío
 * queda protegido de la reentrada (H-57). Al guardar, vuelve a Mi camino.
 */
export function FormularioEleccion({ catalogo, eleccion }: { catalogo: MinisterioParaElegir[]; eleccion: EleccionVistaPersona | null }) {
  const t = useTranslations('eleccion');
  const te = useTranslations('errors');
  const router = useRouter();
  const { data: session } = useSession();
  const validacion = useValidacionCampos();
  const [seleccion, setSeleccion] = useState<SeleccionMinisterios>(eleccion ? seleccionDe(eleccion.opciones) : {});
  const [comentario, setComentario] = useState(eleccion?.comentario ?? '');
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);

  const mensajeDe = (code: string) => (te.has(`campos.${code}`) ? te(`campos.${code}`) : t('errorGenerico'));

  const { enviando, ejecutar } = useEnvio(async () => {
    setErrorGeneral(null);
    const opciones = opcionesDe(seleccion);
    const locales: Record<string, string> = {};
    if (opciones.length === 0) locales.opciones = mensajeDe('ELECCION_VACIA');
    if (comentario.trim().length > ELECCION_COMENTARIO_MAX) locales.comentario = mensajeDe('TEXTO_DEMASIADO_LARGO');
    if (Object.keys(locales).length > 0) {
      validacion.reemplazar(locales);
      return;
    }
    const cuerpo: GuardarMiEleccion = { opciones, comentario };
    try {
      await apiFetch('/elecciones-ministerio/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.apiToken}` },
        body: JSON.stringify(cuerpo),
      });
    } catch (error) {
      const campos = erroresPorCampo(error);
      if (campos) {
        validacion.reemplazar(Object.fromEntries(campos.map(({ campo, code }) => [campo, mensajeDe(code)])));
        return;
      }
      const code = error instanceof ApiError ? error.code : null;
      setErrorGeneral(code && te.has(code) ? te(code) : t('errorGenerico'));
      router.refresh();
      return;
    }
    toast.success(t('guardada'));
    router.push('/mi-camino');
    router.refresh();
  });

  return (
    <form
      noValidate
      aria-labelledby="elegir-titulo"
      onSubmit={(e) => {
        e.preventDefault();
        void ejecutar();
      }}
      className="flex flex-col gap-6"
    >
      <div className="flex flex-col gap-1">
        <h2 id="elegir-titulo" className="text-xl font-semibold">
          {t('elegirTitulo')}
        </h2>
        <p className="text-base text-muted-foreground">{t('elegirAyuda')}</p>
      </div>
      <ResumenErrores errores={validacion.resumen} foco={validacion.foco} titulo={t('resumenErrores')} />
      <SelectorMinisterios
        catalogo={catalogo}
        seleccion={seleccion}
        onCambio={(s) => {
          setSeleccion(s);
          validacion.limpiar('opciones');
        }}
        deshabilitado={enviando}
        invalido={!!validacion.mensajes.opciones}
        idError={validacion.mensajes.opciones ? 'opciones-error' : undefined}
      />
      <MensajeErrorCampo id="opciones-error" mensaje={validacion.mensajes.opciones} />

      <div className="flex flex-col gap-2">
        <label htmlFor="campo-comentario" className="text-base font-medium">
          {t('comentarioEtiqueta')}
        </label>
        <p id="comentario-ayuda" className="text-base text-muted-foreground">
          {t('comentarioAyuda')}
        </p>
        <textarea
          id="campo-comentario"
          name="comentario"
          value={comentario}
          onChange={(e) => {
            setComentario(e.target.value);
            validacion.limpiar('comentario');
          }}
          disabled={enviando}
          aria-invalid={validacion.mensajes.comentario ? true : undefined}
          aria-describedby={validacion.mensajes.comentario ? 'comentario-ayuda comentario-error' : 'comentario-ayuda'}
          className={CLASE_TEXTO}
        />
        <p className="text-sm text-muted-foreground">{t('contadorTexto', { cantidad: comentario.trim().length, maximo: ELECCION_COMENTARIO_MAX })}</p>
        <MensajeErrorCampo id="comentario-error" mensaje={validacion.mensajes.comentario} />
      </div>

      {errorGeneral && (
        <p role="alert" className="text-base">
          {errorGeneral}
        </p>
      )}
      <Button type="submit" size="xl" className="w-full text-base sm:w-fit" loading={enviando}>
        <Send aria-hidden />
        {eleccion ? t('guardarCambios') : t('enviar')}
      </Button>
    </form>
  );
}
