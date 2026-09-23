'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
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
import { Button, ControlesTabla, TablaDatos, type ColumnaTabla, type OrdenTabla, useEnvio } from '@vida-sobrenatural/ui';
import { toast } from 'sonner';
import { useControlesTablaUrl } from '../../hooks/use-controles-tabla-url';
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
 * "Marcar vigente" de cada fila, y el orden que navega (H-88). D129
 * (revisión manual): Admin y Pastor administran los dos
 * (`puedeAdministrarPalabraProfetica`) — cualquier otro rol ni siquiera
 * llega a esta pantalla (page.tsx).
 */
export function PalabraProfeticaCliente({
  historial,
  orden,
  apiToken,
  puedeAdministrarPalabraProfetica,
}: {
  historial: PalabraProfetica[];
  orden: OrdenTabla;
  apiToken: string;
  puedeAdministrarPalabraProfetica: boolean;
}) {
  const router = useRouter();
  const locale = useLocale();
  const te = useTranslations('errors');
  const [errorAlta, setErrorAlta] = useState<string | null>(null);
  const [erroresCampoAlta, setErroresCampoAlta] = useState<ErrorDeCampo[] | null>(null);
  const procesandoRef = useRef(new Set<string>());
  const [marcandoId, setMarcandoId] = useState<string | null>(null);
  const { busqueda, setBusqueda, actualizarParams, limpiar } = useControlesTablaUrl();

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
      // H-104: YOUTUBE_URL_INVALIDA ya viaja con `errors: [{campo:
      // 'youtubeUrl', ...}]` desde el servicio — sin caso especial acá,
      // el mismo mecanismo que cualquier otro campo.
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
        <h2 className="text-xl font-medium">
          {/* D129: Admin y Pastor administran los dos — hoy nadie que
              llegue a esta pantalla ve la rama de solo lectura (page.tsx ya
              bloquea cualquier otro rol antes de renderizar esto), pero el
              texto sigue siendo correcto si algún día se suma un rol
              nuevo con acceso de lectura. */}
          {puedeAdministrarPalabraProfetica ? 'Cargar una nueva' : 'Alta (sin permiso para cargar)'}
        </h2>
        <FormularioPalabraProfetica
          valoresIniciales={VALORES_PALABRA_PROFETICA_VACIOS}
          onGuardar={crear}
          enviando={enviando}
          textoBoton="Crear"
          textoEnviando="Creando…"
          error={errorAlta}
          erroresCampo={erroresCampoAlta}
          soloLectura={!puedeAdministrarPalabraProfetica}
        />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-medium">Historial</h2>
        <ControlesTabla
          busqueda={busqueda}
          onBuscarChange={setBusqueda}
          etiquetaBusqueda="Buscar en el historial"
          placeholderBusqueda="Ej. Fidelidad y crecimiento"
          hayAlgoAplicado={busqueda.trim() !== ''}
          onLimpiar={() => limpiar()}
          cantidadResultados={historial.length}
        />
        <TablaDatos
          columnas={columnas}
          datos={historial}
          obtenerId={(p) => p.id}
          etiqueta="Historial de Palabra Profética"
          mensajeVacio={
            busqueda.trim()
              ? `No encontramos ninguna Palabra Profética que coincida con "${busqueda.trim()}".`
              : 'Todavía no hay ninguna Palabra Profética cargada.'
          }
          orden={orden}
          onOrdenar={onOrdenar}
          acciones={
            puedeAdministrarPalabraProfetica
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
      </section>
    </div>
  );
}
