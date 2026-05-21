import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';

@Module({
  // forFeature registers the User entity ONLY for this module's scope
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [UsersController],
  providers: [UsersService],
  // exports allows AuthModule to use UsersService without re-declaring it
  exports: [UsersService],
})
export class UsersModule {}