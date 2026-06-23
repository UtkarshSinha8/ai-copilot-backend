import { Processor, WorkerHost } from '@nestjs/bullmq';

import { Job } from 'bullmq';

import { Logger } from '@nestjs/common';

import { DocumentsService } from '../documents.service';

@Processor('document-processing')
export class DocumentProcessor extends WorkerHost {
  private readonly logger = new Logger(DocumentProcessor.name);

  constructor(private readonly documentsService: DocumentsService) {
    super();
  }

  async process(job: Job<any>): Promise<void> {
    this.logger.log(`Processing document job: ${job.id}`);

    const { file, userId, documentId } = job.data;

    await this.documentsService.processDocument(file, userId, documentId);

    this.logger.log(`Completed document job: ${job.id}`);
  }
}
