import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  RelationId,
  DeleteDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('chats')
export class Chat {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ default: 'New Chat' })
  title!: string;

  // ManyToOne — many chats belong to one user
  // eager: false is default — you must explicitly join when querying
  @ManyToOne(() => User, { onDelete: 'CASCADE', eager: false })
  @JoinColumn({ name: 'userId' })
  user!: User;

  // @RelationId lets TypeORM automatically populate userId from the relation
  // cleaner than manually managing both user and userId columns
  @RelationId((chat: Chat) => chat.user)
  userId!: string;

  @Column({ default: 'openrouter/free' })
  model!: string;

  @Column({ default: true })
  isActive!: boolean;

  // TypeORM soft delete — sets deletedAt timestamp instead of removing the row
  // use repo.softDelete(id) to soft delete, repo.restore(id) to undo
  // requires WithSoftDelete in queries to include soft-deleted rows
  @DeleteDateColumn({ nullable: true })
  deletedAt!: Date | null;

  // eager: false — messages are NOT loaded automatically
  // you must use relations: ['messages'] or leftJoinAndSelect in queries
  @OneToMany(() => Message, (message) => message.chat, {
    cascade: true,
    eager: false,
  })
  messages!: Message[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

// ─── Message Role Enum ────────────────────────────────────────────────────────

// follows OpenAI/OpenRouter standard role naming
export enum MessageRole {
  USER = 'user',
  ASSISTANT = 'assistant',
  SYSTEM = 'system',
}

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Chat, (chat) => chat.messages, {
    onDelete: 'CASCADE',
    eager: false,
  })
  @JoinColumn({ name: 'chatId' })
  chat!: Chat;

  // @RelationId auto-populates chatId from the relation — no separate @Column needed
  @RelationId((message: Message) => message.chat)
  chatId!: string;

  @Column({
    type: 'enum',
    enum: MessageRole,
    default: MessageRole.USER,
  })
  role!: MessageRole;

  // text type for long AI responses
  @Column({ type: 'text' })
  content!: string;

  // default 0 instead of nullable — always tracks token usage
  // makes cost calculations reliable with no null checks needed
  @Column({ default: 0 })
  promptTokens!: number;

  @Column({ default: 0 })
  completionTokens!: number;

  // required — every message must know which model generated it
  // assistant messages get the model name, user messages get 'user'
  @Column()
  model!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
