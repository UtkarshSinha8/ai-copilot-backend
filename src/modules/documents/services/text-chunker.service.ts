import { Injectable } from '@nestjs/common';

@Injectable()
export class TextChunkerService {
  chunkText(text: string, chunkSize = 1200, overlap = 150): string[] {
    if (!text || !text.trim()) {
      return [];
    }

    const chunks: string[] = [];

    let start = 0;

    while (start < text.length) {
      let end = Math.min(start + chunkSize, text.length);

      // Try to end at a paragraph
      if (end < text.length) {
        const paragraphBreak = text.lastIndexOf('\n\n', end);

        if (paragraphBreak > start + chunkSize * 0.6) {
          end = paragraphBreak;
        } else {
          // Try sentence
          const sentenceBreak = Math.max(
            text.lastIndexOf('. ', end),
            text.lastIndexOf('! ', end),
            text.lastIndexOf('? ', end),
          );

          if (sentenceBreak > start + chunkSize * 0.6) {
            end = sentenceBreak + 1;
          } else {
            // Try whitespace
            const spaceBreak = text.lastIndexOf(' ', end);

            if (spaceBreak > start + chunkSize * 0.6) {
              end = spaceBreak;
            }
          }
        }
      }

      const chunk = text.substring(start, end).trim();

      if (chunk.length > 0) {
        chunks.push(chunk);
      }

      start = Math.max(end - overlap, start + 1);
    }

    return chunks;
  }
}