import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('provider_logs')
export class ProviderLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  vrm: string;

  @Column()
  providerName: string;

  @CreateDateColumn()
  requestDateTime: Date;

  @Column('int')
  requestDuration: number;

  @Column()
  requestUrl: string;

  @Column('int')
  responseCode: number;

  @Column({ nullable: true })
  errorMessage?: string;

  @Column({ default: false })
  isFallbackProvider: boolean;
}