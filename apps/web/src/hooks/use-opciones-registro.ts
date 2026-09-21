import { useTranslations } from 'next-intl';
import type { Genero, EstadoCivil, Profesion, TiempoCongregacion } from '@vida-sobrenatural/shared-types';

/**
 * Las listas predefinidas se guardan como claves estables (los mismos
 * valores que Prisma/class-validator ya usan) y se traducen recién acá, al
 * mostrarse — FR-032 (specs/002-base-transversal, Historia 6). Extraído de
 * `registro/page.tsx` (H-35, revisión manual ronda 3) para reutilizar las
 * mismas opciones en el self-edit de Perfil, sin duplicarlas.
 */
export function useOpcionesRegistro() {
  const t = useTranslations('registro.opciones');

  const genero: { value: Genero; label: string }[] = [
    { value: 'femenino', label: t('genero.femenino') },
    { value: 'masculino', label: t('genero.masculino') },
  ];

  const estadoCivil: { value: EstadoCivil; label: string }[] = [
    { value: 'soltero_a', label: t('estadoCivil.soltero_a') },
    { value: 'casado_a', label: t('estadoCivil.casado_a') },
    { value: 'en_concubinato', label: t('estadoCivil.en_concubinato') },
    { value: 'viudo_a', label: t('estadoCivil.viudo_a') },
    { value: 'divorciado_a', label: t('estadoCivil.divorciado_a') },
    { value: 'separado_a', label: t('estadoCivil.separado_a') },
  ];

  const tiempoCongregacion: { value: TiempoCongregacion; label: string }[] = [
    { value: 'menos_6_meses', label: t('tiempoCongregacion.menos_6_meses') },
    { value: 'de_6_meses_a_1_anio', label: t('tiempoCongregacion.de_6_meses_a_1_anio') },
    { value: 'de_1_a_3_anios', label: t('tiempoCongregacion.de_1_a_3_anios') },
    { value: 'de_3_a_5_anios', label: t('tiempoCongregacion.de_3_a_5_anios') },
    { value: 'mas_5_anios', label: t('tiempoCongregacion.mas_5_anios') },
  ];

  const profesion: { value: Profesion; label: string }[] = [
    { value: 'salud', label: t('profesion.salud') },
    { value: 'educacion', label: t('profesion.educacion') },
    { value: 'tecnologia_ingenieria', label: t('profesion.tecnologia_ingenieria') },
    { value: 'comercio_ventas', label: t('profesion.comercio_ventas') },
    { value: 'oficios_construccion', label: t('profesion.oficios_construccion') },
    { value: 'administracion_finanzas', label: t('profesion.administracion_finanzas') },
    { value: 'legal', label: t('profesion.legal') },
    { value: 'comunicacion_marketing', label: t('profesion.comunicacion_marketing') },
    { value: 'arte_diseno', label: t('profesion.arte_diseno') },
    { value: 'servicios_gastronomia', label: t('profesion.servicios_gastronomia') },
    { value: 'transporte', label: t('profesion.transporte') },
    { value: 'estudiante', label: t('profesion.estudiante') },
    { value: 'ama_de_casa', label: t('profesion.ama_de_casa') },
    { value: 'jubilado_a', label: t('profesion.jubilado_a') },
    { value: 'sin_ocupacion', label: t('profesion.sin_ocupacion') },
    { value: 'otro', label: t('profesion.otro') },
  ];

  return { genero, estadoCivil, tiempoCongregacion, profesion };
}
