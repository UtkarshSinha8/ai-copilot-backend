import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class UpdateChatDto {
  // only title and isActive can be updated by user
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}