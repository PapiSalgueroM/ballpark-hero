/**
 * Round 668: the search dedupe keeps namesakes apart where the source can
 * tell them apart, and changes nothing where it cannot.
 *
 * The owner's report (Who Am I, 2026-09-26, "Wrong answer"): typing the
 * Atalanta midfielder Éderson offered only the Fenerbahce keeper Ederson,
 * because the dedupe kept one row per normalized name and the keeper's peak
 * value is higher. dedupeAndRank is the pure half of searchPlayers, so it is
 * run here on rows, no database.
 *
 * Section 1 is the "exactly as before" promise for every source that declares
 * no identity (NFL, NBA, NHL, MLB, Transfer Path, every grid): the new dedupe
 * is compared against a verbatim copy of the pre-668 one on seeded random row
 * sets, and must agree on every one. Sections 2 to 5 are the new behaviour on
 * the soccer source, which declares person_key and spelling.
 *
 * Added by the Round 668 fix: section 6, a row whose name carries "(dup)" is
 * never offered on any source (the one change to the old results, and the
 * random row sets of section 1 never hold such a name); section 7, Career
 * Ladder's suggestion list keeps the search's namesakes apart and its judge
 * never lets a namesake win.
 *
 * Added by the Round 668 re-review: section 8, the line under a shared name
 * describes the shown man's own latest row, never the latest row of a
 * spelling several men share.
 */
import { describe, it, expect } from 'vitest';
import {
  dedupeAndRank,
  displayName,
  mergeLocalNames,
  normalizeName,
  personKeyOf,
  storedSpelling,
  NBA_PLAYER_SOURCE,
  NFL_ROSTER_SOURCE,
  NHL_PLAYER_SOURCE,
  SOCCER_MARKET_VALUE_SOURCE,
  TRANSFER_PATH_PLAYER_SOURCE,
  type MatchRank,
  type PlayerEntity,
  type PlayerEntityMeta,
  type PlayerSourceConfig,
} from '@/lib/playerSearch';
import { ladderGuessWins, ladderSuggestions } from '@/lib/careerLadder';

type Row = Record<string, unknown>;

/* ------------------------------------------------------------------------ */
/* The pre-668 dedupe, copied from origin/main's searchPlayers as it stood   */
/* before this round (rowToRaw, classifyMatch and the consider/sort block),  */
/* so "exactly as before" is measured against the old code, not restated.   */
/* ------------------------------------------------------------------------ */
function legacyRowToRaw(row: Row, source: PlayerSourceConfig) {
  const lastVal = row[source.nameColumn];
  const last = typeof lastVal === 'string' ? lastVal.trim() : '';
  let name = last;
  if (source.firstNameColumn) {
    const firstVal = row[source.firstNameColumn];
    const first = typeof firstVal === 'string' ? firstVal.trim() : '';
    name = [first, last].filter(Boolean).join(' ');
  }
  if (!name) return null;
  let prominence = source.prominenceColumn ? Number(row[source.prominenceColumn]) || 0 : 0;
  if (source.prominenceColumn && source.prominenceAscending) prominence = 1e15 - prominence;
  const recency = source.recencyColumn ? Number(row[source.recencyColumn]) || 0 : 0;
  const meta: PlayerEntityMeta = {};
  if (source.metaColumns) {
    for (const [metaKey, col] of Object.entries(source.metaColumns)) {
      const v = row[col];
      if (v === null || v === undefined) continue;
      if (typeof v === 'number' || typeof v === 'string') meta[metaKey] = v;
    }
  }
  return { name, prominence, recency, meta };
}

function legacyClassify(normalizedName: string, normalizedQuery: string): MatchRank | null {
  if (!normalizedName.includes(normalizedQuery)) return null;
  if (normalizedName.startsWith(normalizedQuery)) return 0;
  if (normalizedName.split(' ').some(word => word.startsWith(normalizedQuery))) return 1;
  return 2;
}

