import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { ChatModule } from './modules/chat/chat.module';
import { AiGatewayModule } from './modules/ai-gateway/ai-gateway.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { BullModule } from '@nestjs/bull';

import databaseConfig from './config/database.config';
import jwtConfig from './config/jwt.config';
import redisConfig from './config/redis.config';
import openrouterConfig from './config/openrouter.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      load: [databaseConfig, jwtConfig, redisConfig, openrouterConfig],
    }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],

      useFactory: (configService: ConfigService) => {
        console.log('DB_HOST:', configService.get('database.host'));
        console.log('DB_PORT:', configService.get('database.port'));
        console.log('DB_USERNAME:', configService.get('database.username'));
        console.log('DB_PASSWORD:', configService.get('database.password'));
        console.log('DB_NAME:', configService.get('database.name'));

        return {
          type: 'postgres' as const,
          host: configService.get<string>('database.host'),
          port: configService.get<number>('database.port'),
          username: configService.get<string>('database.username'),
          password: configService.get<string>('database.password'),
          database: configService.get<string>('database.name'),

          autoLoadEntities: true,

          synchronize: true,

          logging: process.env.NODE_ENV === 'development',
        };
      },
    }),

    UsersModule,
    AuthModule,
    ChatModule,
    AiGatewayModule,
    DocumentsModule,
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
    } as any),
  ],
})
export class AppModule {}
