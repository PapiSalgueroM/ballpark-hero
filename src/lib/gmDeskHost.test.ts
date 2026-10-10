/* Round 1223: the GM desk host at unit size. The fleet sized proof, on the four
   real engines and with a negative control behind every check, is
   scripts/simGmDeskHost.mjs. This file holds the same properties small. */
import { describe, expect, it } from 'vitest';
import {
  GM_HOST_KEYS, HOST_BLOCK_RULES, HOST_TILE_SUB_MAX, HOST_TILE_VALUE_MAX, hostArriving, hostCanSitOut, hostCanSpend, hostCareerHelp, hostCareerTile, hostCloseSeason,
  hostCraftCut, hostCutQuote, hostDeskCases, hostEarnsLine, hostFeedKey, hostKey, hostLastGrade, hostLegacy,
  hostLegacySeat, hostMarket, hostMarketHelp, hostMarketTile, hostMoveBlocks, hostNewSeat, hostOutOfWorkCard,
  hostPressOption, hostSeasonAway, hostSeasonVerdict, hostSeasonsRecorded, hostSeatOf, hostSitArmLine, hostSitOut, hostSpendPoint,
  hostSummerMandate, hostTakeSeat, hostXpEffects, hostXpHelp, hostXpOf, hostXpRecapLine, hostXpRollKey, hostXpTile,
  isGmSeatBlock,
  type GmAwayHost, type GmDeskHost, type GmSeatBlock, type HostBlockRule, type HostClub, type HostLegacy,
} from '@/lib/gmDeskHost';
import { freshGmDesk, withGmBlock, type GmDesk } from '@/lib/gmDesk';
import { careerTotals, currentStint, sanitizeGmCareer, type SeatSave } from '@/lib/gmSeat';
import {
  GM_TREES, contractAsk, craftedDeadMoney, cushionTrustLoss, defaultGmXp, developedGrowth, gmSeasonXp, mandateSteps,
  pressOdds, scoutedNoise, tradePremium, xpForLevel, type GmTree, type GmXp,
} from '@/lib/gmXp';
import { keyedRng } from '@/lib/keyedRng';
import {
  applyMandateResult, buildOwnerMandate, gradeSeason, FO_TRUST_START,
  type FoGradeResult, type FoSeasonOutcome, type OwnerMandate,
} from '@/lib/foOwnerMandate';
import { buildGmPresser } from '@/lib/foGmPress';
import { deadMoneyFor } from '@/lib/frontOfficeCuts';
import { deskCases, noteArrival, openLedger, type GmContractHost, type GmContractLeague } from '@/lib/gmContracts';
import { GM_SEAT_PACKS } from '@/data/gmSeat/packs';

/* ---------------- a small league and its adapter ---------------- */

interface TClub { id: string; strength: number; wins: number; losses: number; payroll: number }
interface TLeague { season: number; cap: number; clubs: TClub[]; champions: Record<number, string> }

const N = 32;
const idOf = (i: number) => `T${String(i).padStart(2, '0')}`;
const nameOf = (id: string) => `Club ${id}`;
const league = (season = 2030): TLeague => ({
  season, cap: 100,
  clubs: Array.from({ length: N }, (_, i) => ({ id: idOf(i), strength: 90 - i, wins: 50 - i, losses: 30 + i, payroll: 80 + (i % 7) })),
  champions: { [season]: idOf(0) },
});
const host: GmDeskHost<TLeague> = {
  sport: 'nhl', pack: GM_SEAT_PACKS.nhl,
  clubs: l => {
    const table = [...l.clubs].sort((a, b) => b.wins - a.wins || a.id.localeCompare(b.id));
    return l.clubs.map((c): HostClub => ({
      id: c.id, wins: c.wins, losses: c.losses, strength: c.strength, games: c.wins + c.losses,
      record: `${c.wins}-${c.losses}`, place: table.findIndex(x => x.id === c.id) + 1, payroll: c.payroll,
    }));
  },
  season: l => l.season, cap: l => l.cap, champion: (l, s) => l.champions[s] ?? null,
};

const TOP = idOf(0);      // tier 1
const BOTTOM = idOf(31);  // tier 4
const legacy = (over: Partial<HostLegacy> = {}): HostLegacy => ({
  team: BOTTOM, tier: 4, season: 2030, seasonCounted: true, seasonsPlayed: 0, titles: 0, fired: false, lastGrade: null, ...over,
});
/** A stored record: one stint at `team`, these grades, ended or not. */
const block = (team: string, grades: FoGradeResult[], fired: boolean, from = 2026): GmSeatBlock => ({
  v: 1, career: { version: 1, stints: [{ team, tier: 4, from, grades, ...(fired ? { ended: 'fired' as const } : {}) }], seasonsOut: 0 },
});
const deskWith = (seat: GmSeatBlock | null, xp: GmXp | null = null): GmDesk => {
  let d = freshGmDesk();
  if (seat) d = withGmBlock(d, GM_HOST_KEYS.seat, seat);
  if (xp) d = withGmBlock(d, GM_HOST_KEYS.xp, xp);
  return d;
};
const xpWith = (tree: GmTree, points: number, xp = 100000): GmXp => {
  const b = defaultGmXp();
  return { ...b, xp, points: { ...b.points, [tree]: points } };
};
const GRADES: FoGradeResult[] = ['title', 'overachieved', 'met', 'missed', 'badly'];
/* The en and em dash, built from char codes so this file never carries one. */
const DASHES = new RegExp(`[${String.fromCharCode(0x2013, 0x2014)}]`);

/* ---------------- the record of an old save ---------------- */

