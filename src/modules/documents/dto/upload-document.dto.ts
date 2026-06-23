import { IsOptional, IsString } from 'class-validator';

export class UploadDocumentDto {
  // optional description for the document
  // the file itself comes via multipart/form-data not JSON body
  @IsOptional()
  @IsString()
  description?: string;
}
