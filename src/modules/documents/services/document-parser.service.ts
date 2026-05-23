import { Injectable } from '@nestjs/common';

import * as fs from 'fs/promises';

const pdfParse = require('pdf-parse');

@Injectable()
export class DocumentParserService {
  async extractText(
    filePath: string,
    fileType: string,
  ): Promise<string> {
    switch (fileType) {
      case 'txt':
        return this.extractTxtText(filePath);

      case 'pdf':
        return this.extractPdfText(filePath);

      case 'docx':
        return this.extractDocxText(filePath);

      default:
        throw new Error(
          `Unsupported file type: ${fileType}`,
        );
    }
  }

  private async extractTxtText(
    filePath: string,
  ): Promise<string> {
    const text = await fs.readFile(
      filePath,
      'utf-8',
    );

    return this.normalizeText(text);
  }

  private async extractPdfText(
    filePath: string,
  ): Promise<string> {
    const buffer = await fs.readFile(filePath);

    const data = await pdfParse(buffer);

    return this.normalizeText(data.text);
  }

  private async extractDocxText(
    filePath: string,
  ): Promise<string> {
    const text = await fs.readFile(
      filePath,
      'utf-8',
    );

    return this.normalizeText(text);
  }

  private normalizeText(text: string): string {
    return text
      .replace(/\r\n/g, '\n')
      .replace(/\n+/g, '\n')
      .replace(/\s+/g, ' ')
      .trim();
  }
}