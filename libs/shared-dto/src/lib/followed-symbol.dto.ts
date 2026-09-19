export interface FollowedSymbolDto {
  id: string;
  symbol: string;
  userId: string;
  sortOrder: number;
  createdAt: Date;
}

export interface CreateFollowedSymbolDto {
  symbol: string;
}

export interface ReorderFollowedSymbolsDto {
  orderedIds: string[];
}
