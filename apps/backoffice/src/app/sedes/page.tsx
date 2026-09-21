'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
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
  Button,
  EstadoActivoBadge,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  useEnvio,
} from '@vida-sobrenatural/ui';
import { toast } from 'sonner';
import { FormularioSede, VALORES_SEDE_VACIOS, datosSedeParaEnviar, type ValoresSede } from '../../components/formulario-sede';

type Filtro = 'activas' | 'todas';

/**
 * H-51/H-52 (revisión manual ronda 4, D117): el listado muestra también las
 * Sedes inactivas (con un filtro activas/todas) — antes desaparecían sin
 * forma de reactivarlas. Las filas llevan al detalle (`sedes/[id]`, nuevo),
 * que es donde vive la edición, Desactivar y Reactivar; acá solo se lista y
 * se da de alta (en un modal, no un formulario siempre visible).
 *
 * H-52, alcance: sin búsqueda, filtros de más, orden ni paginación — con una
 * o dos filas son ruido (Principio IV). Eso es del spec 004 (tabla
 * compartida en packages/ui, Principio XI).
 */
export default function SedesPage() {
  const { data: session, status } = useSession();
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [filtro, setFiltro] = useState<Filtro>('activas');
  const [error, setError] = useState<string | null>(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [errorAlta, setErrorAlta] = useState<string | null>(null);
  const [erroresCampoAlta, setErroresCampoAlta] = useState<ErrorDeCampo[] | null>(null);
  const te = useTranslations('errors');

  const cargarSedes = useCallback(async () => {
    setError(null);
    try {
      setSedes(await apiFetch<Sede[]>(`/sedes?estado=${filtro}`));
    } catch {
      // GET /sedes es público — un fallo acá es de red, no de permisos.
      setError('No pudimos cargar las Sedes.');
    }
  }, [filtro]);

  useEffect(() => {
    async function ejecutar() {
      await cargarSedes();
    }
    ejecutar();
  }, [cargarSedes]);

  const { enviando, ejecutar: crearSede } = useEnvio(async (valores: ValoresSede) => {
    setErrorAlta(null);
    setErroresCampoAlta(null);
    try {
      await apiFetch('/sedes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.apiToken}` },
        body: JSON.stringify(datosSedeParaEnviar(valores)),
      });
      toast('Sede creada.');
      setModalAbierto(false);
      await cargarSedes();
    } catch (e) {
      const campos = erroresPorCampo(e);
      if (campos) {
        setErroresCampoAlta(campos);
      } else {
        setErrorAlta(e instanceof ApiError ? te(e.code as ErrorCode) : 'No pudimos crear la Sede.');
      }
    }
  });

  if (status === 'loading') {
    return <div className="mx-auto max-w-3xl px-4 py-16">Cargando…</div>;
  }

  if (status === 'unauthenticated') {
    return (
      <div className="mx-auto flex max-w-xl flex-col gap-4 px-4 py-16">
        <h1 className="text-2xl font-semibold">Sedes</h1>
        <Button onClick={() => signIn('google')}>Continuar con Google</Button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-16">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Sedes</h1>
        <Button
          onClick={() => {
            setErrorAlta(null);
            setErroresCampoAlta(null);
            setModalAbierto(true);
          }}
        >
          Crear Sede
        </Button>
      </div>

      {error && (
        <div className="flex items-center justify-between gap-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          <p>{error}</p>
          <Button variant="outline" size="sm" onClick={cargarSedes}>
            Reintentar
          </Button>
        </div>
      )}

      <div className="flex gap-2" role="group" aria-label="Filtrar por estado">
        <Button variant={filtro === 'activas' ? 'default' : 'outline'} size="sm" onClick={() => setFiltro('activas')}>
          Activas
        </Button>
        <Button variant={filtro === 'todas' ? 'default' : 'outline'} size="sm" onClick={() => setFiltro('todas')}>
          Todas
        </Button>
      </div>

      <section className="flex flex-col gap-3">
        {sedes.length === 0 && (
          <p className="text-muted-foreground">
            {filtro === 'activas' ? 'Todavía no hay Sedes activas.' : 'Todavía no hay Sedes cargadas.'}
          </p>
        )}
        {sedes.map((sede) => (
          <Link
            key={sede.id}
            href={`/sedes/${sede.id}`}
            className="flex flex-col gap-1 rounded-lg border border-border p-4 hover:bg-muted/50"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="font-medium">{sede.nombre}</p>
              {filtro === 'todas' && <EstadoActivoBadge activo={sede.activo} />}
            </div>
            <p className="text-sm text-muted-foreground">{sede.direccion}</p>
            <p className="text-sm text-muted-foreground">{sede.horarios}</p>
          </Link>
        ))}
      </section>

      <Sheet open={modalAbierto} onOpenChange={setModalAbierto}>
        <SheetContent side="right">
          <SheetHeader>
            <SheetTitle>Crear Sede</SheetTitle>
            <SheetDescription>Se agrega activa; podés editarla después desde su detalle.</SheetDescription>
          </SheetHeader>
          <div className="px-4">
            <FormularioSede
              valoresIniciales={VALORES_SEDE_VACIOS}
              onGuardar={crearSede}
              enviando={enviando}
              textoBoton="Crear Sede"
              textoEnviando="Creando…"
              error={errorAlta}
              erroresCampo={erroresCampoAlta}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