describe('the record of a save older than the block', () => {
  it('fills nothing in: titles out are titles in, the rest is a count, and it passes the career validator', () => {
    let rows = 0;
    for (let seasons = 0; seasons <= 15; seasons++) {
      for (let titles = 0; titles <= seasons; titles++) {
        for (const lastGrade of [null, ...GRADES]) {
          for (const fired of [false, true]) {
            for (const seasonCounted of [false, true]) {
              const b = hostLegacySeat(legacy({ seasonsPlayed: seasons, titles, lastGrade, fired, seasonCounted }));
              rows += 1;
              expect(isGmSeatBlock(b)).toBe(true);
              expect(sanitizeGmCareer(b.career)).not.toBeNull();
              const g = b.career.stints[0].grades;
              expect(g.filter(x => x === 'title').length).toBe(titles);
              expect(g.length + (b.before?.seasons ?? 0)).toBe(seasons);
              expect(hostSeasonsRecorded(b)).toBe(seasons);
              /* No grade appears that was not handed in. */
              for (const x of g) expect(x === 'title' || x === lastGrade).toBe(true);
              expect(g.filter(x => x !== 'title').length).toBeLessThanOrEqual(1);
              expect(b.before?.tierUnknown).toBe(true);
              expect(b.career.stints[0].ended).toBe(fired ? 'fired' : undefined);
            }
          }
        }
      }
    }
    expect(rows).toBe(136 * 6 * 2 * 2);
  });

  it('starts the stint in the season he started, whichever way the counters were read (the B7 contract)', () => {
    /* A save started in 2030. During 2030 and at its verdict the counters are uncounted. */
    expect(hostLegacySeat(legacy({ season: 2030, seasonsPlayed: 0, seasonCounted: false })).career.stints[0].from).toBe(2030);
    /* At rest after the close they are counted. */
    expect(hostLegacySeat(legacy({ season: 2030, seasonsPlayed: 1, seasonCounted: true })).career.stints[0].from).toBe(2030);
    /* Four seasons in, a fifth being played, then that fifth at rest. */
    expect(hostLegacySeat(legacy({ season: 2034, seasonsPlayed: 4, seasonCounted: false })).career.stints[0].from).toBe(2030);
    expect(hostLegacySeat(legacy({ season: 2034, seasonsPlayed: 5, seasonCounted: true })).career.stints[0].from).toBe(2030);
    /* A counted read of no seasons cannot be: it is read as uncounted, never a season late. */
    expect(hostLegacySeat(legacy({ season: 2030, seasonsPlayed: 0, seasonCounted: true })).career.stints[0].from).toBe(2030);
  });

  it('knows the arrival tier only on a record written the day he took the club', () => {
    expect(hostNewSeat(TOP, 1, 2030).before).toBeUndefined();
    expect(hostLegacySeat(legacy()).before).toEqual({ seasons: 0, tierUnknown: true });
  });

  it('reads the tier through the adapter and never writes', () => {
    const lg = league();
    const before = JSON.stringify(lg);
    expect(hostLegacy(host, lg, { team: TOP, seasonsPlayed: 3, titles: 1, fired: false, seasonCounted: true }).tier).toBe(1);
    expect(hostLegacy(host, lg, { team: BOTTOM, seasonsPlayed: 3, titles: 1, fired: false, seasonCounted: true }).tier).toBe(4);
    expect(JSON.stringify(lg)).toBe(before);
  });
});

describe('the stored record against the save beside it', () => {
  const stored = block(BOTTOM, ['met', 'missed'], false);
  it('is read as stored when it fits, and a read never writes', () => {
    const desk = deskWith(stored);
    const snap = JSON.stringify(desk);
    expect(hostSeatOf(desk, legacy({ seasonsPlayed: 9, titles: 4 }))).toBe(stored);
    expect(JSON.stringify(desk)).toBe(snap);
  });
  it('fails closed to the legacy record when its open stint is at another club, or is open on a fired save', () => {
    const l = legacy({ seasonsPlayed: 9, titles: 4 });
    expect(hostSeatOf(deskWith(block(TOP, ['met'], false)), l)).toEqual(hostLegacySeat(l));
    const firedSave = legacy({ seasonsPlayed: 9, titles: 4, fired: true });
    expect(hostSeatOf(deskWith(stored), firedSave)).toEqual(hostLegacySeat(firedSave));
    /* And the other way round: a record that says out of work on a save that is not. */
    expect(hostSeatOf(deskWith(block(BOTTOM, ['met'], true)), l)).toEqual(hostLegacySeat(l));
  });
  it('costs one block when one block is corrupt', () => {
    const xp = xpWith('ownership', 2);
    const l = legacy({ seasonsPlayed: 2 });
    const badSeat = withGmBlock(deskWith(null, xp), GM_HOST_KEYS.seat, { v: 1, career: { version: 1, stints: [], seasonsOut: 0 } });
    expect(hostSeatOf(badSeat, l)).toEqual(hostLegacySeat(l));
    expect(hostXpOf(badSeat)).toBe(xp);
    const badXp = withGmBlock(deskWith(stored), GM_HOST_KEYS.xp, { v: 1, xp: -5, points: {} });
    expect(hostXpOf(badXp)).toEqual(defaultGmXp());
    expect(hostSeatOf(badXp, l)).toBe(stored);
    expect(hostSeatOf(null, l)).toEqual(hostLegacySeat(l));
    expect(hostXpOf(null)).toEqual(defaultGmXp());
  });
});

/* ---------------- the close and the verdict ---------------- */

const facts = (season: number, grade: FoGradeResult, fired = false) => ({
  season, grade, fired, wins: 48, games: 80, wonTitle: grade === 'title', playoffRoundsWon: grade === 'title' ? 4 : 1,
});

describe('the season close', () => {
  it('records a season once, pays what gmSeasonXp pays, and survives JSON', () => {
    const l = legacy({ seasonsPlayed: 2, titles: 1, seasonCounted: false });
    const first = hostCloseSeason(freshGmDesk(), l, facts(2030, 'met'));
    const expected = gmSeasonXp({ winPct: 48 / 80, titles: 0, playoffRoundsWon: 1, mandateSteps: mandateSteps('met'), placesAboveExpectation: 0, prospectsGraduated: 0 });
    expect(first.award).toEqual(expected);
    expect(hostXpOf(first.desk).xp).toBe(expected.total);
    const seat = hostSeatOf(first.desk, { ...l, seasonsPlayed: 3, seasonCounted: true });
    expect(seat.last).toBe(2030);
    expect(seat.career.stints[0].grades).toEqual(['title', 'met']);
    expect(hostSeasonsRecorded(seat)).toBe(3);
    /* The same season again: nothing recorded, nothing paid, the same desk. */
    const again = hostCloseSeason(first.desk, { ...l, seasonsPlayed: 3, seasonCounted: true }, facts(2030, 'met'));
    expect(again.award).toBeNull();
    expect(again.desk).toBe(first.desk);
    /* The next one is recorded. */
    const next = hostCloseSeason(first.desk, { ...l, seasonsPlayed: 3 }, facts(2031, 'missed'));
    expect(hostSeatOf(next.desk, { ...l, seasonsPlayed: 4, seasonCounted: true }).career.stints[0].grades).toEqual(['title', 'met', 'missed']);
    expect(JSON.parse(JSON.stringify(next.desk))).toEqual(next.desk);
  });
  it('ends the stint on a firing and records nothing after it', () => {
    const l = legacy({ seasonsPlayed: 0, seasonCounted: false });
    const out = hostCloseSeason(freshGmDesk(), l, facts(2030, 'badly', true));
    const seat = hostSeatOf(out.desk, legacy({ seasonsPlayed: 1, fired: true }));
    expect(currentStint(seat.career).ended).toBe('fired');
    const after = hostCloseSeason(out.desk, legacy({ seasonsPlayed: 1, fired: true }), facts(2031, 'title'));
    expect(after.award).toBeNull();
    expect(after.desk).toBe(out.desk);
  });
  it('reports the level before and after', () => {
    const l = legacy({ seasonsPlayed: 0, seasonCounted: false });
    const xp = { ...defaultGmXp(), xp: xpForLevel(2) - 10 };
    const out = hostCloseSeason(deskWith(null, xp), l, facts(2030, 'met'));
    expect(out.levelBefore).toBe(1);
    expect(out.levelAfter).toBe(2);
    expect(hostXpRecapLine(out, GM_TREES)).toBe(`GM XP +${out.award!.total}. Level 2, 1 point to spend.`);
    expect(hostXpRecapLine(out, [])).toBe(`GM XP +${out.award!.total}. Level 2.`);
  });
});

