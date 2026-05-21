import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import { ChatService } from './chat.service';
import { CreateChatDto } from './dto/create-chat.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { UpdateChatDto } from './dto/update-chat.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

// all routes protected — must have valid JWT
@UseGuards(JwtAuthGuard)
@Controller('chats')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  // POST /api/chats — create new chat session
  @Post()
  createChat(
    @CurrentUser() user: any,
    @Body() createChatDto: CreateChatDto,
  ) {
    return this.chatService.createChat(user.id, createChatDto);
  }

  // GET /api/chats — get all chats for current user
  @Get()
  getUserChats(@CurrentUser() user: any) {
    return this.chatService.getUserChats(user.id);
  }

  // GET /api/chats/:id — get single chat with messages
  @Get(':id')
  getChatWithMessages(
    @Param('id') chatId: string,
    @CurrentUser() user: any,
  ) {
    return this.chatService.getChatWithMessages(chatId, user.id);
  }

  // GET /api/chats/:id/history — get message history only
  @Get(':id/history')
  getChatHistory(
    @Param('id') chatId: string,
    @CurrentUser() user: any,
  ) {
    return this.chatService.getChatHistory(chatId, user.id);
  }

  // PATCH /api/chats/:id — update chat title or status
  @Patch(':id')
  updateChat(
    @Param('id') chatId: string,
    @CurrentUser() user: any,
    @Body() updateChatDto: UpdateChatDto,
  ) {
    return this.chatService.updateChat(chatId, user.id, updateChatDto);
  }

  // DELETE /api/chats/:id — soft delete chat
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteChat(
    @Param('id') chatId: string,
    @CurrentUser() user: any,
  ) {
    return this.chatService.deleteChat(chatId, user.id);
  }

  // POST /api/chats/:id/messages — send message with streaming response
  // uses Server-Sent Events (SSE) for real-time token streaming
  @Post(':id/messages')
  async sendMessage(
    @Param('id') chatId: string,
    @CurrentUser() user: any,
    @Body() sendMessageDto: SendMessageDto,
    @Res() res: Response,
  ) {
    // SSE headers — tells client this is an event stream
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const stream$ = await this.chatService.sendMessage(
      chatId,
      user.id,
      sendMessageDto,
    );

    // subscribe to observable — write each chunk to SSE stream
    stream$.subscribe({
      next: (chunk) => {
        // SSE format: "data: <content>\n\n"
        res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
      },
      complete: () => {
        // signal stream end to client
        res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
        res.end();
      },
      error: (err) => {
        res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
        res.end();
      },
    });
  }
}