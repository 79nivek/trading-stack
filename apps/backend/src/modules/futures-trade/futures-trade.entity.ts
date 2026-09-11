import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('futures_trade')
export class FuturesTrade {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 50 })
  symbol!: string;

  @Column({ type: 'varchar', length: 10 })
  side!: 'BUY' | 'SELL';

  @Column({ type: 'float', nullable: true })
  price!: number;

  @Column({ type: 'float', nullable: true })
  qty!: number;

  @Column({ type: 'float', default: 0 })
  fee!: number;

  @Column({ type: 'varchar', length: 20, nullable: true })
  feeAsset?: string | null;

  @Column({ type: 'float', default: 0 })
  realizedPnl!: number;

  @Column({ type: 'float', nullable: true })
  exitPrice?: number;

  @Column({ type: 'timestamp' })
  timestamp!: Date;
}
