import type { UserDocument } from '../domain/user-document';

export type UserEvent =
  | { type: 'upsert'; user: UserDocument }
  | { type: 'delete'; id: string }
  | { type: 'unknown'; name: string }
  | { type: 'invalid'; reason: string };

const str = (v: unknown): string | undefined =>
  typeof v === 'string' && v.length > 0 ? v : undefined;

/**
 * Normaliza el nombre del evento. Acepta "user.created" (contrato del md)
 * y "USER_CREATED" (envelope real de Users, campo eventType).
 */
function normalizeName(raw: Record<string, unknown>): string | undefined {
  const name = str(raw.eventName) ?? str(raw.eventType);
  return name?.toLowerCase().replace(/_/g, '.');
}

/**
 * Convierte el mensaje crudo en una acción. Solo copia los campos del mapeo:
 * cualquier otro (password, passwordHash, ...) se descarta aquí.
 */
export function parseUserEvent(rawValue: string): UserEvent {
  let raw: unknown;
  try {
    raw = JSON.parse(rawValue);
  } catch {
    return { type: 'invalid', reason: 'JSON inválido' };
  }
  if (typeof raw !== 'object' || raw === null) {
    return { type: 'invalid', reason: 'el mensaje no es un objeto' };
  }
  const envelope = raw as Record<string, unknown>;
  const name = normalizeName(envelope);
  if (!name) return { type: 'invalid', reason: 'falta eventName/eventType' };

  const payload = envelope.payload;
  if (typeof payload !== 'object' || payload === null) {
    return { type: 'invalid', reason: 'falta payload' };
  }
  const p = payload as Record<string, unknown>;

  if (name === 'user.created' || name === 'user.updated') {
    const id = str(p.id);
    const userName = str(p.name);
    const email = str(p.email);
    if (!id || !userName || !email) {
      return { type: 'invalid', reason: 'payload incompleto (id, name, email)' };
    }
    return {
      type: 'upsert',
      user: {
        id,
        name: userName,
        email,
        role: str(p.role) ?? '',
        status: str(p.status) ?? '',
      },
    };
  }

  if (name === 'user.deleted') {
    const id = str(p.id) ?? str(envelope.aggregateId);
    if (!id) return { type: 'invalid', reason: 'falta id' };
    return { type: 'delete', id };
  }

  return { type: 'unknown', name };
}
