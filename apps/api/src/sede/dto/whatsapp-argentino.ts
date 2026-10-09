import { ValidatorConstraint, type ValidatorConstraintInterface } from 'class-validator';
import { normalizarWhatsappArgentino } from '@vida-sobrenatural/shared-types';

/**
 * D218: el WhatsApp de Secretaría tiene que ser un celular argentino. Vacío
 * no llega acá (`ValidateIf` en el DTO): significa "sin WhatsApp".
 */
@ValidatorConstraint({ name: 'whatsappArgentino' })
export class WhatsappArgentino implements ValidatorConstraintInterface {
  validate(valor: unknown): boolean {
    return typeof valor === 'string' && normalizarWhatsappArgentino(valor) !== null;
  }
}

/** D218: lo que se guarda — normalizado, o null si vino vacío. `undefined` = no se toca. */
export function whatsappParaGuardar(valor: string | undefined): string | null | undefined {
  if (valor === undefined) return undefined;
  if (valor.trim() === '') return null;
  return normalizarWhatsappArgentino(valor);
}
