'use client';

import { CampoTelefono } from '@vida-sobrenatural/ui';
import type { UseFormularioRegistroResult } from '../../../hooks/use-formulario-registro';
import { Campo, CampoSelect } from './campo';

/** H-44: JSX del paso 2, movido tal cual desde formulario-registro.tsx — sin cambios. */
export function Paso2Contacto({ form }: { form: UseFormularioRegistroResult }) {
  const { t, datos, sedes, actualizar, validacion, validaciones, estadoCampo } = form;

  return (
    <>
      <CampoTelefono
        id="campo-telefono"
        labelTelefono={t('campos.numeroTelefono')}
        labelCodigo={t('campos.codigoPais')}
        codigoPais={datos.telefonoCodigoPais}
        numero={datos.telefonoNumero}
        onChangeCodigo={(v) => actualizar('telefonoCodigoPais', v)}
        onChangeNumero={(v) => actualizar('telefonoNumero', v)}
        onBlurNumero={() =>
          validacion.revalidar(
            'telefono',
            { codigoPais: datos.telefonoCodigoPais, numero: datos.telefonoNumero },
            validaciones.telefono,
          )
        }
        {...estadoCampo('telefono')}
        placeholderNumero={t('soloNumeros')}
      />
      <Campo
        label={t('campos.direccion')}
        name="direccion"
        required
        value={datos.direccion}
        onChange={(v) => actualizar('direccion', v)}
        onBlur={() => validacion.revalidar('direccion', datos.direccion, validaciones.direccion)}
        {...estadoCampo('direccion')}
      />
      <CampoSelect
        label={t('campos.sede')}
        name="sedeId"
        required
        opciones={sedes.map((s) => ({ value: s.id, label: s.nombre }))}
        value={datos.sedeId}
        onChange={(v) => actualizar('sedeId', v)}
        onBlur={() => validacion.revalidar('sedeId', datos.sedeId, validaciones.sedeId)}
        {...estadoCampo('sedeId')}
        placeholder={t('elegirOpcion')}
      />
    </>
  );
}
