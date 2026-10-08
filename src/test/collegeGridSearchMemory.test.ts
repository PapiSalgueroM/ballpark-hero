/**
 * Round 1105: what the College Grid search box RETURNS from memory.
 *
 * WHY. The search no longer asks the database. collegeSearchSource in
 * src/lib/collegeGrid.ts filters the display names of the key file in the
 * browser and searchPlayers ranks them. A review found four one line changes
 * to that filter that passed every gate of the round: a surname found nobody,
 * the least known names came first, a list that failed to load read as "nobody
 * by that name", and a failed list was never asked for again. Every gate read
 * the source text or typed the FIRST letters of a name. This suite reads what
 * the search returns, over the committed file, through the real searchPlayers.
 *
 * EVERY CHECK CARRIES ITS OWN NEGATIVE CONTROL, IN THE SAME RUN. A check is a
 * function of the source it is handed and throws a named error. It runs on the
 * real source and must pass, then on a source broken in exactly the way it
 * exists to catch (BROKEN below) and must throw that error. A check that can
 * no longer see its failure turns this suite red.
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const db = vi.hoisted(() => ({ calls: 0 }));
vi.mock('@/integrations/supabase/client', () => ({
  SUPABASE_URL: 'https://offline.invalid',
  SUPABASE_PUBLISHABLE_KEY: 'offline',
  supabase: { from: () => { db.calls += 1; throw new Error('the memory search must never read a table'); } },
}));

import { searchPlayers, normalizeName, type PlayerSourceConfig } from '@/lib/playerSearch';
import { collegeSearchSource } from '@/lib/collegeGrid';
import { COLLEGE_GRID_PLAYER_SOURCE, warmCollegeSearch } from '@/lib/collegeGridKey';
import searchUrl from '@/data/collegeGrid/collegeGridSearch.json?url';

const SEARCH_TEXT = fs.readFileSync(path.resolve(process.cwd(), 'src/data/collegeGrid/collegeGridSearch.json'), 'utf8');
const FILE = JSON.parse(SEARCH_TEXT) as { v: number; stamp: string; count: number; names: string[] };
const AT = new Map(FILE.names.map((n, i) => [n, i]));
const COULD_NOT = 'Could not load players';

type Reply = { ok: boolean; json: () => Promise<unknown> };
const textReply = (text: string): Reply => ({ ok: true, json: async () => JSON.parse(text) });
const net = { calls: [] as string[], respond: (_url: string): Promise<Reply> => Promise.resolve(textReply(SEARCH_TEXT)) };
const good = () => { net.respond = async () => textReply(SEARCH_TEXT); };

let seq = 0;
/** A fresh address per check: the lib keeps one list per address for the page's life. */
const freshUrl = () => { seq += 1; return `/assets/searchProbe-${seq}.json`; };
type Wrap = (real: PlayerSourceConfig) => PlayerSourceConfig;
const REAL: Wrap = (real) => real;
const fail = (msg: string): never => { throw new Error(msg); };
/** Runs the backoff of a failing load (400 ms, then 800 ms) to its end. */
async function settle<T>(p: Promise<T>): Promise<T> { await vi.advanceTimersByTimeAsync(5_000); return p; }
const raw = (r: { results: { rawName: string }[] }) => r.results.map((e) => e.rawName);

/** The source broken four ways, each the world one check exists to catch. */
const BROKEN: Record<'prefixonly' | 'reversed' | 'emptyonfail' | 'keepfailed', Wrap> = {
  /* A name is only found by its first letters. */
  prefixonly: (real) => ({ ...real, local: async (q) => { const rows = await real.local!(q); return rows && rows.filter((r) => normalizeName(String(r.display_name)).startsWith(q)); } }),
  /* The shortest careers come first. */
  reversed: (real) => ({ ...real, local: async (q) => { const rows = await real.local!(q); return rows && rows.map((r) => ({ ...r, rank: -(r.rank as number) })); } }),
  /* A list that could not be had reads as an empty one. */
  emptyonfail: (real) => ({ ...real, local: async (q) => (await real.local!(q)) ?? [] }),
  /* A list that failed once is never asked for again. */
  keepfailed: (real) => { let dead = false; return { ...real, local: async (q) => { if (dead) return null; const rows = await real.local!(q); if (!rows) dead = true; return rows; } }; },
};

