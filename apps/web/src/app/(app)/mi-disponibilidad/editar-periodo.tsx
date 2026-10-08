'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { BloqueoDisponibilidad } from '@vida-sobrenatural/shared-types';
import {
  Button,
  CampoFecha,
  MensajeErrorCampo,
  ResumenErrores,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  useEnvio,
  useValidacionCampos,
  type EtiquetasCampoFecha,
} from '@vida-sobrenatural/ui';

type Fechas = { desde: string; hasta: string };

/**
 * FR-040 (H-R12, revisión manual de la 004): cambiar desde/hasta de un período
 * ya cargado, con las mismas reglas que al crearlo. Panel lateral como el
 * formulario de Encuentro; se monta de nuevo por cada período, así arranca
 * limpio. La pantalla le pasa las reglas (`validar`) y el guardado
 * (`guardar`): éste resuelve el éxito y los errores que no son de un campo, y
 * devuelve los de campo ya traducidos (o `null`).
 */
export function EditarPeriodo({
  bloqueo,
  onCerrar,
  validar,
  guardar,
  etiquetasFecha,
}: {
  bloqueo: BloqueoDisponibilidad;
  onCerrar: () => void;
  validar: (valores: Fechas) => Record<string, string>;
  guardar: (valores: Fechas) => Promise<Record<string, string> | null>;
  etiquetasFecha: EtiquetasCampoFecha;
}) {
  const t = useTranslations('miDisponibilidad');
  const validacion = useValidacionCampos();
  const [valores, setValores] = useState<Fechas>({ desde: bloqueo.desde, hasta: bloqueo.hasta });

  // Los ids de este panel son `campo-editar-…`, para no chocar con los de "Agregar un período".
  const conPrefijo = (errores: Record<string, string>) => Object.fromEntries(Object.entries(errores).map(([campo, m]) => [`editar-${campo}`, m]));

  const { enviando, ejecutar } = useEnvio(async () => {
    const locales = validar(valores);
    if (Object.keys(locales).length > 0) {
      validacion.reemplazar(conPrefijo(locales));
      return;
    }
    const campos = await guardar(valores);
    if (campos) validacion.reemplazar(conPrefijo(campos));
  });

  return (
    <Sheet open onOpenChange={(a) => !a && onCerrar()}>
      <SheetContent side="right" etiquetaCerrar={t('bloqueos.cancelar')} className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{t('bloqueos.editarTitulo')}</SheetTitle>
          <SheetDescription>{t('bloqueos.editarDescripcion')}</SheetDescription>
        </SheetHeader>
        <form
          noValidate
          className="flex flex-col gap-5 px-4"
          onSubmit={(e) => {
            e.preventDefault();
            void ejecutar();
          }}
        >
          <ResumenErrores errores={validacion.resumen} foco={validacion.foco} titulo={t('errores.resumen')} />
          {(['desde', 'hasta'] as const).map((campo) => {
            const clave = `editar-${campo}`;
            const error = validacion.mensajes[clave];
            return (
              <div key={campo} className="flex flex-col gap-1">
                <CampoFecha
                  id={`campo-${clave}`}
                  etiqueta={t(`bloqueos.${campo}`)}
                  value={valores[campo]}
                  etiquetas={etiquetasFecha}
                  error={Boolean(error)}
                  idError={`campo-${clave}-error`}
                  onChange={(v) => {
                    setValores((previos) => ({ ...previos, [campo]: v }));
                    validacion.limpiar(clave);
                  }}
                  onBlur={() => {
                    const mensaje = validar(valores)[campo];
                    validacion.revalidar(clave, valores[campo], { esValido: () => !mensaje, mensaje: mensaje ?? '' });
                  }}
                />
                <MensajeErrorCampo id={`campo-${clave}-error`} mensaje={error} />
              </div>
            );
          })}
          <SheetFooter className="flex-col gap-2 px-0 sm:flex-row-reverse sm:justify-start">
            <Button type="submit" size="xl" className="w-full sm:w-auto" loading={enviando} loadingText={t('bloqueos.guardando')}>
              {t('bloqueos.guardar')}
            </Button>
            <Button type="button" size="xl" variant="outline" className="w-full sm:w-auto" onClick={onCerrar}>
              {t('bloqueos.cancelar')}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
