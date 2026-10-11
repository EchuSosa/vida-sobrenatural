'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { CalendarClock, CircleAlert, CircleSlash, Church, Crosshair, MapPin, Navigation, Search, UserRound, UserPlus } from 'lucide-react';
import {
  ApiError,
  DIAS_SEMANA,
  DIRECCION_BUSQUEDA_MAX,
  NOMBRE_BUSQUEDA_GRUPO_MAX,
  NOMBRE_BUSQUEDA_GRUPO_MIN,
  apiFetch,
  erroresPorCampo,
  formatearDistanciaKm,
  type DiaSemana,
  type GrupoExtensionEncontrado,
} from '@vida-sobrenatural/shared-types';
import { Button, ConfirmDestructiveDialog, EstadoVacio, Input, MensajeErrorCampo, ResumenErrores, useEnvio, useValidacionCampos, textoHorario, textoNombres } from '@vida-sobrenatural/ui';

type Origen = { direccion: string } | { latitud: number; longitud: number } | { nombre: string };
type Validacion = ReturnType<typeof useValidacionCampos>;

/**
 * spec 014 (D224): "Encontrá tu grupo". La dirección (o la ubicación del
 * navegador) viaja solo en el POST de la búsqueda y no se guarda en ningún
 * lado: tampoco acá, más allá del campo. Errores por campo con resumen y foco
 * (H-50); envíos protegidos de la reentrada (H-57). Resultados: nombre,
 * líder, días y horario, zona y distancia — nunca la dirección exacta.
 * D238: quien ya sabe el grupo o quién lo lidera lo busca por nombre, sin
 * dirección (entonces no hay distancia y el orden es alfabético).
 */
