/* Round 1334: the soccer deck's binding, over a two card fixture pack that
   lives here (the shipped pack is empty until its cards are written), and the
   gate's loader (src/lib/soccerDeckGate.ts) with the two loads that must fail
   closed: one that resolves with nothing in it (what freshBuild.ts's cancelled
   preload error hands a dynamic import) and one that rejects. */
import { beforeEach, describe, expect, it } from 'vitest';
import * as E from '@/lib/soccerCareerEngine';
import type { CareerState, RandomEvent, SeasonRecord } from '@/lib/soccerCareerEngine';
import {
  SOCCER_FX, deckToRandomEvents, dealFromPack, pendingFromPack, soccerDeckFacts, soccerDeckProblems,
  type SoccerDeckPack,
} from '@/lib/soccerDeck';
import {
  isSoccerDeckId, loadSoccerDeck, setSoccerDeckLoader, soccerDeckPending, soccerDeckReady, soccerDeckSlot,
} from '@/lib/soccerDeckGate';
import { SOCCER_DECK_PACKS } from '@/data/soccerDeck';
import { SOCCER_FX_WORDS, SOCCER_TRAINING_KEYS } from '@/data/soccerDeck/words';
import { attrTreeFor } from '@/lib/soccerCareerAttributes';
import { momentsRoom } from '@/lib/season/soccerMoments';
import { isSoccerCareerSave } from '@/lib/soccerCareerSave';
import type { GmEventDef } from '@/lib/gmInbox';

const copy = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

/* Two cards: a forward's training card and a situation card about a call up. */
const FORWARD: GmEventDef = {
  id: '716', beat: 'summer', from: 'The coaching staff', emoji: '⚽', cooldown: 4,
  when: [{ fact: 'pos', op: '>=', value: 3 }],
  text: 'The coaching staff are drawing up the penalty order for next season.',
  choices: [
    { label: 'Put your name down', reply: 'You put your name down for penalties.', karma: 0, fx: { t_shooting: 1 } },
    { label: 'Let someone else take them', reply: 'You leave the penalties to someone else.', karma: 0 },
  ],
};
const CALLUP: GmEventDef = {
  id: '724', beat: 'summer', from: 'The medical staff', emoji: '🌍', cooldown: 2,
  when: [{ fact: 'capped', op: '==', value: true }],
  text: 'You played for your country last season, so the medical staff want you to take the whole break.',
  choices: [
    { label: 'Take the whole break', reply: 'You switch off for the whole break.', karma: 0, morale: 2 },
    { label: 'Come back early anyway', reply: 'You come back a week early and get to work.', karma: 0, morale: -1, fx: { integrity: 1 } },
    { label: 'Come back on the usual day', reply: 'You come back with everyone else.', karma: 0 },
  ],
};
const FIXTURE: SoccerDeckPack = {
  ...SOCCER_DECK_PACKS.soccer,
  events: [FORWARD, CALLUP],
  titles: { 716: 'Penalty duty', 724: 'Back from international duty' },
  kinds: { 716: 'positive', 724: 'international' },
};

function career(patch: Partial<CareerState> = {}, row: Partial<SeasonRecord> = {}): CareerState {
  const stats = { pace: 70, shooting: 70, passing: 70, dribbling: 70, defending: 70, physical: 70, reflexes: 70 };
  const initial = E.initCareer('Deck Fixture', 'England', 'ST', '2020s', stats, 70, 2020, E.FALLBACK_CLUBS, null, 90);
  const last: SeasonRecord = { ...initial.seasons[0], year: 2024, age: 24, club: 'Fixture Albion', clubCountry: 'England', clubTier: 2,
    type: 'playing', apps: 30, goals: 8, assists: 3, cleanSheets: 0, yellowCards: 2, rating: 7, intApps: 0, injury: null, injuryWeeks: 0, ...row };
  return { ...initial, age: 24, phase: 'season_summary', retired: false, currentClub: 'Fixture Albion', currentClubTier: 2,
    seasons: [last], morale: 60, integrityBonus: 0, statBoostNextSeason: {}, overall: 70, potential: 85, potentialEarned: 0,
    contractYearsLeft: 3, isClubCaptain: false, captainClub: null, eventLastFired: {}, lastEventId: null, pendingEvents: [], ...patch };
}
const season = (s: CareerState) => E.eventSeasonIndex(s);
const deal = (s: CareerState, key = 'k', taken: RandomEvent[] = [], pack = FIXTURE) => dealFromPack(pack, s, season(s), key, taken);

