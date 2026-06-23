import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Chat, Message } from './entities/chat.entity';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { AiGatewayModule } from '../ai-gateway/ai-gateway.module';

@Module({
  imports: [TypeOrmModule.forFeature([Chat, Message]), AiGatewayModule],
  controllers: [ChatController],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}
