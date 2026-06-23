import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Observable } from 'rxjs';
import axios from 'axios';

// shape of each message sent to OpenRouter
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// shape of the full chat request
export interface ChatRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

@Injectable()
export class AiGatewayService {
  // NestJS built-in logger — better than console.log for production
  private readonly logger = new Logger(AiGatewayService.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(private readonly configService: ConfigService) {
    // read OpenRouter config from our namespaced config
    this.baseUrl = this.configService.get<string>('openrouter.baseUrl')!;
    this.apiKey = this.configService.get<string>('openrouter.apiKey')!;
  }

  // streamChat returns an Observable<string>
  // each emission is one text chunk from the AI stream
  // Observable is perfect here — it models a sequence of values over time
  streamChat(
    messages: ChatMessage[],
    model: string,
    temperature: number = 0.7,
    maxTokens: number = 1000,
  ): Observable<string> {
    return new Observable<string>((subscriber) => {
      // immediately invoke async function inside Observable constructor
      // this is the standard pattern for wrapping async streams in RxJS
      (async () => {
        try {
          this.logger.log(`Streaming chat with model: ${model}`);

          const response = await axios.post(
            `${this.baseUrl}/chat/completions`,
            {
              model,
              messages,
              temperature,
              max_tokens: maxTokens,
              // stream: true tells OpenRouter to send chunks as they are generated
              stream: true,
            },
            {
              headers: {
                Authorization: `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json',
                // OpenRouter requires these headers for tracking
                'HTTP-Referer': 'http://localhost:3000',
                'X-Title': 'AI Copilot',
              },
              // responseType stream — axios reads the response as a Node.js stream
              // instead of waiting for the full response body
              responseType: 'stream',
            },
          );

          // response.data is a Node.js Readable stream
          const stream = response.data;

          // buffer to handle partial chunks — OpenRouter may split SSE lines
          let buffer = '';

          stream.on('data', (chunk: Buffer) => {
            // convert buffer to string and add to our buffer
            buffer += chunk.toString();

            // split on newlines — SSE format sends one event per line
            const lines = buffer.split('\n');

            // keep the last incomplete line in buffer for next chunk
            buffer = lines.pop() || '';

            for (const line of lines) {
              // SSE lines start with 'data: '
              const trimmed = line.trim();
              if (!trimmed || !trimmed.startsWith('data: ')) continue;

              const data = trimmed.replace('data: ', '');

              // '[DONE]' is the OpenRouter signal that stream has ended
              if (data === '[DONE]') {
                subscriber.complete();
                return;
              }

              try {
                const parsed = JSON.parse(data);

                // extract the text delta from the chunk
                // choices[0].delta.content is the standard OpenAI/OpenRouter format
                const content = parsed?.choices?.[0]?.delta?.content;

                if (content) {
                  // emit each chunk to the Observable subscribers
                  subscriber.next(content);
                }
              } catch {
                // skip malformed JSON chunks — they happen occasionally
                this.logger.warn(`Could not parse chunk: ${data}`);
              }
            }
          });

          stream.on('end', () => {
            subscriber.complete();
          });

          stream.on('error', (err: Error) => {
            this.logger.error('Stream error:', err.message);
            subscriber.error(err);
          });
        } catch (error: any) {
          this.logger.error('AI Gateway error:', error.message);
          subscriber.error(error);
        }
      })();
    });
  }

  // non-streaming version — waits for full response
  // useful for background jobs where streaming is not needed
  async chat(
    messages: ChatMessage[],
    model: string,
    temperature: number = 0.7,
    maxTokens: number = 1000,
  ): Promise<string> {
    try {
      this.logger.log(`Non-streaming chat with model: ${model}`);

      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model,
          messages,
          temperature,
          max_tokens: maxTokens,
          stream: false,
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'http://localhost:3000',
            'X-Title': 'AI Copilot',
          },
        },
      );

      // extract text from standard OpenAI response format
      return response.data?.choices?.[0]?.message?.content || '';
    } catch (error: any) {
      this.logger.error('AI Gateway non-stream error:', error.message);
      throw error;
    }
  }

  // getAvailableModels — returns list of models from OpenRouter
  // useful for letting users pick which model to use
  async getAvailableModels(): Promise<any[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/models`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      });

      return response.data?.data || [];
    } catch (error: any) {
      this.logger.error('Failed to fetch models:', error.message);
      return [];
    }
  }
}
