import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  DeleteDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { OneToMany } from 'typeorm';
import { DocumentChunk } from './document-chunk.entity';

// document processing status — tracks where in the pipeline the document is
export enum DocumentStatus {
  PENDING = 'pending',       // just uploaded, not processed yet
  PROCESSING = 'processing', // currently being chunked and embedded
  COMPLETED = 'completed',   // fully processed, ready for RAG queries
  FAILED = 'failed',         // processing failed — check errorMessage
}

// supported file types — we validate against this on upload
export enum DocumentType {
  PDF = 'pdf',
  TXT = 'txt',
  DOCX = 'docx',
}

@Entity('documents')
export class Document {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // original filename the user uploaded — for display purposes
  @Column()
  originalName!: string;
  @OneToMany(
  () => DocumentChunk,
  (chunk) => chunk.document,
)
chunks!: DocumentChunk[];

  // stored filename — uuid based to avoid collisions and path traversal attacks
  @Column()
  storedName!: string;

  // full path on disk where file is stored
  @Column()
  filePath! : string;

  // file size in bytes — useful for storage quota enforcement later
  @Column()
  fileSize!: number;

  @Column({
    type: 'enum',
    enum: DocumentType,
  })
  fileType!: DocumentType;

  @Column({
    type: 'enum',
    enum: DocumentStatus,
    default: DocumentStatus.PENDING,
  })
  status!: DocumentStatus;

  // total number of chunks this document was split into
  // populated after processing completes
  @Column({ default: 0 })
  chunkCount!: number;

  // stores error details if processing fails
  // helps with debugging and showing user friendly error messages
  @Column({ type: 'text', nullable: true })
  errorMessage!: string | null;

  // ManyToOne — many documents belong to one user
  @ManyToOne(() => User, { onDelete: 'CASCADE', eager: false })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column()
  userId!: string;

  // soft delete — never hard delete documents
  @DeleteDateColumn({ nullable: true })
  deletedAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}