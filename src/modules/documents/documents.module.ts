import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Document } from './entities/document.entity';
import { DocumentChunk } from './entities/document-chunk.entity';
import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';
import { TextChunkerService } from './services/text-chunker.service';
import { DocumentParserService } from './services/document-parser.service';
import { EmbeddingsService } from './services/embeddings.service';
import { AiGatewayModule } from '../ai-gateway/ai-gateway.module';
import { CommonModule } from 'src/common/common.module';
import { BullModule } from '@nestjs/bullmq';
import { DocumentProcessor } from './processors/document.processor';

@Module({
  imports: [
    TypeOrmModule.forFeature([Document, DocumentChunk]),
    AiGatewayModule,
    CommonModule,
    BullModule.registerQueue({
      name: 'document-processing',

      connection: {
        host: process.env.REDIS_HOST || 'localhost',

        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
    }),
  ],
  controllers: [DocumentsController],
  providers: [
    DocumentsService,
    DocumentParserService,
    TextChunkerService,
    EmbeddingsService,
    DocumentProcessor,
  ],

  exports: [DocumentsService],
})
export class DocumentsModule {}
