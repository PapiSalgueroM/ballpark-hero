import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as cm from '@/lib/clubManager';
import * as familyActions from '@/lib/clubManagerRetiredSonActions';
import type { CareerState, CMPlayer, Prospect } from '@/lib/clubManager';
import { CM_ROSTERS } from '@/data/clubManagerRosters';
import { makeGeneratedName } from '@/lib/clubManagerEras';
import { keyedRng } from '@/lib/keyedRng';
import { fenceKeyOf, saveFence } from '@/lib/saveFence';

// Local shapes keep the physical original-Core fault independent of new Core type exports.
type Offer = {
  id: string; club: string; season: number; year: number;
  parentId: string; parentName: string; parentAge: number; parentGenerated: true;
  prospect: Prospect; fee: number;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
};
type FamilyCareer = CareerState & {
  retiredSonApplication?: { version: 1; lastConsideredYear: number; offer: Offer | null };
};
type FamilyApi = {
  retiredSonOffer(career: CareerState): Offer | null;
  acceptRetiredSon(career: CareerState, id: string): FamilyCareer | null;
  declineRetiredSon(career: CareerState, id: string): FamilyCareer | null;
};
const family: FamilyApi = {
  retiredSonOffer(career) { return (cm as typeof cm & Pick<FamilyApi, 'retiredSonOffer'>).retiredSonOffer(career); },
  acceptRetiredSon(career, id) { return familyActions.acceptRetiredSon(career, id) as FamilyCareer | null; },
  declineRetiredSon(career, id) { return familyActions.declineRetiredSon(career, id) as FamilyCareer | null; },
};
const NOW = Date.UTC(2032, 7, 1);
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
let randomSpy: ReturnType<typeof vi.spyOn>;

function seedGlobal(seed = 41031) {
  randomSpy.mockImplementation(keyedRng('cm-son-test-global|' + seed));
  randomSpy.mockClear();
}
beforeEach(() => {
  localStorage.clear();
  saveFence.release(cm.SAVE_KEY);
  randomSpy = vi.spyOn(Math, 'random');
  vi.spyOn(Date, 'now').mockReturnValue(NOW);
  seedGlobal();
});
afterEach(() => {
  saveFence.release(cm.SAVE_KEY);
  vi.restoreAllMocks();
});

function eventKey(career: CareerState, parent: CMPlayer, seed: number | undefined) {
  const namespace = seed ?? ('legacy:' + (career.eraId ?? 'now') + ':' + (career.startYear ?? cm.CM_BASE_YEAR));
  return JSON.stringify(['cm-retired-son-v1', namespace, career.clubName, cm.worldYear(career) + 1, parent.id]);
}

// The person and provenance come from the real engine, not a fabricated sports row.
function fixture(legacy = false) {
  const career = cm.startCareer('Excelsior') as FamilyCareer;
  cm.ensureAcademy(career);
  const generated = career.squad.find(p => p.isYouth && p.name.endsWith(' (Youth)') && !p.onLoan);
  const real = career.squad.find(p => !p.generated && !p.isYouth && !p.academyGrad
    && CM_ROSTERS.Excelsior.some(row => row.n === p.name));
  expect(generated, 'CM_SON_FIXTURE_NEEDS_ENGINE_GENERATED_PLAYER').toBeDefined();
  expect(real, 'CM_SON_FIXTURE_NEEDS_BAKED_REAL_PLAYER').toBeDefined();
  career.squad = career.squad.map(p => ({
    ...p, age: p.id === generated!.id ? 41 : 25, contractYears: 4,
    potential: Math.max(p.rating, p.potential ?? p.rating), apps: 20,
  }));
  const parent = career.squad.find(p => p.id === generated!.id)!;
  career.loanedOut = [];
  career.freeAgents = [];
  delete career.retiredSonApplication;
  let witness: number | undefined;
  for (let i = 0; i < 4096; i += 1) {
    if (legacy) parent.id = generated!.id + ':legacy-fixture-' + i;
    if (keyedRng(eventKey(career, parent, legacy ? undefined : i))() < 1 / 8) { witness = i; break; }
  }
  expect(witness, 'CM_SON_FIXTURE_NEEDS_POSITIVE_KEYED_CHANCE_WITNESS').toBeDefined();
  if (legacy) {
    delete career.worldSeed;
    career.xiIds = career.xiIds.map(id => id === generated!.id ? parent.id : id);
  } else career.worldSeed = witness!;
  return { career, parent: clone(parent), real: clone(real!) };
}