const mandateFor = (tier: 'title' | 'rebuild', season = 2030): OwnerMandate =>
  buildOwnerMandate(tier === 'title' ? 1 : N, N, false, GM_SEAT_PACKS.nhl.words, season);
const outcome = (over: Partial<FoSeasonOutcome> = {}): FoSeasonOutcome => ({
  wins: 40, madePlayoffs: false, roundsWon: 0, reachedFinal: false, wonTitle: false, ...over,
});

describe('the season verdict', () => {
  const lg = league();
  const base = { team: BOTTOM, trust: 60, fired: false, seasonsPlayed: 0, titles: 0 };
  it('with no mandate hands back the trust and the flag it was given', () => {
    const desk = freshGmDesk();
    const v = hostSeasonVerdict(host, lg, { ...base, mandate: null, outcome: outcome(), desk });
    expect(v).toMatchObject({ grade: null, trust: 60, fired: false, award: null });
    expect(v.desk).toBe(desk);
  });
  it('with no desk is the two engine calls a board makes today, tax cheque included', () => {
    for (const m of [mandateFor('title'), mandateFor('rebuild')]) {
      for (const o of [outcome(), outcome({ madePlayoffs: true }), outcome({ wins: 20 }), outcome({ wonTitle: true, madePlayoffs: true, reachedFinal: true, roundsWon: 4 })]) {
        for (const trust of [5, 16, 60, 95]) {
          for (const movers of [undefined, [-7]]) {
            const g = gradeSeason(m, o);
            const today = applyMandateResult(trust, { ...g, trustDelta: g.trustDelta + (movers ? -7 : 0) });
            const v = hostSeasonVerdict(host, lg, { ...base, trust, mandate: m, outcome: o, desk: null, trustMovers: movers });
            expect(v.grade).toEqual(g);
            expect({ trust: v.trust, fired: v.fired, warning: v.warning }).toEqual(today);
            expect(v.desk).toBeNull();
            expect(v.award).toBeNull();
          }
        }
      }
    }
  });
  it('walks Ownership one step a point, and a gain or a tax cheque is never cushioned', () => {
    const missed = mandateFor('title');   // the title asked, the final lost: one level short
    const lostFinal = outcome({ madePlayoffs: true, roundsWon: 3, reachedFinal: true });
    expect(gradeSeason(missed, lostFinal).result).toBe('missed');
    const costs = { missed: [] as number[], badly: [] as number[] };
    for (let p = 0; p <= 5; p++) {
      const desk = deskWith(null, xpWith('ownership', p));
      costs.missed.push(60 - hostSeasonVerdict(host, lg, { ...base, mandate: missed, outcome: lostFinal, desk }).trust);
      costs.badly.push(60 - hostSeasonVerdict(host, lg, { ...base, mandate: missed, outcome: outcome(), desk }).trust);
      /* A gain is the same at every level. */
      expect(hostSeasonVerdict(host, lg, { ...base, mandate: mandateFor('rebuild'), outcome: outcome({ madePlayoffs: true }), desk }).trust).toBe(82);
      /* A tax cheque rides on top, uncushioned. */
      const taxed = hostSeasonVerdict(host, lg, { ...base, mandate: missed, outcome: lostFinal, desk, trustMovers: [-10] });
      expect(taxed.trustDelta).toBe(cushionTrustLoss(-16, p) - 10);
    }
    expect(costs.missed).toEqual([16, 15, 14, 13, 12, 10]);
    expect(costs.badly).toEqual([28, 26, 24, 22, 20, 18]);
    /* On trust 16 a miss fires him with no point and leaves him on 1 with one. */
    const at = (p: number) => hostSeasonVerdict(host, lg, { ...base, trust: 16, mandate: missed, outcome: lostFinal, desk: deskWith(null, xpWith('ownership', p)) });
    expect(at(0)).toMatchObject({ trust: 0, fired: true });
    expect(at(1)).toMatchObject({ trust: 1, fired: false });
  });
  it('on a new save starts the stint in the season he started and is not an arrival (B7)', () => {
    const v = hostSeasonVerdict(host, lg, { ...base, mandate: mandateFor('rebuild'), outcome: outcome(), desk: freshGmDesk() });
    const seat = hostSeatOf(v.desk, legacy({ seasonsPlayed: 1, seasonCounted: true }));
    expect(seat.career.stints[0].from).toBe(lg.season);
    expect(seat.career.stints[0].grades).toEqual([v.grade!.result]);
    expect(hostArriving(seat, lg.season)).toBe(false);
    /* The XP comes from his club's own row: wins over games played. */
    expect(v.award!.wins).toBe(Math.round((19 / 80) * 100));
  });
  it('closes the stint when the verdict fires him', () => {
    const v = hostSeasonVerdict(host, lg, { ...base, trust: 10, mandate: mandateFor('title'), outcome: outcome(), desk: freshGmDesk() });
    expect(v.fired).toBe(true);
    expect(currentStint(hostSeatOf(v.desk, legacy({ seasonsPlayed: 1, fired: true })).career).ended).toBe('fired');
  });
  it('works a last grade out again only from this season: its own mandate and a decided champion', () => {
    const o = outcome();
    expect(hostLastGrade(host, lg, mandateFor('title', 2030), o)).toBe('badly');
    expect(hostLastGrade(host, lg, mandateFor('title', 2029), o)).toBeNull();
    expect(hostLastGrade(host, lg, null, o)).toBeNull();
    expect(hostLastGrade(host, lg, mandateFor('title', 2030), null)).toBeNull();
    expect(hostLastGrade(host, { ...lg, champions: {} }, mandateFor('title', 2030), o)).toBeNull();
  });
  it('keeps the ask he was shown through the next summer, and only that one', () => {
    const built = mandateFor('rebuild', 2031);
    const shown = mandateFor('title', 2031);
    expect(hostSummerMandate(shown, built, 2031)).toBe(shown);
    expect(hostSummerMandate(mandateFor('title', 2030), built, 2031)).toBe(built);
    expect(hostSummerMandate(null, built, 2031)).toBe(built);
  });
});

/* ---------------- XP ---------------- */

