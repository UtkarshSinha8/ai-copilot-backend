import { Module } from '@nestjs/common';
import { AiGatewayService } from './ai-gateway.service';

@Module({
  // no TypeORM needed — AI gateway is a pure service layer
  providers: [AiGatewayService],
  // export so ChatModule can inject AiGatewayService
  exports: [AiGatewayService],
})
export class AiGatewayModule {}
