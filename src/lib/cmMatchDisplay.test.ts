import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { inFixtureOrder, mineFirstOfReport, myClubFirst, pitchInitials, pitchName } from '@/lib/cmMatchDisplay';
import { CM_WORLD_ROSTERS } from '@/data/clubManagerWorldRosters';
import { ERA2005_ROSTERS } from '@/data/clubManagerEra2005';
import { ERA2010_ROSTERS } from '@/data/clubManagerEra2010';
import { ERA2015_ROSTERS } from '@/data/clubManagerEra2015';
import { ERA2020_ROSTERS } from '@/data/clubManagerEra2020';
import { CM_REAL_FREE_AGENTS } from '@/data/clubManagerFreeAgents2026';

describe('the order rule (Round 1340)', () => {
  it('puts my club first at home and on a neutral ground, and second away', () => {
    expect(myClubFirst(true)).toBe(true);
    expect(myClubFirst(null)).toBe(true);
    expect(myClubFirst(false)).toBe(false);
  });

  it('reads a field from before the venue existed as today: my club first', () => {
    expect(myClubFirst(undefined)).toBe(true);
  });

  it('draws the pair home side first', () => {
    expect(inFixtureOrder(true, 'Liverpool', 'Newcastle')).toEqual(['Liverpool', 'Newcastle']);
    expect(inFixtureOrder(null, 'Liverpool', 'Newcastle')).toEqual(['Liverpool', 'Newcastle']);
    expect(inFixtureOrder(false, 'Liverpool', 'Newcastle')).toEqual(['Newcastle', 'Liverpool']);
    expect(inFixtureOrder(undefined, 2, 1)).toEqual([2, 1]);
  });

  it('reads a report the way the engine wrote it', () => {
    expect(mineFirstOfReport({ home: 'Liverpool' }, 'Liverpool')).toBe(true);
    expect(mineFirstOfReport({ home: 'Newcastle' }, 'Liverpool')).toBe(false);
  });

  it('agrees with the engine on every venue: report home is me exactly when myClubFirst', () => {
    // The engine's own construction (clubManager.ts playMyMatch): iAmHome = fx.home !== false.
    for (const home of [true, false, null, undefined] as const) {
      const iAmHome = home !== false;
      const report = { home: iAmHome ? 'Liverpool' : 'Newcastle' };
      expect(mineFirstOfReport(report, 'Liverpool')).toBe(myClubFirst(home));
    }
  });
});

