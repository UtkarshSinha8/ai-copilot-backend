import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Chat, Message, MessageRole } from './entities/chat.entity';
import { CreateChatDto } from './dto/create-chat.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { UpdateChatDto } from './dto/update-chat.dto';
import { AiGatewayService } from '../ai-gateway/ai-gateway.service';
import { Observable } from 'rxjs';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(Chat)
    private readonly chatRepository: Repository<Chat>,

    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,

    // AiGatewayService handles all communication with OpenRouter
    private readonly aiGatewayService: AiGatewayService,
  ) {}

  // create a new chat session for the authenticated user
  async createChat(
    userId: string,
    createChatDto: CreateChatDto,
  ): Promise<Chat> {
    const chat = this.chatRepository.create({
      title: createChatDto.title || 'New Chat',
      model: createChatDto.model || 'openai/gpt-4o',
      // userId set via RelationId — we set the relation by passing user id
      user: { id: userId },
    });

    return this.chatRepository.save(chat);
  }

  // get all chats for the authenticated user — never returns other users chats
  async getUserChats(userId: string): Promise<Chat[]> {
    return this.chatRepository.find({
      where: { user: { id: userId } as any, isActive: true },
      // order by latest updated first
      order: { updatedAt: 'DESC' },
    });
  }

  // get a single chat with all its messages — verifies ownership
  async getChatWithMessages(chatId: string, userId: string): Promise<Chat> {
    const chat = await this.chatRepository.findOne({
      where: { id: chatId },
      // explicitly load messages relation — not auto-loaded since eager: false
      relations: ['messages'],
      order: { messages: { createdAt: 'ASC' } } as any,
    });

    if (!chat) {
      throw new NotFoundException('Chat not found');
    }

    // ownership check — user can only access their own chats
    if (chat.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return chat;
  }

  async updateChat(
    chatId: string,
    userId: string,
    updateChatDto: UpdateChatDto,
  ): Promise<Chat> {
    const chat = await this.getChatById(chatId, userId);
    Object.assign(chat, updateChatDto);
    return this.chatRepository.save(chat);
  }

  async deleteChat(chatId: string, userId: string): Promise<void> {
    const chat = await this.getChatById(chatId, userId);
    await this.chatRepository.softDelete(chat.id);
  }

  async getChatHistory(chatId: string, userId: string): Promise<Message[]> {
    await this.getChatById(chatId, userId);

    return this.messageRepository.find({
      where: { chat: { id: chatId } as any },
      order: { createdAt: 'ASC' },
    });
  }

  // send a message and get a streaming AI response
  // returns Observable<string> — each emission is a chunk of the AI response
  async sendMessage(
    chatId: string,
    userId: string,
    sendMessageDto: SendMessageDto,
  ): Promise<Observable<string>> {
    const chat = await this.getChatById(chatId, userId);

    // save user message to DB first
    const userMessage = this.messageRepository.create({
      chat: { id: chatId },
      role: MessageRole.USER,
      content: sendMessageDto.content,

      model: 'user',
      promptTokens: 0,
      completionTokens: 0,
    });
    await this.messageRepository.save(userMessage);

    const recentMessages = await this.messageRepository.find({
      where: { chat: { id: chatId } as any },
      order: { createdAt: 'ASC' },
      take: 20,
    });

    const formattedMessages = recentMessages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    const model = sendMessageDto.model || chat.model;

    const stream$ = this.aiGatewayService.streamChat(formattedMessages, model);

    this.saveAssistantMessage(chatId, model, stream$);

    if (chat.title === 'New Chat') {
      const autoTitle = sendMessageDto.content.substring(0, 50);
      await this.chatRepository.update(chatId, { title: autoTitle });
    }

    return stream$;
  }

  // private helper — saves assistant message after stream completes
  private async saveAssistantMessage(
    chatId: string,
    model: string,
    stream$: Observable<string>,
  ): Promise<void> {
    let fullContent = '';

    stream$.subscribe({
      next: (chunk) => {
        fullContent += chunk;
      },
      complete: async () => {
        // save complete assistant response to DB
        const assistantMessage = this.messageRepository.create({
          chat: { id: chatId },
          role: MessageRole.ASSISTANT,
          content: fullContent,
          model,
          promptTokens: 0,
          completionTokens: 0,
        });
        await this.messageRepository.save(assistantMessage);
      },
      error: (err) => {
        console.error('Stream error while saving assistant message:', err);
      },
    });
  }

  private async getChatById(chatId: string, userId: string): Promise<Chat> {
    const chat = await this.chatRepository.findOne({
      where: { id: chatId },
    });

    if (!chat) {
      throw new NotFoundException('Chat not found');
    }

    if (chat.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return chat;
  }
}
