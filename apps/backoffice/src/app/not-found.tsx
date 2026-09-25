import { useTranslations } from 'next-intl';
import { BotonAterrizaje } from '../components/boton-aterrizaje';

export const metadata = {
  title: 'No encontrado — Backoffice',
  robots: { index: false, follow: false },
};

/**
 * FR-023. H-134: la salida no es un link a `/` fijo sino BotonAterrizaje, que
 * resuelve el mismo destino que `/` para esta sesión. Síncrono a propósito
 * (ver boton-aterrizaje.tsx). Sin sesión, el layout ni siquiera renderiza
 * esto: muestra la pantalla de ingresar.
 */
export default function NoEncontrado() {
  const t = useTranslations('aterrizaje');
  return (
    // Un <div>, no un <main>: con sesión esto se muestra DENTRO del shell, cuyo
    // SidebarInset ya es el <main> (mismo motivo que H-51/H-52 en el shell) — el
    // <main id="contenido"> de antes duplicaba el landmark y el id. Sin sesión,
    // el layout ni siquiera renderiza esto.
    <div className="mx-auto flex max-w-md flex-col gap-4 px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold">{t('noEncontradoTitulo')}</h1>
      <p className="text-muted-foreground">{t('noEncontradoDescripcion')}</p>
      <BotonAterrizaje />
    </div>
  );
}