function legacyDedupe(
  rowSets: (Row[] | null)[],
  source: PlayerSourceConfig,
  normalizedQuery: string,
  options: { exclude?: Set<string>; boostNames?: Set<string>; limit: number },
): PlayerEntity[] {
  const exclude = options.exclude;
  const byNormalizedName = new Map<string, { raw: ReturnType<typeof legacyRowToRaw>; rank: MatchRank }>();
  const consider = (rows: Row[] | null | undefined) => {
    for (const row of rows ?? []) {
      const parsed = legacyRowToRaw(row, source);
      if (!parsed) continue;
      const normalized = normalizeName(parsed.name);
      if (!normalized) continue;
      const rank = legacyClassify(normalized, normalizedQuery);
      if (rank === null) continue;
      if (exclude?.has(normalized)) continue;
      const existing = byNormalizedName.get(normalized);
      if (!existing) {
        byNormalizedName.set(normalized, { raw: parsed, rank });
        continue;
      }
      const better =
        rank < existing.rank ||
        (rank === existing.rank &&
          parsed &&
          existing.raw &&
          (parsed.prominence > existing.raw.prominence ||
            (parsed.prominence === existing.raw.prominence && parsed.recency > existing.raw.recency)));
      if (better) byNormalizedName.set(normalized, { raw: parsed, rank: Math.min(rank, existing.rank) as MatchRank });
    }
  };
  for (const rows of rowSets) consider(rows);
  const entities: PlayerEntity[] = [...byNormalizedName.entries()]
    .filter(([, v]) => v.raw !== null)
    .map(([normalized, v]) => {
      const raw = v.raw!;
      return {
        key: normalized,
        name: displayName(raw.name),
        rawName: raw.name,
        meta: raw.meta,
        matchRank: v.rank,
        prominence: raw.prominence,
      };
    });
  const boost = options.boostNames;
  entities.sort((a, b) => {
    if (a.matchRank !== b.matchRank) return a.matchRank - b.matchRank;
    if (boost && boost.size > 0) {
      const ab = boost.has(a.key) ? 0 : 1;
      const bb = boost.has(b.key) ? 0 : 1;
      if (ab !== bb) return ab - bb;
    }
    return b.prominence - a.prominence;
  });
  return entities.slice(0, options.limit);
}

/* Seeded, so a failure names the same case every run. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* Names built to collide: accent variants, case variants, a format character,
   doubled spaces, and plain distinct names. */
const FIRST = ['Éderson', 'Ederson', 'ederson', 'Luis', 'Luís', 'Rodri', 'Kylian', 'Ana', 'Nemanja'];
const LAST = ['', 'Suárez', 'Suarez', 'Mbappé', 'Vidic‎', 'Vidic', 'Silva', 'da  Silva'];

function randomRows(rand: () => number, source: PlayerSourceConfig, n: number): Row[] {
  const rows: Row[] = [];
  const pick = <T,>(xs: T[]) => xs[Math.floor(rand() * xs.length)];
  for (let i = 0; i < n; i++) {
    const row: Row = {};
    const first = pick(FIRST);
    const last = pick(LAST);
    if (source.firstNameColumn) {
      row[source.firstNameColumn] = rand() < 0.1 ? null : first;
      row[source.nameColumn] = last || 'Solo';
    } else {
      row[source.nameColumn] = rand() < 0.05 ? '' : `${first} ${last}`;
    }
    if (source.prominenceColumn) row[source.prominenceColumn] = rand() < 0.1 ? null : Math.floor(rand() * 5) * 1000;
    if (source.recencyColumn) row[source.recencyColumn] = 2015 + Math.floor(rand() * 12);
    for (const col of Object.values(source.metaColumns ?? {})) {
      if (!(col in row)) row[col] = rand() < 0.2 ? null : pick(['A', 'B', 'C', 7, 11]);
    }
    rows.push(row);
  }
  return rows;
}

