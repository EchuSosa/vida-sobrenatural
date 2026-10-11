import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { CircleCheck, Hourglass, Info } from 'lucide-react';
import { apiFetch, type MiEleccionMinisterio } from '@vida-sobrenatural/shared-types';
import { AvisoEstado, ButtonLink, MigaDePan } from '@vida-sobrenatural/ui';
import { auth } from '../../../../../auth';
import { DatosConocidosVista } from '../../../../../components/eleccion/datos-conocidos';
import { textoOpcion } from '../../../../../components/eleccion/texto-opcion';
import { FormularioEleccion } from './formulario-eleccion';

/**
 * spec 015 (D239): "¿Dónde querés servir?" — la elección de ministerio antes
 * de terminar Vida de Servicio. Arriba lo que la app ya sabe; abajo el
 * listado en dos bloques, hasta 2 Ministerios y un área de cada uno. Después
 * de la charla con el líder ya no se cambia desde acá (se ve lo elegido).
 * Sin la elección abierta, lo dice y vuelve a Mi camino.
 */
export default async function ElegirMinisterioPage() {
  const session = await auth();
  const [t, tMiCamino] = await Promise.all([getTranslations('eleccion'), getTranslations('miCamino')]);
  const datos = await apiFetch<MiEleccionMinisterio>('/elecciones-ministerio/me', {
    headers: { Authorization: `Bearer ${session?.apiToken}` },
    cache: 'no-store',
  });

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-16">
      <MigaDePan tramos={[{ label: tMiCamino('titulo'), href: '/mi-camino' }, { label: t('titulo') }]} LinkComponente={Link} />
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">{t('titulo')}</h1>
        <p className="text-base text-muted-foreground">{datos.disponible ? t('introduccion', { edicion: datos.edicion.nombre }) : t('noDisponibleTexto')}</p>
      </div>

      {!datos.disponible ? (
        <div className="flex flex-col gap-3">
          <AvisoEstado icono={<Info className="text-muted-foreground" />} titulo={t('noDisponibleTitulo')} className="rounded-lg border border-border p-4" />
          <ButtonLink render={<Link href="/mi-camino" />} variant="outline" size="xl" className="w-full text-base sm:w-fit">
            {t('volverMiCamino')}
          </ButtonLink>
        </div>
      ) : (
        <>
          <DatosConocidosVista datos={datos.conocido} titulo={t('conocidoTitulo')} />
          {datos.editable ? (
            <FormularioEleccion catalogo={datos.catalogo} eleccion={datos.eleccion} />
          ) : (
            <section aria-labelledby="elegiste-titulo" className="flex flex-col gap-3">
              <h2 id="elegiste-titulo" className="text-xl font-semibold">
                {t('elegisteTitulo')}
              </h2>
              {datos.eleccion ? (
                <>
                  <ul className="flex flex-col gap-2">
                    {datos.eleccion.opciones.map((o) => (
                      <li key={o.id} className="flex gap-2 rounded-md border border-border p-3 text-base">
                        <CircleCheck aria-hidden className="mt-0.5 size-5 shrink-0 text-primary" />
                        {textoOpcion({ ministerio: o.ministerio.nombre, celula: o.celula?.nombre ?? null })}
                      </li>
                    ))}
                  </ul>
                  <AvisoEstado
                    icono={<Hourglass className="text-primary" />}
                    titulo={datos.eleccion.estado === 'charla_hecha' ? t('charlaHechaTitulo') : t('cerradaTitulo')}
                    className="rounded-lg border border-border p-4"
                  >
                    {datos.eleccion.estado === 'charla_hecha' ? t('charlaHechaTexto') : t('cerradaTexto')}
                  </AvisoEstado>
                </>
              ) : (
                <AvisoEstado icono={<Info className="text-muted-foreground" />} titulo={t('cerradaSinEleccion')} className="rounded-lg border border-border p-4" />
              )}
              <ButtonLink render={<Link href="/mi-camino" />} variant="outline" size="xl" className="w-full text-base sm:w-fit">
                {t('volverMiCamino')}
              </ButtonLink>
            </section>
          )}
        </>
      )}
    </div>
  );
}
