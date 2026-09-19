import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { FollowedSymbol } from './followed-symbol.entity';

@Injectable()
export class FollowedSymbolRepository {
  constructor(
    @InjectRepository(FollowedSymbol)
    private readonly repo: Repository<FollowedSymbol>,
    private readonly dataSource: DataSource,
  ) {}

  findByUserId(userId: string): Promise<FollowedSymbol[]> {
    return this.repo.find({
      where: { userId },
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
  }

  findOneOwned(id: string, userId: string): Promise<FollowedSymbol | null> {
    return this.repo.findOne({ where: { id, userId } });
  }

  findByUserIdAndSymbol(
    userId: string,
    symbol: string,
  ): Promise<FollowedSymbol | null> {
    return this.repo.findOne({ where: { userId, symbol } });
  }

  async create(userId: string, symbol: string): Promise<FollowedSymbol> {
    // Assign next sortOrder — append at end
    const max = await this.repo
      .createQueryBuilder('fs')
      .select('MAX(fs.sortOrder)', 'max')
      .where('fs.userId = :userId', { userId })
      .getRawOne();

    const nextOrder = (max?.max ?? -1) + 1;
    const entry = this.repo.create({ userId, symbol, sortOrder: nextOrder });
    return this.repo.save(entry);
  }

  async softDelete(id: string, userId: string): Promise<void> {
    await this.repo.softDelete({ id, userId });
  }

  /**
   * Bulk-update sortOrder for a list of ids belonging to this user.
   * Runs inside a transaction to guarantee atomicity.
   */
  async updateSortOrders(
    orderedIds: string[],
    userId: string,
  ): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      for (let i = 0; i < orderedIds.length; i++) {
        await manager.update(
          FollowedSymbol,
          { id: orderedIds[i], userId },
          { sortOrder: i },
        );
      }
    });
  }
}
