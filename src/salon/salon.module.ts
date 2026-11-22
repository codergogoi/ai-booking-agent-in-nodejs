import { Module } from '@nestjs/common';
import { SalonController } from './salon.controller.js';
import { SalonService } from './salon.service.js';

@Module({
  controllers: [SalonController],
  providers: [SalonService],
  exports: [SalonService],
})
export class SalonModule {}