const NO_IDENTITY_SOURCES: [string, PlayerSourceConfig][] = [
  ['NFL roster', NFL_ROSTER_SOURCE],
  ['NBA (split names, ascending prominence)', NBA_PLAYER_SOURCE],
  ['NHL (no prominence column)', NHL_PLAYER_SOURCE],
  ['Transfer Path', TRANSFER_PATH_PLAYER_SOURCE],
  ['soccer with its identity taken off', { ...SOCCER_MARKET_VALUE_SOURCE, identity: undefined }],
];

describe('1. a source with no identity is deduped exactly as before', () => {
  for (const [label, source] of NO_IDENTITY_SOURCES) {
    it(`${label}: 400 seeded row sets agree with the pre-668 dedupe`, () => {
      expect(source.identity).toBeUndefined();
      const rand = mulberry32(668);
      let compared = 0;
      let nonEmpty = 0;
      let merged = 0;
      for (let i = 0; i < 400; i++) {
        const legs = [randomRows(rand, source, 1 + Math.floor(rand() * 30)), rand() < 0.2 ? null : randomRows(rand, source, Math.floor(rand() * 30))];
        const q = normalizeName(['ed', 'ederson', 'lu', 'suarez', 'silva', 'vidic', 'a', 'rodri'][Math.floor(rand() * 8)]);
        const exclude = rand() < 0.3 ? new Set([normalizeName('Ederson'), 'luis suarez']) : undefined;
        const boostNames = rand() < 0.3 ? new Set(['luis suarez', normalizeName('Nemanja Vidic')]) : undefined;
        const limit = 1 + Math.floor(rand() * 10);
        const now = dedupeAndRank(legs, source, q, { exclude, boostNames, limit });
        const then = legacyDedupe(legs, source, q, { exclude, boostNames, limit });
        expect(now).toEqual(then);
        compared += 1;
        if (then.length > 0) nonEmpty += 1;
        /* Did any name arrive on more than one row, so the merge had work to do? */
        const matching = legs
          .flatMap(rows => rows ?? [])
          .map(r => legacyRowToRaw(r, source))
          .filter(p => p !== null)
          .map(p => normalizeName(p!.name))
          .filter(n => n && n.includes(q));
        if (new Set(matching).size < matching.length) merged += 1;
        for (const e of now) {
          expect(e.personKey).toBeUndefined();
          expect(e.disambiguator).toBeUndefined();
        }
      }
      /* The comparison has to have had something to compare: most sets return
         results, and many of them merge several rows into one. */
      expect(compared).toBe(400);
      expect(nonEmpty).toBeGreaterThan(200);
      expect(merged).toBeGreaterThan(100);
    });
  }

  /* The control for the promise above: the same generator, with the soccer
     identity switched ON, must disagree with the old dedupe on a good share of
     sets. If it did not, the row sets above would hold no namesakes and the
     "agree on every one" would be agreeing about nothing. */
  it('control: the same row sets with an identity switched on do NOT all agree', () => {
    const rand = mulberry32(668);
    let differ = 0;
    for (let i = 0; i < 400; i++) {
      const legs = [randomRows(rand, SOCCER_MARKET_VALUE_SOURCE, 1 + Math.floor(rand() * 30)), null];
      const q = normalizeName(['ed', 'ederson', 'lu', 'suarez'][Math.floor(rand() * 4)]);
      const now = dedupeAndRank(legs, SOCCER_MARKET_VALUE_SOURCE, q, { limit: 8 });
      const then = legacyDedupe(legs, SOCCER_MARKET_VALUE_SOURCE, q, { limit: 8 });
      if (JSON.stringify(now.map(e => e.rawName)) !== JSON.stringify(then.map(e => e.rawName))) differ += 1;
    }
    expect(differ).toBeGreaterThan(100);
  });
});