/** A word from the middle or the end of a name lists the man who carries it. */
async function checkSurname(wrap: Wrap) {
  good();
  const source = wrap(collegeSearchSource(freshUrl()));
  let checked = 0;
  for (let i = 0; i < FILE.names.length; i += 487) {
    const word = normalizeName(FILE.names[i].split(' ')[1] ?? '');
    if (word.length < 4) continue;
    const out = await searchPlayers({ source, query: word, limit: 100_000 });
    if (out.error) fail(`SURNAME: "${word}" settled with an error: ${out.error}`);
    if (!raw(out).includes(FILE.names[i])) fail(`SURNAME: "${word}" did not list ${FILE.names[i]}`);
    checked += 1;
  }
  if (checked < 50) fail(`SURNAME: only ${checked} names were sampled, the check went hollow`);
  for (const [query, man] of [['manning', 'Peyton Manning'], ['sanders', 'Barry Sanders'], ['rice', 'Jerry Rice']]) {
    if (!raw(await searchPlayers({ source, query, limit: 100_000 })).includes(man)) fail(`SURNAME: "${query}" did not list ${man}`);
  }
  return checked;
}

/** Exact prefix, then word prefix, then contains; inside a tier the file's order, longest NFL careers first. */
async function checkOrder(wrap: Wrap) {
  good();
  const source = wrap(collegeSearchSource(freshUrl()));
  const top = async (query: string, n: number) => raw(await searchPlayers({ source, query, limit: n }));
  const mannings = (await top('manning', 3)).join(', ');
  if (mannings !== 'Peyton Manning, Eli Manning, Archie Manning') fail(`ORDER: "manning" opens with ${mannings}`);
  const rice = (await top('rice', 1))[0];
  if (rice !== 'Jerry Rice') fail(`ORDER: "rice" opens with ${rice}, ahead of Jerry Rice`);
  const brady = await top('brady', 13);
  if (!brady.slice(0, 12).every((n) => n.startsWith('Brady')) || brady[12] !== 'Tom Brady') fail(`ORDER: "brady" does not list the twelve names that start with it and then Tom Brady: ${brady.join(', ')}`);
  for (const query of ['manning', 'smith', 'rice', 'sanders', 'john', 'will']) {
    const out = await searchPlayers({ source, query, limit: 100_000 });
    if (out.results.length < 10) fail(`ORDER: "${query}" listed only ${out.results.length} names`);
    let tier = -1;
    let last = -1;
    for (const e of out.results) {
      if (e.matchRank < tier) fail(`ORDER: "${query}" lists a better match (${e.rawName}) after a worse one`);
      if (e.matchRank > tier) { tier = e.matchRank; last = -1; }
      const at = AT.get(e.rawName) ?? fail(`ORDER: "${query}" listed ${e.rawName}, who is not in the file`);
      if (at < last) fail(`ORDER: "${query}" lists ${e.rawName} after a less known name of the same tier`);
      last = at;
    }
  }
}

/** A list that cannot be had is an error, never "nobody by that name". */
async function checkFailedIsError(wrap: Wrap) {
  net.respond = async () => { throw new TypeError('Failed to fetch'); };
  const source = wrap(collegeSearchSource(freshUrl()));
  const out = await settle(searchPlayers({ source, query: 'manning' }));
  if (out.error !== COULD_NOT || out.results.length !== 0) fail(`FAILED LOAD: the search settled with ${JSON.stringify(out.error)} and ${out.results.length} names`);
}

/** After a failed load the very next search asks the network again. */
async function checkRetry(wrap: Wrap, breakIt: () => void, callsWhenBroken: number) {
  breakIt();
  const source = wrap(collegeSearchSource(freshUrl()));
  net.calls.length = 0;
  const first = await settle(searchPlayers({ source, query: 'manning' }));
  if (first.error !== COULD_NOT) fail(`RETRY: the broken world did not fail the search (${JSON.stringify(first.error)})`);
  if (net.calls.length !== callsWhenBroken) fail(`RETRY: the broken world made ${net.calls.length} requests, expected ${callsWhenBroken}`);
  good();
  const second = await settle(searchPlayers({ source, query: 'manning' }));
  if (net.calls.length !== callsWhenBroken + 1) fail(`RETRY: the healed search made ${net.calls.length - callsWhenBroken} new requests, expected exactly 1`);
  if (second.error !== null || raw(second)[0] !== 'Peyton Manning') fail(`RETRY: the healed search settled with ${JSON.stringify(second.error)} and ${raw(second)[0]}`);
}