export function BuscadorGrupos() {
  const t = useTranslations('grupoExtension.buscar');
  const tg = useTranslations('grupoExtension');
  const te = useTranslations('errors');
  const { data: session } = useSession();
  const validacion = useValidacionCampos();
  const validacionNombre = useValidacionCampos();
  const [direccion, setDireccion] = useState('');
  const [nombre, setNombre] = useState('');
  const [porNombreBuscado, setPorNombreBuscado] = useState(false);
  const [dias, setDias] = useState<DiaSemana[]>([]);
  const [resultados, setResultados] = useState<GrupoExtensionEncontrado[] | null>(null);
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);

  async function buscarDesde(origen: Origen, v: Validacion = validacion) {
    setErrorGeneral(null);
    try {
      const encontrados = await apiFetch<GrupoExtensionEncontrado[]>('/grupos-extension/buscar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.apiToken}` },
        body: JSON.stringify({ ...origen, dias }),
      });
      setResultados(encontrados);
      setPorNombreBuscado('nombre' in origen);
      validacion.limpiar('direccion');
      validacionNombre.limpiar('nombre');
    } catch (error) {
      const campos = erroresPorCampo(error);
      if (campos) {
        v.reemplazar(Object.fromEntries(campos.map(({ campo, code }) => [campo, te.has(`campos.${code}`) ? te(`campos.${code}`) : t('errorGenerico')])));
        return;
      }
      const code = error instanceof ApiError ? error.code : null;
      setErrorGeneral(code && te.has(code) ? te(code) : t('errorGenerico'));
    }
  }

  const porDireccion = useEnvio(async () => {
    const texto = direccion.trim();
    if (!texto) {
      validacion.reemplazar({ direccion: te('campos.DIRECCION_REQUERIDA') });
      return;
    }
    await buscarDesde({ direccion: texto });
  });

  const porUbicacion = useEnvio(async () => {
    setErrorGeneral(null);
    const posicion = await new Promise<GeolocationPosition | null>((resolver) => {
      if (!('geolocation' in navigator)) return resolver(null);
      navigator.geolocation.getCurrentPosition(resolver, () => resolver(null), { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 });
    });
    if (!posicion) {
      setErrorGeneral(t('ubicacionNoDisponible'));
      return;
    }
    await buscarDesde({ latitud: posicion.coords.latitude, longitud: posicion.coords.longitude });
  });

  const porNombre = useEnvio(async () => {
    const texto = nombre.trim();
    if (texto.length < NOMBRE_BUSQUEDA_GRUPO_MIN) {
      validacionNombre.reemplazar({ nombre: te('campos.NOMBRE_BUSQUEDA_REQUERIDO') });
      return;
    }
    await buscarDesde({ nombre: texto }, validacionNombre);
  });

  const ocupado = porDireccion.enviando || porUbicacion.enviando || porNombre.enviando;

  return (
    <section aria-labelledby="buscar-grupo-titulo" className="flex flex-col gap-6">
      <form
        noValidate
        aria-labelledby="buscar-grupo-titulo"
        onSubmit={(e) => {
          e.preventDefault();
          void porDireccion.ejecutar();
        }}
        className="flex flex-col gap-5 rounded-lg border border-border p-4 sm:p-5"
      >
        <div className="flex flex-col gap-1">
          <h2 id="buscar-grupo-titulo" className="text-xl font-semibold">
            {t('titulo')}
          </h2>
          <p className="text-base text-muted-foreground">{t('ayuda')}</p>
        </div>
        <ResumenErrores errores={validacion.resumen} foco={validacion.foco} titulo={t('resumenErrores')} />

        <div className="flex flex-col gap-2">
          <label htmlFor="campo-direccion" className="text-base font-medium">
            {t('direccionEtiqueta')}
          </label>
          <p id="direccion-ayuda" className="text-base text-muted-foreground">
            {t('direccionAyuda')}
          </p>
          <Input
            id="campo-direccion"
            name="direccion"
            autoComplete="street-address"
            value={direccion}
            maxLength={DIRECCION_BUSQUEDA_MAX}
            onChange={(e) => {
              setDireccion(e.target.value);
              validacion.limpiar('direccion');
            }}
            disabled={ocupado}
            aria-invalid={validacion.mensajes.direccion ? true : undefined}
            aria-describedby={validacion.mensajes.direccion ? 'direccion-ayuda direccion-error' : 'direccion-ayuda'}
            className="h-11 text-base"
          />
          <MensajeErrorCampo id="direccion-error" mensaje={validacion.mensajes.direccion} />
        </div>

        <fieldset className="flex flex-col gap-2" aria-describedby="dias-ayuda">
          <legend className="text-base font-medium">{t('diasEtiqueta')}</legend>
          <p id="dias-ayuda" className="text-base text-muted-foreground">
            {t('diasAyuda')}
          </p>
          <div className="flex flex-wrap gap-2">
            {DIAS_SEMANA.map((dia) => (
              <label key={dia} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md border border-border px-3 text-base has-[:checked]:border-primary has-[:checked]:font-medium">
                <input
                  type="checkbox"
                  checked={dias.includes(dia)}
                  onChange={(e) => setDias((actual) => (e.target.checked ? [...actual, dia] : actual.filter((d) => d !== dia)))}
                  disabled={ocupado}
                  className="size-5 shrink-0 accent-primary"
                />
                {tg(`dias.${dia}`)}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button type="submit" size="xl" className="w-full text-base sm:w-fit" loading={porDireccion.enviando} disabled={porUbicacion.enviando || porNombre.enviando}>
            <Search aria-hidden />
            {t('buscar')}
          </Button>
          <Button type="button" variant="outline" size="xl" className="w-full text-base sm:w-fit" loading={porUbicacion.enviando} disabled={porDireccion.enviando || porNombre.enviando} onClick={() => void porUbicacion.ejecutar()}>
            <Crosshair aria-hidden />
            {t('usarUbicacion')}
          </Button>
        </div>
        {errorGeneral && (
          <p role="alert" className="flex gap-2 text-base">
            <CircleAlert aria-hidden className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
            {errorGeneral}
          </p>
        )}
      </form>

      <form
        noValidate
        aria-labelledby="buscar-nombre-titulo"
        onSubmit={(e) => {
          e.preventDefault();
          void porNombre.ejecutar();
        }}
        className="flex flex-col gap-4 rounded-lg border border-border p-4 sm:p-5"
      >
        <div className="flex flex-col gap-1">
          <h2 id="buscar-nombre-titulo" className="text-lg font-semibold">
            {t('porNombreTitulo')}
          </h2>
          <p className="text-base text-muted-foreground">{t('porNombreAyuda')}</p>
        </div>
        <ResumenErrores errores={validacionNombre.resumen} foco={validacionNombre.foco} titulo={t('resumenErrores')} />
        <div className="flex flex-col gap-2">
          <label htmlFor="campo-nombre" className="text-base font-medium">
            {t('porNombreEtiqueta')}
          </label>
          <Input
            id="campo-nombre"
            name="nombre"
            type="search"
            autoComplete="off"
            value={nombre}
            maxLength={NOMBRE_BUSQUEDA_GRUPO_MAX}
            onChange={(e) => {
              setNombre(e.target.value);
              validacionNombre.limpiar('nombre');
            }}
            disabled={ocupado}
            aria-invalid={validacionNombre.mensajes.nombre ? true : undefined}
            aria-describedby={validacionNombre.mensajes.nombre ? 'nombre-error' : undefined}
            className="h-11 text-base"
          />
          <MensajeErrorCampo id="nombre-error" mensaje={validacionNombre.mensajes.nombre} />
        </div>
        <Button type="submit" variant="outline" size="xl" className="w-full text-base sm:w-fit" loading={porNombre.enviando} disabled={porDireccion.enviando || porUbicacion.enviando}>
          <Search aria-hidden />
          {t('porNombreBuscar')}
        </Button>
      </form>

      {resultados && <Resultados grupos={resultados} filtrando={dias.length > 0} porNombre={porNombreBuscado} />}
    </section>
  );
}

function Resultados({ grupos, filtrando, porNombre }: { grupos: GrupoExtensionEncontrado[]; filtrando: boolean; porNombre: boolean }) {
  const t = useTranslations('grupoExtension.buscar');
  if (grupos.length === 0) return <EstadoVacio mensaje={porNombre ? t('vacioPorNombre') : filtrando ? t('vacio') : t('vacioSinFiltro')} />;
  return (
    <section aria-labelledby="resultados-titulo" aria-live="polite" className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2 id="resultados-titulo" className="text-xl font-semibold">
          {t('resultadosTitulo')}
        </h2>
        <p className="text-base text-muted-foreground">{t(porNombre ? 'resultadosCantidadPorNombre' : 'resultadosCantidad', { cantidad: grupos.length })}</p>
      </div>
      <ul className="flex flex-col gap-3">
        {grupos.map((g) => (
          <TarjetaResultado key={g.id} grupo={g} />
        ))}
      </ul>
    </section>
  );
}

function TarjetaResultado({ grupo }: { grupo: GrupoExtensionEncontrado }) {
  const t = useTranslations('grupoExtension.buscar');
  const tg = useTranslations('grupoExtension');
  const te = useTranslations('errors');
  const router = useRouter();
  const { data: session } = useSession();
  const idTitulo = `grupo-${grupo.id}`;

  const { enviando, ejecutar } = useEnvio(async () => {
    try {
      await apiFetch(`/grupos-extension/${grupo.id}/solicitudes/me`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.apiToken}` },
      });
      toast.success(t('enviado'));
      window.scrollTo({ top: 0 });
    } catch (error) {
      const code = error instanceof ApiError ? error.code : null;
      toast.error(code && te.has(code) ? te(code) : t('errorGenerico'));
    }
    router.refresh();
  });

  return (
    <li>
      <article aria-labelledby={idTitulo} className="flex flex-col gap-3 rounded-lg border border-border p-4 text-base">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 id={idTitulo} className="text-lg font-semibold break-words">
            {grupo.nombre}
          </h3>
          <span className="flex items-center gap-1 font-medium">
            <Navigation aria-hidden className="size-4 shrink-0 text-primary" />
            {grupo.distanciaKm === null ? t('sinDistancia') : t('distancia', { km: formatearDistanciaKm(grupo.distanciaKm) })}
          </span>
        </div>
        <ul className="flex flex-col gap-1.5 text-muted-foreground">
          <li className="flex gap-2">
            <UserRound aria-hidden className="mt-0.5 size-4 shrink-0" />
            {t('lidera', { lideres: textoNombres(grupo.lideres, tg) })}
            {grupo.genero === 'mixto' && ` · ${t('mixto')}`}
          </li>
          <li className="flex gap-2">
            <CalendarClock aria-hidden className="mt-0.5 size-4 shrink-0" />
            {textoHorario(grupo.dias, grupo.horaInicio, tg)}
          </li>
          <li className="flex gap-2">
            {grupo.enLaIglesia ? <Church aria-hidden className="mt-0.5 size-4 shrink-0" /> : <MapPin aria-hidden className="mt-0.5 size-4 shrink-0" />}
            {grupo.enLaIglesia ? t('enLaIglesia') : t('zona', { zona: grupo.zona ?? '' })}
          </li>
        </ul>
        {grupo.completo ? (
          <p className="flex items-center gap-2 font-medium">
            <CircleSlash aria-hidden className="size-5 shrink-0 text-muted-foreground" />
            {t('completo')}
          </p>
        ) : (
          <ConfirmDestructiveDialog
            tono="neutro"
            trigger={
              <Button type="button" size="xl" className="w-full text-base sm:w-fit" loading={enviando} aria-label={t('sumarmeAria', { grupo: grupo.nombre })}>
                <UserPlus aria-hidden />
                {t('quieroSumarme')}
              </Button>
            }
            titulo={t('confirmarTitulo', { grupo: grupo.nombre })}
            descripcion={t('confirmarDescripcion')}
            textoConfirmar={t('confirmarSi')}
            textoCancelar={t('confirmarNo')}
            onConfirmar={() => void ejecutar()}
          />
        )}
      </article>
    </li>
  );
}
