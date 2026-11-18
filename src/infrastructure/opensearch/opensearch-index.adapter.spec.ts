import { beforeEach, describe, expect, it, vi } from 'vitest';

const client = vi.hoisted(() => ({
  indices: { exists: vi.fn(), create: vi.fn() },
  index: vi.fn(),
  delete: vi.fn(),
  search: vi.fn(),
}));
vi.mock('@opensearch-project/opensearch', () => ({
  Client: function Client() {
    return client;
  },
}));

import { OpenSearchIndexAdapter } from './opensearch-index.adapter';

const adapter = () =>
  new OpenSearchIndexAdapter({ url: 'https://h:1', username: 'u', password: 'p', index: 'users' });

beforeEach(() => vi.clearAllMocks());

describe('OpenSearchIndexAdapter', () => {
  it('crea el índice con 1 shard y 0 réplicas si no existe', async () => {
    client.indices.exists.mockResolvedValue({ body: false });
    await adapter().ensureIndex();
    const arg = client.indices.create.mock.calls[0][0];
    expect(arg.body.settings).toEqual({ number_of_shards: 1, number_of_replicas: 0 });
    expect(arg.body.mappings.properties.name.type).toBe('text');
  });

  it('no crea el índice si ya existe', async () => {
    client.indices.exists.mockResolvedValue({ body: true });
    await adapter().ensureIndex();
    expect(client.indices.create).not.toHaveBeenCalled();
  });

  it('upsert usa _id = id y solo los campos del mapeo', async () => {
    const user = { id: '1', name: 'Ana', email: 'a@x.co', role: 'M', status: 'ACTIVE', passwordHash: 'h' };
    await adapter().upsert(user as never);
    expect(client.index).toHaveBeenCalledWith({
      index: 'users',
      id: '1',
      body: { id: '1', name: 'Ana', email: 'a@x.co', role: 'M', status: 'ACTIVE' },
    });
  });

  it('remove ignora 404 pero relanza otros errores', async () => {
    client.delete.mockRejectedValueOnce({ meta: { statusCode: 404 } });
    await expect(adapter().remove('1')).resolves.toBeUndefined();
    client.delete.mockRejectedValueOnce({ meta: { statusCode: 503 } });
    await expect(adapter().remove('1')).rejects.toBeDefined();
  });

  it('search arma fuzzy en name, term en email, filtro status y paginación', async () => {
    client.search.mockResolvedValue({
      body: { hits: { total: { value: 1 }, hits: [{ _source: { id: '1', name: 'Ana', email: 'a', role: 'M', status: 'ACTIVE', x: 1 } }] } },
    });
    const res = await adapter().search({ q: 'ana', status: 'ACTIVE', page: 3, size: 10 });
    const body = client.search.mock.calls[0][0].body;
    expect(body.from).toBe(20);
    expect(body.size).toBe(10);
    expect(body.query.bool.must[0].bool.should[0].match.name.fuzziness).toBe('AUTO');
    expect(body.query.bool.must[0].bool.should[1]).toEqual({ term: { email: 'ana' } });
    expect(body.query.bool.filter).toEqual([{ term: { status: 'ACTIVE' } }]);
    expect(res).toEqual({ total: 1, items: [{ id: '1', name: 'Ana', email: 'a', role: 'M', status: 'ACTIVE' }] });
  });
});
