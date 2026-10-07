'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import {
  apiFetch,
  CAPITULOS_MAX,
  hoyEnArgentina,
  NOTAS_ENCUENTRO_MAX,
  type EncuentroDelDiscipulador,
} from '@vida-sobrenatural/shared-types';
import {
  Button,
  CampoFecha,
  Input,
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
  type ValidacionCampo,
} from '@vida-sobrenatural/ui';
import { mensajeDeError, mensajesDeCampo } from '../comun';

export interface PersonaDeAsistencia {
  inscripcionId: string;
  personaId: string;
  nombre: string;
}

/**
 * specs/004, T046 (FR-009, FR-013, FR-013a, FR-041): registrar o editar un
 * Encuentro. Formulario estilo GOV.UK (docs/15): etiqueta arriba, ayuda
 * debajo, validación al salir del campo y al enviar, resumen con foco
 * (H-50/H-72). La asistencia arranca con todos presentes: solo se marca quién
 * faltó. Sin borrar (FR-041). Se remonta con `key` para arrancar limpio.
 */
export function FormularioEncuentro({
  abierto,
  onCerrar,
  onGuardado,
  grupoId,
  apiToken,
  personas,
  encuentro,
}: {
  abierto: boolean;
  onCerrar: () => void;
  onGuardado: () => void;
  grupoId: string;
  apiToken: string;
  personas: PersonaDeAsistencia[];
  /** Si viene, se edita; si no, se registra uno nuevo. */
  encuentro: EncuentroDelDiscipulador | null;
}) {
  const t = useTranslations('misDiscipulados');
  const tc = useTranslations('comun');
  const te = useTranslations('errors');
  const tcf = useTranslations('campoFecha');
  const hoy = hoyEnArgentina();
  const [fecha, setFecha] = useState(encuentro?.fecha ?? hoy);
  const [capitulos, setCapitulos] = useState(encuentro?.capitulos ?? '');
  const [notas, setNotas] = useState(encuentro?.notas ?? '');
  const [faltaron, setFaltaron] = useState<Set<string>>(
    () => new Set(encuentro ? encuentro.asistencias.filter((a) => !a.presente).map((a) => a.personaId) : []),
  );
  const validacion = useValidacionCampos();

  const reglas = {
    fecha: {
      esValido: (v: string) => v !== '' && v <= hoy,
      mensaje: fecha === '' ? te('campos.FECHA_REQUERIDA') : te('campos.FECHA_FUTURA'),
    } satisfies ValidacionCampo<string>,
    capitulos: { esValido: (v: string) => v.trim() !== '' && v.trim().length <= CAPITULOS_MAX, mensaje: te('campos.CAPITULOS_REQUERIDO') } satisfies ValidacionCampo<string>,
    notas: { esValido: (v: string) => v.trim().length <= NOTAS_ENCUENTRO_MAX, mensaje: te('campos.NOTAS_DEMASIADO_LARGAS') } satisfies ValidacionCampo<string>,
  };

  const { enviando, ejecutar: guardar } = useEnvio(async () => {
    const errores: Record<string, string> = {};
    if (fecha === '') errores.fecha = te('campos.FECHA_REQUERIDA');
    else if (fecha > hoy) errores.fecha = te('campos.FECHA_FUTURA');
    if (!reglas.capitulos.esValido(capitulos)) errores.capitulos = reglas.capitulos.mensaje;
    if (!reglas.notas.esValido(notas)) errores.notas = reglas.notas.mensaje;
    if (Object.keys(errores).length > 0) {
      validacion.reemplazar(errores);
      return;
    }

    const cuerpo = {
      fecha,
      capitulos: capitulos.trim(),
      notas: notas.trim() === '' ? null : notas.trim(),
      asistencias: personas.map((p) => ({ inscripcionId: p.inscripcionId, presente: !faltaron.has(p.personaId) })),
    };
    try {
      await apiFetch(
        encuentro ? `/discipulado/mis-discipulados/${grupoId}/encuentros/${encuentro.id}` : `/discipulado/mis-discipulados/${grupoId}/encuentros`,
        {
          method: encuentro ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiToken}` },
          body: JSON.stringify(cuerpo),
        },
      );
      toast(encuentro ? t('detalle.formulario.exitoEditado') : t('detalle.formulario.exitoNuevo'));
      onGuardado();
    } catch (e) {
      const campos = mensajesDeCampo(e, te, t);
      if (campos) validacion.reemplazar(campos);
      else toast.error(mensajeDeError(e, te, t));
    }
  });

  return (
    <Sheet open={abierto} onOpenChange={(a) => !a && onCerrar()}>
      <SheetContent side="right" etiquetaCerrar={tc('cerrarPanel')} className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{encuentro ? t('detalle.formulario.tituloEditar') : t('detalle.formulario.tituloNuevo')}</SheetTitle>
          <SheetDescription>{t('detalle.formulario.descripcion')}</SheetDescription>
        </SheetHeader>
        <form
          noValidate
          className="flex flex-col gap-5 px-4"
          onSubmit={(e) => {
            e.preventDefault();
            void guardar();
          }}
        >
          <ResumenErrores errores={validacion.resumen} foco={validacion.foco} titulo={t('campos.resumen')} />

          <div className="flex flex-col gap-1">
            <CampoFecha
              id="campo-fecha"
              etiqueta={t('detalle.formulario.fecha')}
              value={fecha}
              etiquetas={{ dia: tcf('dia'), mes: tcf('mes'), anio: tcf('anio'), meses: tcf.raw('meses') as EtiquetasCampoFecha['meses'] }}
              onChange={(v) => {
                setFecha(v);
                validacion.limpiar('fecha');
              }}
              onBlur={() => validacion.revalidar('fecha', fecha, reglas.fecha)}
              error={Boolean(validacion.mensajes.fecha)}
              idError="campo-fecha-error"
            />
            <MensajeErrorCampo id="campo-fecha-error" mensaje={validacion.mensajes.fecha} />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="campo-capitulos" className="text-sm font-medium">
              {t('detalle.formulario.capitulos')}
            </label>
            <p id="campo-capitulos-ayuda" className="text-sm text-muted-foreground">
              {t('detalle.formulario.capitulosAyuda')}
            </p>
            <Input
              id="campo-capitulos"
              value={capitulos}
              maxLength={CAPITULOS_MAX}
              className="h-11"
              onChange={(e) => {
                setCapitulos(e.target.value);
                validacion.limpiar('capitulos');
              }}
              onBlur={() => validacion.revalidar('capitulos', capitulos, reglas.capitulos)}
              aria-invalid={Boolean(validacion.mensajes.capitulos)}
              aria-describedby={validacion.mensajes.capitulos ? 'campo-capitulos-ayuda campo-capitulos-error' : 'campo-capitulos-ayuda'}
            />
            <MensajeErrorCampo id="campo-capitulos-error" mensaje={validacion.mensajes.capitulos} />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="campo-notas" className="text-sm font-medium">
              {t('detalle.formulario.notas')}
            </label>
            <p id="campo-notas-ayuda" className="text-sm text-muted-foreground">
              {t('detalle.formulario.notasAyuda')}
            </p>
            <textarea
              id="campo-notas"
              rows={5}
              value={notas}
              onChange={(e) => {
                setNotas(e.target.value);
                validacion.limpiar('notas');
              }}
              onBlur={() => validacion.revalidar('notas', notas, reglas.notas)}
              aria-invalid={Boolean(validacion.mensajes.notas)}
              aria-describedby={validacion.mensajes.notas ? 'campo-notas-ayuda campo-notas-error' : 'campo-notas-ayuda'}
              className="min-h-28 rounded-md border border-input bg-transparent px-3 py-2 text-base aria-invalid:border-destructive md:text-sm dark:bg-input/30"
            />
            <MensajeErrorCampo id="campo-notas-error" mensaje={validacion.mensajes.notas} />
          </div>

          {personas.length > 0 && (
            <fieldset id="campo-asistencias" tabIndex={-1} className="flex flex-col gap-1 outline-none" aria-describedby="campo-asistencias-ayuda">
              <legend className="text-sm font-medium">{t('detalle.formulario.asistencia')}</legend>
              <p id="campo-asistencias-ayuda" className="text-sm text-muted-foreground">
                {t('detalle.formulario.asistenciaAyuda')}
              </p>
              {personas.map((p) => (
                <label key={p.inscripcionId} className="flex min-h-11 items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    className="size-5 accent-primary"
                    checked={faltaron.has(p.personaId)}
                    onChange={(e) => {
                      const siguiente = new Set(faltaron);
                      if (e.target.checked) siguiente.add(p.personaId);
                      else siguiente.delete(p.personaId);
                      setFaltaron(siguiente);
                      validacion.limpiar('asistencias');
                    }}
                  />
                  {t('detalle.formulario.falto', { nombre: p.nombre })}
                </label>
              ))}
              <MensajeErrorCampo id="campo-asistencias-error" mensaje={validacion.mensajes.asistencias} />
            </fieldset>
          )}

          <SheetFooter className="flex-col gap-2 px-0 sm:flex-row-reverse sm:justify-start">
            <Button type="submit" size="xl" className="w-full sm:w-auto" loading={enviando} loadingText={t('detalle.formulario.guardando')}>
              {encuentro ? t('detalle.formulario.guardarCambios') : t('detalle.formulario.guardar')}
            </Button>
            <Button type="button" size="xl" variant="outline" className="w-full sm:w-auto" onClick={onCerrar}>
              {t('detalle.volver')}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