describe('the seven effects', () => {
  it('hand back what they were given with no point, and draw nothing', () => {
    for (const desk of [null, freshGmDesk(), deskWith(null, defaultGmXp())]) {
      const fx = hostXpEffects(desk, 'nhl');
      for (const n of [-4, -3, 0, 2, 4]) expect(fx.scoutNoise(n, 'k')).toBe(n);
      for (const a of [0.8, 3.3, 12.7]) { expect(fx.ask(a, 0.8, 'k')).toBe(a); expect(fx.deadMoney(a, 'k')).toBe(a); }
      for (const g of [-2, 0, 1, 3]) expect(fx.growth(g, 5, 'k')).toBe(g);
      for (const p of [1, 1.02, 1.07, 1.15]) expect(fx.premium(p)).toBe(p);
      for (const d of [-28, -16, 14, 40]) expect(fx.trustDelta(d)).toBe(d);
      for (const o of [0.45, 0.7]) expect(fx.pressOdds(o)).toBe(o);
    }
  });
  it('at every level equal gmXp fed the keyed roll, and no two trees share a roll', () => {
    for (let p = 1; p <= 5; p++) {
      for (const key of ['T00|2030|a', 'T00|2030|b', 'T31|2031|a']) {
        const roll = (tree: GmTree) => keyedRng(hostXpRollKey('nba', tree, key))();
        expect(hostXpEffects(deskWith(null, xpWith('scouting', p)), 'nba').scoutNoise(-4, key)).toBe(scoutedNoise(-4, p, roll('scouting')));
        expect(hostXpEffects(deskWith(null, xpWith('negotiation', p)), 'nba').ask(7.3, 0.8, key)).toBe(contractAsk(7.3, p, roll('negotiation'), 0.8));
        expect(hostXpEffects(deskWith(null, xpWith('capCraft', p)), 'nba').deadMoney(4.7, key)).toBe(craftedDeadMoney(4.7, p, roll('capCraft')));
        expect(hostXpEffects(deskWith(null, xpWith('development', p)), 'nba').growth(2, 6, key)).toBe(developedGrowth(2, 6, p, roll('development')));
        expect(new Set(GM_TREES.map(roll)).size).toBe(GM_TREES.length);
      }
      expect(hostXpEffects(deskWith(null, xpWith('trading', p)), 'nba').premium(1.07)).toBe(tradePremium(1.07, p));
      expect(hostXpEffects(deskWith(null, xpWith('ownership', p)), 'nba').trustDelta(-16)).toBe(cushionTrustLoss(-16, p));
      expect(hostXpEffects(deskWith(null, xpWith('media', p)), 'nba').pressOdds(0.5)).toBe(pressOdds(0.5, p));
    }
    /* The sport is in the key, so two sports never share a stream either. */
    expect(hostXpRollKey('nba', 'scouting', 'k')).not.toBe(hostXpRollKey('nhl', 'scouting', 'k'));
    expect(hostKey('TOR', 2030, 'h12')).toBe('TOR|2030|h12');
  });
});

describe('spending a point', () => {
  it('is refused off the live list, with no point, and past five', () => {
    const rich = deskWith(null, { ...defaultGmXp(), xp: 1e9 });
    expect(hostSpendPoint(rich, 'media', ['ownership'])).toBeNull();
    expect(hostSpendPoint(rich, 'nonsense', GM_TREES)).toBeNull();
    expect(hostSpendPoint(deskWith(null, defaultGmXp()), 'media', GM_TREES)).toBeNull();
    let d = rich;
    for (let i = 0; i < 5; i++) { d = hostSpendPoint(d, 'media', GM_TREES)!; expect(d).not.toBeNull(); }
    expect(hostXpOf(d).points.media).toBe(5);
    expect(hostSpendPoint(d, 'media', GM_TREES)).toBeNull();
    /* The desk handed in is not changed. */
    expect(hostXpOf(rich).points.media).toBe(0);
  });
  it('tiles pulse only when a live tree can take a point he has', () => {
    const one = deskWith(null, { ...defaultGmXp(), xp: xpForLevel(2) });
    expect(hostCanSpend(one, ['media'])).toBe(true);
    expect(hostCanSpend(one, [])).toBe(false);
    expect(hostXpTile(one, ['media'], true)).toMatchObject({ value: 'GM level 2', sub: '1 point to spend', accent: true });
    expect(hostXpTile(one, [], true).accent).toBe(false);
    expect(hostXpTile(one, ['media'], false).accent).toBe(false);
    expect(hostXpTile(null, GM_TREES, true).sub).toBe(`${xpForLevel(2)} XP to level 2`);
  });
});

/* ---------------- the market ---------------- */

/** A man let go by `team` after these grades, in a league at rest in `season`. */
const firedFrom = (team: string, grades: FoGradeResult[], from = 2026, out = 0): GmSeatBlock => {
  const b = block(team, grades, true, from);
  return { ...b, career: { ...b.career, seasonsOut: out } };
};
/* Strong enough that the engine's own count can never come out at zero (standing near the top:
   the smallest roll is over one), so a test that needs an offer does not lean on a keyed roll. */
const WINNER: FoGradeResult[] = ['title', 'title', 'title', 'title', 'title', 'overachieved', 'overachieved', 'overachieved', 'missed'];
const WRECK: FoGradeResult[] = ['badly', 'badly', 'badly'];

