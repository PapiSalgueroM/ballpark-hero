/**
 * Round 1052: a photograph of Club Manager's world taken BEFORE that round added two countries,
 * proving they were added beside it.
 *
 * The round's promise is that no existing club's rating, squad or id changes and that an old save
 * loads unchanged. This file holds the static half of that promise. The fixture
 * (src/test/fixtures/cmWorldIdentity1052.json) was recorded on the untouched base, the commit it
 * names, and holds in clear, so a person can read a failure:
 *   - the 26 league ids in REAL_LEAGUES order, each with its name, cup, European flag and clubs;
 *   - the 20 NATIONS rows with their derived league ids, PYRAMIDS, and a digest of each league's
 *     rules row as leagueRulesOf answers it;
 *   - one digest a club for all 438 clubs, over: its squad rows in order, its playableClubs row
 *     (tier, colour, budget, expectation), bakedXIAvg, clubPreviewRating, isPartialClub and the
 *     nationality nationalityOf answers for each of its men;
 *   - the free agent pool (count and digest);
 *   - eraFlavour: for every past season, the strength the engine's own strengthOf gives each
 *     Russian club that season's Champions League field names, in a fresh career seeded 1052.
 *
 * After the round the test still reads the SAME 26 leagues and 438 clubs: it takes its lists from
 * the fixture, never from today's REAL_LEAGUES, and it asserts that the world's first 26 leagues and
 * first 20 nations ARE the fixture's, in order, so a new league can only ever be added after them.
 * It is static data on purpose. No seeded season is in it, because a bigger world plays a
 * different season for an honest reason (the rules digest and the dailies say how).
 *
 * It is NEVER re recorded to make it pass. Recording is CM_WORLD_IDENTITY_RECORD=1 with
 * CM_WORLD_IDENTITY_BASE=<the base commit>; without the flag the test only compares, and a missing
 * fixture fails. The first later round that re bakes the modern rosters, or moves a man out of an
 * existing squad on purpose, deletes this file and its fixture and says so.
 *
 * Negative control, run on the base on 2026-10-08 (CM_WORLD_IDENTITY_CONTROL=rating): the first man
 * of Sevilla's squad gains one rating point in memory after his old value is asserted, the file on
 * disk is never touched, and the club digests must fail naming Sevilla and nobody else.
 * MEASURED on the base (2005dc4e, which is 5ba57826 plus this file; a GitHub runner, 2026-10-08):
 * two recordings taken one after the other were byte identical (26 leagues, 20 nations, 5 pyramids,
 * 26 rules digests, 438 clubs, 7 free agents, 7 era rows: Rubin Kazan and Spartak Moscow in 2010-11,
 * Zenit and CSKA Moscow in 2015-16, Lokomotiv Moscow, Krasnodar and Zenit in 2020-21); the plain run
 * passed 6 of 6 in two seconds; the control failed 1 of 6, "clubs whose digest moved: Sevilla", and
 * the other five stayed green, vitest exit 1.
 */
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

/* No part of this file may reach the database: the client is replaced by nothing at all. */
vi.mock('@/integrations/supabase/client', () => ({
  supabase: null, SUPABASE_URL: '', SUPABASE_PUBLISHABLE_KEY: '',
}));

const FIXTURE = path.resolve(process.cwd(), 'src/test/fixtures/cmWorldIdentity1052.json');
const RECORD = process.env.CM_WORLD_IDENTITY_RECORD === '1';
const CONTROL = process.env.CM_WORLD_IDENTITY_CONTROL ?? '';
const PINNED = Date.UTC(2026, 9, 8, 12, 0, 0);
const ERA_CLUB = 'Arsenal';

/* eslint-disable @typescript-eslint/no-explicit-any */
const sha = (v: unknown): string => createHash('sha256').update(typeof v === 'string' ? v : JSON.stringify(v ?? null)).digest('hex');
const seeded = (s: number) => { let x = (s >>> 0) || 1; return () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; };
const fixture: any = fs.existsSync(FIXTURE) ? JSON.parse(fs.readFileSync(FIXTURE, 'utf8')) : null;
const got: any = {};
let cm: any; let rosters: Record<string, any[]>; let nationalityOf: (era: string | undefined, name: string) => string | null;

