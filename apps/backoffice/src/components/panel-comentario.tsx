'use client';

import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  Button,
  FormularioComentario,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  textosFormularioComentario,
  type TraductorComentario,
} from '@vida-sobrenatural/ui';
import { enviarComentarioBackoffice } from './acciones-comentario';

/**
 * spec 013 (T065, FR-040): "Contanos qué te parece" en un panel lateral, desde
 * el menú de usuario. Con sesión siempre: no pide datos de contacto (usa los
 * del perfil). La página de origen es la pantalla en la que estaba.
 */
export function PanelComentario({ abierto, alCambiar }: { abierto: boolean; alCambiar: (abierto: boolean) => void }) {
  const t = useTranslations('comentarios');
  const tf = useTranslations('comentarios.formulario');
  const pathname = usePathname();
  return (
    <Sheet open={abierto} onOpenChange={alCambiar}>
      <SheetContent side="right" etiquetaCerrar={t('cerrarPanel')} className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{t('panelTitulo')}</SheetTitle>
          <SheetDescription>{t('panelDescripcion')}</SheetDescription>
        </SheetHeader>
        <div className="px-4 pb-6">
          {abierto && (
            <FormularioComentario
              textos={textosFormularioComentario(tf as unknown as TraductorComentario)}
              conSesion
              paginaOrigen={pathname || '/'}
              app="backoffice"
              enviar={enviarComentarioBackoffice}
              accionesConfirmacion={
                <Button type="button" variant="ghost" size="xl" onClick={() => alCambiar(false)}>
                  {t('cerrar')}
                </Button>
              }
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
