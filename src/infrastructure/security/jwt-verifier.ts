import { jwtVerify } from 'jose';
import type { TokenClaims, TokenVerifierPort } from '../../application/ports/token-verifier.port';

/** JWT_SECRET viene en Base64, igual que en users-management. */
export class JoseJwtVerifier implements TokenVerifierPort {
  private readonly key: Uint8Array;

  constructor(base64Secret: string) {
    this.key = new Uint8Array(Buffer.from(base64Secret, 'base64'));
  }

  async verify(token: string): Promise<TokenClaims> {
    const { payload } = await jwtVerify(token, this.key, { algorithms: ['HS256', 'HS384', 'HS512'] });
    return { subject: payload.sub, roles: extractRoles(payload) };
  }
}

// [VERIFICAR] el nombre exacto del claim en JwtTokenService de users-management.
// Se aceptan "role", "roles" y "authorities", con o sin prefijo ROLE_.
export function extractRoles(payload: Record<string, unknown>): string[] {
  const raw = payload.role ?? payload.roles ?? payload.authorities;
  const arr = Array.isArray(raw) ? raw : typeof raw === 'string' ? raw.split(',') : [];
  return arr
    .filter((r): r is string => typeof r === 'string')
    .map((r) => r.trim().replace(/^ROLE_/i, '').toUpperCase())
    .filter(Boolean);
}
