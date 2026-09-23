'use client';

import { Fragment } from 'react';
import { useTranslations } from 'next-intl';
import { type Sede, formatearFechaCorta } from '@vida-sobrenatural/shared-types';
import { MensajeErrorCampo } from '@vida-sobrenatural/ui';
import { useOpcionesRegistro } from '../../../hooks/use-opciones-registro';
import type { UseFormularioRegistroResult } from '../../../hooks/use-formulario-registro';
import type { DatosFormulario } from './tipos';

/**
 * H-44/H-104: JSX del paso 4 (resumen + consentimiento). La casilla de
 * consentimiento participa del sistema de errores como cualquier otro
 * campo (id, aria-invalid, mensaje al lado) — antes quedaba afuera: un
 * envío sin tildarla solo mostraba el aviso genérico arriba, sin marcar
 * la casilla ni mover el foco.
 */
export function Paso4Resumen({ form }: { form: UseFormularioRegistroResult }) {
  const {
    t,
    locale,
    datos,
    apellidoEfectivo,
    nombreEfectivo,
    opciones,
    sedes,
    setPaso,
    esProbablementeMayorDeEdad,
    actualizar,
    validacion,
  } = form;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">{t('resumenIntro')}</p>
      <ResumenDatos
        datos={{ ...datos, apellido: apellidoEfectivo, nombre: nombreEfectivo }}
        opciones={opciones}
        sedes={sedes}
        t={t}
        locale={locale}
        onEditar={setPaso}
      />

      {esProbablementeMayorDeEdad && (
        <div className="flex flex-col gap-1">
          {/* Sin `required`: un bloqueo nativo del navegador (tooltip
              propio, sin nuestro estilo) evitaría que el envío llegara a
              enterarse y mostrara el resumen/foco/mensaje del sistema de
              errores — justo lo que H-104 pide que sea consistente en
              toda la app. El servidor (CONSENTIMIENTO_REQUERIDO) sigue
              siendo la fuente de verdad, como el resto de las reglas de
              negocio que tampoco son expresables con HTML nativo. */}
          <label htmlFor="campo-consentimientoDatos" className="flex items-start gap-2 text-sm text-foreground">
            <input
              id="campo-consentimientoDatos"
              type="checkbox"
              checked={datos.consentimientoDatos}
              onChange={(e) => actualizar('consentimientoDatos', e.target.checked)}
              aria-invalid={Boolean(validacion.mensajes.consentimientoDatos)}
              aria-describedby={validacion.mensajes.consentimientoDatos ? 'campo-consentimientoDatos-error' : undefined}
              className="mt-1"
            />
            {t('campos.consentimiento')}
          </label>
          <MensajeErrorCampo id="campo-consentimientoDatos-error" mensaje={validacion.mensajes.consentimientoDatos} />
        </div>
      )}
    </div>
  );
}

/** H-44: movido tal cual desde formulario-registro.tsx, sin cambios. */
function ResumenDatos({
  datos,
  opciones,
  sedes,
  t,
  locale,
  onEditar,
}: {
  datos: DatosFormulario;
  opciones: ReturnType<typeof useOpcionesRegistro>;
  sedes: Sede[];
  t: ReturnType<typeof useTranslations<'registro'>>;
  locale: string;
  onEditar: (paso: number) => void;
}) {
  const sede = sedes.find((s) => s.id === datos.sedeId);
  const generoLabel = opciones.genero.find((o) => o.value === datos.genero)?.label ?? '';
  const estadoCivilLabel = opciones.estadoCivil.find((o) => o.value === datos.estadoCivil)?.label ?? '';
  const profesionLabel = opciones.profesion.find((o) => o.value === datos.profesion)?.label ?? '';
  const tiempoLabel =
    opciones.tiempoCongregacion.find((o) => o.value === datos.tiempoCongregacion)?.label ?? '';

  const grupos: { paso: number; titulo: string; filas: { label: string; valor: string }[] }[] = [
    {
      paso: 1,
      titulo: t('tituloPaso1'),
      filas: [
        { label: t('campos.apellido'), valor: datos.apellido },
        { label: t('campos.nombre'), valor: datos.nombre },
        { label: t('campos.genero'), valor: generoLabel },
        {
          label: t('campos.fechaNacimiento'),
          valor: datos.fechaNacimiento ? formatearFechaCorta(datos.fechaNacimiento, locale) : '',
        },
      ],
    },
    {
      paso: 2,
      titulo: t('tituloPaso2'),
      filas: [
        { label: t('campos.numeroTelefono'), valor: `${datos.telefonoCodigoPais} ${datos.telefonoNumero}` },
        { label: t('campos.direccion'), valor: datos.direccion },
        { label: t('campos.sede'), valor: sede?.nombre ?? '' },
      ],
    },
    {
      paso: 3,
      titulo: t('tituloPaso3'),
      filas: [
        { label: t('campos.estadoCivil'), valor: estadoCivilLabel },
        { label: t('campos.profesion'), valor: profesionLabel },
        ...(datos.profesion === 'otro'
          ? [{ label: t('campos.profesionDetalle'), valor: datos.profesionDetalle }]
          : []),
        { label: t('campos.tiempoCongregacion'), valor: tiempoLabel },
      ],
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      {grupos.map((grupo) => (
        <section key={grupo.paso} className="flex flex-col gap-2 rounded-lg border border-border p-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-medium text-foreground">{grupo.titulo}</h3>
            <button
              type="button"
              onClick={() => onEditar(grupo.paso)}
              className="shrink-0 text-sm font-medium text-primary underline-offset-2 hover:underline"
            >
              {t('botones.editar')}
            </button>
          </div>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            {grupo.filas.map((fila) => (
              <Fragment key={fila.label}>
                <dt className="font-medium text-muted-foreground">{fila.label}</dt>
                <dd className="text-foreground">{fila.valor || '—'}</dd>
              </Fragment>
            ))}
          </dl>
        </section>
      ))}
    </div>
  );
}
