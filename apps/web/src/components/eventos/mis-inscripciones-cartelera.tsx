'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { CircleCheck, Hourglass, ListOrdered } from 'lucide-react';
import { apiFetch, type EstadoInscripcionEvento, type MiInscripcionEvento, type Pagina } from '@vida-sobrenatural/shared-types';

/**
 * DEMO-17 (2026-10-10): en la cartelera (ISR, igual para todos), quien tiene
 * sesión ve en cada tarjeta si ya está anotada, sin tener que entrar al Evento.
 * El proveedor pide una vez sus inscripciones próximas; cada tarjeta muestra
 * su marca en lugar del estado público. Sin sesión, sin proveedor o si el
 * pedido falla, la tarjeta queda como estaba.
 */
type Estados = Map<string, EstadoInscripcionEvento>;
const MisInscripciones = createContext<Estados | null>(null);

const QUE_SE_MUESTRAN: readonly EstadoInscripcionEvento[] = ['confirmada', 'pendiente', 'lista_espera'];

export function ProveedorMisInscripciones({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const token = session?.apiToken;
  const [estados, setEstados] = useState<Estados | null>(null);
  useEffect(() => {
    if (!token) return;
    let vigente = true;
    apiFetch<Pagina<MiInscripcionEvento>>('/mis-inscripciones-evento?cuando=proximas&take=50', { headers: { Authorization: `Bearer ${token}` } })
      .then((pagina) => {
        if (!vigente) return;
        setEstados(new Map(pagina.items.filter((i) => QUE_SE_MUESTRAN.includes(i.estado)).map((i) => [i.evento.id, i.estado])));
      })
      .catch(() => undefined);
    return () => {
      vigente = false;
    };
  }, [token]);
  return <MisInscripciones.Provider value={estados}>{children}</MisInscripciones.Provider>;
}

const ICONOS = { confirmada: CircleCheck, pendiente: Hourglass, lista_espera: ListOrdered } as const;

/** La marca de la tarjeta: "Ya te anotaste" (o pendiente / lista de espera) en lugar de `children` (el estado público). */
export function EstadoOMiInscripcion({ eventoId, children }: { eventoId: string; children: ReactNode }) {
  const t = useTranslations('eventos.publico.miInscripcion');
  const estado = useContext(MisInscripciones)?.get(eventoId);
  if (!estado || !(estado in ICONOS)) return <>{children}</>;
  const clave = estado as keyof typeof ICONOS;
  const Icono = ICONOS[clave];
  return (
    <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-primary/50 px-2.5 py-1 text-sm font-medium text-foreground">
      <Icono className="size-4" aria-hidden="true" />
      {t(clave)}
    </span>
  );
}
