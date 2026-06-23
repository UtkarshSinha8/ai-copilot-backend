import { IsNotEmpty, IsString } from 'class-validator';

export class SearchDocumentsDto {
  @IsString()
  @IsNotEmpty()
  query!: string;
}
