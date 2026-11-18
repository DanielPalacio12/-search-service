import type { SearchIndexPort } from '../ports/search-index.port';

/** user.deleted: borra por id, ignorando si ya no existe. */
export class RemoveUser {
  constructor(private readonly index: SearchIndexPort) {}
  execute(id: string): Promise<void> {
    return this.index.remove(id);
  }
}