describe('the job market', () => {
  const lg = league();
  it('is null while he holds a seat', () => {
    expect(hostMarket(host, lg, block(BOTTOM, ['met'], false), nameOf)).toBeNull();
    expect(hostMarketTile(null)).toBeNull();
  });
  it('reads the same feed every time and a new one a year or a season on', () => {
    const seat = firedFrom(BOTTOM, WINNER);
    const a = hostMarket(host, lg, seat, nameOf)!;
    const snap = JSON.stringify(lg);
    for (let i = 0; i < 20; i++) expect(hostMarket(host, lg, seat, nameOf)).toEqual(a);
    expect(JSON.stringify(lg)).toBe(snap);
    expect(a.state).toBe('offers');
    expect(hostFeedKey('nhl', seat, 2030)).not.toBe(hostFeedKey('nhl', firedFrom(BOTTOM, WINNER, 2026, 1), 2030));
    expect(hostFeedKey('nhl', seat, 2030)).not.toBe(hostFeedKey('nhl', seat, 2031));
    expect(hostFeedKey('nhl', seat, 2030)).not.toBe(hostFeedKey('nba', seat, 2030));
  });
  it('never offers the club that let him go, asks for next season, and carries facts for every offer', () => {
    let offers = 0;
    for (const team of [TOP, idOf(12), idOf(20), BOTTOM]) {
      for (let from = 2015; from < 2027; from++) {
        const m = hostMarket(host, lg, firedFrom(team, WINNER, from), nameOf)!;
        for (const o of m.offers) {
          offers += 1;
          expect(o.teamId).not.toBe(team);
          expect(o.ask.season).toBe(lg.season + 1);
          const f = m.facts[o.teamId];
          const c = lg.clubs.find(x => x.id === o.teamId)!;
          expect(f).toEqual({ strengthRank: lg.clubs.indexOf(c) + 1, record: `${c.wins}-${c.losses}`, place: lg.clubs.indexOf(c) + 1, room: 100 - c.payroll });
        }
        expect(m.season).toBe(lg.season + 1);
      }
    }
    expect(offers).toBeGreaterThanOrEqual(48);
  });
  it('tells offers, quiet and closed apart, and a closed line never tells him to sit', () => {
    const closed = hostMarket(host, lg, firedFrom(BOTTOM, WRECK), nameOf)!;
    expect(closed).toMatchObject({ state: 'closed', nextYear: 'shut', offers: [] });
    expect(/\bsit/i.test(closed.line)).toBe(false);
    expect(closed.line).toContain('the phone has stopped');
    expect(hostMarketTile(closed)).toMatchObject({ value: 'No more calls', sub: 'Only a new front office now', accent: false });
    /* A tier 1 club's wreck is above the floor today and under it next year
       whatever happens: with an empty feed that is closed, not quiet. */
    let topClosed = 0;
    let quiet = 0;
    for (let from = 2000; from < 2027; from++) {
      const top = hostMarket(host, lg, firedFrom(TOP, WRECK, from), nameOf)!;
      if (top.offers.length === 0) { topClosed += 1; expect(top.state).toBe('closed'); }
      const mid = hostMarket(host, lg, firedFrom(BOTTOM, ['badly', 'missed', 'missed'], from), nameOf)!;
      if (mid.offers.length === 0) {
        quiet += 1;
        expect(mid.state).toBe('quiet');
        expect(mid.nextYear).toBe('open');
        expect(mid.line).toContain('Nobody called this year');
        /* Open is read at his old club's tier today, and a year out can move it: the words never promise more. */
        expect(mid.line).toContain('As things stand next year is still open');
        expect(hostMarketTile(mid)).toMatchObject({ value: 'Nobody called', sub: 'Next year open, as things stand' });
      }
      /* Two seasons nowhere near the ask at the bottom: under the floor today, and a climb reopens next year. */
      const climb = hostMarket(host, lg, firedFrom(BOTTOM, ['badly', 'badly'], from), nameOf)!;
      expect(climb).toMatchObject({ state: 'quiet', nextYear: 'climb', climbTo: 1, offers: [] });
      expect(climb.line).toContain('climbed into the top tier of the league');
    }
    expect(topClosed).toBeGreaterThan(5);
    expect(quiet).toBeGreaterThan(5);
  });
  it('with offers on the table says what passing costs, and takes the year out away when they are the last calls', () => {
    let last = 0;
    let hangs = 0;
    for (let from = 1990; from < 2027; from++) {
      /* A top tier club's wreck: over the floor today, under it next year whatever
         happens. Read off many keys, some feeds hold the one offer. */
      const seat = firedFrom(TOP, WRECK, from);
      const m = hostMarket(host, lg, seat, nameOf)!;
      expect(m.nextYear).toBe('shut');
      expect(hostCanSitOut(m)).toBe(false);
      if (m.state === 'offers') {
        last += 1;
        expect(m.line).toMatch(/called\. (It is the last call|They are the last calls) you will get: pass, and the phone stops for good\.$/);
        /* The host refuses the year whatever a screen allows, before the league is touched. */
        const copy = league();
        const snap = JSON.stringify(copy);
        const log: string[] = [];
        const l = legacy({ team: TOP, tier: 1, seasonsPlayed: 3, fired: true });
        expect(hostSeasonAway({ host, away: awayHost(log), league: copy, desk: deskWith(seat), legacy: l, rng: keyedRng('x') })).toEqual({ ok: false, reason: 'last-call' });
        expect(log).toEqual([]);
        expect(JSON.stringify(copy)).toBe(snap);
      }
      /* A bottom club, two seasons nowhere near the ask and one short of it: over
         the floor today, and next year hangs on the old club reaching the third tier. */
      const hang = hostMarket(host, lg, firedFrom(BOTTOM, ['badly', 'badly', 'missed'], from), nameOf)!;
      expect(hang).toMatchObject({ nextYear: 'climb', climbTo: 3 });
      /* Tiers are quarters: a bottom quarter club is told to reach the third tier, never a half it is already in. */
      expect(hang.line).toContain(`the ${nameOf(BOTTOM)} have climbed into the third tier of the league by then.`);
      expect(hostCanSitOut(hang)).toBe(true);
      expect(hostSitArmLine(hang, true)).toContain('only if your old club has climbed the league by then');
      if (hang.state === 'offers') {
        hangs += 1;
        expect(hang.line).toContain(`called. Pass, and next year the phone rings only if the ${nameOf(BOTTOM)} have climbed into the`);
        expect(hostSitArmLine(hang, true)).toContain(`You turn down ${hang.offers.length} offer`);
      } else {
        expect(hostSitArmLine(hang, true)).not.toContain('turn down');
      }
    }
    expect(last).toBeGreaterThan(5);
    expect(hangs).toBeGreaterThan(5);
    expect(hostCanSitOut(null)).toBe(false);
    /* An open next year says no more than "as things stand", and the desk line rides on every one. */
    const open = hostMarket(host, lg, firedFrom(BOTTOM, WINNER), nameOf)!;
    expect(open).toMatchObject({ state: 'offers', nextYear: 'open' });
    expect(open.line).toMatch(/called\.$/);
    expect(hostSitArmLine(open, true)).toContain('As things stand the phone can still ring next year.');
    expect(hostSitArmLine(open, false)).toContain('opens your GM desk');
    expect(hostSitArmLine(open, true)).not.toContain('opens your GM desk');
  });
  it('counts the seasons known only as a count in the line (B6)', () => {
    const l = legacy({ seasonsPlayed: 9, titles: 2, fired: true });
    const seat = hostLegacySeat(l);
    const m = hostMarket(host, lg, seat, nameOf)!;
    expect(m.line).toContain('out after 9 seasons and 2 titles');
    expect(DASHES.test(m.line)).toBe(false);
    const card = hostOutOfWorkCard(host, lg, seat, m, nameOf);
    expect(card.title).toBe(`Let go by the ${nameOf(BOTTOM)}`);
    const later = hostOutOfWorkCard(host, lg, { ...seat, career: { ...seat.career, seasonsOut: 2 } }, m, nameOf);
    expect(later.title).toBe('Out of work, 2 seasons');
    expect(later.lines).toContain(`The ${nameOf(TOP)} won the Stanley Cup in 2030.`);
    expect(later.lines).toContain(`The ${nameOf(BOTTOM)} went 19-61 without you, 32nd in the league.`);
  });
});

/* ---------------- taking a seat, sitting out ---------------- */