describe('the words', () => {
  it('prints every training key as the attribute screen names its stat, for that position group', () => {
    for (const [k, { stat, keeper }] of Object.entries(SOCCER_TRAINING_KEYS)) {
      const fam = attrTreeFor(keeper ? 'GK' : 'ST').find(f => f.key === stat);
      expect(fam, k).toBeDefined();
      expect(SOCCER_FX_WORDS[k].label, k).toBe(`${fam!.label} next season`);
    }
    expect(Object.keys(SOCCER_TRAINING_KEYS)).toHaveLength(13);
    expect(Object.keys(SOCCER_FX_WORDS).sort()).toEqual(['integrity', ...Object.keys(SOCCER_TRAINING_KEYS)].sort());
    expect(SOCCER_FX_WORDS.integrity.label).toBe('Integrity');
    /* a keeper family for each of his seven stats, and the outfield's six */
    expect(Object.values(SOCCER_TRAINING_KEYS).filter(t => t.keeper).map(t => t.stat).sort()).toEqual(attrTreeFor('GK').map(f => f.key).sort());
    expect(Object.values(SOCCER_TRAINING_KEYS).filter(t => !t.keeper).map(t => t.stat).sort()).toEqual(attrTreeFor('ST').map(f => f.key).sort());
  });
});

describe('soccerDeckFacts', () => {
  it('reads each of the ten codes as the drills group them', () => {
    const want: Record<string, number> = { GK: 0, CB: 1, LB: 1, RB: 1, CDM: 1, CM: 2, CAM: 2, LW: 3, RW: 3, ST: 3 };
    for (const [code, g] of Object.entries(want)) expect(soccerDeckFacts(career({ position: code }))?.pos, code).toBe(g);
  });
  it('reads only the save: caps, the armband at his club, one year left, the room, the senior rows, the same club', () => {
    expect(soccerDeckFacts(career())?.capped).toBe(false);
    expect(soccerDeckFacts(career({}, { intApps: 2 }))?.capped).toBe(true);
    expect(soccerDeckFacts(career({ isClubCaptain: true, captainClub: 'Fixture Albion' }))?.captain).toBe(true);
    expect(soccerDeckFacts(career({ isClubCaptain: true, captainClub: 'Somewhere Else' }))?.captain).toBe(false);
    expect(soccerDeckFacts(career({ contractYearsLeft: 1 }))?.contractYear).toBe(true);
    expect(soccerDeckFacts(career({ contractYearsLeft: 0 }))?.contractYear).toBe(false);
    expect(soccerDeckFacts(career({ contractYearsLeft: 2 }))?.contractYear).toBe(false);
    const s = career({ statBoostNextSeason: { pace: 2 } });
    expect(soccerDeckFacts(s)?.room).toBe(momentsRoom(s));
    expect(soccerDeckFacts(s)?.room).toBe(13);
    /* a 19 year old in his third senior season is not in his first */
    const r = career().seasons[0];
    const teen = career({ age: 19, seasons: [{ ...r, year: 2022, age: 17 }, { ...r, year: 2023, age: 18 }, { ...r, year: 2024, age: 19 }] });
    expect(soccerDeckFacts(teen)?.seniorSeasons).toBe(3);
    expect(soccerDeckFacts(career({ age: 19, seasons: [{ ...r, type: 'youth', year: 2023 }, { ...r, year: 2024 }] }))?.seniorSeasons).toBe(1);
    /* a loanee back at his parent club: last season was not at his present club */
    expect(soccerDeckFacts(career({ currentClub: 'Fixture Parent' }, { club: 'Fixture Loan Town' }))?.sameClub).toBe(false);
    expect(soccerDeckFacts(career())?.sameClub).toBe(true);
    expect(soccerDeckFacts(career({}, { injuryWeeks: undefined }))?.injuryWeeks).toBe(0);
  });
  it('counts only the derby meetings he played last season', () => {
    const meetings = [{ home: true, gf: 1, ga: 0, played: true, goals: 0 }, { home: false, gf: 0, ga: 0, played: false, goals: 0 }];
    const derbies = [{ rival: 'Fixture Rovers', name: 'The Fixture Derby', kind: 'derby', meetings }];
    expect(soccerDeckFacts(career({}, { derbies } as Partial<SeasonRecord>))?.derbies).toBe(1);
    expect(soccerDeckFacts(career())?.derbies).toBe(0);
  });
  it('is null unless a live career at a club has just played a season', () => {
    expect(soccerDeckFacts(career({}, { type: 'youth' }))).toBeNull();
    expect(soccerDeckFacts(career({ currentClub: '' }))).toBeNull();
    expect(soccerDeckFacts(career({ currentClub: '   ' }))).toBeNull();
    expect(soccerDeckFacts(career({ retired: true }))).toBeNull();
    expect(soccerDeckFacts(career({ age: 16 }))).toBeNull();
  });
});