/* The Ederson rows exactly as the live table held them on 2026-09-28. A
   subset: the keeper's Man City peak and Fenerbahce latest, the midfielder's
   Atalanta peak and latest, and one 2015 Kashiwa Reysol row, a centre-forward
   (listed at 25 that year) who shares the 'Éderson' spelling with the
   midfielder. The attacking midfielder who shares the 'Ederson' spelling with
   the keeper (the table has him at Nice, Lyon, Lazio and Flamengo, 2005 to
   2017) is not in this subset. */
const EDERSON_ROWS: Row[] = [
  { player_name: 'Ederson', club: 'Manchester City', position: 'Goalkeeper', nationality: 'Brazil', market_value_usd: 76000000, year: 2019, age: 25, person_key: null },
  { player_name: 'Ederson', club: 'Fenerbahce', position: 'Goalkeeper', nationality: 'Brazil', market_value_usd: 14000000, year: 2026, age: 32, person_key: null },
  { player_name: 'Éderson', club: 'Atalanta BC', position: 'Central Midfield', nationality: 'Brazil', market_value_usd: 54000000, year: 2025, age: 25, person_key: null },
  { player_name: 'Éderson', club: 'Atalanta BC', position: 'Central Midfield', nationality: 'Brazil', market_value_usd: 43000000, year: 2026, age: 26, person_key: null },
  { player_name: 'Éderson', club: 'Kashiwa Reysol', position: 'Centre-Forward', nationality: 'Brazil', market_value_usd: 3000000, year: 2015, age: 25, person_key: null },
];

describe('2. the soccer source keeps Éderson and Ederson apart', () => {
  const q = normalizeName('Éderson');
  const results = dedupeAndRank([EDERSON_ROWS, null], SOCCER_MARKET_VALUE_SOURCE, q, { limit: 8 });

  it('offers one row per stored spelling, the keeper first on peak value', () => {
    expect(results.map(r => r.rawName)).toEqual(['Ederson', 'Éderson']);
    expect(results.map(r => r.personKey)).toEqual(['sp:Ederson', 'sp:Éderson']);
    /* Before this round the same rows gave one result, the keeper. */
    const before = legacyDedupe([EDERSON_ROWS, null], SOCCER_MARKET_VALUE_SOURCE, q, { limit: 8 });
    expect(before.map(r => r.rawName)).toEqual(['Ederson']);
  });

  it('key stays the normalized name callers compare with, and the list key (personKey ?? key) is unique', () => {
    expect(results.map(r => r.key)).toEqual(['ederson', 'ederson']);
    expect(new Set(results.map(r => r.personKey ?? r.key)).size).toBe(results.length);
  });

  it('each shared name says which man it is, from his LATEST row', () => {
    expect(results[0].disambiguator).toBe('Fenerbahce · Goalkeeper · 2026');
    expect(results[1].disambiguator).toBe('Atalanta BC · Central Midfield · 2026');
  });

  it('the midfielder keeps his own peak row, not the keeper\'s', () => {
    expect(results[1].meta.position).toBe('Central Midfield');
    expect(results[1].prominence).toBe(54000000);
  });

  it('excluding one person key drops just that man; a normalized name still drops both', () => {
    const noKeeper = dedupeAndRank([EDERSON_ROWS], SOCCER_MARKET_VALUE_SOURCE, q, { limit: 8, exclude: new Set(['sp:Ederson']) });
    expect(noKeeper.map(r => r.rawName)).toEqual(['Éderson']);
    const neither = dedupeAndRank([EDERSON_ROWS], SOCCER_MARKET_VALUE_SOURCE, q, { limit: 8, exclude: new Set(['ederson']) });
    expect(neither).toEqual([]);
  });

  it('a namesake just past the limit still marks the one on screen', () => {
    const one = dedupeAndRank([EDERSON_ROWS], SOCCER_MARKET_VALUE_SOURCE, q, { limit: 1 });
    expect(one).toHaveLength(1);
    expect(one[0].disambiguator).toBe('Fenerbahce · Goalkeeper · 2026');
  });
});

