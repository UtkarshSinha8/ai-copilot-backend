import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { UserRole } from '../entities/user.entity';
export class CreateUserDto {
  @IsEmail({}, { message: 'please provide a valid email' })
  email!: string;

  @IsString()
  firstName!: string;

  @IsString()
  lastName!: string;

  @IsString()
  @MinLength(8, { message: 'password miust be at least 8 character ' })
  password!: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
