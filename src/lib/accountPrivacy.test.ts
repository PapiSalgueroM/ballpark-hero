// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { handleAccountPrivacy, type PrivacyServices } from '../../supabase/functions/account-privacy/handler';

const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';
const user = { id: A, email: 'a@example.test', created_at: '2026-01-01', factors: [] };
function fixture(overrides: Partial<PrivacyServices> = {}) {
  const calls: string[] = [];
  const services: PrivacyServices = {
    getUser: async token => { calls.push(`auth:${token}`); return user; },
    exportData: async id => { calls.push(`export:${id}`); return { profiles: [{ user_id: id }] }; },
    deletionBlockers: async id => { calls.push(`preflight:${id}`); return { admin: false, storage: false }; },
    confirmPassword: async (email, password) => { calls.push(`password:${email}`); return password === 'right' ? A : null; },
    deleteUser: async id => { calls.push(`delete:${id}`); },
    ...overrides,
  };
  return { services, calls };
}
function request(body: unknown, token = 'valid', origin = 'https://douknowball.com') {
  return new Request('https://example.test/account-privacy', {
    method: 'POST', headers: { authorization: token ? `Bearer ${token}` : '', origin, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('account privacy server authorization', () => {
  it('requires a current Auth user before any account read or deletion', async () => {
    const f = fixture({ getUser: async () => null });
    expect((await handleAccountPrivacy(request({ action: 'delete', confirmation: 'DELETE MY ACCOUNT', password: 'right' }), f.services)).status).toBe(401);
    expect(f.calls).toEqual([]);
  });
  it('rejects missing bearer and disallowed origin without consulting privileged services', async () => {
    for (const req of [request({ action: 'export' }, ''), request({ action: 'export' }, 'valid', 'https://evil.example')]) {
      const f = fixture();
      expect([401, 403]).toContain((await handleAccountPrivacy(req, f.services)).status);
      expect(f.calls).toEqual([]);
    }
  });
  it('exports only the server verified identity and excludes Auth secrets', async () => {
    const f = fixture({ getUser: async () => ({ ...user, encrypted_password: 'SECRET', refresh_token: 'SECRET', user_metadata: { password: 'SECRET' } } as typeof user) });
    const response = await handleAccountPrivacy(request({ action: 'export' }), f.services);
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.export.account).toEqual({ id: A, email: 'a@example.test', phone: null, created_at: '2026-01-01', email_confirmed_at: null });
    expect(body.export.data.profiles[0].user_id).toBe(A);
    expect(JSON.stringify(body)).not.toContain('SECRET');
    expect(f.calls).toEqual([`export:${A}`]);
    expect(response.headers.get('cache-control')).toBe('no-store');
  });
  it('refuses client target IDs instead of redirecting export or deletion to B', async () => {
    for (const action of ['export', 'delete']) {
      const f = fixture();
      const response = await handleAccountPrivacy(request({ action, user_id: B, confirmation: 'DELETE MY ACCOUNT', password: 'right' }), f.services);
      expect(response.status).toBe(400);
      expect(f.calls).toEqual(['auth:valid']);
    }
  });
  it('requires exact confirmation and a password before preflight or deletion', async () => {
    for (const body of [{ action: 'delete', confirmation: 'delete my account', password: 'right' }, { action: 'delete', confirmation: 'DELETE MY ACCOUNT' }]) {
      const f = fixture();
      expect((await handleAccountPrivacy(request(body), f.services)).status).toBe(400);
      expect(f.calls).toEqual(['auth:valid']);
    }
  });
  it('never deletes on wrong password or a successful sign-in to another account', async () => {
    for (const confirmPassword of [async () => null, async () => B]) {
      const f = fixture({ confirmPassword });
      expect((await handleAccountPrivacy(request({ action: 'delete', confirmation: 'DELETE MY ACCOUNT', password: 'bad' }), f.services)).status).toBe(403);
      expect(f.calls.some(call => call.startsWith('delete:'))).toBe(false);
    }
  });
  it('preserves admin accounts, owned uploads and verified MFA accounts for manual handling', async () => {
    for (const blockers of [{ admin: true, storage: false }, { admin: false, storage: true }]) {
      const f = fixture({ deletionBlockers: async () => blockers });
      expect((await handleAccountPrivacy(request({ action: 'delete', confirmation: 'DELETE MY ACCOUNT', password: 'right' }), f.services)).status).toBe(409);
      expect(f.calls).toEqual(['auth:valid']);
    }
    const f = fixture({ getUser: async () => ({ ...user, factors: [{ status: 'verified' }] }) });
    expect((await handleAccountPrivacy(request({ action: 'delete', confirmation: 'DELETE MY ACCOUNT', password: 'right' }), f.services)).status).toBe(409);
    expect(f.calls).toEqual([]);
  });
  it('hard deletes only A after current authentication, safe preflight and same-account password confirmation', async () => {
    const f = fixture();
    const response = await handleAccountPrivacy(request({ action: 'delete', confirmation: 'DELETE MY ACCOUNT', password: 'right' }), f.services);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, deleted: true });
    expect(f.calls).toEqual(['auth:valid', `preflight:${A}`, 'password:a@example.test', `delete:${A}`]);
  });
  it('fails closed on missing preflight and provider errors without exposing request or provider details', async () => {
    const log = vi.spyOn(console, 'error');
    for (const overrides of [
      { deletionBlockers: async () => { throw new Error('SECRET'); } },
      { exportData: async () => { throw new Error('SECRET'); } },
      { deleteUser: async () => { throw new Error('SECRET'); } },
    ]) {
      const f = fixture(overrides);
      const body = overrides.exportData ? { action: 'export' } : { action: 'delete', confirmation: 'DELETE MY ACCOUNT', password: 'right' };
      const response = await handleAccountPrivacy(request(body), f.services);
      expect(response.status).toBe(503);
      expect(await response.text()).not.toContain('SECRET');
    }
    expect(log).not.toHaveBeenCalled();
    log.mockRestore();
  });
  it('rejects oversized and malformed requests without invoking deletion services', async () => {
    const f = fixture();
    expect((await handleAccountPrivacy(request({ action: 'delete', password: 'x'.repeat(5000) }), f.services)).status).toBe(413);
    const req = new Request('https://example.test/account-privacy', { method: 'POST', headers: { authorization: 'Bearer valid', 'content-type': 'application/json' }, body: '{' });
    expect((await handleAccountPrivacy(req, f.services)).status).toBe(400);
    expect(f.calls.every(call => call.startsWith('auth:'))).toBe(true);
  });
});
