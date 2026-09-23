import { ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { AllExceptionsFilter } from './common/errors/all-exceptions.filter.js';
import { validationExceptionFactory } from './common/errors/validation-exception-factory.js';

/**
 * H-119 (revisión manual): el CONTRATO de la app — cómo se formatean los
 * errores, qué validación corre — vivía repetido a mano en main.ts y en
 * cada spec de integración, y cada uno terminó con un subconjunto
 * distinto (algunos sin `exceptionFactory`, uno sin `AllExceptionsFilter`
 * directamente). Un solo lugar para que main.ts (producción) y los specs
 * de integración (test/) armen EXACTAMENTE la misma app, nunca una
 * parecida.
 *
 * Deliberadamente NO incluye lo que es bootstrap del PROCESO y no del
 * contrato — pino (logging), Swagger (docs), archivos estáticos de
 * portadas, CORS: nada de eso cambia qué respuesta devuelve un endpoint
 * dado un request dado, que es lo único que un test de integración
 * necesita igual que producción. Metadata de proceso (puerto, logs) no
 * pertenece acá.
 */
export function configurarApp(app: INestApplication): void {
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      exceptionFactory: validationExceptionFactory,
    }),
  );
}
