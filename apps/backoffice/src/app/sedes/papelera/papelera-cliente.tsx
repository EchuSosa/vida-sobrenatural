'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { type Sede, type ErrorCode, apiFetch, ApiError, formatearFechaHora } from '@vida-sobrenatural/shared-types';
import { Button, MigaDePan, TablaDatos, type ColumnaTabla } from '@vida-sobrenatural/ui';
import { toast } from 'sonner';

/** H-60 (revisión manual ronda 7): `sedes` llega ya cargada desde page.tsx — isla de cliente: Restaurar. */
export function PapeleraCliente({ sedes, apiToken }: { sedes: Sede[]; apiToken: string }) {
  const router = useRouter();
  const te = useTranslations('errors');
  const locale = useLocale();
  const procesandoRef = useRef(new Set<string>());
  const [restaurandoId, setRestaurandoId] = useState<string | null>(null);

  async function restaurar(sede: Sede) {
    if (procesandoRef.current.has(sede.id)) return;
    procesandoRef.current.add(sede.id);
    setRestaurandoId(sede.id);
    try {
      await apiFetch(`/sedes/${sede.id}/restaurar`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiToken}` },
      });
      toast(`${sede.nombre} restaurada.`);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof ApiError ? te(e.code as ErrorCode) : 'No pudimos restaurar la Sede.');
    } finally {
      procesandoRef.current.delete(sede.id);
      setRestaurandoId(null);
    }
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
      {/* H-95: la miga de pan reemplaza el "Volver a X" escrito a mano — va
          arriba del <h1>, mismo componente en toda la app. */}
      <MigaDePan
        tramos={[{ label: 'Sedes', href: '/sedes' }, { label: 'Papelera' }]}
        LinkComponente={Link}
      />
      {/* H-96: el texto de acá abajo es lo único que necesita saber quien
          usa el backoffice — las referencias a decisiones (D119: borrado
          recuperable) van en comentarios como este, no en la interfaz. */}
      <h1 className="text-2xl font-semibold">Papelera de Sedes</h1>
      <p className="text-sm text-muted-foreground">
        Sedes eliminadas. Restaurar las devuelve a &quot;Todas&quot;.
      </p>

      <TablaDatos
        columnas={columnas}
        datos={sedes}
        obtenerId={(sede) => sede.id}
        etiqueta="Papelera de Sedes"
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
    </div>
  );
}
