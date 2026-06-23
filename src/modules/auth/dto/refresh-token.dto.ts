import { IsString } from 'class-validator';

export class RefreshTokenDto {
  // Client sends refresh token to get a new access token
  @IsString()
  refreshToken!: string;
}
