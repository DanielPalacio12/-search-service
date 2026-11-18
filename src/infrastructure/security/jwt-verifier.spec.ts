import { SignJWT } from 'jose';
import { describe, expect, it } from 'vitest';
import { JoseJwtVerifier } from './jwt-verifier';

const secret = Buffer.from('un-secreto-de-prueba-de-32-bytes-minimo!!').toString('base64');
const sign = (claims: object, key = secret) =>
  new SignJWT(claims as never)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('5m')
    .sign(new Uint8Array(Buffer.from(key, 'base64')));

describe('JoseJwtVerifier', () => {
  const v = new JoseJwtVerifier(secret);

  it('lee roles de un token válido', async () => {
    expect((await v.verify(await sign({ role: 'ROLE_admin' }))).roles).toEqual(['ADMIN']);
    expect((await v.verify(await sign({ roles: ['REVIEWER'] }))).roles).toEqual(['REVIEWER']);
  });

  it('lee el payload real de users-management ({ sub, role, iat, exp })', async () => {
    const claims = { sub: '00000000-0000-0000-0000-000000000001', role: 'ADMIN' };
    expect(await v.verify(await sign(claims))).toEqual({ subject: claims.sub, roles: ['ADMIN'] });
  });

  it('rechaza una firma distinta', async () => {
    const other = Buffer.from('otro-secreto-completamente-distinto!!!').toString('base64');
    await expect(v.verify(await sign({ role: 'ADMIN' }, other))).rejects.toThrow();
  });
});