describe('3. no collision, no disambiguator', () => {
  it('a name only one person holds gets no extra line and keeps its plain key', () => {
    const rows: Row[] = [
      { player_name: 'Erling Haaland', club: 'Manchester City', position: 'Centre-Forward', market_value_usd: 200000000, year: 2026, age: 25 },
      { player_name: 'Erling Haaland', club: 'Borussia Dortmund', position: 'Centre-Forward', market_value_usd: 150000000, year: 2022, age: 21 },
    ];
    const [r] = dedupeAndRank([rows], SOCCER_MARKET_VALUE_SOURCE, 'haaland', { limit: 8 });
    expect(r.key).toBe('erling haaland');
    expect(r.disambiguator).toBeUndefined();
    expect(r.personKey).toBe('sp:Erling Haaland');
  });
});

describe('4. what is and is not a different person', () => {
  it('a format character or a doubled space is the same spelling (the Round 383 Vidic row)', () => {
    expect(storedSpelling('Nemanja Vidic‎')).toBe('Nemanja Vidic');
    expect(storedSpelling('  Nemanja   Vidic ')).toBe('Nemanja Vidic');
    const rows: Row[] = [
      { player_name: 'Nemanja Vidic‎', club: 'Manchester United', market_value_usd: 30000000, year: 2010 },
      { player_name: 'Nemanja Vidic', club: 'Inter Milan', market_value_usd: 5000000, year: 2015 },
    ];
    const res = dedupeAndRank([rows], SOCCER_MARKET_VALUE_SOURCE, 'vidic', { limit: 8 });
    expect(res).toHaveLength(1);
    expect(res[0].disambiguator).toBeUndefined();
  });

  it('a person_key wins over the spelling: one spelling, two keys, two people', () => {
    const rows: Row[] = [
      { player_name: 'Rodri', club: 'Manchester City', position: 'Defensive Midfield', market_value_usd: 130000000, year: 2024, person_key: 'rodri-1996' },
      { player_name: 'Rodri', club: 'SD Huesca', position: 'Centre-Forward', market_value_usd: 1000000, year: 2009, person_key: 'rodri-1977' },
    ];
    const res = dedupeAndRank([rows], SOCCER_MARKET_VALUE_SOURCE, 'rodri', { limit: 8 });
    expect(res.map(r => r.personKey)).toEqual(['pk:rodri-1996', 'pk:rodri-1977']);
    expect(res.map(r => r.disambiguator)).toEqual(['Manchester City · Defensive Midfield · 2024', 'SD Huesca · Centre-Forward · 2009']);
  });

  it('with no person_key, one spelling is one person, as the table cannot tell more', () => {
    const rows: Row[] = [
      { player_name: 'Rodri', club: 'Manchester City', market_value_usd: 130000000, year: 2024, person_key: null },
      { player_name: 'Rodri', club: 'SD Huesca', market_value_usd: 1000000, year: 2009, person_key: null },
    ];
    expect(dedupeAndRank([rows], SOCCER_MARKET_VALUE_SOURCE, 'rodri', { limit: 8 })).toHaveLength(1);
  });

  it('personKeyOf is undefined on a source with no identity, so nothing there grows a key', () => {
    expect(personKeyOf(undefined, 'Ederson', 'x')).toBeUndefined();
    expect(personKeyOf({ personKeyColumn: 'person_key' }, 'Éderson', null)).toBe('nm:ederson');
  });
});

describe('5. local names do not double up a split namesake', () => {
  it('a caller\'s own "Ederson" is not appended a third time', () => {
    const remote = dedupeAndRank([EDERSON_ROWS], SOCCER_MARKET_VALUE_SOURCE, 'ederson', { limit: 8 });
    const merged = mergeLocalNames(remote, ['Ederson', 'Kylian Mbappé'], 'e');
    expect(merged.map(r => r.name)).toEqual([...remote.map(r => r.name), 'Kylian Mbappé']);
  });
});

