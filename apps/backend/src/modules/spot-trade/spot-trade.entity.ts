import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('spot_trade')
export class SpotTrade {
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

  @Column({ type: 'timestamp' })
  timestamp!: Date;
}
