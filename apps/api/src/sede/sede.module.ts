import { Module } from '@nestjs/common';
import { SedeController } from './sede.controller.js';
import { SedeService } from './sede.service.js';

@Module({
  controllers: [SedeController],
  providers: [SedeService],
  exports: [SedeService],
})
export class SedeModule {}
