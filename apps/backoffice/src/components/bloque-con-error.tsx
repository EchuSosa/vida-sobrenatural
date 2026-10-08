'use client';

import { Component, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { CircleAlert } from 'lucide-react';
import { Button } from '@vida-sobrenatural/ui';

interface Props {
  children: ReactNode;
  /** Qué parte no cargó, dicho para la persona (ej. "No pudimos cargar sus Grupos."). */
  mensajeError: string;
  etiquetaReintentar: string;
}

/**
 * spec 013 (D209, docs/15 "Bloques independientes"): el error de UN bloque de
 * una pantalla hecha de bloques (perfil de Persona, Inicio). Si el bloque
 * falla muestra su error con "Reintentar" y los demás se siguen viendo — la
 * página no cae entera en su `error.tsx`. Va junto con un `Suspense` (el
 * "cargando" del bloque).
 */
export function BloqueConError({ children, mensajeError, etiquetaReintentar }: Props) {
  const router = useRouter();
  return (
    <Limite
      mensajeError={mensajeError}
      etiquetaReintentar={etiquetaReintentar}
      alReintentar={(reiniciar) => {
        router.refresh();
        reiniciar();
      }}
    >
      {children}
    </Limite>
  );
}

class Limite extends Component<Props & { alReintentar: (reiniciar: () => void) => void }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error & { digest?: string }) {
    console.warn('[BloqueConError]', this.props.mensajeError, error.digest, error.message);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <ErrorDelBloque
        mensaje={this.props.mensajeError}
        etiquetaReintentar={this.props.etiquetaReintentar}
        reintentar={() => this.props.alReintentar(() => this.setState({ error: null }))}
      />
    );
  }
}

function ErrorDelBloque({ mensaje, etiquetaReintentar, reintentar }: { mensaje: string; etiquetaReintentar: string; reintentar: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-start gap-3 rounded-lg border border-border p-4">
      <p className="flex items-start gap-2">
        <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-destructive" />
        <span>{mensaje}</span>
      </p>
      <Button variant="outline" onClick={reintentar}>
        {etiquetaReintentar}
      </Button>
    </div>
  );
}
