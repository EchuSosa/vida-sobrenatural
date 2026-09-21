'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { signIn, useSession } from 'next-auth/react';
import { useLocale, useTranslations } from 'next-intl';
import {
  type Sede,
  type ErrorCode,
  apiFetch,
  ApiError,
  formatearFechaHora,
} from '@vida-sobrenatural/shared-types';
import { Button, TablaDatos, type ColumnaTabla } from '@vida-sobrenatural/ui';
import { toast } from 'sonner';

/**
 * D119: papelera de Sedes, para el Admin — desde acá se restauran las que
 * se eliminaron por error (duplicada, de prueba, nombre equivocado). El
 * endpoint (`GET /sedes?estado=papelera`) está gateado por rol — quien no
 * sea Admin recibe 403, tratado como cualquier otro error de permiso.
 */
export default function PapeleraSedesPage() {
  const { data: session, status } = useSession();
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const te = useTranslations('errors');
  const locale = useLocale();
  const procesandoRef = useRef(new Set<string>());
  const [restaurandoId, setRestaurandoId] = useState<string | null>(null);

  const cargarPapelera = useCallback(async () => {
    if (!session?.apiToken) return;
    setCargando(true);
    setError(null);
    try {
      setSedes(
        await apiFetch<Sede[]>('/sedes?estado=papelera', {
          headers: { Authorization: `Bearer ${session.apiToken}` },
        }),
      );
    } catch (e) {
      setError(e instanceof ApiError ? te(e.code as ErrorCode) : 'No pudimos cargar la papelera.');
    } finally {
      setCargando(false);
    }
  }, [session, te]);

  useEffect(() => {
    async function ejecutar() {
      await cargarPapelera();
    }
    ejecutar();
  }, [cargarPapelera]);

  async function restaurar(sede: Sede) {
    if (procesandoRef.current.has(sede.id)) return;
    procesandoRef.current.add(sede.id);
    setRestaurandoId(sede.id);
    try {
      await apiFetch(`/sedes/${sede.id}/restaurar`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.apiToken}` },
      });
      toast(`${sede.nombre} restaurada.`);
      await cargarPapelera();
    } catch (e) {
      toast.error(e instanceof ApiError ? te(e.code as ErrorCode) : 'No pudimos restaurar la Sede.');
    } finally {
      procesandoRef.current.delete(sede.id);
      setRestaurandoId(null);
    }
  }

  if (status === 'loading') {
    return <div className="mx-auto max-w-3xl px-4 py-16">Cargando…</div>;
  }

  if (status === 'unauthenticated') {
    return (
      <div className="mx-auto flex max-w-xl flex-col gap-4 px-4 py-16">
        <h1 className="text-2xl font-semibold">Papelera de Sedes</h1>
        <Button onClick={() => signIn('google')}>Continuar con Google</Button>
      </div>
    );
  }

  const columnas: ColumnaTabla<Sede>[] = [
    { id: 'nombre', encabezado: 'Nombre', celda: (sede) => <span className="font-medium">{sede.nombre}</span> },
    {
      id: 'eliminadoEn',
      encabezado: 'Eliminada el',
      className: 'hidden sm:table-cell',
      celda: (sede) => (sede.eliminadoEn ? formatearFechaHora(sede.eliminadoEn, locale) : '—'),
    },
  ];

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-16">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Papelera de Sedes</h1>
        <Link href="/sedes" className="text-sm text-muted-foreground underline underline-offset-4">
          Volver a Sedes
        </Link>
      </div>
      <p className="text-sm text-muted-foreground">
        Sedes eliminadas (D119) — corregí un error de carga acá. Restaurar las devuelve a &quot;Todas&quot;.
      </p>

      {error && (
        <div className="flex items-center justify-between gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <p>{error}</p>
          <Button variant="outline" size="sm" onClick={cargarPapelera}>
            Reintentar
          </Button>
        </div>
      )}

      {!error && (
        <TablaDatos
          columnas={columnas}
          datos={sedes}
          obtenerId={(sede) => sede.id}
          etiqueta="Papelera de Sedes"
          cargando={cargando}
          mensajeVacio="La papelera está vacía."
          acciones={(sede) => (
            <Button
              variant="outline"
              size="sm"
              loading={restaurandoId === sede.id}
              loadingText="Restaurando…"
              onClick={() => restaurar(sede)}
            >
              Restaurar
            </Button>
          )}
        />
      )}
    </div>
  );
}
