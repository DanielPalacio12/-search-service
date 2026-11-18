import type { SearchUsersQuery, SearchUsersResult, UserDocument } from '../../domain/user-document';

export interface SearchIndexPort {
  ensureIndex(): Promise<void>;
  upsert(user: UserDocument): Promise<void>;
  /** Borra por id. Si no existe, no falla. */
  remove(id: string): Promise<void>;
  search(query: SearchUsersQuery): Promise<SearchUsersResult>;
}
