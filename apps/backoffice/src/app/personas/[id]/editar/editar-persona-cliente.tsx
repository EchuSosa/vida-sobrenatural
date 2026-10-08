'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { ApiError, anioEnArgentina, apiFetch, erroresPorCampo, type PerfilPersona, type PersonaConMismoDni } from '@vida-sobrenatural/shared-types';
import { Button, ButtonLink, MigaDePan, ResumenErrores, useEnvio, useValidacionCampos } from '@vida-sobrenatural/ui';
import {
  CamposPersona,
  cuerpoPersona,
  datosPersonaDesde,
  erroresLocalesPersona,
  useMensajeCampoPersona,
  type CuerpoPersona,
  type DatosPersonaFormulario,
} from '../../../../components/campos-persona';

/**
 * spec 013, Historia 7 (T082, FR-057, FR-058): el Admin corrige los datos de
 * una Persona con el formulario del alta (`CamposPersona`: mismos campos,
 * reglas y mensajes por campo — H7.1). Solo se manda lo que cambió, así un
 * dato viejo que no se toca no bloquea (la API valida lo enviado). D133
 * (H7.2): la API rechaza una fecha que vuelve menor a quien tiene un rol de
 * cargo, y acá se explica qué hacer. Email de otra Persona (H7.3) y DNI
 * repetido (D215): error en su campo. Al guardar, toast y vuelta al perfil
 * (H7.4). Envío protegido de la reentrada (H-57).
 */