/* The Pepê rows as the live table held them on 2026-09-28, the '(dup)' copy
   included (id 156902, the exact twin of the Gremio row beside it). */
const PEPE_ROWS: Row[] = [
  { player_name: 'Pepê', club: 'FC Porto', position: 'Right Winger', market_value_usd: 32000000, year: 2024, age: 26, person_key: null },
  { player_name: 'Pepê', club: 'FC Porto', position: 'Right Winger', market_value_usd: 22000000, year: 2026, age: 28, person_key: null },
  { player_name: 'Pepê', club: 'Grêmio Foot-Ball Porto Alegrense', position: 'Central Midfield', market_value_usd: 3000000, year: 2023, age: 24, person_key: null },
  { player_name: 'Pepê (dup)', club: 'Grêmio Foot-Ball Porto Alegrense', position: 'Central Midfield', market_value_usd: 3000000, year: 2023, age: 24, person_key: null },
  { player_name: 'Pepe', club: 'Real Madrid', position: 'Centre-Back', market_value_usd: 32000000, year: 2012, age: 28, person_key: null },
];

describe('6. a leftover "(dup)" row is never offered (Round 668 fix)', () => {
  it('the soccer search offers Pepe and Pepê, never "Pepê (dup)"', () => {
    const res = dedupeAndRank([PEPE_ROWS], SOCCER_MARKET_VALUE_SOURCE, normalizeName('pepe'), { limit: 8 });
    expect(res.map(r => r.rawName).sort()).toEqual(['Pepe', 'Pepê']);
    /* The pre-668 code offered the copy as a player of its own. */
    const before = legacyDedupe([PEPE_ROWS], SOCCER_MARKET_VALUE_SOURCE, normalizeName('pepe'), { limit: 8 });
    expect(before.some(r => r.rawName === 'Pepê (dup)')).toBe(true);
  });

  it('on a source with no identity too, and nothing else about its results moves', () => {
    const src = { ...SOCCER_MARKET_VALUE_SOURCE, identity: undefined };
    const now = dedupeAndRank([PEPE_ROWS], src, normalizeName('pepe'), { limit: 8 });
    const then = legacyDedupe([PEPE_ROWS], src, normalizeName('pepe'), { limit: 8 });
    expect(now.map(r => r.rawName)).toEqual(then.map(r => r.rawName).filter(n => !n.includes('(dup)')));
  });
});

describe('7. Career Ladder keeps the search\'s namesakes apart (Round 668 fix)', () => {
  const pool = ['Ederson', 'Pavel Nedvěd', 'Kylian Mbappé'];
  const found = dedupeAndRank([EDERSON_ROWS], SOCCER_MARKET_VALUE_SOURCE, normalizeName('ederson'), { limit: 12 });

  it('offers the pool\'s Ederson and, on its own line, the Atalanta Éderson', () => {
    const s = ladderSuggestions(pool, found, 'ederson', []);
    expect(s.map(x => x.name)).toEqual(['Ederson', 'Éderson']);
    expect(s[0].hint).toBeUndefined();
    expect(s[1].hint).toBe('Atalanta BC · Central Midfield · 2026');
    expect(new Set(s.map(x => x.key)).size).toBe(s.length);
  });

  it('picking the namesake never wins the pool man\'s round; picking the pool man does', () => {
    expect(ladderGuessWins('Éderson', 'Ederson', pool)).toBe(false);
    expect(ladderGuessWins('Ederson', 'Ederson', pool)).toBe(true);
  });

  it('a wrong guess on the namesake does not hide the pool man', () => {
    expect(ladderSuggestions(pool, found, 'ederson', ['Éderson']).map(x => x.name)).toEqual(['Ederson']);
  });

  it('one man spelled two ways across two tables stays one row, under the pool\'s spelling', () => {
    const nedved = dedupeAndRank(
      [[{ player_name: 'Pavel Nedved', club: 'Juventus', position: 'Attacking Midfield', market_value_usd: 30000000, year: 2004, person_key: null }]],
      SOCCER_MARKET_VALUE_SOURCE,
      normalizeName('nedved'),
      { limit: 12 },
    );
    const s = ladderSuggestions(pool, nedved, 'nedved', []);
    expect(s.map(x => x.name)).toEqual(['Pavel Nedvěd']);
    expect(ladderGuessWins(s[0].name, 'Pavel Nedvěd', pool)).toBe(true);
  });
});

