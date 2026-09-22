import Link from 'next/link';
import { Suspense } from 'react';
import { ButtonLink } from '@vida-sobrenatural/ui';
import { AvisoPorQuery } from '../../components/aviso-por-query';

export const metadata = {
  title: 'Vida Sobrenatural — La Plata',
  description:
    'Iglesia Vida Sobrenatural en La Plata, Buenos Aires. Enterate cómo son los primeros pasos y visitanos.',
};

export default function InicioPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-16">
      {/* H-11: aviso breve al volver acá después de cerrar sesión */}
      <Suspense fallback={null}>
        <AvisoPorQuery param="sesion" valor="cerrada" mensaje="Cerraste sesión." />
      </Suspense>
      <h1 className="text-3xl font-semibold tracking-tight">Vida Sobrenatural — La Plata</h1>
      <p className="text-lg leading-7 text-muted-foreground">
        Nos alegra que estés acá. Si te acercaste por primera vez, o hace poco empezaste a venir,
        arrancá por Primeros pasos.
      </p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <ButtonLink render={<Link href="/primeros-pasos" />} size="xl">
          Ver primeros pasos
        </ButtonLink>
        <ButtonLink render={<Link href="/visitanos" />} variant="outline" size="xl">
          Visitanos
        </ButtonLink>
      </div>
    </div>
  );
}
