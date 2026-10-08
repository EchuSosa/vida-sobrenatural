import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { type EstadoMiDiscipulado, apiFetch } from '@vida-sobrenatural/shared-types';
import { MigaDePan } from '@vida-sobrenatural/ui';
import { auth } from '../../../../auth';
import { MiCaminoCliente } from '../mi-camino-cliente';

/**
 * spec 006, T029 (FR-005): Vida Nueva de la 004 (pedir con franjas, estado del
 * pedido, editar y retirar, discipulado en curso, finalizado, baja, menor de
 * 12), que antes era todo Mi camino, ahora en su propia pantalla y sin cambio
 * de comportamiento. La tarjeta sigue en `../mi-camino-cliente.tsx` (es de la
 * sesión ajustes-ux, specs/IMPLEMENTACION.md §4): se importa, no se mueve.
 * Si la API falla, lo atrapa `error.tsx` de esta ruta.
 */
export default async function VidaNuevaPage() {
  const session = await auth();
  const t = await getTranslations('miCamino');
  const estado = await apiFetch<EstadoMiDiscipulado>('/discipulado/me', {
    headers: { Authorization: `Bearer ${session?.apiToken}` },
    cache: 'no-store',
  });

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-16">
      <MigaDePan tramos={[{ label: t('titulo'), href: '/mi-camino' }, { label: t('vidaNueva.titulo') }]} LinkComponente={Link} />
      <h1 className="text-3xl font-semibold tracking-tight">{t('vidaNueva.titulo')}</h1>
      <MiCaminoCliente estadoInicial={estado} />
    </div>
  );
}