interface TSave extends SeatSave { titles: number; seasonsPlayed: number }
const RULES: HostBlockRule<TLeague>[] = [
  ...HOST_BLOCK_RULES,
  { key: 'staff', owner: 'club', fresh: (_l, team) => ({ club: team }) },
  { key: 'books', owner: 'club' },
  { key: 'picks', owner: 'league' },
];

describe('taking a seat', () => {
  const lg = league();
  const seat = firedFrom(BOTTOM, WINNER);
  const xp = xpWith('media', 3);
  let desk = deskWith(seat, xp);
  desk = withGmBlock(desk, 'staff', { club: BOTTOM });
  desk = withGmBlock(desk, 'books', { cash: 5 });
  desk = withGmBlock(desk, 'picks', { ledger: [1, 2, 3] });
  desk = withGmBlock(desk, 'unknown', { kept: true });
  const save: TSave = { myTeam: BOTTOM, trust: 0, fired: true, mandate: mandateFor('rebuild'), pressTilt: 1, seasonTradeLine: 'a deal', titles: 3, seasonsPlayed: 5 };
  const l = legacy({ seasonsPlayed: 5, titles: 3, fired: true });
  const market = hostMarket(host, lg, seat, nameOf)!;
  const pick = market.offers[0];
  const args = { host, league: lg, desk, save, legacy: l, nameOf, blocks: RULES };

  it('moves his club, his trust, the ask and the club owned blocks, and nothing else', () => {
    const snap = JSON.stringify(lg);
    const out = hostTakeSeat({ ...args, teamId: pick.teamId })!;
    expect(JSON.stringify(lg)).toBe(snap);
    expect(out.save).toMatchObject({ myTeam: pick.teamId, trust: FO_TRUST_START, fired: false, pressTilt: 0, seasonTradeLine: null, titles: 3, seasonsPlayed: 5 });
    expect(out.save.mandate).toEqual(pick.ask);
    expect(out.offer).toEqual(pick);
    expect(out.desk.blocks.staff).toEqual({ club: pick.teamId });
    expect('books' in out.desk.blocks).toBe(false);
    expect(out.desk.blocks.picks).toBe(desk.blocks.picks);
    expect(out.desk.blocks.unknown).toBe(desk.blocks.unknown);
    expect(out.desk.blocks.xp).toBe(xp);
    const now = hostSeatOf(out.desk, legacy({ team: pick.teamId, seasonsPlayed: 5, titles: 3 }));
    expect(now.career.stints).toHaveLength(2);
    expect(now.career.stints[0]).toEqual(seat.career.stints[0]);
    expect(currentStint(now.career)).toEqual({ team: pick.teamId, tier: pick.tier, from: lg.season + 1, grades: [] });
    expect(hostArriving(now, lg.season)).toBe(true);
    expect(hostArriving(now, lg.season + 1)).toBe(false);
    expect(hostMarket(host, lg, now, nameOf)).toBeNull();
    expect(hostCareerTile(now, nameOf)).toMatchObject({ value: 'Season 1', sub: `With the ${nameOf(pick.teamId)}` });
    expect(hostCareerTile(seat, nameOf)).toMatchObject({ value: 'Out of work', sub: '1 club, 5 titles' });
    /* The desk and the save handed in are not changed. */
    expect(desk.blocks.staff).toEqual({ club: BOTTOM });
    expect(save.myTeam).toBe(BOTTOM);
  });
  it('refuses a club that is not in the feed, the club that let him go, and a man who holds a seat', () => {
    const absent = lg.clubs.find(c => c.id !== BOTTOM && !market.offers.some(o => o.teamId === c.id))!;
    expect(hostTakeSeat({ ...args, teamId: absent.id })).toBeNull();
    expect(hostTakeSeat({ ...args, teamId: BOTTOM })).toBeNull();
    expect(hostTakeSeat({ ...args, teamId: 'NOPE' })).toBeNull();
    const held = deskWith(block(BOTTOM, ['met'], false));
    expect(hostTakeSeat({ ...args, desk: held, legacy: legacy({ seasonsPlayed: 1 }), teamId: pick.teamId })).toBeNull();
  });
  it('lists every club block once and keeps the first rule for a key', () => {
    const twice = hostMoveBlocks(desk, [{ key: 'staff', owner: 'league' }, ...RULES], lg, TOP);
    expect(twice.blocks.staff).toBe(desk.blocks.staff);
  });
});

/* ---------------- a year out ---------------- */

/** A write side adapter over the small league that also logs the order of its calls. */
const awayHost = (log: string[], breakIt: 'none' | 'noseason' | 'nochampion' = 'none'): GmAwayHost<TLeague> => ({
  awayDraft: (_l, _r, d) => { log.push('draft'); return withGmBlock(d, 'picks', { rolled: 'draft' }); },
  awaySummer: (l, _r, d) => {
    log.push('summer');
    if (breakIt !== 'noseason') l.season += 1;
    for (const c of l.clubs) { c.wins = 0; c.losses = 0; }
    /* A step that tries to touch his XP must not get to. */
    return withGmBlock(withGmBlock(d, 'picks', { rolled: 'summer' }), GM_HOST_KEYS.xp, defaultGmXp());
  },
  periods: () => 4,
  playRound: (l, rng) => { log.push('round'); l.clubs.forEach((c, i) => { if (rng() < 0.5 + (15 - i) / 100) c.wins += 1; else c.losses += 1; }); },
  playoffs: l => {
    log.push('playoffs');
    const champ = [...l.clubs].sort((a, b) => b.wins - a.wins || a.id.localeCompare(b.id))[0].id;
    if (breakIt !== 'nochampion') l.champions[l.season] = champ;
    return champ;
  },
});