beforeAll(async () => {
  vi.spyOn(Date, 'now').mockReturnValue(PINNED);
  cm = await import('@/lib/clubManager');
  rosters = (await import('@/data/clubManagerWorldRosters')).CM_WORLD_ROSTERS as any;
  nationalityOf = (await import('@/data/playerNationalities')).nationalityOf;
  const eras = await import('@/lib/clubManagerEras');
  await eras.ensureAllEraRosters();
  if (CONTROL === 'rating') {
    const man = rosters.Sevilla?.[0];
    if (!man || typeof man.r !== 'number') throw new Error('control rating: Sevilla has no first man with a rating; refusing to run');
    rosters.Sevilla = [{ ...man, r: man.r + 1 }, ...rosters.Sevilla.slice(1)];
  } else if (CONTROL) throw new Error(`CM_WORLD_IDENTITY_CONTROL=${CONTROL} is not a control this file knows (rating)`);

  /* The lists come from the fixture once it exists: the photograph decides what is compared. */
  const leagueIds: string[] = RECORD ? cm.REAL_LEAGUES.map((l: any) => l.id) : (fixture?.leagues ?? []).map((l: any) => l.id);
  const byId = new Map<string, any>(cm.REAL_LEAGUES.map((l: any) => [l.id, l]));
  got.leagues = leagueIds.map(id => { const l = byId.get(id); return l ? { id: l.id, name: l.name, cupName: l.cupName ?? null, euro: !!l.euro, clubs: [...l.clubs] } : { id, missing: true }; });
  const nationCount = RECORD ? cm.NATIONS.length : (fixture?.nations ?? []).length;
  got.nations = cm.NATIONS.slice(0, nationCount).map((n: any) => ({ id: n.id, name: n.name, flag: n.flag, leagueIds: [...n.leagueIds] }));
  got.pyramids = cm.PYRAMIDS.map((p: any) => ({ ...p }));
  got.rules = Object.fromEntries(leagueIds.map(id => [id, sha(cm.leagueRulesOf(id))]));
  got.clubs = {};
  for (const lg of got.leagues) {
    if (lg.missing) continue;
    const defs = new Map<string, any>(cm.playableClubs(lg.id).map((d: any) => [d.name, d]));
    for (const club of lg.clubs) {
      const rows = rosters[club] ?? null;
      got.clubs[club] = sha({
        rows, def: defs.get(club) ?? null, xi: cm.bakedXIAvg(club), preview: cm.clubPreviewRating(club), partial: cm.isPartialClub(club),
        nats: (rows ?? []).map((p: any) => nationalityOf(undefined, p.n)),
      });
    }
  }
  const fa = (await import('@/data/clubManagerFreeAgents2026')).CM_REAL_FREE_AGENTS;
  got.freeAgents = { count: fa.length, sha: sha(fa) };
  got.eraFlavour = [];
  const real = Math.random;
  for (const [eraId, field] of Object.entries(cm.ERA_UCL_FIELDS) as [string, any[]][]) {
    const russians = field.filter(r => r.country === 'Russia').map(r => r.name);
    if (!russians.length) continue;
    Math.random = seeded(1052);
    const career = cm.startCareer(ERA_CLUB, eraId);
    Math.random = real;
    for (const club of russians) got.eraFlavour.push({ season: eraId, club, value: cm.strengthOf(career, club) });
  }
  if (RECORD) {
    const base = process.env.CM_WORLD_IDENTITY_BASE;
    if (!base) throw new Error('recording needs CM_WORLD_IDENTITY_BASE=<the base commit>');
    if (CONTROL) throw new Error('a control run never records');
    fs.writeFileSync(FIXTURE, JSON.stringify({ base, recorded: '2026-10-08', eraClub: ERA_CLUB, ...got }, null, 1) + '\n');
  }
});

describe('Round 1052: the world before the round is still there, untouched', () => {
  it('has a fixture, recorded on the base', () => {
    expect(RECORD || fixture !== null, 'src/test/fixtures/cmWorldIdentity1052.json is missing and this is not a recording run').toBe(true);
  });
  it('keeps the 26 leagues, their order, names, cups and clubs, as the first leagues of the world', () => {
    if (RECORD) return;
    expect(got.leagues).toEqual(fixture.leagues);
    expect(cm.REAL_LEAGUES.slice(0, fixture.leagues.length).map((l: any) => l.id)).toEqual(fixture.leagues.map((l: any) => l.id));
  });
  it('keeps the 20 nations as the first nations, the pyramids and every rules row', () => {
    if (RECORD) return;
    expect(got.nations).toEqual(fixture.nations);
    expect(got.pyramids).toEqual(fixture.pyramids);
    expect(got.rules).toEqual(fixture.rules);
  });
  it('keeps every one of the 438 clubs: squad, club row, ratings, partial mark and flags', () => {
    if (RECORD) return;
    const names = Object.keys(fixture.clubs);
    const moved = names.filter(n => got.clubs[n] !== fixture.clubs[n]);
    expect(moved, `clubs whose digest moved: ${moved.join(', ')}`).toEqual([]);
    expect(Object.keys(got.clubs).length).toBe(names.length);
  });
  it('keeps the free agent pool', () => {
    if (RECORD) return;
    expect(got.freeAgents).toEqual(fixture.freeAgents);
  });
  it('keeps the past seasons own Russian clubs at the strength their season gave them', () => {
    if (RECORD) return;
    expect(got.eraFlavour.length).toBeGreaterThan(0);
    expect(got.eraFlavour).toEqual(fixture.eraFlavour);
  });
});
