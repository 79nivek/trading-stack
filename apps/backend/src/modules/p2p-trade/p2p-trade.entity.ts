import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('p2p_trade')
export class P2PTrade {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  orderNumber!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  advNo!: string;

  @Column({ type: 'varchar', length: 10 })
  tradeType!: 'BUY' | 'SELL';

  @Column({ type: 'varchar', length: 20 })
  asset!: string;

  @Column({ type: 'varchar', length: 20 })
  fiat!: string;

  @Column({ type: 'varchar', length: 10, nullable: true })
  fiatSymbol!: string;

  @Column({ type: 'float' })
  amount!: number;

  @Column({ type: 'float' })
  totalPrice!: number;

  @Column({ type: 'float' })
  unitPrice!: number;

  @Column({ type: 'varchar', length: 50 })
  orderStatus!: string;

  @Column({ type: 'float', default: 0 })
  commission!: number;

  @Column({ type: 'timestamp' })
  createTime!: Date;
}
