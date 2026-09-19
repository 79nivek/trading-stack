import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../users/user.entity';

@Entity('followed_symbols')
export class FollowedSymbol {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  symbol!: string;

  @Column()
  userId!: string;

  /** Manual sort order — lower value appears first */
  @Column({ type: 'int', default: 0 })
  sortOrder!: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @DeleteDateColumn()
  deletedAt!: Date;
}