/* Every "Cafu" and "Cafú" row as the live table held them on 2026-09-28. The
   'Cafu' spelling is two men by the table's own ages: the Milan right-back
   (listed 33 in 2004 to 36 in 2007, born about 1971) and a left midfielder at
   Botafogo, Sao Bento and Portuguesa (21 in 2018 to 23 in 2020, born about
   1997). 'Cafú' is a third man, the Portugal midfielder. */
const CAFU_ROWS: Row[] = [
  { player_name: 'Cafu', club: 'AC Milan', position: 'Right-Back', nationality: 'Brazil', market_value_usd: 3000000, year: 2004, age: 33, person_key: null },
  { player_name: 'Cafu', club: 'AC Milan', position: 'Right-Back', nationality: 'Brazil', market_value_usd: 3000000, year: 2005, age: 34, person_key: null },
  { player_name: 'Cafu', club: 'AC Milan', position: 'Right-Back', nationality: 'Brazil', market_value_usd: 2000000, year: 2006, age: 35, person_key: null },
  { player_name: 'Cafu', club: 'AC Milan', position: 'Right-Back', nationality: 'Brazil', market_value_usd: 2000000, year: 2007, age: 36, person_key: null },
  { player_name: 'Cafu', club: 'Botafogo FC', position: 'Left Midfield', nationality: 'Brazil', market_value_usd: 1000000, year: 2018, age: 21, person_key: null },
  { player_name: 'Cafu', club: 'Esporte Clube São Bento (SP)', position: 'Left Midfield', nationality: 'Brazil', market_value_usd: 1000000, year: 2019, age: 22, person_key: null },
  { player_name: 'Cafu', club: 'AA Portuguesa', position: 'Left Midfield', nationality: 'Brazil', market_value_usd: 1000000, year: 2020, age: 23, person_key: null },
  { player_name: 'Cafú', club: 'Vitória Guimarães SC', position: 'Central Midfield', nationality: 'Portugal', market_value_usd: 2000000, year: 2015, age: 21, person_key: null },
  { player_name: 'Cafú', club: 'Vitória Guimarães SC', position: 'Central Midfield', nationality: 'Portugal', market_value_usd: 2000000, year: 2016, age: 22, person_key: null },
  { player_name: 'Cafú', club: 'FC Lorient', position: 'Central Midfield', nationality: 'Portugal', market_value_usd: 3000000, year: 2017, age: 23, person_key: null },
  { player_name: 'Cafú', club: 'Legia Warszawa', position: 'Central Midfield', nationality: 'Portugal', market_value_usd: 2000000, year: 2019, age: 25, person_key: null },
];