describe('soccerDeckProblems', () => {
  it('passes the shipped pack and the fixture', () => {
    expect(soccerDeckProblems(SOCCER_DECK_PACKS.soccer)).toEqual([]);
    expect(soccerDeckProblems(FIXTURE)).toEqual([]);
  });
  it('refuses each soccer rule with its own message', () => {
    const card = (patch: Partial<GmEventDef>, which = 0): SoccerDeckPack => ({ ...FIXTURE, events: FIXTURE.events.map((e, i) => (i === which ? { ...e, ...patch } : e)) });
    const opt = (patch: object, which = 0, o = 0): SoccerDeckPack => card({ choices: FIXTURE.events[which].choices.map((c, i) => (i === o ? { ...c, ...patch } : c)) }, which);
    const keeperCard: GmEventDef = { ...FORWARD, id: '701', when: [{ fact: 'pos', op: '<', value: 1 }], choices: [{ ...FORWARD.choices[0], fx: { t_shooting: 1 } }, FORWARD.choices[1]] };
    const breakages: Record<string, SoccerDeckPack> = {
      cash: opt({ cash: 1 }), popularity: opt({ popularity: 1 }), karma: opt({ karma: 1 }), desk: opt({ recruit: 1 }),
      keeperWordOutfield: opt({ fx: { gk_reflexes: 1 } }),
      outfieldWordKeeper: { ...FIXTURE, events: [keeperCard, CALLUP], titles: { ...FIXTURE.titles, 701: 'x' }, kinds: { ...FIXTURE.kinds, 701: 'positive' } },
      trainingOnSituation: opt({ fx: { t_pace: 1 } }, 1, 0),
      trainingNotWhole: opt({ fx: { t_shooting: 0.5 } }),
      id650: { ...FIXTURE, events: [{ ...FORWARD, id: '650' }, CALLUP], titles: { ...FIXTURE.titles, 650: 'x' }, kinds: { ...FIXTURE.kinds, 650: 'positive' } },
      duplicate: { ...FIXTURE, events: [FORWARD, FORWARD, CALLUP] },
      noTitle: { ...FIXTURE, titles: { 724: FIXTURE.titles[724] } },
      noKind: { ...FIXTURE, kinds: { 724: 'international' } },
      noNeutral: card({ choices: [FORWARD.choices[0]] }),
      texts: card({ texts: ['Another wording.'] }), tag: card({ tag: 'conduct', subject: 'x' }), oneShot: card({ oneShot: true }),
      story: card({ story: 'penalties' }), cardChance: card({ chance: 0.3 }), expires: card({ expires: 2 }),
      undeclared: card({ when: [{ fact: 'mood', op: '>', value: 1 }] }), beat: card({ beat: 'winter' }),
      unregistered: opt({ fx: { t_heading: 1 } }),
      packChance: { ...FIXTURE, chance: 0.5 }, perWeek: { ...FIXTURE, perWeek: 2 }, clock: { ...FIXTURE, clock: 'week' },
      store: { ...FIXTURE, store: 'whole' }, seat: { ...FIXTURE, seat: 'nfl' },
      slots: { ...FIXTURE, slots: { player: { fact: 'pos' } } }, targets: { ...FIXTURE, targets: { coach: 'your coach' } },
    };
    const clean = new Set(soccerDeckProblems(FIXTURE));
    const firsts = new Set<string>();
    for (const [name, pack] of Object.entries(breakages)) {
      const fresh = soccerDeckProblems(pack).filter(p => !clean.has(p));
      expect(fresh.length, name).toBeGreaterThan(0);
      firsts.add(fresh.join(' | '));
    }
    expect(firsts.size).toBe(Object.keys(breakages).length);
  });
});