const fetchThrows = () => { net.respond = async () => { throw new TypeError('Failed to fetch'); }; };
const serveShape = (edit: (f: Record<string, unknown>) => unknown) => () => {
  const f = JSON.parse(SEARCH_TEXT) as Record<string, unknown>;
  const body = edit(f) ?? f;
  net.respond = async () => textReply(JSON.stringify(body));
};
/** Files that parse and are not the search file. Each is one request: the body arrived, the lib refused it. */
const WRONG_SHAPES: [string, () => void][] = [
  ['one name short of its count', serveShape((f) => { (f.names as unknown[]).pop(); })],
  ['version 2', serveShape((f) => { f.v = 2; })],
  ['no stamp', serveShape((f) => { delete f.stamp; })],
  ['an empty name', serveShape((f) => { (f.names as unknown[])[9] = ' '; })],
  ['a name that is not text', serveShape((f) => { (f.names as unknown[])[9] = 9; })],
  ['the judge file where the search file belongs', serveShape(() => ({ v: 1, stamp: FILE.stamp, count: FILE.count, schools: [] }))],
  ['a bare list', serveShape((f) => f.names)],
];

beforeEach(() => {
  db.calls = 0;
  net.calls.length = 0;
  good();
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  vi.stubGlobal('fetch', (url: unknown) => { net.calls.push(String(url)); return net.respond(String(url)); });
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('the College Grid search, from memory (Round 1105)', () => {
  it('a surname lists the man, and the check fails when names are found by their first letters only', async () => {
    const checked = await checkSurname(REAL);
    console.log(`CGSEARCH| surname: ${checked} sampled names each listed by their second word`);
    await expect(checkSurname(BROKEN.prefixonly)).rejects.toThrow(/^SURNAME: ".+" did not list /);
  }, 120_000);

  it('the best match and the longest career come first, and the check fails when the order is turned round', async () => {
    await checkOrder(REAL);
    await expect(checkOrder(BROKEN.reversed)).rejects.toThrow(/^ORDER: "manning" opens with /);
  }, 120_000);

  it('a list that failed to load is an error, and the check fails when it reads as nobody by that name', async () => {
    await checkFailedIsError(REAL);
    await expect(checkFailedIsError(BROKEN.emptyonfail)).rejects.toThrow(/^FAILED LOAD: the search settled with null and 0 names/);
  }, 120_000);

  it('after a failed fetch the next search asks again, and the check fails when a failed list is kept', async () => {
    await checkRetry(REAL, fetchThrows, 3);
    await expect(checkRetry(BROKEN.keepfailed, fetchThrows, 3)).rejects.toThrow(/^RETRY: the healed search made 0 new requests/);
  }, 120_000);

  it(`a file of the wrong shape is refused and forgotten, ${WRONG_SHAPES.length} ways, and a 200 that is not JSON is a failed fetch`, async () => {
    for (const [, breakIt] of WRONG_SHAPES) await checkRetry(REAL, breakIt, 1);
    await checkRetry(REAL, () => { net.respond = async () => ({ ok: true, json: async () => JSON.parse('<!doctype html><html></html>') }); }, 3);
    await checkRetry(REAL, () => { net.respond = async () => ({ ok: false, json: async () => ({}) }); }, 3);
    await expect(checkRetry(BROKEN.keepfailed, WRONG_SHAPES[0][1], 1)).rejects.toThrow(/^RETRY: the healed search made 0 new requests/);
    console.log(`CGSEARCH| ${WRONG_SHAPES.length} wrong shapes, an HTML body and a 404 each failed the search and were asked for again`);
  }, 120_000);

  it('the box on the page searches the shipped file: one request for it however many searches, and no table read', async () => {
    warmCollegeSearch();
    const first = await searchPlayers({ source: COLLEGE_GRID_PLAYER_SOURCE, query: 'manning' });
    const second = await searchPlayers({ source: COLLEGE_GRID_PLAYER_SOURCE, query: 'jerry rice' });
    const third = await searchPlayers({ source: COLLEGE_GRID_PLAYER_SOURCE, query: 'zzzzzz' });
    expect(raw(first).slice(0, 3)).toEqual(['Peyton Manning', 'Eli Manning', 'Archie Manning']);
    expect(first.results.length, 'the default limit holds').toBe(8);
    expect(raw(second)).toEqual(['Jerry Rice']);
    expect(third, 'nobody by that name is an empty list with no error').toEqual({ results: [], error: null });
    expect(net.calls, 'one request, for the hashed search file').toEqual([searchUrl]);
    expect(db.calls, 'no table read').toBe(0);
  }, 120_000);
});