function rollover(career: CareerState, seed = 701, now = NOW, club?: string) {
  seedGlobal(seed);
  vi.mocked(Date.now).mockReturnValue(now);
  const next = cm.startNextSeason(clone(career), club) as FamilyCareer;
  const draws = randomSpy.mock.calls.length;
  const following = Math.random();
  return { next, draws, following };
}

function savedOffer() {
  const f = fixture();
  const next = rollover(f.career).next;
  const offer = next.retiredSonApplication?.offer;
  expect(offer, 'CM_SON_FIXTURE_ROLLOVER_MUST_PRODUCE_PENDING_OFFER').toBeTruthy();
  expect(offer!.status).toBe('pending');
  expect(family.retiredSonOffer(next)).toEqual(offer);
  return { ...f, next, offer: offer! };
}

function invited(career: FamilyCareer, offer: Offer) {
  const next = family.acceptRetiredSon(career, offer.id);
  expect(next, 'CM_SON_VALID_INVITE_MUST_SUCCEED').not.toBeNull();
  return next!;
}

function ordinarySummer(career: FamilyCareer) {
  return {
    club: career.clubName, season: career.season, budget: career.budget,
    retired: career.retiredLastSummer,
    squad: career.squad.map(p => ({
      name: p.name, position: p.position, rating: p.rating, age: p.age,
      potential: p.potential, wage: p.wage, value: p.value, apps: p.apps,
    })),
    prospects: career.academy!.prospects.map(({ id: _id, ...p }) => p),
  };
}

function fullBooks(career: FamilyCareer, prototype: Prospect) {
  const next = clone(career);
  next.academy!.prospects = Array.from({ length: cm.MAX_PROSPECTS }, (_, i) => ({
    ...prototype, id: 'capacity-fixture-' + i,
    name: makeGeneratedName('cm-son-capacity-' + i), fee: 0,
  }));
  expect(new Set(next.academy!.prospects.map(p => p.name)).size).toBe(cm.MAX_PROSPECTS);
  return next;
}

function assertNoAction(career: FamilyCareer, id: string) {
  const before = JSON.stringify(career), draws = randomSpy.mock.calls.length;
  expect(family.acceptRetiredSon(career, id), 'CM_SON_RESOLVED_OR_STALE_INVITE_MUST_REFUSE').toBeNull();
  expect(family.declineRetiredSon(career, id), 'CM_SON_RESOLVED_OR_STALE_PASS_MUST_REFUSE').toBeNull();
  expect(JSON.stringify(career)).toBe(before);
  expect(randomSpy.mock.calls).toHaveLength(draws);
}