describe('8. the line under a shared name describes the man shown (Round 668 re-review)', () => {
  const q = normalizeName('cafu');
  const results = dedupeAndRank([CAFU_ROWS], SOCCER_MARKET_VALUE_SOURCE, q, { limit: 8 });
  const cafu = results.find(r => r.rawName === 'Cafu')!;
  const cafuAccent = results.find(r => r.rawName === 'Cafú')!;

  it('the fixture holds the defect: the latest "Cafu" row is another man than the row shown', () => {
    /* The shown row is the peak, the Milan right-back. The latest row under
       the spelling is the Portuguesa left midfielder, which is what the line
       said before the re-review. */
    expect(cafu.meta.club).toBe('AC Milan');
    expect(cafu.meta.position).toBe('Right-Back');
    const spellingLatest = CAFU_ROWS.filter(r => r.player_name === 'Cafu').reduce((a, b) => (Number(b.year) > Number(a.year) ? b : a));
    expect(spellingLatest.club).toBe('AA Portuguesa');
    expect(Number(cafu.meta.year) - Number(cafu.meta.age)).not.toBe(Number(spellingLatest.year) - Number(spellingLatest.age));
  });

  it('the Milan right-back\'s line is his own latest row, never the Portuguesa left midfielder\'s', () => {
    expect(cafu.disambiguator).toBe('AC Milan · Right-Back · 2007');
  });

  it('the other spelling gets its own man\'s latest row', () => {
    expect(cafuAccent.disambiguator).toBe('Legia Warszawa · Central Midfield · 2019');
  });

  /* The rows below are made up (the "Synthetic FC" rows and the person keys
     are not in the table) to reach the two paths live data does not have:
     a row with no age, and a person_key. */
  it('a later row with no age proves nothing and is never used; nor is anything when the shown row has none', () => {
    const noAgeLater: Row[] = [
      { player_name: 'Cafu', club: 'AC Milan', position: 'Right-Back', market_value_usd: 3000000, year: 2005, age: 34, person_key: null },
      { player_name: 'Cafu', club: 'Synthetic FC', position: 'Right-Back', market_value_usd: 1000000, year: 2010, age: null, person_key: null },
      { player_name: 'Cafú', club: 'FC Lorient', position: 'Central Midfield', market_value_usd: 3000000, year: 2017, age: 23, person_key: null },
    ];
    const res = dedupeAndRank([noAgeLater], SOCCER_MARKET_VALUE_SOURCE, q, { limit: 8 });
    expect(res.find(r => r.rawName === 'Cafu')!.disambiguator).toBe('AC Milan · Right-Back · 2005');
    const shownNoAge: Row[] = [
      { player_name: 'Cafu', club: 'AC Milan', position: 'Right-Back', market_value_usd: 3000000, year: 2005, age: null, person_key: null },
      { player_name: 'Cafu', club: 'AC Milan', position: 'Right-Back', market_value_usd: 2000000, year: 2007, age: 36, person_key: null },
      { player_name: 'Cafú', club: 'FC Lorient', position: 'Central Midfield', market_value_usd: 3000000, year: 2017, age: 23, person_key: null },
    ];
    const res2 = dedupeAndRank([shownNoAge], SOCCER_MARKET_VALUE_SOURCE, q, { limit: 8 });
    expect(res2.find(r => r.rawName === 'Cafu')!.disambiguator).toBe('AC Milan · Right-Back · 2005');
  });

  it('a person_key says the later row is him whatever its age says', () => {
    const keyed: Row[] = [
      { player_name: 'Cafu', club: 'AC Milan', position: 'Right-Back', market_value_usd: 3000000, year: 2005, age: 34, person_key: 'cafu-1970' },
      { player_name: 'Cafu', club: 'Synthetic FC', position: 'Right-Back', market_value_usd: 1000000, year: 2008, age: 20, person_key: 'cafu-1970' },
      { player_name: 'Cafu', club: 'AA Portuguesa', position: 'Left Midfield', market_value_usd: 1000000, year: 2020, age: 23, person_key: 'cafu-1997' },
    ];
    const res = dedupeAndRank([keyed], SOCCER_MARKET_VALUE_SOURCE, q, { limit: 8 });
    expect(res.map(r => r.personKey)).toEqual(['pk:cafu-1970', 'pk:cafu-1997']);
    expect(res.map(r => r.disambiguator)).toEqual(['Synthetic FC · Right-Back · 2008', 'AA Portuguesa · Left Midfield · 2020']);
  });
});
