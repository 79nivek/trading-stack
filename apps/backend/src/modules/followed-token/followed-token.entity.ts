import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity('followed_token')
export class FollowedToken {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  symbol!: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;
}