describe('the pitch name and the initials (Round 1340b)', () => {
  it('keeps the words a surname carries and drops only a generational suffix', () => {
    const pins: [string, string, string][] = [
      ['Virgil van Dijk', 'van Dijk', 'VvD'], ['Kevin De Bruyne', 'De Bruyne', 'KDB'], ['Alexis Mac Allister', 'Mac Allister', 'AMA'],
      ['Edwin van der Sar', 'van der Sar', 'EdS'], ['Wissam Ben Yedder', 'Ben Yedder', 'WBY'], ['Ángel Di María', 'Di María', 'ÁDM'],
      ['Neymar Jr', 'Neymar', 'Ne'], ['Rodri', 'Rodri', 'Ro'], ['Alexander Isak', 'Isak', 'AI'],
      ['Trent Alexander-Arnold', 'Alexander-Arnold', 'TA'], ['Joe Bloggs (Youth)', 'Bloggs', 'JB'],
      /* An agnome is the name a man is known by: never dropped, it joins the word before it. */
      ['Pedro Neto', 'Pedro Neto', 'PN'], ['Mauro Júnior', 'Mauro Júnior', 'MJ'], ['Vinicius Junior', 'Vinicius Junior', 'VJ'],
      ['Prince Amoako Junior', 'Amoako Junior', 'PAJ'], ['Cristian Cásseres Jr.', 'Cásseres', 'CC'],
      /* A first word that is also a particle word is his first name, never part of the surname: the rosters hold
         eighteen men called Ben and one Van (the review's mutation m1 put "Ben White" on the pitch). */
      ['Ben White', 'White', 'BW'], ['Ben Chilwell', 'Chilwell', 'BC'], ['Van Fitzharris', 'Fitzharris', 'VF'],
      /* The engine's numbered fallback for a youth name never puts a digit on the pitch. */
      ['Joe Bloggs 2 (Youth)', 'Bloggs', 'JB'],
    ];
    for (const [name, surname, initials] of pins) {
      expect(pitchName(name)).toBe(surname);
      expect(pitchInitials(name)).toBe(initials);
    }
  });

  it('holds over every name the game can put on a pitch', () => {
    const real = new Set<string>();
    for (const rosters of [CM_WORLD_ROSTERS, ERA2005_ROSTERS, ERA2010_ROSTERS, ERA2015_ROSTERS, ERA2020_ROSTERS]) {
      for (const squad of Object.values(rosters)) for (const p of squad) real.add(p.n);
    }
    for (const fa of CM_REAL_FREE_AGENTS) real.add(fa.name);
    /* The generated pools are read from the engine's source, so every name it can make is covered: each first
       name with each last name, as a youth and with the numbered fallback. */
    const pool = (file: string, list: string) => {
      const src = fs.readFileSync(path.join(process.cwd(), file), 'utf8');
      const body = new RegExp(`const ${list} = \\[([\\s\\S]*?)\\];`).exec(src)?.[1] ?? '';
      return [...body.matchAll(/'((?:[^'\\]|\\.)*)'/g)].map(m => m[1].replace(/\\'/g, "'"));
    };
    const generated = new Set<string>();
    for (const [file, first, last] of [['src/lib/clubManager.ts', 'YOUTH_FIRST', 'YOUTH_LAST'], ['src/lib/clubManagerEras.ts', 'GEN_FIRST', 'GEN_LAST']]) {
      const firsts = pool(file, first);
      const lasts = pool(file, last);
      expect(firsts.length).toBeGreaterThan(10);
      expect(lasts.length).toBeGreaterThan(10);
      for (const f of firsts) for (const l of lasts) { generated.add(`${f} ${l}`); generated.add(`${f} ${l} (Youth)`); generated.add(`${f} ${l} 2`); }
    }
    expect(real.size).toBeGreaterThan(5000);
    const lastName = (n: string) => n.replace(' (Youth)', '').split(' ').slice(-1)[0];
    const changed: string[] = [];
    let longest = '';
    for (const name of [...real, ...generated]) {
      const surname = pitchName(name);
      const words = name.replace(/\s*\(Youth\)\s*$/i, '').split(/\s+/).filter(w => w && !/\d/.test(w));
      while (words.length > 1 && /^(jr\.?|sr\.?|ii|iii|iv)$/i.test(words[words.length - 1])) words.pop();
      /* Only words of the name, a run that ends it, never a digit, never empty. */
      expect(surname, name).not.toBe('');
      expect(/\d/.test(surname), name).toBe(false);
      expect(` ${words.join(' ')}`.endsWith(` ${surname}`), name).toBe(true);
      /* Never a first name standing alone where the name has more words: a one word pitch name is the last word
         (by place, not by spelling: "Jhon Jhon" is a generated name whose two words are the same). */
      if (words.length > 1 && !surname.includes(' ')) expect(surname, name).toBe(words[words.length - 1]);
      expect(pitchInitials(name), name).toMatch(/^\p{L}{2,3}$/u);
      if (real.has(name) && surname !== lastName(name)) changed.push(`${name} -> ${surname}`);
      if (real.has(name) && surname.length > longest.length) longest = surname;
    }
    /* Printed, not asserted: what changes on the pitch, for a reader to look through for a first name. */
    console.log(`pitch names: ${real.size} real names and ${generated.size} generated ones checked; ${changed.length} real names print differently from the old last word`);
    for (let i = 0; i < changed.length; i += 8) console.log(`  ${changed.slice(i, i + 8).join('; ')}`);
    console.log(`the longest pitch name in the pool: ${longest} (${longest.length} characters)`);
  });
});