describe('Club Manager retired-player academy application', { timeout: 120000 }, () => {
  it('CM_SON_ROLLOVER_APPLICATION', () => {
    const { career, parent } = fixture();
    expect(parent.isYouth).toBe(true);
    expect(parent.age).toBe(41);
    const next = rollover(career).next;
    expect(next.season, 'CM_SON_REAL_ROLLOVER_PREREQUISITE').toBe(career.season + 1);
    expect(next.retiredLastSummer, 'CM_SON_ACTUAL_AGE42_RETIREMENT_PREREQUISITE')
      .toContainEqual(expect.objectContaining({ name: parent.name, age: 42 }));
    expect(next.squad.some(p => p.id === parent.id || p.name === parent.name)).toBe(false);
    const offer = next.retiredSonApplication?.offer;
    expect(offer, 'CM_SON_MISSING_RETIREMENT_APPLICATION').toBeTruthy();
    expect(next.retiredSonApplication).toMatchObject({ version: 1, lastConsideredYear: cm.worldYear(next) });
    expect(offer).toMatchObject({
      club: next.clubName, season: next.season, year: cm.worldYear(next),
      parentId: parent.id, parentName: parent.name, parentAge: 42, parentGenerated: true, status: 'pending',
    });
    const p = offer!.prospect;
    expect(p.age).toBeGreaterThanOrEqual(16);
    expect(p.age).toBeLessThanOrEqual(18);
    expect(offer!.parentAge - p.age).toBeGreaterThanOrEqual(18);
    expect(p.name.split(' ').slice(-1)[0]).toBe(parent.name.replace(/ \(Youth\)$/, '').split(' ').slice(-1)[0]);
    expect([...next.squad, ...next.academy!.prospects].some(x => x.id === p.id || x.name === p.name)).toBe(false);
    expect(p.source).toBe('Academy');
    expect(p.rating).toBeGreaterThanOrEqual(40);
    expect(p.rating).toBeLessThanOrEqual(76);
    expect(p.potential).toBeGreaterThanOrEqual(p.rating);
    expect(p.potential).toBeLessThanOrEqual(95);
    expect(offer!.fee).toBe(Math.max(0.2, Math.round((p.potential - 52) * 0.14 * 10) / 10));
    expect(p.fee).toBe(offer!.fee);
  });

  it('CM_SON_REAL_UNOWNED_EXCLUSION', () => {
    const { career, parent, real } = fixture();
    for (const kind of ['real', 'real-hostile-flag', 'unowned-generated-name', 'incoming-loan'] as const) {
      const input = clone(career);
      const replacement = kind.startsWith('real')
        ? { ...real, age: 41, contractYears: 4, isYouth: false, academyGrad: false, generated: kind === 'real-hostile-flag' }
        : { ...parent, isYouth: kind === 'incoming-loan', academyGrad: false, generated: false,
          ...(kind === 'incoming-loan' ? { onLoan: true } : {}) };
      input.squad = input.squad.filter(p => p.id !== parent.id && p.id !== replacement.id);
      input.squad.push(replacement);
      let positiveSeed: number | undefined;
      for (let i = 0; i < 4096; i += 1) {
        if (keyedRng(eventKey(input, replacement, i))() < 1 / 8) { positiveSeed = i; break; }
      }
      expect(positiveSeed, 'CM_SON_EXCLUSION_REQUIRES_POSITIVE_SUBJECT_CHANCE:' + kind).toBeDefined();
      input.worldSeed = positiveSeed!;

      input.xiIds = cm.autoPickXI(input.squad, cm.FORMATIONS[input.formationIndex]);
      const next = rollover(input).next;
      if (kind !== 'incoming-loan') expect(next.retiredLastSummer).toContainEqual(expect.objectContaining({ name: replacement.name, age: 42 }));
      expect(next.retiredSonApplication?.offer ?? null, 'CM_SON_REAL_OR_UNOWNED_PARENT_MUST_NOT_CREATE_RELATIONSHIP:' + kind).toBeNull();
    }
  });

  it('CM_SON_PRIVATE_RNG', () => {
    for (const legacy of [false, true]) {
      const { career, parent } = fixture(legacy);
      const first = rollover(career, 812);
      const later = rollover(career, 812, NOW + 86_400_000);
      expect(first.next.retiredSonApplication?.offer, 'CM_SON_DETERMINISTIC_POSITIVE_OFFER').toBeDefined();
      expect(later.next.retiredSonApplication).toEqual(first.next.retiredSonApplication);
      expect(later.draws).toBe(first.draws);
      expect(later.following).toBe(first.following);
      const withoutProvenance = clone(career);
      const p = withoutProvenance.squad.find(x => x.id === parent.id)!;
      p.isYouth = false; p.academyGrad = false; p.generated = false;
      const ordinary = rollover(withoutProvenance, 812);
      expect(ordinary.next.retiredSonApplication?.offer ?? null).toBeNull();
      expect(first.draws, 'CM_SON_PRIVATE_STREAM_MUST_NOT_CONSUME_GLOBAL_DRAWS').toBe(ordinary.draws);
      expect(first.following).toBe(ordinary.following);
      expect(ordinarySummer(first.next)).toEqual(ordinarySummer(ordinary.next));
    }
  });

  it('CM_SON_INVITE_ONCE', () => {
    const { next, offer } = savedOffer();
    next.budget = Math.round((offer.fee + 1.24) * 100) / 100;
    const before = JSON.stringify(next), books = clone(next.academy!.prospects);
    const accepted = family.acceptRetiredSon(next, offer.id);
    expect(accepted, 'CM_SON_VALID_INVITE_MUST_SUCCEED').not.toBeNull();
    expect(accepted!.budget, 'CM_SON_INVITE_MUST_CHARGE_DISPLAYED_FEE_ONCE')
      .toBe(Math.round((next.budget - offer.fee) * 100) / 100);
    expect(accepted!.budget, 'CM_SON_INVITE_MUST_PRESERVE_BUDGET_CENTS').toBe(1.24);
    expect(accepted!.academy!.prospects, 'CM_SON_INVITE_MUST_APPEND_ONE_PROSPECT')
      .toEqual([...books, { ...offer.prospect, fee: 0 }]);
    expect(family.retiredSonOffer(accepted!)?.status).toBe('accepted');
    const { budget: _b, academy: _a, retiredSonApplication: _f, ...old } = next;
    const { budget: _nb, academy: _na, retiredSonApplication: _nf, ...held } = accepted!;
    expect(held).toEqual(old);
    expect({ ...accepted!.academy!, prospects: books }).toEqual(next.academy);
    expect(JSON.stringify(next)).toBe(before);
    assertNoAction(accepted!, offer.id);
    const fundedReplay = { ...clone(accepted!), budget: Math.round((offer.fee + 1.24) * 100) / 100 };
    expect(fundedReplay.budget, 'CM_SON_REPLAY_FIXTURE_MUST_AFFORD_DISPLAYED_FEE').toBeGreaterThanOrEqual(offer.fee);
    assertNoAction(fundedReplay, offer.id);
    assertNoAction(next, offer.id + ':stale');
  });

  it('CM_SON_CAPACITY_AND_FUNDS', () => {
    const { next, offer } = savedOffer();
    const full = fullBooks(next, offer.prospect), before = JSON.stringify(full);
    expect(family.acceptRetiredSon(full, offer.id), 'CM_SON_FULL_ACADEMY_MUST_NOT_EVICT').toBeNull();
    expect(JSON.stringify(full)).toBe(before);
    const poor = { ...clone(next), budget: Math.max(0, offer.fee - 0.1) }, poorBefore = JSON.stringify(poor);
    expect(offer.fee).toBeGreaterThan(poor.budget);
    expect(family.acceptRetiredSon(poor, offer.id), 'CM_SON_INSUFFICIENT_FUNDS_MUST_REFUSE').toBeNull();
    expect(JSON.stringify(poor)).toBe(poorBefore);
    full.academy!.prospects.pop();
    full.budget = offer.fee;
    const accepted = family.acceptRetiredSon(full, offer.id)!;
    expect(accepted).not.toBeNull();
    expect(accepted.budget).toBe(0);
    expect(accepted.academy!.prospects).toHaveLength(cm.MAX_PROSPECTS);
    expect(accepted.academy!.prospects.slice(0, -1)).toEqual(full.academy!.prospects);
    expect(accepted.academy!.prospects.slice(-1)[0]).toEqual({ ...offer.prospect, fee: 0 });
  });

  it('CM_SON_PASS_NEUTRAL', () => {
    const { next, offer } = savedOffer(), before = JSON.stringify(next);
    const declined = family.declineRetiredSon(next, offer.id)!;
    expect(declined).not.toBeNull();
    expect(family.retiredSonOffer(declined)?.status).toBe('declined');
    const { retiredSonApplication: _a, ...original } = next;
    const { retiredSonApplication: _b, ...after } = declined;
    expect(after).toEqual(original);
    expect(JSON.stringify(next)).toBe(before);
    assertNoAction(declined, offer.id);
  });

  it('CM_SON_SUMMER_AND_CLUB_EXPIRY', () => {
    const { next, offer } = savedOffer();
    const summer = rollover(next).next;
    expect(summer.season).toBe(next.season + 1);
    expect(family.retiredSonOffer(summer)).toBeNull();
    assertNoAction(summer, offer.id);
    const moved = rollover(next, 701, NOW, 'Brentford').next;
    expect(moved.clubName).toBe('Brentford');
    expect(family.retiredSonOffer(moved)).toBeNull();
    assertNoAction(moved, offer.id);
    for (const foreign of [{ ...clone(next), clubName: 'Brentford' }, { ...clone(next), season: next.season + 1 }]) {
      expect(family.retiredSonOffer(foreign)).toBeNull();
      assertNoAction(foreign, offer.id);
    }
    const replay = rollover(next).next;
    expect(replay.retiredSonApplication).toEqual(summer.retiredSonApplication);
  });

  it('CM_SON_FULL_AND_LEAN_SAVE', () => {
    const { next, offer } = savedOffer();
    const declined = family.declineRetiredSon(next, offer.id);
    expect(declined, 'CM_SON_VALID_PASS_MUST_SUCCEED').not.toBeNull();
    for (const resolved of [next, invited(next, offer), declined!]) {
      for (const lean of [false, true]) {
        const input = clone(resolved);
        input.h2h = Array.from({ length: 12 }, (_, i) => ({
          opp: 'Everton save-fixture opponent', score: '1-0', res: 'W' as const, season: i + 1, comp: 'league', home: true,
        }));
        const setItem = Storage.prototype.setItem;
        let attempts = 0;
        const writes = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (key, value) {
          if (key === cm.SAVE_KEY && ++attempts === 1 && lean) throw new DOMException('Test quota', 'QuotaExceededError');
          return setItem.call(this, key, value);
        });
        try {
          saveFence.release(cm.SAVE_KEY);
          expect(cm.saveCareer(input)).toBe(true);
        } finally { writes.mockRestore(); }
        expect(attempts).toBe(lean ? 2 : 1);
        const stored = JSON.parse(localStorage.getItem(cm.SAVE_KEY)!);
        expect(stored.h2h).toHaveLength(lean ? 6 : 12);
        expect(stored.retiredSonApplication).toEqual(input.retiredSonApplication);
        const loaded = cm.loadCareer() as FamilyCareer;
        expect(loaded).not.toBeNull();
        expect(loaded.retiredSonApplication).toEqual(input.retiredSonApplication);
        expect(family.retiredSonOffer(loaded)).toEqual(input.retiredSonApplication!.offer);
        if (resolved.retiredSonApplication!.offer!.status !== 'pending') assertNoAction(loaded, offer.id);
        else {
          const accepted = family.acceptRetiredSon(loaded, offer.id)!;
          expect(accepted.academy!.prospects.filter(p => p.id === offer.prospect.id)).toHaveLength(1);
        }
        const raw = localStorage.getItem(cm.SAVE_KEY);
        saveFence.adopt(cm.SAVE_KEY);
        const generation = Number(localStorage.getItem(fenceKeyOf(cm.SAVE_KEY)) ?? 0);
        localStorage.setItem(fenceKeyOf(cm.SAVE_KEY), String(generation + 1));
        expect(cm.saveCareer({ ...loaded, budget: loaded.budget + 1 })).toBe(false);
        expect(localStorage.getItem(cm.SAVE_KEY)).toBe(raw);
        saveFence.release(cm.SAVE_KEY);
      }
    }
  });

  it('CM_SON_OLD_AND_HOSTILE_SAVE', () => {
    const { next, offer, real } = savedOffer(), old = clone(next);
    delete old.retiredSonApplication;
    localStorage.setItem(cm.SAVE_KEY, JSON.stringify(old));
    const loaded = cm.loadCareer() as FamilyCareer;
    expect(loaded).not.toBeNull();
    expect(loaded).not.toHaveProperty('retiredSonApplication');
    expect(family.retiredSonOffer(loaded)).toBeNull();
    const invalid: unknown[] = [
      { ...next.retiredSonApplication!, version: 2 },
      { ...next.retiredSonApplication!, lastConsideredYear: Number.NaN },
      ...[
        { fee: -1 }, { fee: 0 }, { fee: offer.fee + 1 }, { status: 'unknown' },
        { club: 'Brentford' }, { season: next.season + 1 }, { year: cm.worldYear(next) + 1 },
        { parentGenerated: false }, { parentName: real.name }, { parentAge: 20 },
        { prospect: { ...offer.prospect, age: 35 } },
        { prospect: { ...offer.prospect, potential: 1000 } },
        { prospect: { ...offer.prospect, name: real.name } },
        { prospect: { ...offer.prospect, id: '' } },
      ].map(change => ({ ...next.retiredSonApplication!, offer: { ...offer, ...change } })),
    ];
    for (const bad of invalid) {
      const input = { ...clone(next), retiredSonApplication: bad } as FamilyCareer;
      const before = JSON.stringify(input), draws = randomSpy.mock.calls.length;
      expect(family.retiredSonOffer(input), 'CM_SON_HOSTILE_METADATA_MUST_FAIL_CLOSED').toBeNull();
      assertNoAction(input, offer.id);
      expect(JSON.stringify(input)).toBe(before);
      expect(randomSpy.mock.calls).toHaveLength(draws);
      localStorage.setItem(cm.SAVE_KEY, before);
      const reopened = cm.loadCareer();
      expect(reopened).not.toBeNull();
      expect(family.retiredSonOffer(reopened!)).toBeNull();
    }
  });

  it('CM_SON_PROMOTION_TERMS', () => {
    const { next, offer } = savedOffer();
    next.budget = Math.round((offer.fee + 1.24) * 100) / 100;
    const accepted = invited(next, offer);
    const budget = accepted.budget;
    expect(budget, 'CM_SON_PROMOTION_FIXTURE_REQUIRES_EXACT_CENT_BALANCE').toBe(1.24);
    const promoted = cm.promoteProspect(accepted, offer.prospect.id)!;
    expect(promoted).not.toBeNull();
    expect(promoted.budget, 'CM_SON_PROMOTION_MUST_NOT_CHARGE_RECRUITMENT_TWICE').toBe(budget);
    expect(promoted.academy!.prospects.some(p => p.id === offer.prospect.id)).toBe(false);
    const player = promoted.squad.find(p => p.name === offer.prospect.name)!;
    expect(player).toMatchObject({
      age: offer.prospect.age, rating: offer.prospect.rating,
      potential: offer.prospect.potential, position: offer.prospect.position, academyGrad: true,
    });
    expect(player.wage).toBeGreaterThan(0);
    expect(player.contractYears).toBe(4);
    expect(player.nation).toBeTruthy();
    expect(promoted.squad.filter(p => p.name === player.name)).toHaveLength(1);
    expect(cm.promoteProspect(promoted, offer.prospect.id)).toBeNull();
  });

  it('CM_SON_SENIOR_CAP', () => {
    const { next, offer } = savedOffer();
    const accepted = invited(next, offer);
    while (accepted.squad.length < 30) {
      const i = accepted.squad.length;
      accepted.squad.push({ ...accepted.squad[0], id: 'senior-capacity-fixture-' + i,
        name: makeGeneratedName('cm-son-senior-capacity-' + i), generated: true, isYouth: false });
    }
    expect(accepted.squad).toHaveLength(30);
    const before = JSON.stringify(accepted);
    expect(cm.promoteProspect(accepted, offer.prospect.id), 'CM_SON_SENIOR_CAP_MUST_REFUSE_WITHOUT_EVICTION').toBeNull();
    expect(JSON.stringify(accepted)).toBe(before);
  });

  it('CM_SON_NORMAL_DEVELOPMENT', () => {
    const { next, offer } = savedOffer();
    const accepted = invited(next, offer);
    const promoted = cm.promoteProspect(accepted, offer.prospect.id)! as FamilyCareer;
    const player = promoted.squad.find(p => p.name === offer.prospect.name)!;
    const playing = clone(promoted), bench = clone(promoted);
    playing.squad.find(p => p.id === player.id)!.apps = 34;
    bench.squad.find(p => p.id === player.id)!.apps = 0;
    const ordinary = clone(playing);
    delete ordinary.retiredSonApplication;
    const played = rollover(playing, 918), benched = rollover(bench, 918), unlabelled = rollover(ordinary, 918);
    const after = played.next.squad.find(p => p.id === player.id)!;
    const benchAfter = benched.next.squad.find(p => p.id === player.id)!;
    expect(after, 'CM_SON_ORDINARY_DEVELOPMENT_MUST_KEEP_PLAYER').toBeDefined();
    expect(benchAfter).toBeDefined();
    expect(after.age).toBe(player.age + 1);
    expect(after.rating, 'CM_SON_PLAYING_TIME_MUST_STILL_IMPROVE_DEVELOPMENT').toBeGreaterThan(benchAfter.rating);
    expect(after.rating).toBeLessThanOrEqual(player.potential!);
    expect(after.apps).toBe(0);
    expect(unlabelled.next.squad.find(p => p.id === player.id)).toEqual(after);
    expect(unlabelled.draws).toBe(played.draws);
    expect(unlabelled.following).toBe(played.following);
  });
});
