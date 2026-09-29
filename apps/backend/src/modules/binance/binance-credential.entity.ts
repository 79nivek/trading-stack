import { Column, Entity, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, DeleteDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../users/user.entity';

@Entity('binance_credentials')
export class BinanceCredential {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column()
  userId!: string;

  @Column()
  encryptedApiKey!: string;

  @Column()
  encryptedSecretKey!: string;

  @Column()
  apiKeyIv!: string;

  @Column()
  apiKeyAuthTag!: string;

  @Column()
  secretKeyIv!: string;

  @Column()
  secretKeyAuthTag!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @DeleteDateColumn()
  deletedAt!: Date;
}
