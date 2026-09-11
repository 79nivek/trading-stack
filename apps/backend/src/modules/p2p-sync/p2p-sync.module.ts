import { Module } from '@nestjs/common';
import { P2PSyncService } from './p2p-sync.service';

@Module({
  providers: [P2PSyncService],
  exports: [P2PSyncService],
})
export class P2PSyncModule {}
