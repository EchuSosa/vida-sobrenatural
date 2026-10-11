'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Send } from 'lucide-react';
import {
  ApiError,
  COMENTARIO_DECLARACION_MAX,
  apiFetch,
  erroresPorCampo,
  hoyEnArgentina,
  type MinisterioParaElegir,
  type NuevaDeclaracion,
} from '@vida-sobrenatural/shared-types';
import { Button, MensajeErrorCampo, ResumenErrores, useEnvio, useValidacionCampos } from '@vida-sobrenatural/ui';
import { SelectorMinisterios, opcionesDe, type SeleccionMinisterios } from '../../../../../components/eleccion/selector-ministerios';

const CLASE_TEXTO =
  'min-h-24 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:bg-input/30';
const CLASE_SELECT =
  'h-11 w-full rounded-lg border border-input bg-background px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive sm:w-64';

/**
 * spec 015 (D243): el formulario de "Ya sirvo". La regla es la de la elección
 * (`validarEleccionMinisterio`, en la API); acá se adelanta lo obvio. Errores
 * por campo con resumen y foco (H-50); envío protegido de la reentrada (H-57).
 */
export function FormularioYaSirvo({ catalogo }: { catalogo: MinisterioParaElegir[] }) {
  const t = useTranslations('yaSirvo');
  const te = useTranslations('errors');
  const router = useRouter();
  const { data: session } = useSession();
  const validacion = useValidacionCampos();
  const [seleccion, setSeleccion] = useState<SeleccionMinisterios>({});
  const [desdeAnio, setDesdeAnio] = useState('');
  const [comentario, setComentario] = useState('');
  const anioActual = Number(hoyEnArgentina().slice(0, 4));
  const anios = Array.from({ length: anioActual - 1950 + 1 }, (_, i) => anioActual - i);
  const mensajeDe = (code: string) => (te.has(`campos.${code}`) ? te(`campos.${code}`) : t('errorGenerico'));

  const { enviando, ejecutar } = useEnvio(async () => {
    const opciones = opcionesDe(seleccion);
    const locales: Record<string, string> = {};
    if (opciones.length === 0) locales.opciones = mensajeDe('ELECCION_VACIA');
    if (comentario.trim().length > COMENTARIO_DECLARACION_MAX) locales.comentario = mensajeDe('COMENTARIO_DEMASIADO_LARGO');
    if (Object.keys(locales).length > 0) {
      validacion.reemplazar(locales);
      return;
    }
    const cuerpo: NuevaDeclaracion = { etapa: 'ministerio', opciones, desdeAnio: desdeAnio ? Number(desdeAnio) : null, comentario: comentario.trim() || undefined };
    try {
      await apiFetch('/camino/me/declaraciones', {
        method: 'POST',
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
      toast.error(code && te.has(code) ? te(code) : t('errorGenerico'));
      router.refresh();
      return;
    }
    toast.success(t('enviado'));
    router.push('/mi-camino');
    router.refresh();
  });

  return (
    <form
      noValidate
      aria-label={t('titulo')}
      onSubmit={(e) => {
        e.preventDefault();
        void ejecutar();
      }}
      className="flex flex-col gap-6"
    >
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
        <label htmlFor="campo-desdeAnio" className="text-base font-medium">
          {t('desdeEtiqueta')}
        </label>
        <select
          id="campo-desdeAnio"
          name="desdeAnio"
          value={desdeAnio}
          onChange={(e) => {
            setDesdeAnio(e.target.value);
            validacion.limpiar('desdeAnio');
          }}
          disabled={enviando}
          aria-invalid={validacion.mensajes.desdeAnio ? true : undefined}
          aria-describedby={validacion.mensajes.desdeAnio ? 'desdeAnio-error' : undefined}
          className={CLASE_SELECT}
        >
          <option value="">{t('desdeNoSe')}</option>
          {anios.map((a) => (
            <option key={a} value={a}>
              {a === anioActual ? t('desdeEsteAnio', { anio: a }) : a}
            </option>
          ))}
        </select>
        <MensajeErrorCampo id="desdeAnio-error" mensaje={validacion.mensajes.desdeAnio} />
      </div>

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
        <MensajeErrorCampo id="comentario-error" mensaje={validacion.mensajes.comentario} />
      </div>

      <Button type="submit" size="xl" className="w-full text-base sm:w-fit" loading={enviando}>
        <Send aria-hidden />
        {t('enviar')}
      </Button>
    </form>
  );
}
