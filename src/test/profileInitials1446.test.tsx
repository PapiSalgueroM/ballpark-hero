import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

interface ProfileFixture {
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

const AUTH = vi.hoisted(() => ({
  user: {
    id: 'viewer-1446', email: 'viewer@example.invalid', created_at: '2026-01-05T00:00:00Z',
    user_metadata: { full_name: 'Metadata Keeper', avatar_url: null as string | null },
  },
  profile: null as ProfileFixture | null,
  loading: false,
  refreshProfile: vi.fn(() => Promise.resolve()),
  updateProfile: vi.fn(() => Promise.resolve({ error: null })),
}));
const FIXTURE = vi.hoisted(() => ({ publicProfile: null as ProfileFixture | null, profileWrites: [] as string[] }));

// The real Profile load awaits this query seam. It never reaches a database.
function query(table: string): Record<string, unknown> {
  let head = false;
  let single = false;
  const filters = new Map<string, unknown>();
  const answer = () => {
    if (table === 'profiles') {
      const row = filters.has('username') ? FIXTURE.publicProfile : AUTH.profile;
      const matches = row && [...filters].every(([key, value]) => row[key as keyof ProfileFixture] === value);
      return { data: matches ? row : null, error: null };
    }
    if (head) return { data: null, count: 0, error: null };
    return { data: single ? null : [], error: null };
  };
  const builder: Record<string, unknown> = {};
  const chain = () => builder;
  builder.select = (_columns?: string, options?: { head?: boolean }) => { head = !!options?.head; return builder; };
  builder.eq = (key: string, value: unknown) => { filters.set(key, value); return builder; };
  for (const method of ['gt', 'order', 'limit', 'in']) builder[method] = chain;
  for (const method of ['update', 'upsert', 'insert', 'delete']) {
    builder[method] = () => { if (table === 'profiles') FIXTURE.profileWrites.push(method); return builder; };
  }
  builder.maybeSingle = () => { single = true; return builder; };
  builder.then = (ok: (result: ReturnType<typeof answer>) => unknown, bad?: (error: unknown) => unknown) => Promise.resolve(answer()).then(ok, bad);
  return builder;
}

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => AUTH }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (table: string) => query(table), rpc: () => Promise.resolve({ data: null, error: null }) },
  SUPABASE_URL: 'http://localhost.test', SUPABASE_PUBLISHABLE_KEY: 'test-key',
}));
vi.mock('html2canvas', () => ({ default: vi.fn() }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/components/seo/PageSeo', () => ({ default: () => null }));
vi.mock('@/components/profile/AchievementCase', () => ({ default: () => null }));
vi.mock('@/components/profile/StreakHistory', () => ({ default: () => null }));

import Profile from '@/pages/Profile';

const WAIT = { timeout: 5000 };
vi.setConfig({ testTimeout: 20000 });

function row(overrides: Partial<ProfileFixture> = {}): ProfileFixture {
  return {
    user_id: 'viewer-1446', username: 'rowkeeper', display_name: 'Row Keeper',
    avatar_url: null, created_at: '2026-01-05T00:00:00Z', ...overrides,
  };
}
function records() {
  return JSON.stringify({ user: AUTH.user, profile: AUTH.profile, publicProfile: FIXTURE.publicProfile });
}
function mount(path = '/profile') {
  return render(<MemoryRouter initialEntries={[path]}><Routes>
    <Route path="/profile" element={<Profile />} />
    <Route path="/profile/:username" element={<Profile />} />
  </Routes></MemoryRouter>);
}
async function checkInitial(heading: string, initial: string, marker: string, before: string) {
  await waitFor(() => expect(screen.queryByRole('heading', { level: 1, name: heading })).not.toBeNull(), WAIT);
  const main = screen.getByRole('main');
  expect(records(), 'PROFILE_INITIALS_1446_RECORDS_PRESERVED').toBe(before);
  expect(FIXTURE.profileWrites, 'PROFILE_INITIALS_1446_NO_AVATAR_RECORD_WRITE').toEqual([]);
  expect(AUTH.updateProfile, 'PROFILE_INITIALS_1446_NO_AUTH_PROFILE_WRITE').not.toHaveBeenCalled();
  // JSDOM does not fetch ordinary images. The unsafe DOM sink itself must be absent.
  expect(main.querySelectorAll('img'), `${marker}_IMAGE`).toHaveLength(0);
  const letters = within(main).queryAllByText(initial, { exact: true, selector: 'div' });
  expect(letters, `${marker}_INITIAL`).toHaveLength(1);
  expect(letters[0]).toBeVisible();
}

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  AUTH.user = {
    id: 'viewer-1446', email: 'viewer@example.invalid', created_at: '2026-01-05T00:00:00Z',
    user_metadata: { full_name: 'Metadata Keeper', avatar_url: null },
  };
  AUTH.profile = row();
  FIXTURE.publicProfile = null;
  FIXTURE.profileWrites = [];
});
afterEach(() => { cleanup(); localStorage.clear(); });

describe('Profile initials1446', () => {
  it('keeps a stored avatar URL inert on the own profile', async () => {
    AUTH.profile = row({ avatar_url: 'https://stored-avatar.invalid/profile.png' });
    AUTH.user.user_metadata.avatar_url = 'https://viewer-avatar.invalid/profile.png';
    const before = records();
    mount();
    await checkInitial('Row Keeper', 'R', 'PROFILE_INITIALS_1446_STORED', before);
  });

  it('keeps the legacy Auth metadata avatar URL inert', async () => {
    AUTH.profile = null;
    AUTH.user.user_metadata.avatar_url = 'https://metadata-avatar.invalid/profile.png';
    const before = records();
    mount();
    await checkInitial('Metadata Keeper', 'M', 'PROFILE_INITIALS_1446_METADATA', before);
  });

  it('uses the viewed subject initial with a different signed-in viewer', async () => {
    FIXTURE.publicProfile = row({
      user_id: 'subject-1446', username: 'public1446', display_name: 'Public Keeper',
      avatar_url: 'https://subject-avatar.invalid/profile.png',
    });
    AUTH.user.user_metadata.avatar_url = 'https://viewer-avatar.invalid/profile.png';
    const before = records();
    mount('/profile/public1446');
    await checkInitial('Public Keeper', 'P', 'PROFILE_INITIALS_1446_PUBLIC', before);
  });

  it('uses the viewed username when its display name is missing', async () => {
    FIXTURE.publicProfile = row({
      user_id: 'subject-1446', username: 'subject1446', display_name: null,
    });
    const before = records();
    mount('/profile/subject1446');
    await checkInitial('Anonymous Player', 'S', 'PROFILE_INITIALS_1446_USERNAME', before);
  });

  it('uses U when the profile has neither public name nor username', async () => {
    AUTH.profile = row({ display_name: null, username: null });
    const before = records();
    mount();
    await checkInitial('Anonymous Player', 'U', 'PROFILE_INITIALS_1446_NEUTRAL', before);
  });

  it('keeps the existing display-name initial without an avatar URL', async () => {
    AUTH.profile = row({ display_name: 'Initial Keeper' });
    const before = records();
    mount();
    await checkInitial('Initial Keeper', 'I', 'PROFILE_INITIALS_1446_EXISTING', before);
  });
});
