import { describe, expect, it, vi } from 'vitest';
import { parseUserEvent } from './user-event';
import { HandleUserEvent } from './use-cases/handle-user-event';
import { IndexUser } from './use-cases/index-user';
import { RemoveUser } from './use-cases/remove-user';
import { SearchUsers } from './use-cases/search-users';
import { withRetry } from './retry';
import type { SearchIndexPort } from './ports/search-index.port';

const fakeIndex = (over: Partial<SearchIndexPort> = {}): SearchIndexPort => ({
  ensureIndex: vi.fn(),
  upsert: vi.fn(),
  remove: vi.fn(),
  search: vi.fn().mockResolvedValue({ total: 0, items: [] }),
  ...over,
});
const logger = { info: vi.fn(), warn: vi.fn() };
const handler = (idx: SearchIndexPort) => new HandleUserEvent(new IndexUser(idx), new RemoveUser(idx), logger);

const created = (extra: object = {}) =>
  JSON.stringify({
    eventName: 'user.created',
    occurredOn: 'x',
    payload: { id: '1', name: 'Ana', email: 'a@x.co', role: 'MEMBER', status: 'ACTIVE', ...extra },
  });

describe('parseUserEvent', () => {
  it('mapea user.created y user.updated a upsert', () => {
    expect(parseUserEvent(created())).toEqual({
      type: 'upsert',
      user: { id: '1', name: 'Ana', email: 'a@x.co', role: 'MEMBER', status: 'ACTIVE' },
    });
    expect(parseUserEvent(created().replace('user.created', 'user.updated')).type).toBe('upsert');
  });

  it('acepta el envelope real de Users (eventType USER_CREATED)', () => {
    const raw = JSON.stringify({ eventType: 'USER_CREATED', payload: { id: '1', name: 'Ana', email: 'a@x.co' } });
    expect(parseUserEvent(raw).type).toBe('upsert');
  });

  it('no deja pasar password ni passwordHash', () => {
    const ev = parseUserEvent(created({ password: 'p', passwordHash: 'h', extra: 1 }));
    expect(ev.type === 'upsert' && Object.keys(ev.user).sort()).toEqual(['email', 'id', 'name', 'role', 'status']);
  });

  it('user.deleted solo con id', () => {
    const raw = JSON.stringify({ eventName: 'user.deleted', payload: { id: '9' } });
    expect(parseUserEvent(raw)).toEqual({ type: 'delete', id: '9' });
  });

  it('evento desconocido e inválidos no lanzan', () => {
    expect(parseUserEvent(JSON.stringify({ eventName: 'account.created', payload: {} })).type).toBe('unknown');
    expect(parseUserEvent('no es json').type).toBe('invalid');
    expect(parseUserEvent(JSON.stringify({ eventName: 'user.created', payload: { id: '1' } })).type).toBe('invalid');
  });
});

describe('HandleUserEvent', () => {
  it('indexa, borra e ignora', async () => {
    const idx = fakeIndex();
    const h = handler(idx);
    expect(await h.execute(created())).toBe('indexed');
    expect(idx.upsert).toHaveBeenCalledOnce();
    expect(await h.execute(JSON.stringify({ eventName: 'user.deleted', payload: { id: '1' } }))).toBe('removed');
    expect(idx.remove).toHaveBeenCalledWith('1');
    expect(await h.execute(JSON.stringify({ eventName: 'account.created', payload: {} }))).toBe('ignored');
  });

  it('propaga el error de OpenSearch para que el mensaje no se confirme', async () => {
    const idx = fakeIndex({ upsert: vi.fn().mockRejectedValue(new Error('down')) });
    await expect(handler(idx).execute(created())).rejects.toThrow('down');
  });
});

describe('withRetry', () => {
  it('reintenta hasta tener éxito', async () => {
    const fn = vi.fn().mockRejectedValueOnce(new Error('a')).mockResolvedValue('ok');
    expect(await withRetry(fn, { attempts: 3, delayMs: 1, sleep: async () => {} })).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });
  it('relanza si se agotan los intentos', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('x'));
    await expect(withRetry(fn, { attempts: 2, delayMs: 1, sleep: async () => {} })).rejects.toThrow('x');
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

describe('SearchUsers', () => {
  it('limita size a 50 y normaliza page', async () => {
    const idx = fakeIndex();
    await new SearchUsers(idx).execute({ q: ' ana ', size: 500, page: 0 });
    expect(idx.search).toHaveBeenCalledWith({ q: 'ana', status: undefined, page: 1, size: 50 });
  });
});
