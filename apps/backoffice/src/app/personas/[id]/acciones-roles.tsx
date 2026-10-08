'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import type { PerfilPersona, PersonaListado } from '@vida-sobrenatural/shared-types';
import { Button } from '@vida-sobrenatural/ui';
import { HistorialDialog, RolesDialog } from '../personas-cliente';

/**
 * spec 013 (T033, FR-012): el panel de roles y su historial (005) abiertos
 * desde el perfil — los MISMOS componentes del listado de Personas, no una
 * copia. Solo se monta con `personas.gestionar_roles`.
 */
export function AccionesRoles({ perfil, apiToken }: { perfil: PerfilPersona; apiToken: string }) {
  const t = useTranslations('personas');
  const router = useRouter();
  const [abierto, setAbierto] = useState<'roles' | 'historial' | null>(null);
  const nombre = `${perfil.nombre} ${perfil.apellido}`;
  // La forma que esperan los paneles: la misma fila que trae `GET /personas`.
  const persona: PersonaListado = {
    id: perfil.id,
    nombre: perfil.nombre,
    apellido: perfil.apellido,
    fotoUrl: perfil.fotoUrl,
    email: perfil.email,
    telefono: perfil.telefono,
    rol: [...perfil.roles.deCargo, ...perfil.roles.delProceso],
    quitar: perfil.quitar,
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" className="h-11 text-base" aria-label={t('cambiarRolesDe', { nombre })} onClick={() => setAbierto('roles')}>
        {t('cambiarRoles')}
      </Button>
      <Button variant="ghost" className="h-11 text-base" aria-label={t('verHistorialDe', { nombre })} onClick={() => setAbierto('historial')}>
        {t('verHistorial')}
      </Button>
      <RolesDialog
        key={`roles-${abierto === 'roles'}`}
        persona={abierto === 'roles' ? persona : null}
        apiToken={apiToken}
        onCerrar={() => setAbierto(null)}
        onCambio={() => router.refresh()}
      />
      <HistorialDialog
        key={`historial-${abierto === 'historial'}`}
        persona={abierto === 'historial' ? persona : null}
        apiToken={apiToken}
        onCerrar={() => setAbierto(null)}
      />
    </div>
  );
}
