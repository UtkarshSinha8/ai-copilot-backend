import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { AiGatewayService, ChatMessage } from './ai-gateway.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { IsString, IsArray, IsOptional, IsNumber } from 'class-validator';

// DTO for direct AI chat — used for testing the gateway
class DirectChatDto {
  @IsArray()
  messages!: ChatMessage[];

  @IsString()
  model!: string;

  @IsOptional()
  @IsNumber()
  temperature?: number;

  @IsOptional()
  @IsNumber()
  maxTokens?: number;
}

@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiGatewayController {
  constructor(private readonly aiGatewayService: AiGatewayService) {}

  // GET /api/ai/models — list all available OpenRouter models
  @Get('models')
  getModels() {
    return this.aiGatewayService.getAvailableModels();
  }

  // POST /api/ai/chat — direct non-streaming chat for testing
  @Post('chat')
  directChat(@Body() directChatDto: DirectChatDto) {
    return this.aiGatewayService.chat(
      directChatDto.messages,
      directChatDto.model,
      directChatDto.temperature,
      directChatDto.maxTokens,
    );
  }
}