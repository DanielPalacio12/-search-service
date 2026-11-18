import { Client } from '@opensearch-project/opensearch';
import type { SearchIndexPort } from '../../application/ports/search-index.port';
import type { SearchUsersQuery, SearchUsersResult, UserDocument } from '../../domain/user-document';

export interface OpenSearchOptions {
  url: string;
  username: string;
  password: string;
  ca?: string;
  index: string;
}

export const INDEX_BODY = {
  settings: { number_of_shards: 1, number_of_replicas: 0 },
  mappings: {
    properties: {
      id: { type: 'keyword' },
      name: { type: 'text' },
      email: { type: 'keyword' },
      role: { type: 'keyword' },
      status: { type: 'keyword' },
    },
  },
};

const statusOf = (err: unknown): number | undefined =>
  (err as { meta?: { statusCode?: number } })?.meta?.statusCode ??
  (err as { statusCode?: number })?.statusCode;

/** Solo estos campos viajan al índice, pase lo que pase con el objeto de entrada. */
const toDoc = (u: UserDocument): UserDocument => ({
  id: u.id,
  name: u.name,
  email: u.email,
  role: u.role,
  status: u.status,
});

export class OpenSearchIndexAdapter implements SearchIndexPort {
  private readonly client: Client;
  private readonly index: string;

  constructor(opts: OpenSearchOptions) {
    this.index = opts.index;
    this.client = new Client({
      node: opts.url,
      auth: { username: opts.username, password: opts.password },
      ...(opts.ca ? { ssl: { ca: opts.ca } } : {}),
    });
  }

  async ensureIndex(): Promise<void> {
    const exists = await this.client.indices.exists({ index: this.index });
    if (exists.body) return;
    try {
      await this.client.indices.create({ index: this.index, body: INDEX_BODY as never });
    } catch (err) {
      // Carrera entre procesos (web + worker): el índice ya existe
      const type = (err as { meta?: { body?: { error?: { type?: string } } } })?.meta?.body?.error?.type;
      if (type !== 'resource_already_exists_exception') throw err;
    }
  }

  async upsert(user: UserDocument): Promise<void> {
    await this.client.index({ index: this.index, id: user.id, body: toDoc(user) });
  }

  async remove(id: string): Promise<void> {
    try {
      await this.client.delete({ index: this.index, id });
    } catch (err) {
      if (statusOf(err) !== 404) throw err;
    }
  }

  async search(q: SearchUsersQuery): Promise<SearchUsersResult> {
    const must = q.q
      ? [
          {
            bool: {
              should: [{ match: { name: { query: q.q, fuzziness: 'AUTO' } } }, { term: { email: q.q } }],
              minimum_should_match: 1,
            },
          },
        ]
      : [{ match_all: {} }];
    const filter = q.status ? [{ term: { status: q.status } }] : [];

    const res = await this.client.search({
      index: this.index,
      body: {
        from: (q.page - 1) * q.size,
        size: q.size,
        track_total_hits: true,
        query: { bool: { must, filter } },
      },
    });
    const hits = res.body.hits;
    const total = typeof hits.total === 'number' ? hits.total : (hits.total?.value ?? 0);
    return {
      total,
      items: hits.hits.map((h) => toDoc(h._source as UserDocument)),
    };
  }
}