describe('deckToRandomEvents', () => {
  it('gives the save validator a number id, words, and each option its effect words', () => {
    const [fwd, call] = deckToRandomEvents(FIXTURE, FIXTURE.events);
    expect(fwd).toMatchObject({ id: 716, emoji: '⚽', title: 'Penalty duty', category: 'positive', cooldown: 4 });
    expect(fwd.choices.map(c => c.consequence)).toEqual(['Shooting next season +1', 'Nothing changes']);
    expect(fwd.choices.map(c => [c.emoji, c.color])).toEqual([['📋', 'bg-blue-600'], ['✋', 'bg-gray-800']]);
    expect(call.choices.map(c => c.consequence)).toEqual(['Morale +2', 'Morale -1, Integrity +1', 'Nothing changes']);
    expect(call.choices[1].color).toBe('bg-emerald-600');
    expect(fwd.story).toBeUndefined();
    const saved = copy({ ...career(), phase: 'random_events', pendingEvents: [fwd, call] });
    expect(isSoccerCareerSave(saved)).toBe(true);
  });
});

describe('the slot', () => {
  const st = () => career({}, { intApps: 3 });
  it('deals the same card from the same key, at most one, never from Math.random', () => {
    const base = st();
    let calls = 0;
    const real = Math.random;
    Math.random = () => { calls++; return real(); };
    try {
      const a = deal({ ...base }, 'Deck Fixture|2024|deckslot');
      const b = deal({ ...base }, 'Deck Fixture|2024|deckslot');
      expect(a).toHaveLength(1);
      expect(b.map(e => e.id)).toEqual(a.map(e => e.id));
      const seen = new Set<number>();
      for (let i = 0; i < 40; i++) for (const e of deal({ ...base }, `key${i}`)) seen.add(e.id);
      expect([...seen].sort()).toEqual([716, 724]);
    } finally { Math.random = real; }
    expect(calls).toBe(0);
  });
  it('holds a training card at room 0, and deals nothing when the facts are null', () => {
    const full = st();
    full.overall = 85;
    for (let i = 0; i < 20; i++) expect(deal(full, `key${i}`).map(e => e.id)).toEqual([724]);
    expect(deal(career({}, { type: 'youth' }))).toEqual([]);
  });
  it('never deals a card the old batch holds, the last card answered, or one cooling down', () => {
    const s = st();
    const taken = [{ id: 724, emoji: '', title: '', description: '', category: 'life', choices: [] } as RandomEvent];
    for (let i = 0; i < 20; i++) expect(deal(s, `key${i}`, taken).map(e => e.id)).toEqual([716]);
    for (let i = 0; i < 20; i++) expect(deal({ ...s, lastEventId: 724 }, `key${i}`).map(e => e.id)).toEqual([716]);
    const cooling = { ...s, eventLastFired: { 716: season(s) - 4 } };
    for (let i = 0; i < 20; i++) expect(deal(cooling, `key${i}`).map(e => e.id)).toEqual([724]);
    const back = { ...s, eventLastFired: { 716: season(s) - 5 } };
    expect(new Set(Array.from({ length: 20 }, (_, i) => deal(back, `key${i}`)[0].id)).has(716)).toBe(true);
  });
  it('deals nothing from a pack with a problem', () => {
    const broken: SoccerDeckPack = { ...FIXTURE, chance: 0.5 };
    for (let i = 0; i < 10; i++) expect(deal(st(), `key${i}`, [], broken)).toEqual([]);
  });
});

