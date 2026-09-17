'use client';

import { useEffect, useState } from 'react';

/**
 * Estado de conexión — FR-024. `apps/web` todavía no tiene la infraestructura
 * de PWA (manifest/service worker) construida (docs/10, pendiente), así que
 * se resuelve con los eventos nativos del navegador; el día que exista un
 * service worker, puede reemplazarse sin cambiar esta interfaz.
 */
export function useEnLinea(): boolean {
  // Siempre arranca en `true` — tanto en el server (sin `navigator`) como en
  // el primer render del cliente, para que coincidan y React no tire un
  // error de hidratación. El valor real de `navigator.onLine` se aplica
  // recién en el efecto (después de hidratar), igual que el resto de los
  // listeners — nunca en el cuerpo del render.
  const [enLinea, setEnLinea] = useState(true);

  useEffect(() => {
    // No hay forma de conocer el valor real de navigator.onLine sin
    // arriesgar un mismatch de hidratación (SSR no tiene `navigator`) — se
    // corrige acá a propósito, no es el caso que la regla busca evitar.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEnLinea(navigator.onLine);
    const marcarOnline = () => setEnLinea(true);
    const marcarOffline = () => setEnLinea(false);
    window.addEventListener('online', marcarOnline);
    window.addEventListener('offline', marcarOffline);
    return () => {
      window.removeEventListener('online', marcarOnline);
      window.removeEventListener('offline', marcarOffline);
    };
  }, []);

  return enLinea;
}

export function OfflineBanner() {
  const enLinea = useEnLinea();
  if (enLinea) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="sticky top-0 z-50 bg-warning px-4 py-2 text-center text-sm font-medium text-warning-foreground"
    >
      Estás sin conexión — algunas acciones no van a funcionar hasta que vuelva la señal.
    </div>
  );
}
