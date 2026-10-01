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

describe('every added row is in the pool exactly as both sources agree', () => {
  const players = [...new Set(ledger.added.map(r => r.player))];
  for (const name of players) {
    it(`${name}: the prepended seasons`, () => {
      const rows = ledger.added.filter(r => r.player === name);
      const head = player(name).career.slice(0, rows.length);
      expect(head).toEqual(rows.map(r => ({ season: r.season, club: r.club, goals: r.goals, assists: null, appearances: r.appearances, marketValue: 0 })));
      for (const r of rows) {
        expect(r.wikipedia, `${name} ${r.season}: no Wikipedia figure`).toMatch(/\d+ apps?/);
        expect(r.footballdatabase, `${name} ${r.season}: no second source figure`).toMatch(/\d+ apps?/);
      }
    });
  }

  it('the changed rows carry the corrected figure', () => {
    for (const c of ledger.changed) {
      const row = player(c.player).career.find(s => s.season === c.season && s.club === c.club);
      expect(row?.[c.field], `${c.player} ${c.season} ${c.club}`).toBe(c.to);
      expect(c.wikipedia).toMatch(/\d+ apps/);
      expect(c.footballdatabase).toMatch(/\d+ apps/);
    }
  });
});
