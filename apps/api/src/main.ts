import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
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

  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
