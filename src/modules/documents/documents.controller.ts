import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  UseGuards,
} from '@nestjs/common';

import { FileInterceptor } from '@nestjs/platform-express';

import { diskStorage } from 'multer';

import { DocumentsService } from './documents.service';

import { CurrentUser } from '../../common/decorators/current-user.decorator';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Body } from '@nestjs/common';

import { SearchDocumentsDto } from './dto/search-documents.dto';
import { AskQuestionDto } from './dto/ask-question.dto';
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post('upload')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',

        filename: (req, file, callback) => {
          const uniqueName = Date.now() + '-' + file.originalname;

          callback(null, uniqueName);
        },
      }),
    }),
  )
  async uploadDocument(
    @UploadedFile() file: Express.Multer.File,

    @CurrentUser() user: any,
  ) {
    return this.documentsService.uploadDocument(file, user.id);
  }

  @Post('search')
  @UseGuards(JwtAuthGuard)
  async searchDocuments(
    @Body() dto: SearchDocumentsDto,

    @CurrentUser() user: any,
  ) {
    return this.documentsService.semanticSearch(dto.query, user.id);
  }
  @Post('ask')
  @UseGuards(JwtAuthGuard)
  async askQuestion(
    @Body() dto: AskQuestionDto,

    @CurrentUser() user: any,
  ) {
    return this.documentsService.askQuestion(dto.question, user.id);
  }
}
