'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { signIn, useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import {
  type Sede,
  type ErrorCode,
  type ErrorDeCampo,
  apiFetch,
  ApiError,
  erroresPorCampo,
} from '@vida-sobrenatural/shared-types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  ConfirmDestructiveDialog,
  EstadoActivoBadge,
  useEnvio,
} from '@vida-sobrenatural/ui';
import { toast } from 'sonner';
import { FormularioSede, sedeAValoresFormulario, datosSedeParaEnviar, type ValoresSede } from '../../../components/formulario-sede';

/**
 * H-52 (revisión manual ronda 4): detalle + edición de una Sede — antes
 * GET /sedes/:id y PATCH /sedes/:id existían sin ninguna pantalla que los
 * usara. H-51/D117: se puede abrir el detalle de una Sede inactiva y
 * reactivarla acá.
 */
export default function SedeDetallePage() {
  const params = useParams<{ id: string }>();
  const { data: session, status } = useSession();
  const [sede, setSede] = useState<Sede | null>(null);
  const [cargando, setCargando] = useState(true);
  const [noEncontrada, setNoEncontrada] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorGuardar, setErrorGuardar] = useState<string | null>(null);
  const [erroresCampoGuardar, setErroresCampoGuardar] = useState<ErrorDeCampo[] | null>(null);
  const [avisoUnicaActiva, setAvisoUnicaActiva] = useState(false);
  const te = useTranslations('errors');

  const cargarSede = useCallback(async () => {
    setCargando(true);
    setNoEncontrada(false);
    setError(null);
    try {
      setSede(await apiFetch<Sede>(`/sedes/${params.id}`));
    } catch (e) {
      if (e instanceof ApiError && e.code === 'NO_ENCONTRADO') {
        setNoEncontrada(true);
      } else {
        setError('No pudimos cargar la Sede.');
      }
    } finally {
      setCargando(false);
    }
  }, [params.id]);

  useEffect(() => {
    async function ejecutar() {
      await cargarSede();
    }
    ejecutar();
  }, [cargarSede]);

  const { enviando, ejecutar: guardar } = useEnvio(async (valores: ValoresSede) => {
    setErrorGuardar(null);
    setErroresCampoGuardar(null);
    try {
      await apiFetch(`/sedes/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.apiToken}` },
        body: JSON.stringify(datosSedeParaEnviar(valores)),
      });
      toast('Cambios guardados.');
      await cargarSede();
    } catch (e) {
      const campos = erroresPorCampo(e);
      if (campos) {
        setErroresCampoGuardar(campos);
      } else {
        setErrorGuardar(e instanceof ApiError ? te(e.code as ErrorCode) : 'No pudimos guardar los cambios.');
      }
    }
  });

  // H-57: el guard va también en el envío — ConfirmDestructiveDialog ya
  // cierra el diálogo apenas se confirma (así que ese botón puntual no
  // puede clickearse dos veces), pero desactivar()/reactivar() podrían
  // dispararse de nuevo si alguien reabre el diálogo mientras la primera
  // petición sigue en curso.
  const { enviando: desactivando, ejecutar: desactivar } = useEnvio(async () => {
    try {
      await apiFetch(`/sedes/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.apiToken}` },
        body: JSON.stringify({ activo: false }),
      });
      toast('Sede desactivada.');
      await cargarSede();
    } catch (e) {
      if (e instanceof ApiError && e.code === 'SEDE_UNICA_ACTIVA') {
        setAvisoUnicaActiva(true);
        return;
      }
      toast.error(e instanceof ApiError ? te(e.code as ErrorCode) : 'No pudimos desactivar la Sede.');
    }
  });

  const { enviando: reactivando, ejecutar: reactivar } = useEnvio(async () => {
    try {
      await apiFetch(`/sedes/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.apiToken}` },
        body: JSON.stringify({ activo: true }),
      });
      toast('Sede reactivada.');
      await cargarSede();
    } catch (e) {
      // H-51, borde: puede chocar con el nombre de una Sede creada mientras
      // esta estaba inactiva — decir cómo corregir, no solo "conflicto".
      if (e instanceof ApiError && e.code === 'SEDE_NOMBRE_DUPLICADO') {
        toast.error('Ya existe otra Sede activa con este nombre — cambiá el nombre antes de reactivar.');
        return;
      }
      toast.error(e instanceof ApiError ? te(e.code as ErrorCode) : 'No pudimos reactivar la Sede.');
    }
  });

  if (status === 'loading' || cargando) {
    return <div className="mx-auto max-w-2xl px-4 py-16">Cargando…</div>;
  }

  if (status === 'unauthenticated') {
    return (
      <div className="mx-auto flex max-w-xl flex-col gap-4 px-4 py-16">
        <h1 className="text-2xl font-semibold">Sede</h1>
        <Button onClick={() => signIn('google')}>Continuar con Google</Button>
      </div>
    );
  }

  if (noEncontrada) {
    return (
      <div className="mx-auto flex max-w-xl flex-col gap-4 px-4 py-16">
        <h1 className="text-2xl font-semibold">No encontramos esta Sede</h1>
        <Link href="/sedes" className="text-sm underline underline-offset-4">
          Volver a Sedes
        </Link>
      </div>
    );
  }

  if (error || !sede) {
    return (
      <div className="mx-auto flex max-w-xl flex-col gap-4 px-4 py-16">
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error ?? 'No pudimos cargar la Sede.'}
        </p>
        <Button variant="outline" onClick={cargarSede}>
          Reintentar
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-16">
      <Link href="/sedes" className="text-sm text-muted-foreground underline underline-offset-4">
        ← Volver a Sedes
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">{sede.nombre}</h1>
          <EstadoActivoBadge activo={sede.activo} />
        </div>

        {sede.activo ? (
          <ConfirmDestructiveDialog
            trigger={
              <Button
                variant="outline"
                className="text-destructive"
                loading={desactivando}
                loadingText="Desactivando…"
              >
                Desactivar
              </Button>
            }
            titulo={`¿Desactivar la Sede ${sede.nombre}?`}
            descripcion="Deja de mostrarse en Visitanos y en el registro. No se borra nada: las personas asociadas siguen igual y podés volver a activarla cuando quieras."
            textoConfirmar="Sí, desactivar"
            textoCancelar="Volver"
            onConfirmar={desactivar}
          />
        ) : (
          <ConfirmDestructiveDialog
            trigger={
              <Button loading={reactivando} loadingText="Reactivando…">
                Reactivar
              </Button>
            }
            titulo={`¿Reactivar la Sede ${sede.nombre}?`}
            descripcion="Vuelve a mostrarse en Visitanos y en el registro."
            textoConfirmar="Sí, reactivar"
            textoCancelar="Volver"
            onConfirmar={reactivar}
          />
        )}
      </div>

      <FormularioSede
        key={sede.id}
        valoresIniciales={sedeAValoresFormulario(sede)}
        onGuardar={guardar}
        enviando={enviando}
        textoBoton="Guardar cambios"
        textoEnviando="Guardando…"
        error={errorGuardar}
        erroresCampo={erroresCampoGuardar}
      />

      <AlertDialog open={avisoUnicaActiva} onOpenChange={setAvisoUnicaActiva}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Necesitás al menos una Sede activa</AlertDialogTitle>
            <AlertDialogDescription>{te('SEDE_UNICA_ACTIVA')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Volver</AlertDialogCancel>
            <AlertDialogAction render={<Link href="/sedes">Crear una Sede</Link>} />
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
