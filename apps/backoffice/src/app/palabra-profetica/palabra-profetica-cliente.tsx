'use client';

import { useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import {
  type PalabraProfetica,
  type ErrorCode,
  type ErrorDeCampo,
  apiFetch,
  ApiError,
  erroresPorCampo,
  formatearFechaHora,
} from '@vida-sobrenatural/shared-types';
import { Button, EstadoVacio, TablaDatos, type ColumnaTabla, type OrdenTabla, useEnvio } from '@vida-sobrenatural/ui';
import { toast } from 'sonner';
import {
  FormularioPalabraProfetica,
  VALORES_PALABRA_PROFETICA_VACIOS,
  datosPalabraProfeticaParaEnviar,
  type ValoresPalabraProfetica,
} from '../../components/formulario-palabra-profetica';

/** Mismo criterio que page.tsx: createdAt arranca desc, el resto asc. */
function direccionDefaultDe(columna: string): 'asc' | 'desc' {
  return columna === 'createdAt' ? 'desc' : 'asc';
}

/**
 * Historia 3 (D64): `historial` llega ya cargado y ordenado desde page.tsx
 * (Server Component). Isla de cliente: el formulario de alta, el botón
 * "Marcar vigente" de cada fila, y el orden que navega (H-88). Pastor
 * (`esAdmin: false`) ve todo, sin ningún control habilitado — el formulario
 * queda `inert` (FormularioPalabraProfetica) y la columna de acciones no se
 * renderiza.
 */
export function PalabraProfeticaCliente({
  historial,
  orden,
  apiToken,
  esAdmin,
}: {
  historial: PalabraProfetica[];
  orden: OrdenTabla;
  apiToken: string;
  esAdmin: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = useLocale();
  const te = useTranslations('errors');
  const [errorAlta, setErrorAlta] = useState<string | null>(null);
  const [erroresCampoAlta, setErroresCampoAlta] = useState<ErrorDeCampo[] | null>(null);
  const procesandoRef = useRef(new Set<string>());
  const [marcandoId, setMarcandoId] = useState<string | null>(null);

  function actualizarParams(cambios: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams);
    for (const [clave, valor] of Object.entries(cambios)) {
      if (valor === null) params.delete(clave);
      else params.set(clave, valor);
    }
    const query = params.toString();
    router.push(query ? `/palabra-profetica?${query}` : '/palabra-profetica');
  }

  function onOrdenar(columnaId: string) {
    const siguienteDireccion: 'asc' | 'desc' =
      orden.columna === columnaId ? (orden.direccion === 'asc' ? 'desc' : 'asc') : direccionDefaultDe(columnaId);
    actualizarParams({
      orden: columnaId === 'createdAt' ? null : columnaId,
      dir: siguienteDireccion === direccionDefaultDe(columnaId) ? null : siguienteDireccion,
    });
  }

  const { enviando, ejecutar: crear } = useEnvio(async (valores: ValoresPalabraProfetica) => {
    setErrorAlta(null);
    setErroresCampoAlta(null);
    try {
      await apiFetch('/palabra-profetica', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiToken}` },
        body: JSON.stringify(datosPalabraProfeticaParaEnviar(valores)),
      });
      toast('Palabra Profética creada.');
      router.refresh();
    } catch (e) {
      if (e instanceof ApiError && e.code === 'YOUTUBE_URL_INVALIDA') {
        setErroresCampoAlta([{ campo: 'youtubeUrl', code: e.code }]);
        return;
      }
      const campos = erroresPorCampo(e);
      if (campos) {
        setErroresCampoAlta(campos);
      } else {
        setErrorAlta(e instanceof ApiError ? te(e.code as ErrorCode) : 'No pudimos crear la Palabra Profética.');
      }
    }
  });

  async function marcarVigente(item: PalabraProfetica) {
    if (procesandoRef.current.has(item.id)) return;
    procesandoRef.current.add(item.id);
    setMarcandoId(item.id);
    try {
      await apiFetch(`/palabra-profetica/${item.id}/marcar-vigente`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${apiToken}` },
      });
      toast(`"${item.titulo}" marcada vigente.`);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof ApiError ? te(e.code as ErrorCode) : 'No pudimos marcar la Palabra Profética como vigente.');
    } finally {
      procesandoRef.current.delete(item.id);
      setMarcandoId(null);
    }
  }

  const columnas: ColumnaTabla<PalabraProfetica>[] = [
    { id: 'anio', encabezado: 'Año', ordenable: true, celda: (p) => <span className="font-medium">{p.anio}</span> },
    { id: 'titulo', encabezado: 'Título', ordenable: true, celda: (p) => p.titulo },
    {
      id: 'estado',
      encabezado: 'Estado',
      ordenable: true,
      celda: (p) =>
        p.vigente ? (
          <span className="text-sm font-medium text-success">Vigente</span>
        ) : (
          <span className="text-sm text-muted-foreground">No vigente</span>
        ),
    },
    {
      id: 'createdAt',
      encabezado: 'Creada',
      ordenable: true,
      className: 'hidden sm:table-cell',
      celda: (p) => formatearFechaHora(p.createdAt, locale),
    },
  ];

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8 px-4 py-16">
      <h1 className="text-2xl font-semibold">Palabra Profética</h1>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-medium">{esAdmin ? 'Cargar una nueva' : 'Alta (solo Admin)'}</h2>
        <FormularioPalabraProfetica
          valoresIniciales={VALORES_PALABRA_PROFETICA_VACIOS}
          onGuardar={crear}
          enviando={enviando}
          textoBoton="Crear"
          textoEnviando="Creando…"
          error={errorAlta}
          erroresCampo={erroresCampoAlta}
          soloLectura={!esAdmin}
        />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-medium">Historial</h2>
        {historial.length === 0 ? (
          <EstadoVacio mensaje="Todavía no hay ninguna Palabra Profética cargada." />
        ) : (
          <TablaDatos
            columnas={columnas}
            datos={historial}
            obtenerId={(p) => p.id}
            etiqueta="Historial de Palabra Profética"
            mensajeVacio="Todavía no hay ninguna Palabra Profética cargada."
            orden={orden}
            onOrdenar={onOrdenar}
            acciones={
              esAdmin
                ? (p) =>
                    p.vigente ? null : (
                      <Button
                        variant="outline"
                        size="sm"
                        loading={marcandoId === p.id}
                        loadingText="Marcando…"
                        onClick={() => marcarVigente(p)}
                      >
                        Marcar vigente
                      </Button>
                    )
                : undefined
            }
          />
        )}
      </section>
    </div>
  );
}
