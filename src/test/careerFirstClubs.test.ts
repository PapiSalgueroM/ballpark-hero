/* Round 784: the career quiz paths start where the careers started.

   A player reported on 2026-09-21 from /career: Alisson played for
   Internacional before Roma, and the quiz started him at Roma. Round 667 added
   his Internacional 2015 and 2016; this round adds 2013 and 2014, corrects his
   2016 appearances, and audits the first club of the 25 best known players in
   the pool (the highest peak market values, the same measure the quiz's Easy
   tier uses) against two sources each. scripts/data/careerFirstClubs.json is
   the record: the rule, every source, every row added or changed, and what was
   seen and left for another round.

   src/data/careerPlayers.ts is baked from the live tables, so the same rows go
   to the tables through supabase/migrations/20261001120000_career_first_clubs.sql;
   until that is applied, simCareerFallback reports the file ahead of the table.

   On the pre 784 pool every case below fails: Alisson opens at 2015, and seven
   of the 25 open at a later club than their first. */
import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { careerPlayers } from '@/data/careerPlayers';
import type { CareerPlayer } from '@/types/career';

interface LedgerRow { player: string; playerId: string; season: string; club: string; appearances: number; goals: number; wikipedia: string; footballdatabase: string }
interface Ledger {
  audit: { player: string; fdb: number; poolFirst: string; seniorFirst: string; verdict: 'right' | 'late club' | 'late season' }[];
  added: LedgerRow[];
  changed: { player: string; season: string; club: string; field: 'appearances'; from: number; to: number; wikipedia: string; footballdatabase: string }[];
}
const ledger = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'scripts/data/careerFirstClubs.json'), 'utf8')) as Ledger;
const pool = new Map<string, CareerPlayer>(careerPlayers.map(p => [p.name, p]));
const player = (name: string) => {
  const p = pool.get(name);
  if (!p) throw new Error(`${name} is not in the pool`);
  return p;
};
/** "2016 Bryne", "2010-2011 Leyton Orient (loan)" -> { start, season, club }. */
function parseStop(stop: string) {
  const m = stop.match(/^(\d{4})(-\d{4})? (.+?)( \(loan\))?$/);
  if (!m) throw new Error(`cannot read ${stop}`);
  return { start: Number(m[1]), season: m[1] + (m[2] ?? ''), club: m[3] };
}
/** The clubs in order with repeats folded: the path the quiz shows. */
const clubPath = (p: CareerPlayer) => p.career.map(s => s.club).filter((c, i, all) => i === 0 || all[i - 1] !== c);

describe('Alisson starts at Internacional in 2013', () => {
  for (const name of ['Alisson', 'Alisson Becker']) {
    it(`${name}: Internacional 2013 to 2016, Roma 2016 to 2018, Liverpool from 2018`, () => {
      const p = player(name);
      expect(p.career.slice(0, 6).map(s => `${s.season} ${s.club}`)).toEqual([
        '2013 Internacional', '2014 Internacional', '2015 Internacional', '2016 Internacional',
        '2016-2017 Roma', '2017-2018 Roma',
      ]);
      expect(clubPath(p)).toEqual(['Internacional', 'Roma', 'Liverpool']);
      expect(p.career[6].season).toBe('2018-2019');
      expect(p.career.find(s => s.season === '2016' && s.club === 'Internacional')?.appearances).toBe(20);
    });
  }
});

describe('the 25 best known paths open at the first senior club', () => {
  it('the audit covers exactly the 25 highest peak market values in the pool', () => {
    const peak = (p: CareerPlayer) => p.career.reduce((m, s) => Math.max(m, s.marketValue ?? 0), 0);
    const top = [...careerPlayers].sort((a, b) => peak(b) - peak(a) || a.name.localeCompare(b.name)).slice(0, 25).map(p => p.name);
    expect(ledger.audit.map(a => a.player).sort()).toEqual([...top].sort());
    for (const a of ledger.audit) expect(a.fdb, `${a.player} has no second source id`).toBeGreaterThan(0);
  });

  for (const a of ledger.audit) {
    it(`${a.player}: opens at ${a.seniorFirst} (${a.verdict})`, () => {
      const first = player(a.player).career[0];
      const want = parseStop(a.seniorFirst);
      expect(first.club).toBe(want.club);
      expect(Number(first.season.slice(0, 4))).toBe(want.start);
      if (a.verdict !== 'right') expect(first.season).toBe(want.season);
    });
  }
});

/** "14 apps 0 goals", "1 app 0 goals", "21 apps (1 league, ...)" -> the counts
    the source string states, so a row can be held against what was read. */
function sourceCount(s: string): { apps: number; goals: number | null; bare: boolean } {
  const m = s.match(/^(\d+) apps?(?: (\d+) goals?)?/);
  if (!m) throw new Error(`cannot read a source figure from "${s}"`);
  return { apps: Number(m[1]), goals: m[2] === undefined ? null : Number(m[2]), bare: s === m[0] };
}

