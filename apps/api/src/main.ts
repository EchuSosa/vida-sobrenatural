import 'dotenv/config';
import './instrument.js';
import { randomUUID } from 'node:crypto';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { pinoHttp } from 'pino-http';
import { AppModule } from './app.module.js';
import { configurarApp } from './configurar-app.js';
import { servirArchivosPublicos } from './storage/archivos-publicos.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Logs JSON estructurados con requestId, sin datos personales (Constitución
  // Principio X / FR-025). Middleware de Express directo (no el módulo
  // nestjs-pino: su dist compilado en CommonJS choca con la transformación a
  // ESM de @nestjs/common bajo Jest --experimental-vm-modules; pino-http
  // logra el mismo resultado sin ese problema).
  app.use(
    pinoHttp({
      genReqId: (req) => (req as { id?: string }).id ?? randomUUID(),
      redact: {
        paths: [
          'req.headers.authorization',
          'req.headers["x-internal-secret"]',
          'req.body.email',
          'req.body.telefono',
          'req.body.direccion',
          'req.body.fechaNacimiento',
          'req.body.tutorTelefono',
          'req.body.tutorNombre',
          'req.body.tutorApellido',
          'req.body.apellido',
          'req.body.nombre',
        ],
        censor: '[redactado]',
      },
    }),
  );

  configurarApp(app);
  // D110/FR-026: las portadas de Libro se sirven públicas (sin sesión) desde
  // su propia ruta — distinta del endpoint de subida (POST /libros/:id/portada,
  // que sí exige rol Admin). STORAGE_DIR es el mismo directorio que usa
  // LocalStorageProvider (research.md Decisión 3).
  // Lote 0 global (D168): las áreas privadas viven bajo `.privado/` dentro de
  // la misma carpeta, y `dotfiles: 'deny'` hace que nunca se sirvan.
  servirArchivosPublicos(app);
  // Desarrollo local únicamente — apps/web y apps/backoffice corren en otro
  // puerto. No se usan cookies de sesión hacia esta API (solo Bearer JWT), así
  // que reflejar el origin es suficiente sin necesitar `credentials: true`.
  app.enableCors();

  const config = new DocumentBuilder()
    .setTitle('Vida Sobrenatural — API')
    .setDescription('Fase de Bienvenida: Persona y Sede')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(process.env.PORT ?? 3333);
}
await bootstrap();
