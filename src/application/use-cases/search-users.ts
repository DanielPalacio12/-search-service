import type { SearchUsersQuery, SearchUsersResult } from '../../domain/user-document';
import type { SearchIndexPort } from '../ports/search-index.port';

export const MAX_SIZE = 50;
export const DEFAULT_SIZE = 10;

const posInt = (n: number | undefined, fallback: number) =>
  Number.isInteger(n) && (n as number) >= 1 ? (n as number) : fallback;

export class SearchUsers {
  constructor(private readonly index: SearchIndexPort) {}

  execute(input: { q?: string; status?: string; page?: number; size?: number }): Promise<SearchUsersResult> {
    const query: SearchUsersQuery = {
      q: input.q?.trim() || undefined,
      status: input.status?.trim() || undefined,
      page: posInt(input.page, 1),
      size: Math.min(posInt(input.size, DEFAULT_SIZE), MAX_SIZE),
    };
    return this.index.search(query);
  }
}
