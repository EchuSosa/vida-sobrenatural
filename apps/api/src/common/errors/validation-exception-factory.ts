import type { ValidationError } from '@nestjs/common';
import { AppException } from './app-exception.js';

/**
 * Convierte los `ValidationError[]` de class-validator en un `AppException`
 * con `code: 'VALIDACION'` y un `errors` por campo — ver
 * specs/002-base-transversal/contracts/errores.md. El código de cada campo
 * se deriva de su nombre (ej. `telefono` → `TELEFONO_INVALIDO`); no requiere
 * un catálogo aparte por campo.
 */
export function validationExceptionFactory(validationErrors: ValidationError[] = []): AppException {
  const errors = aplanar(validationErrors).map((error) => ({
    campo: error.property,
    code: `${error.property.toUpperCase()}_INVALIDO`,
  }));

  return new AppException(
    'VALIDACION',
    400,
    'Uno o más campos no son válidos.',
    errors,
  );
}

function aplanar(errors: ValidationError[], prefijo = ''): ValidationError[] {
  return errors.flatMap((error) => {
    const property = prefijo ? `${prefijo}.${error.property}` : error.property;
    if (error.children?.length) {
      return aplanar(error.children, property);
    }
    return [{ ...error, property }];
  });
}
