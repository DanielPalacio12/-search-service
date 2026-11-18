import type { NextRequest } from 'next/server';
import { getContainer } from '../../../../src/infrastructure/container';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const num = (v: string | null) => (v === null || v === '' ? undefined : Number(v));

export async function GET(req: NextRequest) {
  const header = req.headers.get('authorization') ?? '';
  const token = /^Bearer\s+(.+)$/i.exec(header)?.[1];
  if (!token) return Response.json({ error: 'Token requerido' }, { status: 401 });

  let c: ReturnType<typeof getContainer>;
  try {
    c = getContainer();
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    return Response.json({ error: 'Servicio mal configurado' }, { status: 500 });
  }

  let roles: string[];
  try {
    roles = (await c.tokenVerifier.verify(token)).roles;
  } catch {
    return Response.json({ error: 'Token inválido' }, { status: 401 });
  }
  if (!roles.some((r) => c.config.allowedRoles.includes(r))) {
    return Response.json({ error: 'Rol no permitido' }, { status: 403 });
  }

  const p = req.nextUrl.searchParams;
  try {
    const result = await c.searchUsers.execute({
      q: p.get('q') ?? undefined,
      status: p.get('status') ?? undefined,
      page: num(p.get('page')),
      size: num(p.get('size')),
    });
    return Response.json(result);
  } catch (err) {
    console.error('Error consultando OpenSearch', err instanceof Error ? err.message : err);
    return Response.json({ error: 'Búsqueda no disponible' }, { status: 502 });
  }
}
