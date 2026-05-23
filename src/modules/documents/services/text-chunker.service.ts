import { Injectable } from '@nestjs/common';

@Injectable()
export class TextChunkerService {
  chunkText(
    text: string,
    chunkSize = 1000,
    overlap = 200,
  ): string[] {
    const chunks: string[] = [];

    let start = 0;

    while (start < text.length) {
      const end = start + chunkSize;

      const chunk = text.slice(start, end).trim();

      if (chunk.length > 0) {
        chunks.push(chunk);
      }

      start += chunkSize - overlap;
    }

    return chunks;
  }
}