import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { SedeModule } from './sede/sede.module.js';
import { PersonaModule } from './persona/persona.module.js';
import { AuthModule } from './auth/auth.module.js';

@Module({
  imports: [PrismaModule, AuthModule, SedeModule, PersonaModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
