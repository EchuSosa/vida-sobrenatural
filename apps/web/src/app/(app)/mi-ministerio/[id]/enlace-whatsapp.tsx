'use client';

import { useTranslations } from 'next-intl';
import { MessageCircle } from 'lucide-react';
import { enlaceWhatsapp } from '@vida-sobrenatural/shared-types';

/** spec 016: "Escribir por WhatsApp" a un integrante (D218), con un saludo armado. */
export function EnlaceWhatsappIntegrante({ whatsapp, nombre, texto }: { whatsapp: string; nombre: string; texto: string }) {
  const t = useTranslations('miMinisterio');
  return (
    <a
      href={`${enlaceWhatsapp(whatsapp)}?text=${encodeURIComponent(texto)}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t('whatsappAria', { nombre })}
      className="flex min-h-11 w-fit items-center gap-2 font-medium text-primary underline underline-offset-2"
    >
      <MessageCircle aria-hidden className="size-4 shrink-0" />
      {t('whatsapp')}
    </a>
  );
}
