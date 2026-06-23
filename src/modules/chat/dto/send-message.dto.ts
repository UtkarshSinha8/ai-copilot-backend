import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class SendMessageDto {
  // the user's message content
  @IsString()
  @IsNotEmpty()
  content!: string;

  // optional model override per message — user can switch models mid-chat
  @IsOptional()
  @IsString()
  model?: string;
}