describe('the answer', () => {
  const [fwd, call] = deckToRandomEvents(FIXTURE, FIXTURE.events);
  const untouched = (a: CareerState, b: CareerState) => {
    for (const k of ['netWorth', 'totalEarnings', 'socialMediaFollowers', 'popularity', 'karma'] as const) expect(b[k], k).toEqual(a[k]);
  };
  it('moves exactly what the button prints and writes one line saying what landed', () => {
    const s = career({ statBoostNextSeason: { shooting: 1 } });
    const after = fwd.choices[0].apply({ ...s });
    expect(after.statBoostNextSeason).toEqual({ shooting: 2 });
    expect(s.statBoostNextSeason).toEqual({ shooting: 1 });
    expect(after.events.slice(s.events.length)).toEqual(['⚽ Penalty duty: You put your name down for penalties. Shooting next season +1.']);
    untouched(s, after);
    const early = call.choices[1].apply({ ...s });
    expect([early.morale, early.integrityBonus]).toEqual([59, 1]);
    expect(early.events.at(-1)).toBe('🌍 Back from international duty: You come back a week early and get to work. Morale -1, Integrity +1.');
    untouched(s, early);
  });
  it('lands a training key no further than the room at the answer, and says so', () => {
    const s = career({ overall: 85 });
    const after = fwd.choices[0].apply({ ...s });
    expect(after.statBoostNextSeason).toEqual({});
    expect(after.events.at(-1)).toBe('⚽ Penalty duty: You put your name down for penalties. Shooting next season +0, you are at your ceiling.');
    expect(SOCCER_FX.t_shooting.read(after)).toBe(0);
  });
  it('stops morale at 0 and 100 and says where it stopped', () => {
    expect(call.choices[0].apply(career({ morale: 99 }))).toMatchObject({ morale: 100 });
    expect(call.choices[0].apply(career({ morale: 99 })).events.at(-1)).toMatch(/Morale \+1, now at 100\.$/);
    expect(call.choices[0].apply(career({ morale: 100 })).events.at(-1)).toMatch(/Morale stays at 100\.$/);
    expect(call.choices[1].apply(career({ morale: 0 })).events.at(-1)).toMatch(/Morale stays at 0, Integrity \+1\.$/);
  });
  it('leaves the state untouched and the log alone on the option that moves nothing', () => {
    const s = career();
    expect(fwd.choices[1].apply(s)).toBe(s);
    expect(call.choices[2].apply(s)).toBe(s);
  });
});

describe('the pending reader', () => {
  it('rebuilds a saved deck card in random_events only, whatever the facts say now', () => {
    const [fwd] = deal(career({}, { intApps: 0 }), 'Deck Fixture|2024|deckslot');
    expect(fwd.id).toBe(716);
    /* reloaded as a goalkeeper (a fact that would never deal it): it still answers */
    const saved = copy({ ...career({ position: 'GK' }), phase: 'random_events' as const, pendingEvents: [fwd] });
    const back = pendingFromPack(FIXTURE, saved);
    expect(back.map(e => e.id)).toEqual([716]);
    expect(typeof back[0].choices[0].apply).toBe('function');
    expect(pendingFromPack(FIXTURE, { ...saved, phase: 'season_summary' })).toEqual([]);
    expect(pendingFromPack(FIXTURE, { ...saved, pendingEvents: [{ ...fwd, id: 799 }] })).toEqual([]);
  });
});

