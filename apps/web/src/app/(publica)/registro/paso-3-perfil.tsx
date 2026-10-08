'use client';

import type { UseFormularioRegistroResult } from '../../../hooks/use-formulario-registro';
import { Campo, CampoSelect } from './campo';

/** H-44: JSX del paso 3, movido tal cual desde formulario-registro.tsx — sin cambios. */
export function Paso3Perfil({ form }: { form: UseFormularioRegistroResult }) {
  const { t, opciones, datos, actualizar, validacion, validaciones, estadoCampo } = form;

  return (
    <>
      <CampoSelect
        label={t('campos.estadoCivil')}
        name="estadoCivil"
        required
        opciones={opciones.estadoCivil}
        value={datos.estadoCivil}
        onChange={(v) => actualizar('estadoCivil', v)}
        onBlur={() => validacion.revalidar('estadoCivil', datos.estadoCivil, validaciones.estadoCivil)}
        {...estadoCampo('estadoCivil')}
        placeholder={t('elegirOpcion')}
      />
      <CampoSelect
        label={t('campos.profesion')}
        name="profesion"
        required
        opciones={opciones.profesion}
        value={datos.profesion}
        onChange={(v) => actualizar('profesion', v)}
        onBlur={() => validacion.revalidar('profesion', datos.profesion, validaciones.profesion)}
        {...estadoCampo('profesion')}
        placeholder={t('elegirOpcion')}
      />
      {datos.profesion === 'otro' && (
        <Campo
          label={t('campos.profesionDetalle')}
          name="profesionDetalle"
          required
          value={datos.profesionDetalle}
          onChange={(v) => actualizar('profesionDetalle', v)}
          onBlur={() => validacion.revalidar('profesionDetalle', datos.profesionDetalle, validaciones.profesionDetalle)}
          {...estadoCampo('profesionDetalle')}
        />
      )}
      <CampoSelect
        label={t('campos.congregaDesde')}
        name="congregaDesde"
        required
        opciones={opciones.congregaDesde}
        value={datos.congregaDesde}
        onChange={(v) => actualizar('congregaDesde', v)}
        onBlur={() =>
          validacion.revalidar('congregaDesde', datos.congregaDesde, validaciones.congregaDesde)
        }
        {...estadoCampo('congregaDesde')}
        placeholder={t('elegirOpcion')}
      />
    </>
  );
}
