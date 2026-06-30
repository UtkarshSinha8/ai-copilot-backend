import { Injectable, BadRequestException } from '@nestjs/common';

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

  async semanticSearch(query: string, userId: string) {
    const queryEmbedding =
      await this.embeddingsService.generateEmbedding(query);

    const result = await this.chunksRepository.query(
      `
    SELECT
      c.id,
      c.content,
      c."documentId",
      c."chunkIndex",
      d."originalName" AS "documentName",
      c.embedding <=> $1::vector AS distance
    FROM document_chunks c
    LEFT JOIN documents d ON c."documentId" = d.id
    WHERE c."userId" = $2
      AND c.embedding IS NOT NULL
    ORDER BY c.embedding <=> $1::vector
    LIMIT 10
    `,
      [JSON.stringify(queryEmbedding), userId],
    );

    return result;
  }

  async uploadDocument(file: Express.Multer.File, userId: string) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    const fileExtension = file.originalname.split('.').pop()?.toLowerCase();

    if (!fileExtension || !['pdf', 'txt', 'docx'].includes(fileExtension)) {
      throw new BadRequestException('Unsupported file type');
    }

    const document = this.documentsRepository.create({
      originalName: file.originalname,
      storedName: file.filename,
      filePath: file.path,
      fileSize: file.size,
      fileType: fileExtension as any,
      status: 'processing' as any,
      userId,
    } as any);

    const savedDocument = await this.documentsRepository.save(document);

    const savedDocumentEntity = Array.isArray(savedDocument)
      ? savedDocument[0]
      : savedDocument;

    await this.documentQueue.add('process-document', {
      file,
      userId,
      documentId: savedDocumentEntity.id,
    });

    return {
      success: true,
      message: 'Document uploaded and queued for processing',
      documentId: savedDocumentEntity.id,
      status: 'processing',
    };
  }

  async getDocuments(userId: string) {
    return this.documentsRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async askQuestion(question: string, userId: string) {
    const cacheKey = `rag:${userId}:${question}`;

    const cachedResultStr = await this.cacheService.get(cacheKey);

    if (cachedResultStr) {
      try {
        const cachedObj = JSON.parse(cachedResultStr);
        return {
          question,
          answer: cachedObj.answer,
          retrievedChunks: cachedObj.retrievedChunks || 0,
          sources: cachedObj.sources || [],
          cached: true,
        };
      } catch (e) {
        // Fallback if cache gets corrupted or was raw string
        return {
          question,
          answer: cachedResultStr,
          retrievedChunks: 0,
          sources: [],
          cached: true,
        };
      }
    }
    const searchResults = await this.semanticSearch(question, userId);

const relevantChunks = searchResults.filter(
  (chunk: any) => Number(chunk.distance) < 0.7,
);

    const context = relevantChunks
  .map(
    (chunk: any, index: number) => `
Source ${index + 1}
Document: ${chunk.documentName}
Chunk: ${chunk.chunkIndex}

${chunk.content}
`,
  )
  .join('\n\n----------------------------------------\n\n');

    const sources = Array.from(
      new Set(relevantChunks.map((chunk: any) => chunk.documentName || 'Unknown Document')),
    );
    const hasRelevantContext = relevantChunks.length > 0;

    const prompt = hasRelevantContext
  ? `
You are an intelligent AI Assistant designed to help users understand uploaded documents and answer their questions accurately.

Rules:

1. Always prioritize the retrieved document context whenever it is relevant.

2. If the uploaded documents fully answer the question, answer primarily from the documents.

3. If the uploaded documents only partially answer the question, first explain what the documents contain, then complete the answer using your own general knowledge.

4. Never invent or attribute information to the uploaded documents that is not actually present in the retrieved context.

5. Use headings and bullet points whenever they improve readability.

6. Keep answers concise unless the user explicitly asks for detailed explanations.

Retrieved Context:

${context}

Number of Retrieved Chunks:

${relevantChunks.length}

User Question:

${question}

Answer:
`
  : `
You are a helpful and knowledgeable AI assistant.

No relevant information was found in the uploaded documents for this question.

Answer the user's question naturally using your own knowledge.

If appropriate, mention that the uploaded documents do not contain information related to the question, but do not refuse to answer.

Use clear explanations and examples whenever appropriate.

User Question:

${question}

Answer:
`;

    const response = await this.aiGatewayService.chat(
      [
        {
          role: 'user',
          content: prompt,
        },
      ],
      'deepseek/deepseek-r1:free',
    );

    const result = {
      answer: response,
      retrievedChunks: relevantChunks.length,
      sources,
    };

    await this.cacheService.set(cacheKey, JSON.stringify(result), 3600);

    return {
      question,
      ...result,
      cached: false,
    };
  }
  async processDocument(
    file: Express.Multer.File,
    userId: string,
    documentId: string,
  ) {
    const savedDocument = await this.documentsRepository.findOne({
      where: {
        id: documentId,
      },
    });

    if (!savedDocument) {
      throw new Error('Document not found');
    }

    const fileExtension =
      file.originalname.split('.').pop()?.toLowerCase() || 'txt';

    try {
      const extractedText = await this.parserService.extractText(
        file.path,
        fileExtension,
      );

      const chunks = this.chunkerService.chunkText(extractedText);

      const chunkEntities: DocumentChunk[] = [];

      for (let index = 0; index < chunks.length; index++) {
        const chunk = chunks[index];

        const embedding = await this.embeddingsService.generateEmbedding(chunk);

        const chunkEntity = this.chunksRepository.create({
          documentId: savedDocument.id,
          content: chunk,
          chunkIndex: index,
          userId,
          embedding,
        });

        chunkEntities.push(chunkEntity);
      }

      await this.chunksRepository.save(chunkEntities);

      savedDocument.chunkCount = chunks.length;

      savedDocument.status = 'completed' as any;

      await this.documentsRepository.save(savedDocument);
    } catch (error) {
      savedDocument.status = 'failed' as any;

      savedDocument.errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      await this.documentsRepository.save(savedDocument);

      throw error;
    }
  }
}