describe('the gate', () => {
  beforeEach(() => setSoccerDeckLoader());
  const s = () => career({}, { intApps: 3 });
  it('knows the deck ids', () => {
    expect([700, 724, 999].map(isSoccerDeckId)).toEqual([true, true, true]);
    expect([699, 1000, 700.5, '701', null].map(isSoccerDeckId)).toEqual([false, false, false, false, false]);
  });
  it('answers [] until the deck is loaded, then deals from it', async () => {
    const saved = { ...s(), phase: 'random_events' as const, pendingEvents: deckToRandomEvents(FIXTURE, [FORWARD]) };
    expect(soccerDeckReady()).toBe(false);
    expect(soccerDeckSlot(s(), 2024, 'k', [])).toEqual([]);
    expect(soccerDeckPending(saved)).toEqual([]);
    const real = await import('@/lib/soccerDeck');
    setSoccerDeckLoader(async () => ({ ...real,
      dealSoccerDeck: (st: CareerState, se: number, key: string, taken: readonly RandomEvent[]) => real.dealFromPack(FIXTURE, st, se, key, taken),
      pendingSoccerDeck: (st: CareerState) => real.pendingFromPack(FIXTURE, st) }));
    await loadSoccerDeck();
    expect(soccerDeckReady()).toBe(true);
    expect(soccerDeckSlot(s(), 2024, 'k', [])).toHaveLength(1);
    expect(soccerDeckPending(saved).map(e => e.id)).toEqual([716]);
  });
  it('loads the real chunk and deals one card of the shipped pack', async () => {
    await loadSoccerDeck();
    expect(soccerDeckReady()).toBe(true);
    const dealt = soccerDeckSlot(s(), 2024, 'k', []);
    expect(dealt).toHaveLength(1);
    expect(isSoccerDeckId(dealt[0].id)).toBe(true);
  });
  it('fails closed on a load that resolves with nothing in it', async () => {
    setSoccerDeckLoader(() => Promise.resolve(undefined));
    await expect(loadSoccerDeck()).rejects.toThrow();
    expect(soccerDeckReady()).toBe(false);
    expect(soccerDeckSlot(s(), 2024, 'k', [])).toEqual([]);
    setSoccerDeckLoader(() => Promise.resolve({ dealSoccerDeck: 1 }));
    await expect(loadSoccerDeck()).rejects.toThrow();
    expect(soccerDeckReady()).toBe(false);
  });
  it('clears a rejected load so the next try can land it', async () => {
    let tries = 0;
    setSoccerDeckLoader(() => (tries++ === 0 ? Promise.reject(new Error('offline')) : import('@/lib/soccerDeck')));
    await expect(loadSoccerDeck()).rejects.toThrow('offline');
    expect(soccerDeckReady()).toBe(false);
    await loadSoccerDeck();
    expect(soccerDeckReady()).toBe(true);
    expect(tries).toBe(2);
  });
});