describe('a year out', () => {
  const quietSeat = firedFrom(BOTTOM, ['badly', 'missed', 'missed']);
  const l = legacy({ seasonsPlayed: 3, fired: true });
  const xp = xpWith('trading', 2);
  const start = () => ({ lg: league(), desk: withGmBlock(deskWith(quietSeat, xp), 'picks', { rolled: 'never' }) });

  it('plays the draft, the summer, every period and the postseason in that order, then writes the year', () => {
    const { lg, desk } = start();
    const log: string[] = [];
    const out = hostSeasonAway({ host, away: awayHost(log), league: lg, desk, legacy: l, rng: keyedRng('away') });
    expect(log).toEqual(['draft', 'summer', 'round', 'round', 'round', 'round', 'playoffs']);
    if (out.ok === false) throw new Error(out.reason);
    expect(lg.season).toBe(2031);
    expect(out.report.season).toBe(2031);
    expect(out.report.champion).toBe(lg.champions[2031]);
    expect(out.report.oldClub).toMatchObject({ id: BOTTOM });
    const seat = hostSeatOf(out.desk, l);
    expect(seat.career.seasonsOut).toBe(1);
    /* A year out is not a season on his record, and the stint is as it was. */
    expect(careerTotals(seat.career).seasons).toBe(3);
    expect(seat.career.stints).toEqual(quietSeat.career.stints);
    /* A league owned block rolled with the summer, and his XP is the block he walked in with. */
    expect(out.desk.blocks.picks).toEqual({ rolled: 'summer' });
    expect(out.desk.blocks.xp).toBe(xp);
    expect(desk.blocks.picks).toEqual({ rolled: 'never' });
    /* The same state a firing leaves: a decided season, so the market reads again, off a new key. */
    expect(hostMarket(host, lg, seat, nameOf)).not.toBeNull();
    expect(hostFeedKey('nhl', seat, 2031)).not.toBe(hostFeedKey('nhl', quietSeat, 2030));
  });
  it('is refused, league untouched, in a seat, on an open season and on a closed market', () => {
    const cases: [GmDesk, HostLegacy, (lg: TLeague) => void, string][] = [
      [deskWith(block(BOTTOM, ['met'], false)), legacy({ seasonsPlayed: 1 }), () => {}, 'in-seat'],
      [deskWith(quietSeat), l, lg => { lg.champions = {}; }, 'season-open'],
      [deskWith(firedFrom(BOTTOM, WRECK)), l, () => {}, 'market-closed'],
    ];
    for (const [desk, leg, prep, reason] of cases) {
      const lg = league();
      prep(lg);
      const snap = JSON.stringify(lg);
      const log: string[] = [];
      expect(hostSeasonAway({ host, away: awayHost(log), league: lg, desk, legacy: leg, rng: keyedRng('x') })).toEqual({ ok: false, reason });
      expect(log).toEqual([]);
      expect(JSON.stringify(lg)).toBe(snap);
    }
  });
  it('says so when the sport does not leave the league one decided season on', () => {
    for (const broken of ['noseason', 'nochampion'] as const) {
      const { lg, desk } = start();
      expect(hostSeasonAway({ host, away: awayHost([], broken), league: lg, desk, legacy: l, rng: keyedRng('x') })).toEqual({ ok: false, reason: 'broken-adapter' });
    }
  });
  it('sitting out is written only between seats', () => {
    const held = deskWith(block(BOTTOM, ['met'], false));
    expect(hostSitOut(held, block(BOTTOM, ['met'], false))).toBe(held);
    const out = hostSitOut(freshGmDesk(), quietSeat);
    expect(hostSeatOf(out, l).career.seasonsOut).toBe(1);
  });
});

/* ---------------- the routes every sport shares ---------------- */

describe('the press, the cut and the ask', () => {
  it('eases a gamble and nothing else, and hands the same object back with no point', () => {
    const presser = buildGmPresser(GM_SEAT_PACKS.nhl.words, { justHired: true, teamLabel: 'x', fired: false, wonTitle: false, gradeResult: null, tradeLine: null, seasonsPlayed: 0 })!;
    const none = hostXpEffects(null, 'nhl');
    for (const opt of presser.options) expect(hostPressOption(opt, none)).toBe(opt);
    for (let p = 1; p <= 5; p++) {
      const fx = hostXpEffects(deskWith(null, xpWith('media', p)), 'nhl');
      for (const opt of presser.options) {
        const eased = hostPressOption(opt, fx);
        if (!opt.effect.gamble) { expect(eased).toBe(opt); continue; }
        expect(eased.effect.gamble!.odds).toBe(pressOdds(opt.effect.gamble.odds, p));
        expect({ ...eased.effect, gamble: { ...eased.effect.gamble, odds: 0 } }).toEqual({ ...opt.effect, gamble: { ...opt.effect.gamble, odds: 0 } });
        expect(eased.label).toBe(opt.label);
      }
    }
  });
  it('charges exactly the cut it quoted, on the last entry for the man', () => {
    const man = { id: 'p9', name: 'A Man', salary: 9.6, years: 4 };
    const none = hostXpEffects(null, 'nhl');
    expect(hostCutQuote(man, none, 'TOR', 2030)).toEqual(deadMoneyFor(man));
    for (let p = 1; p <= 5; p++) {
      const fx = hostXpEffects(deskWith(null, xpWith('capCraft', p)), 'nhl');
      const quote = hostCutQuote(man, fx, 'TOR', 2030);
      /* The club already holds a retained salary row under his id; the cut engine appended its own. */
      const club = { deadCap: [
        { playerId: 'p9', name: 'A Man', amount: 1.1, seasonsLeft: 2 },
        { playerId: 'zz', name: 'Other', amount: 2, seasonsLeft: 1 },
        { playerId: 'p9', name: 'A Man', amount: deadMoneyFor(man).now, seasonsLeft: 2 },
      ] };
      expect(hostCraftCut(club, 'p9', fx, 'TOR', 2030)).toBe(quote.now);
      expect(club.deadCap.map(d => d.amount)).toEqual([1.1, 2, quote.now]);
      expect(quote.now).toBeLessThanOrEqual(deadMoneyFor(man).now);
      expect(quote.next).toBe(Math.round((quote.now / 2) * 10) / 10);
      expect(hostCraftCut(club, 'nobody', fx, 'TOR', 2030)).toBeNull();
    }
    /* One year left, or a guaranteed deal: nothing carries to next season. */
    const fx = hostXpEffects(deskWith(null, xpWith('capCraft', 5)), 'nhl');
    expect(hostCutQuote({ ...man, years: 1 }, fx, 'TOR', 2030).next).toBe(0);
    expect(hostCutQuote({ ...man, guaranteed: true }, fx, 'TOR', 2030).next).toBe(0);
  });
  it('eases the ask of a man he can negotiate with and of nobody else', () => {
    const men = Array.from({ length: 12 }, (_, i) => ({ id: `m${i}`, name: `Man ${i}`, pos: 'X', age: 24 + i, ovr: 70 + i, years: i % 3 === 0 ? 2 : 1, salary: 1 + i }));
    const lg: GmContractLeague = {
      season: 2030, cap: 200, freeAgents: [],
      teams: { AAA: { players: men.map(m => ({ ...m })), picks: [] }, BBB: { players: [], picks: [] } },
    };
    const contracts: GmContractHost = { sport: 'mlb', marketSalary: (_l, m) => m.ovr / 10, nextCap: l => l.cap, runOffseason: () => null, minSalary: () => 0.8 };
    const ledger = openLedger(lg, 'AAA');
    /* One man this GM drafted last summer: under club control, so there is no talk to ease. */
    noteArrival(ledger, 'm1', 2030, 'draft', 1);
    const raw = deskCases(contracts, lg, ledger);
    expect(raw.some(c => c.canNegotiate)).toBe(true);
    expect(raw.some(c => !c.canNegotiate)).toBe(true);
    expect(hostDeskCases(contracts, lg, ledger, hostXpEffects(null, 'mlb'))).toEqual(raw);
    let moved = 0;
    for (let p = 1; p <= 5; p++) {
      const eased = hostDeskCases(contracts, lg, ledger, hostXpEffects(deskWith(null, xpWith('negotiation', p)), 'mlb'));
      expect(eased.map(c => c.man.id)).toEqual(raw.map(c => c.man.id));
      eased.forEach((c, i) => {
        if (!raw[i].canNegotiate) { expect(c).toEqual(raw[i]); return; }
        const roll = keyedRng(hostXpRollKey('mlb', 'negotiation', hostKey('AAA', 2030, c.man.id)))();
        expect(c.ask.salary).toBe(contractAsk(raw[i].ask.salary, p, roll, 0.8));
        expect(c.ask.salary).toBeGreaterThanOrEqual(0.8);
        expect({ ...c, ask: { ...c.ask, salary: 0 } }).toEqual({ ...raw[i], ask: { ...raw[i].ask, salary: 0 } });
        if (c.ask.salary < raw[i].ask.salary) moved += 1;
      });
    }
    expect(moved).toBeGreaterThan(0);
  });
});

