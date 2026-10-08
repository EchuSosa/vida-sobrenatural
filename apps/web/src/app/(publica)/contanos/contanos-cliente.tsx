'use client';

import { useTranslations } from 'next-intl';
import { ButtonLink, FormularioComentario, textosFormularioComentario, type TraductorComentario } from '@vida-sobrenatural/ui';
import { enviarComentario } from './acciones';

/** spec 013 (T064): el formulario compartido de `packages/ui` con los textos y la acción de la web. */
export function ContanosCliente({ conSesion, paginaOrigen }: { conSesion: boolean; paginaOrigen: string }) {
  const t = useTranslations('comentarios');
  const tf = useTranslations('comentarios.formulario');
  return (
    <FormularioComentario
      textos={textosFormularioComentario(tf as unknown as TraductorComentario)}
      conSesion={conSesion}
      paginaOrigen={paginaOrigen}
      app="web"
      enviar={enviarComentario}
      accionesConfirmacion={
        paginaOrigen !== '/contanos' ? (
          <ButtonLink href={paginaOrigen} variant="ghost" size="xl">
            {t('volver')}
          </ButtonLink>
        ) : null
      }
    />
  );
}
