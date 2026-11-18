import type { UserDocument } from '../../domain/user-document';
import type { SearchIndexPort } from '../ports/search-index.port';

/** user.created y user.updated: index con _id = id (idempotente). */
export class IndexUser {
  constructor(private readonly index: SearchIndexPort) {}
  execute(user: UserDocument): Promise<void> {
    return this.index.upsert(user);
  }
}