export function EditarPersonaCliente({
  perfil,
  sedes,
  sedeActualInactiva,
  apiToken,
}: {
  perfil: PerfilPersona;
  sedes: Array<{ id: string; nombre: string }>;
  sedeActualInactiva: { id: string; nombre: string } | null;
  apiToken: string;
}) {
  const t = useTranslations('personasEditar');
  const ta = useTranslations('personasAlta');
  const te = useTranslations('errors');
  const mensaje = useMensajeCampoPersona();
  const router = useRouter();
  const validacion = useValidacionCampos();
  const inicial = useMemo(() => datosPersonaDesde(perfil), [perfil]);
  const [datos, setDatos] = useState<DatosPersonaFormulario>(inicial);
  const [conMismoDni, setConMismoDni] = useState<PersonaConMismoDni | null>(null);
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [sinCambios, setSinCambios] = useState(false);
  const anioActual = anioEnArgentina();
  const nombre = `${perfil.nombre} ${perfil.apellido}`;
  const opcionesSede = sedeActualInactiva ? [...sedes, { id: sedeActualInactiva.id, nombre: t('sedeInactiva', { nombre: sedeActualInactiva.nombre }) }] : sedes;

  function cambiar<K extends keyof DatosPersonaFormulario>(campo: K, valor: DatosPersonaFormulario[K]) {
    setDatos((d) => ({ ...d, [campo]: valor }));
    validacion.limpiar(campo === 'codigoPais' || campo === 'numero' ? 'telefono' : campo);
    setSinCambios(false);
    if (campo === 'dni') setConMismoDni(null);
  }

  /** Solo los campos que cambiaron respecto de los datos actuales. */
  function cambios(): Partial<CuerpoPersona> {
    const ahora = cuerpoPersona(datos);
    const antes = cuerpoPersona(inicial);
    const claves = (Object.keys(ahora) as Array<keyof CuerpoPersona>).filter((k) => JSON.stringify(ahora[k] ?? null) !== JSON.stringify(antes[k] ?? null));
    // Con "Otro", el detalle va siempre junto con la profesión.
    if (claves.includes('profesion') && ahora.profesion === 'otro' && !claves.includes('profesionDetalle')) claves.push('profesionDetalle');
    return Object.fromEntries(claves.map((k) => [k, ahora[k] ?? null])) as Partial<CuerpoPersona>;
  }

  const { enviando, ejecutar } = useEnvio(async () => {
    setErrorGeneral(null);
    const enviados = cambios();
    if (Object.keys(enviados).length === 0) {
      setSinCambios(true);
      return;
    }
    const locales = Object.fromEntries(
      Object.entries(erroresLocalesPersona(cuerpoPersona(datos), mensaje, { anioActual, soloAdultos: false })).filter(([campo]) => campo in enviados),
    );
    if (Object.keys(locales).length > 0) {
      validacion.reemplazar(locales);
      return;
    }
    try {
      await apiFetch<PerfilPersona>(`/personas/${perfil.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiToken}` },
        body: JSON.stringify(enviados),
      });
      toast(t('guardado'));
      router.push(`/personas/${perfil.id}`);
      router.refresh();
    } catch (error) {
      if (error instanceof ApiError && error.code === 'DNI_DUPLICADO') {
        const persona = (error.extensiones?.persona as PersonaConMismoDni | undefined) ?? null;
        setConMismoDni(persona);
        validacion.reemplazar({ dni: persona ? t('dniDuplicado', { nombre: `${persona.nombre} ${persona.apellido}` }) : mensaje('dni', 'DNI_DUPLICADO') });
        return;
      }
      // D133: se explica qué hacer, no solo qué pasó.
      if (error instanceof ApiError && error.code === 'PERSONA_MENOR_DE_EDAD_NO_PUEDE_TENER_ROL_DE_CARGO') {
        validacion.reemplazar({ fechaNacimiento: t('menorConRolDeCargo') });
        return;
      }
      if (error instanceof ApiError && error.code === 'EMAIL_DUPLICADO') {
        validacion.reemplazar({ email: t('emailDuplicado') });
        return;
      }
      const campos = erroresPorCampo(error);
      if (campos) {
        validacion.reemplazar(Object.fromEntries(campos.map(({ campo, code }) => [campo, mensaje(campo, code)])));
        return;
      }
      const code = error instanceof ApiError ? error.code : null;
      setErrorGeneral(code && te.has(code) ? te(code) : t('errorGenerico'));
    }
  });

  const m = validacion.mensajes;
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-16">
      <MigaDePan
        tramos={[{ label: ta('personas'), href: '/personas' }, { label: nombre, href: `/personas/${perfil.id}` }, { label: t('miga') }]}
        LinkComponente={Link}
      />
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">{t('titulo', { nombre })}</h1>
        <p className="text-muted-foreground">{t('descripcion')}</p>
      </div>

      <form
        noValidate
        className="flex flex-col gap-6"
        onSubmit={(e) => {
          e.preventDefault();
          void ejecutar();
        }}
      >
        <ResumenErrores errores={validacion.resumen} foco={validacion.foco} titulo={ta('resumenErrores')} />
        {errorGeneral && (
          <p role="alert" className="rounded-md border border-destructive px-3 py-2">
            {errorGeneral}
          </p>
        )}

        <CamposPersona
          datos={datos}
          cambiar={cambiar}
          mensajes={m}
          sedes={opcionesSede}
          anioActual={anioActual}
          ayudaFechaNacimiento={t('ayudaFechaNacimiento')}
          despuesDelDni={
            conMismoDni &&
            m.dni && (
              <Link href={`/personas/${conMismoDni.id}`} className="w-fit text-sm underline underline-offset-4">
                {ta('dniDuplicado.ver', { nombre: `${conMismoDni.nombre} ${conMismoDni.apellido}` })}
              </Link>
            )
          }
        />

        {sinCambios && (
          <p role="status" className="rounded-md border border-border px-3 py-2">
            {t('sinCambios')}
          </p>
        )}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <ButtonLink href={`/personas/${perfil.id}`} variant="ghost" size="xl">
            {t('cancelar')}
          </ButtonLink>
          <Button type="submit" size="xl" loading={enviando} loadingText={ta('guardando')}>
            {t('guardar')}
          </Button>
        </div>
      </form>
    </div>
  );
}
