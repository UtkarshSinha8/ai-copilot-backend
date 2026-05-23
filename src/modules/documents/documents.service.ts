import {
  Injectable,
  BadRequestException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';

import { Document } from './entities/document.entity';
import { DocumentChunk } from './entities/document-chunk.entity';

import { DocumentParserService } from './services/document-parser.service';
import { TextChunkerService } from './services/text-chunker.service';
import { EmbeddingsService } from './services/embeddings.service';
import { AiGatewayService } from '../ai-gateway/ai-gateway.service';
import { CacheService } from 'src/common/services/cache.service';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';

@Injectable()
export class DocumentsService {
  constructor(
    @InjectRepository(Document)
    private readonly documentsRepository: Repository<Document>,

    @InjectRepository(DocumentChunk)
    private readonly chunksRepository: Repository<DocumentChunk>,

    private readonly parserService: DocumentParserService,

    private readonly chunkerService: TextChunkerService,
    private readonly embeddingsService: EmbeddingsService,
    private readonly aiGatewayService: AiGatewayService,
    private readonly cacheService: CacheService,
    @InjectQueue('document-processing')
private readonly documentQueue: Queue,
  ) {}

  async semanticSearch(
  query: string,
  userId: string,
) {
  const queryEmbedding =
    await this.embeddingsService.generateEmbedding(
      query,
    );

  const result = await this.chunksRepository.query(
    `
    SELECT
      id,
      content,
      "documentId",
      "chunkIndex",
      embedding <=> $1::vector AS distance
    FROM document_chunks
    WHERE "userId" = $2
      AND embedding IS NOT NULL
    ORDER BY embedding <=> $1::vector
    LIMIT 5
    `,
    [JSON.stringify(queryEmbedding), userId],
  );

  return result;
}

  async uploadDocument(
  file: Express.Multer.File,
  userId: string,
) {
  if (!file) {
    throw new BadRequestException(
      'File is required',
    );
  }

  const fileExtension = file.originalname
    .split('.')
    .pop()
    ?.toLowerCase();

  if (
    !fileExtension ||
    !['pdf', 'txt', 'docx'].includes(
      fileExtension,
    )
  ) {
    throw new BadRequestException(
      'Unsupported file type',
    );
  }

  const document =
    this.documentsRepository.create({
      originalName: file.originalname,
      storedName: file.filename,
      filePath: file.path,
      fileSize: file.size,
      fileType: fileExtension as any,
      status: 'processing' as any,
      userId,
    } as any);

  const savedDocument =
    await this.documentsRepository.save(
      document,
    );

  const savedDocumentEntity =
    Array.isArray(savedDocument)
      ? savedDocument[0]
      : savedDocument;

  await this.documentQueue.add(
    'process-document',
    {
      file,
      userId,
      documentId:
        savedDocumentEntity.id,
    },
  );

  return {
    success: true,
    message:
      'Document uploaded and queued for processing',
    documentId:
      savedDocumentEntity.id,
    status: 'processing',
  };
}
  async askQuestion(
  
  question: string,
  userId: string,
) 
{
  const cacheKey = `rag:${userId}:${question}`;

const cachedAnswer =
  await this.cacheService.get(cacheKey);

if (cachedAnswer) {
  return {
    question,
    answer: cachedAnswer,
    retrievedChunks: 0,
    cached: true,
  };
}
  const relevantChunks =
    await this.semanticSearch(
      question,
      userId,
    );

  const context = relevantChunks
    .map((chunk: any) => chunk.content)
    .join('\n\n');

  const prompt = `
You are an AI Operations Copilot.

Use the provided context as the PRIMARY source of truth.

If the context contains relevant information:
- answer using the context

If the context is insufficient:
- answer using your general knowledge
- but clearly separate inferred/general knowledge from retrieved context

CONTEXT:
${context}

USER QUESTION:
${question}

ANSWER:
`;

  const response =
  await this.aiGatewayService.chat(
    [
      {
        role: 'user',
        content: prompt,
      },
    ],
    'openai/gpt-3.5-turbo',
  );

  await this.cacheService.set(
  cacheKey,
  response,
  3600,
);

return {
  question,
  answer: response,
  retrievedChunks: relevantChunks.length,
  cached: false,
};
}
async processDocument(
  file: Express.Multer.File,
  userId: string,
  documentId: string,
) {
  const savedDocument =
    await this.documentsRepository.findOne({
      where: {
        id: documentId,
      },
    });

  if (!savedDocument) {
    throw new Error(
      'Document not found',
    );
  }

  const fileExtension =
    file.originalname
      .split('.')
      .pop()
      ?.toLowerCase() || 'txt';

  try {
    const extractedText =
      await this.parserService.extractText(
        file.path,
        fileExtension,
      );

    const chunks =
      this.chunkerService.chunkText(
        extractedText,
      );

    const chunkEntities: DocumentChunk[] =
      [];

    for (
      let index = 0;
      index < chunks.length;
      index++
    ) {
      const chunk = chunks[index];

      const embedding =
        await this.embeddingsService.generateEmbedding(
          chunk,
        );

      const chunkEntity =
        this.chunksRepository.create({
          documentId:
            savedDocument.id,
          content: chunk,
          chunkIndex: index,
          userId,
          embedding,
        });

      chunkEntities.push(
        chunkEntity,
      );
    }

    await this.chunksRepository.save(
      chunkEntities,
    );

    savedDocument.chunkCount =
      chunks.length;

    savedDocument.status =
      'completed' as any;

    await this.documentsRepository.save(
      savedDocument,
    );
  } catch (error) {
    savedDocument.status =
      'failed' as any;

    savedDocument.errorMessage =
      error instanceof Error
        ? error.message
        : 'Unknown error';

    await this.documentsRepository.save(
      savedDocument,
    );

    throw error;
  }
}
}