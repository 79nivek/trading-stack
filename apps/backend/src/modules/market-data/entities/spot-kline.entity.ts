import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
} from 'typeorm';

@Entity('klines_spot')
@Index(['interval', 'openTime'])
@Index(['openTime'])
export class SpotKline {
  @PrimaryColumn() symbol!: string;
  @PrimaryColumn() interval!: string;
  @PrimaryColumn({ type: 'bigint' }) openTime!: number;

  @Column({ type: 'bigint' }) closeTime!: number;
  @Column() open!: string;
  @Column() high!: string;
  @Column() low!: string;
  @Column() close!: string;
  @Column() baseVolume!: string;
  @Column() quoteVolume!: string;

  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
  @DeleteDateColumn() deletedAt!: Date;
}
