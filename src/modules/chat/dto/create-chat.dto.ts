import { IsString, IsOptional } from 'class-validator';

export class CreateChatDto {
  // title is optional — if not provided, we auto-generate from first message
  @IsOptional()
  @IsString()
  title?: string;

  // model is optional — defaults to entity default 'openai/gpt-4o'
  @IsOptional()
  @IsString()
  model?: string;
}