describe('the starter pack', () => {
  const PACK = SOCCER_DECK_PACKS.soccer;
  const group = (e: GmEventDef) => {
    const pos = (e.when ?? []).filter(c => c.fact === 'pos');
    if (pos.length === 0) return 'situation';
    const lo = pos.find(c => c.op === '>=')?.value ?? 0;
    return ['keeper', 'defender', 'midfielder', 'forward'][lo as number];
  };
  const dealtIds = (s: CareerState, n = 80) => {
    const seen = new Set<number>();
    for (let i = 0; i < n; i++) for (const e of dealFromPack(PACK, { ...s }, season(s), `pack|${i}`, [])) seen.add(e.id);
    return seen;
  };
  it('holds 28 cards: five a position group and eight about where a career stands', () => {
    expect(PACK.events.map(e => e.id)).toEqual(Array.from({ length: 28 }, (_, i) => String(701 + i)));
    const by: Record<string, string[]> = {};
    for (const e of PACK.events) (by[group(e)] ??= []).push(e.id);
    expect(Object.fromEntries(Object.entries(by).map(([k, v]) => [k, v.length]))).toEqual({ keeper: 5, defender: 5, midfielder: 5, forward: 5, situation: 8 });
    expect(soccerDeckProblems(PACK)).toEqual([]);
  });
  it('deals each code only its own group\'s position cards', () => {
    const want: Record<string, string> = { GK: 'keeper', CB: 'defender', LB: 'defender', RB: 'defender', CDM: 'defender', CM: 'midfielder', CAM: 'midfielder', LW: 'forward', RW: 'forward', ST: 'forward' };
    for (const [code, g] of Object.entries(want)) {
      const ids = dealtIds(career({ position: code, age: 27 }, { yellowCards: 9, goals: 5, apps: 12 }));
      const groups = new Set(PACK.events.filter(e => ids.has(Number(e.id))).map(group).filter(x => x !== 'situation'));
      expect([...groups], code).toEqual([g]);
    }
  });
  it('gates the cards whose words state a fact on that fact', () => {
    const keeper = career({ position: 'GK' }, { apps: 8 });
    expect(dealtIds(keeper).has(705)).toBe(true);
    expect(dealtIds({ ...keeper, currentClub: 'Fixture Parent' }).has(705)).toBe(false);
    expect(dealtIds(career({ contractYearsLeft: 1 })).has(723)).toBe(true);
    expect(dealtIds(career({ contractYearsLeft: 0 })).has(723)).toBe(false);
    const r = career().seasons[0];
    expect(dealtIds(career({ age: 19, seasons: [{ ...r, year: 2024, age: 19 }] })).has(721)).toBe(true);
    expect(dealtIds(career({ age: 19, seasons: [{ ...r, year: 2022, age: 17 }, { ...r, year: 2023, age: 18 }, { ...r, year: 2024, age: 19 }] })).has(721)).toBe(false);
    expect(dealtIds(career()).has(728)).toBe(false);
    const derbies = [{ rival: 'Fixture Rovers', name: 'The Fixture Derby', kind: 'derby', meetings: [{ home: true, gf: 1, ga: 1, played: true, goals: 0 }] }];
    expect(dealtIds(career({}, { derbies } as Partial<SeasonRecord>)).has(728)).toBe(true);
    expect(dealtIds(career({ isClubCaptain: true, captainClub: 'Somewhere Else' })).has(725)).toBe(false);
    expect(dealtIds(career({ isClubCaptain: true, captainClub: 'Fixture Albion' })).has(725)).toBe(true);
  });
  it('never deals a training card at room 0, and every option moves exactly what it prints', () => {
    for (const code of ['GK', 'CB', 'CM', 'ST']) {
      const full = career({ position: code, overall: 85 }, { yellowCards: 9, goals: 5, apps: 12, intApps: 2 });
      for (const id of dealtIds(full)) {
        const e = PACK.events.find(x => Number(x.id) === id)!;
        expect(e.choices.some(c => Object.keys(c.fx ?? {}).some(k => k in SOCCER_TRAINING_KEYS)), `${code} ${id}`).toBe(false);
      }
    }
    for (const card of deckToRandomEvents(PACK, PACK.events)) {
      card.choices.forEach(c => {
        const s = career({ morale: 50 });
        const handed = { ...s };
        const after = c.apply(handed);
        if (c.consequence === 'Nothing changes') { expect(after).toBe(handed); return; }
        const moved: string[] = [];
        if (after.morale !== s.morale) moved.push(`Morale ${after.morale - s.morale > 0 ? '+' : ''}${after.morale - s.morale}`);
        if (after.integrityBonus !== s.integrityBonus) moved.push(`Integrity +${after.integrityBonus - s.integrityBonus}`);
        for (const stat of ['pace', 'shooting', 'passing', 'dribbling', 'defending', 'physical', 'reflexes'] as const) {
          const d = (after.statBoostNextSeason[stat] ?? 0) - (s.statBoostNextSeason[stat] ?? 0);
          if (!d) continue;
          const key = Object.keys(SOCCER_TRAINING_KEYS).find(k => SOCCER_TRAINING_KEYS[k].stat === stat && c.consequence.includes(SOCCER_FX_WORDS[k].label));
          moved.push(key ? `${SOCCER_FX_WORDS[key].label} +${d}` : `${stat} +${d}, printed nowhere`);
        }
        expect(moved.sort(), `${card.id} ${c.label}`).toEqual(c.consequence.split(', ').sort());
        expect(after.events.length, `${card.id} ${c.label}`).toBe(s.events.length + 1);
      });
    }
  });
});
