import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { User } from './user.entity';

@Injectable()
export class UserRepository extends Repository<User> {
  constructor(dataSource: DataSource) {
    super(User, dataSource.createEntityManager());
  }

  async findByEmailOrUsername(email: string, username: string): Promise<User | null> {
    return this.findOne({
      where: [{ email }, { username }],
    });
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.findOne({ where: { username } });
  }

  async findById(id: string): Promise<User | null> {
    return this.findOne({ where: { id } });
  }
}