/* ---------------- words ---------------- */

describe('the words on the boxes', () => {
  const clean = (s: string) => {
    expect(s.trim().length).toBeGreaterThan(0);
    expect(DASHES.test(s)).toBe(false);
    expect(/[{}]|undefined|NaN/.test(s)).toBe(false);
  };
  it('are never empty and carry no dash or raw placeholder', () => {
    const lg = league();
    const seats = [firedFrom(BOTTOM, WINNER), firedFrom(BOTTOM, WRECK), firedFrom(BOTTOM, ['badly', 'badly']), firedFrom(TOP, ['met'], 2026, 2)];
    for (const pack of [GM_SEAT_PACKS.nfl, GM_SEAT_PACKS.nba, GM_SEAT_PACKS.mlb, GM_SEAT_PACKS.nhl]) {
      [...hostMarketHelp(pack), ...hostCareerHelp(pack), ...hostXpHelp(hostEarnsLine(['wins', 'titles', 'playoffs', 'mandate']))].forEach(clean);
      for (const seat of seats) {
        const m = hostMarket({ ...host, pack }, lg, seat, nameOf)!;
        clean(m.line);
        const tile = hostMarketTile(m)!;
        clean(tile.value); clean(tile.sub);
        const card = hostOutOfWorkCard({ ...host, pack }, lg, seat, m, nameOf);
        clean(card.title); card.lines.forEach(clean);
        const career = hostCareerTile(seat, nameOf);
        clean(career.value); clean(career.sub);
      }
    }
    for (const deskOn of [false, true]) { const t = hostXpTile(null, GM_TREES, deskOn); clean(t.value); clean(t.sub); }
  });
  it('fit the hub box: a value and a sub each stay on their one line, with a real club name on the Career box', () => {
    const fits = (t: { value: string; sub: string }) => {
      expect(t.value.length, t.value).toBeLessThanOrEqual(HOST_TILE_VALUE_MAX);
      expect(t.sub.length, t.sub).toBeLessThanOrEqual(HOST_TILE_SUB_MAX);
    };
    const lg = league();
    /* Every market state, with and without a call, a year out or four. */
    const states = new Set<string>();
    for (const team of [TOP, BOTTOM]) for (const grades of [WINNER, WRECK, ['badly', 'badly'], ['badly', 'badly', 'missed'], ['badly', 'missed', 'missed']] as FoGradeResult[][]) {
      for (let from = 1990; from < 2027; from++) for (const out of [0, 4]) {
        const m = hostMarket(host, lg, firedFrom(team, grades, from, out), nameOf)!;
        states.add(`${m.state} ${m.nextYear}`);
        fits(hostMarketTile(m)!);
      }
    }
    expect([...states].sort()).toEqual(['closed shut', 'offers climb', 'offers open', 'offers shut', 'quiet climb', 'quiet open']);
    /* The Career box: the season on the value, the club under it, whatever the name and however long he has stayed. */
    const long = (id: string) => (id === TOP ? 'Minnesota Timberwolves' : id === BOTTOM ? 'Upper Northern Territory Rovers' : `Club ${id}`);
    const at = (team: string, seasons: number): GmSeatBlock => block(team, Array.from({ length: seasons }, () => 'met' as FoGradeResult), false);
    for (const seasons of [0, 9, 40]) { fits(hostCareerTile(at(TOP, seasons), long)); fits(hostCareerTile(at(BOTTOM, seasons), long)); }
    expect(hostCareerTile(at(TOP, 9), long)).toMatchObject({ value: 'Season 10', sub: 'With the Minnesota Timberwolves' });
    /* A name too long to follow "With the" goes in alone. */
    expect(hostCareerTile(at(BOTTOM, 0), long)).toMatchObject({ value: 'Season 1', sub: 'Upper Northern Territory Rovers' });
    expect(hostCareerTile(firedFrom(TOP, WINNER), long)).toMatchObject({ value: 'Out of work' });
    fits(hostCareerTile({ ...firedFrom(TOP, WINNER), career: { ...firedFrom(TOP, WINNER).career, seasonsOut: 3 } }, long));
    /* The GM level box in every state its sub can read. */
    const full = { ...defaultGmXp(), xp: 1e9, points: Object.fromEntries(GM_TREES.map(t => [t, 5])) as GmXp['points'] };
    for (const [desk, live, on] of [
      [null, GM_TREES, false], [null, GM_TREES, true], [deskWith(null, { ...defaultGmXp(), xp: 1e9 }), GM_TREES, true],
      [deskWith(null, { ...defaultGmXp(), xp: 1e9 }), [], true], [deskWith(null, full), GM_TREES, true],
    ] as [GmDesk | null, readonly GmTree[], boolean][]) fits(hostXpTile(desk, live, on));
  });
  it('say only what a desk pays for', () => {
    expect(hostEarnsLine(['wins', 'titles', 'playoffs', 'mandate']))
      .toBe('You earn XP every season for your win share, titles, playoff rounds won and meeting or beating the ask from upstairs. Points are yours for good: nothing here can be taken back.');
    expect(hostEarnsLine(['wins'])).toContain('for your win share.');
    expect(hostEarnsLine([])).toBe('This desk does not pay XP yet.');
  });
  it('compute the worked examples from the lib they describe', () => {
    const help = hostXpHelp('x').join(' ');
    expect(help).toContain('pays 170 XP');
    expect(help).toContain('pays 110 XP, so at that pace the first point is about 4 seasons away');
    expect(help).toContain('costs 14, not 16, so you keep the job on trust 2');
    expect(hostMarketHelp(GM_SEAT_PACKS.nhl).join(' ')).toContain('no top tier franchise calls');
  });
});
