'use client';

import { ErrorEventos } from '../error-eventos';

export default function ErrorListadoEventos(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorEventos {...props} />;
}