/** The ledger's rule: the row carries the matches both sources record, so
    where they agree it is that figure, and where they differ it is the lower
    one and at least one source says what the extra games were. The review of
    2026-10-01 found the old check only asked for the shape "<n> apps": giving
    Kane's two sources 25 and 31 against his row's 18 stayed green. */
function expectRowFromSources(label: string, row: { apps: number; goals?: number }, wikipedia: string, footballdatabase: string) {
  const w = sourceCount(wikipedia);
  const f = sourceCount(footballdatabase);
  expect(row.apps, `${label}: appearances against Wikipedia ${w.apps} and footballdatabase ${f.apps}`).toBe(Math.min(w.apps, f.apps));
  if (row.goals !== undefined) {
    expect(w.goals, `${label}: Wikipedia gives no goals figure`).not.toBeNull();
    expect(f.goals, `${label}: footballdatabase gives no goals figure`).not.toBeNull();
    expect(row.goals, `${label}: goals against Wikipedia ${w.goals} and footballdatabase ${f.goals}`).toBe(Math.min(w.goals!, f.goals!));
  }
  if (w.apps !== f.apps || w.goals !== f.goals) {
    expect(w.bare && f.bare, `${label}: the sources disagree (${w.apps} and ${f.apps}) and neither says what the extra games were`).toBe(false);
  }
}

describe('every added row is in the pool exactly as both sources agree', () => {
  const players = [...new Set(ledger.added.map(r => r.player))];
  for (const name of players) {
    it(`${name}: the prepended seasons`, () => {
      const rows = ledger.added.filter(r => r.player === name);
      const head = player(name).career.slice(0, rows.length);
      expect(head).toEqual(rows.map(r => ({ season: r.season, club: r.club, goals: r.goals, assists: null, appearances: r.appearances, marketValue: 0 })));
      for (const r of rows) expectRowFromSources(`${name} ${r.season} ${r.club}`, { apps: r.appearances, goals: r.goals }, r.wikipedia, r.footballdatabase);
    });
  }

  it('the migration writes to the tables exactly the rows the ledger and the file carry', () => {
    const sql = fs.readFileSync(path.resolve(process.cwd(), 'supabase/migrations/20261001120000_career_first_clubs.sql'), 'utf8').replace(/\r\n/g, '\n');
    const unquote = (s: string) => s.replace(/''/g, "'");
    const inserts = [...sql.matchAll(/^\s*\('(a0000001-[0-9a-f-]+)', '((?:[^']|'')+)', '((?:[^']|'')+)', (\d+), null, (\d+), 0, (\d+)\)[,;]$/gm)]
      .map(m => ({ playerId: m[1], season: unquote(m[2]), club: unquote(m[3]), goals: Number(m[4]), appearances: Number(m[5]), sortOrder: Number(m[6]) }));
    expect(inserts.length).toBe(ledger.added.length);
    const want = ledger.added.map(r => ({ playerId: r.playerId, season: r.season, club: r.club, goals: r.goals, appearances: r.appearances }));
    expect(inserts.map(r => ({ playerId: r.playerId, season: r.season, club: r.club, goals: r.goals, appearances: r.appearances })).sort((x, y) => JSON.stringify(x).localeCompare(JSON.stringify(y))))
      .toEqual([...want].sort((x, y) => JSON.stringify(x).localeCompare(JSON.stringify(y))));
    /* each player's rows open his path, in order, and the rows already there move down by exactly that many */
    for (const id of new Set(inserts.map(r => r.playerId))) {
      const mine = inserts.filter(r => r.playerId === id);
      expect(mine.map(r => r.sortOrder)).toEqual(mine.map((_, i) => i));
      expect(sql).toContain(`update public.career_seasons set sort_order = sort_order + ${mine.length} where player_id = '${id}';`);
    }
    const updates = [...sql.matchAll(/^\s*update public\.career_seasons set appearances = (\d+) where player_id = '([0-9a-f-]+)' and season = '([^']+)' and club = '([^']+)' and appearances = (\d+);$/gm)];
    expect(updates.map(m => `${m[2]} ${m[3]} ${m[4]} ${m[5]}->${m[1]}`).sort())
      .toEqual(ledger.changed.map(c => `${ledger.added.find(a => a.player === c.player)?.playerId} ${c.season} ${c.club} ${c.from}->${c.to}`).sort());
    const before = Number(sql.match(/if total <> (\d+) then/)?.[1]);
    const after = Number(sql.match(/if n <> (\d+) then raise exception 'expected \d+ career_seasons rows after/)?.[1]);
    expect(after - before).toBe(ledger.added.length);
  });

  it('the changed rows carry the corrected figure', () => {
    for (const c of ledger.changed) {
      const row = player(c.player).career.find(s => s.season === c.season && s.club === c.club);
      expect(row?.[c.field], `${c.player} ${c.season} ${c.club}`).toBe(c.to);
      expect(c.from, `${c.player} ${c.season}: a change that changes nothing`).not.toBe(c.to);
      expectRowFromSources(`${c.player} ${c.season} ${c.club}`, { apps: c.to }, c.wikipedia, c.footballdatabase);
    }
  });
});
