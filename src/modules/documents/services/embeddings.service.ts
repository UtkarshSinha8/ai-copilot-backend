import { Injectable, InternalServerErrorException } from '@nestjs/common';

import axios from 'axios';

import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmbeddingsService {
  private readonly apiKey: string;

  private readonly baseUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('openrouter.apiKey') || '';

    this.baseUrl = this.configService.get<string>('openrouter.baseUrl') || '';
  }

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/embeddings`,
        {
          model: 'text-embedding-3-small',
          input: text,
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        },
      );

      return response.data.data[0].embedding;
    } catch (error) {
      console.error('Embedding generation failed:', error);

      throw new InternalServerErrorException('Failed to generate embedding');
    }
  }
}
