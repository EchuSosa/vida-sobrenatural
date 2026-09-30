'use client';

import { useTranslations } from 'next-intl';
import { CampoFecha, MensajeErrorCampo, type EtiquetasCampoFecha } from '@vida-sobrenatural/ui';
import type { UseFormularioRegistroResult } from '../../../hooks/use-formulario-registro';
import { Campo, CampoSelect } from './campo';

/** H-44: JSX del paso 1, movido tal cual desde formulario-registro.tsx. H-R10: la fecha es `CampoFecha`. */
export function Paso1DatosPersonales({ form }: { form: UseFormularioRegistroResult }) {
  const tf = useTranslations('campoFecha');
  const { t, opciones, apellidoEfectivo, nombreEfectivo, datos, actualizar, validacion, validaciones, estadoCampo } = form;

  return (
    <>
      <Campo
        label={t('campos.apellido')}
        name="apellido"
        required
        value={apellidoEfectivo}
        onChange={(v) => actualizar('apellido', v)}
        onBlur={() => validacion.revalidar('apellido', apellidoEfectivo, validaciones.apellido)}
        {...estadoCampo('apellido')}
      />
      <Campo
        label={t('campos.nombre')}
        name="nombre"
        required
        value={nombreEfectivo}
        onChange={(v) => actualizar('nombre', v)}
        onBlur={() => validacion.revalidar('nombre', nombreEfectivo, validaciones.nombre)}
        {...estadoCampo('nombre')}
      />
      <CampoSelect
        label={t('campos.genero')}
        name="genero"
        required
        opciones={opciones.genero}
        value={datos.genero}
        onChange={(v) => actualizar('genero', v)}
        onBlur={() => validacion.revalidar('genero', datos.genero, validaciones.genero)}
        {...estadoCampo('genero')}
        placeholder={t('elegirOpcion')}
      />
      <div className="flex flex-col gap-1">
        <CampoFecha
          id="campo-fechaNacimiento"
          etiqueta={t('campos.fechaNacimiento')}
          required
          autoCompletarNacimiento
          value={datos.fechaNacimiento}
          onChange={(v) => actualizar('fechaNacimiento', v)}
          onBlur={() => validacion.revalidar('fechaNacimiento', datos.fechaNacimiento, validaciones.fechaNacimiento)}
          etiquetas={{ dia: tf('dia'), mes: tf('mes'), anio: tf('anio'), meses: tf.raw('meses') as EtiquetasCampoFecha['meses'] }}
          error={estadoCampo('fechaNacimiento').error}
          idError="campo-fechaNacimiento-error"
        />
        {estadoCampo('fechaNacimiento').error && (
          <MensajeErrorCampo id="campo-fechaNacimiento-error" mensaje={estadoCampo('fechaNacimiento').errorTexto} />
        )}
      </div>
    </>
  );
}
