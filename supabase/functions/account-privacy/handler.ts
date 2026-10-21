export interface PrivacyUser {
  id: string;
  email?: string | null;
  phone?: string | null;
  created_at?: string;
  email_confirmed_at?: string | null;
  is_anonymous?: boolean;
  factors?: { status?: string }[];
}

export interface PrivacyServices {
  getUser: (jwt: string) => Promise<PrivacyUser | null>;
  exportData: (userId: string) => Promise<unknown>;
  deletionBlockers: (userId: string) => Promise<{ admin: boolean; storage: boolean }>;
  confirmPassword: (email: string, password: string) => Promise<string | null>;
  deleteUser: (userId: string) => Promise<void>;
}

const allowedOrigins = new Set([
  'https://douknowball.com', 'https://www.douknowball.com',
  'https://douknowball.lovable.app', 'https://ballpark-hero.lovable.app',
  'https://id-preview--c29d224f-a662-4a15-b809-d86fa3b3f0ad.lovable.app',
  'http://localhost:8080', 'http://localhost:5173',
]);

export async function handleAccountPrivacy(request: Request, services: PrivacyServices): Promise<Response> {
  const origin = request.headers.get('origin');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json', 'Cache-Control': 'no-store', Vary: 'Origin',
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
  if (origin && allowedOrigins.has(origin)) headers['Access-Control-Allow-Origin'] = origin;
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });
  if (origin && !allowedOrigins.has(origin)) return json({ ok: false, error: 'origin_denied' }, 403);
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (request.method !== 'POST') return json({ ok: false, error: 'method_not_allowed' }, 405);
  const token = request.headers.get('authorization')?.match(/^Bearer ([^\s]+)$/i)?.[1];
  if (!token) return json({ ok: false, error: 'sign_in_required' }, 401);

  try {
    // Always consult Auth, including when an otherwise valid JWT outlives its user.
    const user = await services.getUser(token);
    if (!user || user.is_anonymous) return json({ ok: false, error: 'sign_in_required' }, 401);
    if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
      return json({ ok: false, error: 'invalid_request' }, 400);
    }
    const reader = request.body?.getReader();
    if (!reader) return json({ ok: false, error: 'invalid_request' }, 400);
    const chunks: Uint8Array[] = [];
    let length = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > 4096) {
        await reader.cancel();
        return json({ ok: false, error: 'request_too_large' }, 413);
      }
      chunks.push(value);
    }
    let body: Record<string, unknown>;
    try {
      const bytes = new Uint8Array(length);
      let offset = 0;
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
      body = JSON.parse(new TextDecoder().decode(bytes));
      if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error();
    } catch {
      return json({ ok: false, error: 'invalid_request' }, 400);
    }
    const fields = body.action === 'export' ? ['action'] : ['action', 'confirmation', 'password'];
    if (Object.keys(body).some(key => !fields.includes(key))) return json({ ok: false, error: 'invalid_request' }, 400);
    if (body.action === 'export') {
      const data = await services.exportData(user.id);
      if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error();
      return json({ ok: true, export: {
        version: 1, generated_at: new Date().toISOString(),
        account: { id: user.id, email: user.email ?? null, phone: user.phone ?? null,
          created_at: user.created_at ?? null, email_confirmed_at: user.email_confirmed_at ?? null },
        data,
      } });
    }
    if (body.action !== 'delete' || body.confirmation !== 'DELETE MY ACCOUNT'
      || typeof body.password !== 'string' || !body.password || body.password.length > 1024) {
      return json({ ok: false, error: 'confirmation_required' }, 400);
    }
    if (!user.email || user.factors?.some(factor => factor.status === 'verified')) {
      return json({ ok: false, error: 'manual_required' }, 409);
    }
    const blockers = await services.deletionBlockers(user.id);
    if (typeof blockers?.admin !== 'boolean' || typeof blockers?.storage !== 'boolean') throw new Error();
    if (blockers.admin || blockers.storage) return json({ ok: false, error: 'manual_required' }, 409);
    const confirmedId = await services.confirmPassword(user.email, body.password);
    body.password = '';
    if (confirmedId !== user.id) return json({ ok: false, error: 'password_not_confirmed' }, 403);
    await services.deleteUser(user.id);
    return json({ ok: true, deleted: true });
  } catch {
    // Neither provider messages nor request bodies belong in errors or logs.
    return json({ ok: false, error: 'temporarily_unavailable' }, 503);
  }
}
