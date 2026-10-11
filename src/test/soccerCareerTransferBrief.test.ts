import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  acceptLoan, acceptOffer, FALLBACK_CLUBS, initCareer, projectLeagueApps, repairCareer,
  requestTransfer, requestTransferDecision, signExtension, stayAtClub, transferBriefPreview,
  type CareerState, type ClubData, type ContractOffer,
} from '@/lib/soccerCareerEngine';
import {
  previewTransferBrief, readTransferBrief, setTransferBrief, storeTransferBriefResult,
  transferBriefCandidates, transferBriefResult, type SoccerTransferBrief, type TransferBriefPriority,
} from '@/lib/soccerCareerTransferBrief';

const parent = FALLBACK_CLUBS.find(club => club.name === 'Real Madrid')!;
const generated = (name: string, tier: number, country = 'Brazil'): ClubData => ({
  id: `test-${name}`, name: `Generated ${name}`, tier, country, color: '#123456', league: `Generated ${country} league`,
});
const home = generated('Home Club', 2);
const top = generated('Top Club', 1, 'Germany');
const other = generated('Other Club', 2, 'France');
const lower = generated('Lower Club', 4);
const clubs = [parent, top, home, other, lower];
const offer: ContractOffer = { club: home, contractYears: 3, wage: 27000, transferFee: 8, isDreamClub: false, isPayCut: false };
const tape = [0.1, 0.1, 0.2, 0.3, 0.25, 0.3, 0.4];

function career(): CareerState {
  const overall = 77;
  const stats = { pace: overall, shooting: overall, passing: overall, dribbling: overall, defending: overall, physical: overall, reflexes: overall };
  const started = initCareer('Brief Tester', 'Brazil', 'ST', '2020s', stats, overall, 2026, FALLBACK_CLUBS, null, 99);
  const pro = repairCareer(acceptOffer(started, { club: parent, contractYears: 4, wage: 100000, transferFee: 0 }));
  return { ...pro, age: 26, overall, phase: 'transfer_window', retired: false, loan: null, rival: null,
    transferSituation: { type: 'no_interest' },
    seasons: [{ ...started.seasons[0], year: 2027, age: 25, type: 'playing', club: parent.name,
      clubCountry: parent.country, clubTier: parent.tier, apps: 32, leagueApps: 30, rating: 7.2 }],
  };
}
function withRaw(state: CareerState, value: unknown): CareerState {
  return { ...state, transferBrief: value as SoccerTransferBrief };
}
function run<T>(action: () => T, values = tape): { value: T; draws: number[] } {
  const draws: number[] = [];
  const random = vi.spyOn(Math, 'random').mockImplementation(() => {
    const value = values[draws.length % values.length];
    draws.push(value);
    return value;
  });
  try { return { value: action(), draws }; } finally { random.mockRestore(); }
}
function oldPageRequest(state: CareerState): CareerState {
  const result = requestTransfer(state, clubs);
  const next = { ...state, transferSituation: result };
  if (result.type === 'request_result' && !result.offer) { next.phase = 'playing'; next.transferSituation = null; }
  return next;
}
function offered(priority: TransferBriefPriority = 'home'): CareerState {
  return storeTransferBriefResult(setTransferBrief(career(), priority), {
    status: 'offered', offer, eligibleCount: 3, matchingCount: 1,
    projection: projectLeagueApps(77, home.tier, home.name, 0),
  });
}
afterEach(() => vi.restoreAllMocks());

describe('Agent destination brief choices and preview', () => {
  it('saves and cancels one current-window choice without mutating its input or drawing', () => {
    const state = career(), before = structuredClone(state);
    const random = vi.spyOn(Math, 'random');
    const picked = setTransferBrief(state, 'minutes');
    expect(picked.transferBrief).toEqual({ version: 1, priority: 'minutes', context: {
      club: parent.name, seasonCount: 1, lastYear: 2027, overall: 77, age: 26, nationality: 'Brazil',
    } });
    expect(setTransferBrief(picked, 'minutes')).toBe(picked);
    expect(setTransferBrief(picked, 'level').transferBrief?.priority).toBe('level');
    expect(setTransferBrief(picked, null)).toEqual(state);
    expect(setTransferBrief(state, null)).toBe(state);
    expect(state).toEqual(before);
    expect(random).not.toHaveBeenCalled();
  });

  it('ranks minutes by minimum then maximum, retains tied clubs and uses zero seasons at the destination', () => {
    const state = setTransferBrief(career(), 'minutes');
    const candidates = [generated('Lower Minimum', 1), generated('First Best', 2), generated('Second Best', 2), generated('Lower Maximum', 2)];
    const projection = vi.fn((overall: number, tier: number, name: string, seasons: number) => {
      expect([overall, seasons]).toEqual([77, 0]);
      expect(tier).toBeGreaterThan(0);
      return name.includes('Lower Minimum') ? { min: 19, max: 38 } : name.includes('Lower Maximum') ? { min: 20, max: 29 } : { min: 20, max: 30 };
    });
    const before = structuredClone(candidates);
    expect(transferBriefCandidates(state, candidates, projection).map(club => club.name))
      .toEqual(['Generated First Best', 'Generated Second Best']);
    expect(candidates).toEqual(before);
  });

  it('selects the lowest eligible tier and exact home country without widening the supplied pool', () => {
    const state = career(), pool = [home, top, other, lower];
    expect(transferBriefCandidates(setTransferBrief(state, 'level'), pool, projectLeagueApps)).toEqual([top]);
    expect(transferBriefCandidates(setTransferBrief(state, 'home'), pool, projectLeagueApps)).toEqual([home, lower]);
    expect(transferBriefCandidates(setTransferBrief({ ...state, nationality: 'Canada' }, 'home'), pool, projectLeagueApps)).toEqual([]);
  });

  it('previews all three eligible counts and baseline bands with no draws, writes or out-of-tier candidates', () => {
    const state = setTransferBrief(career(), 'home'), before = structuredClone(state);
    const random = vi.spyOn(Math, 'random');
    const preview = transferBriefPreview(state, clubs);
    expect(preview).toMatchObject({ eligible: true, selected: 'home', result: null });
    expect(preview.options.map(row => [row.id, row.eligibleCount, row.matchingCount, row.tiers]))
      .toEqual([['minutes', 3, 2, [2]], ['level', 3, 1, [1]], ['home', 3, 1, [2]]]);
    expect(preview.options[2].projection).toEqual(projectLeagueApps(77, 2, home.name, 0));
    expect(state).toEqual(before);
    expect(random).not.toHaveBeenCalled();
  });

  it('excludes the player club by canonical alias only in the opted pool', () => {
    const city = FALLBACK_CLUBS.find(club => club.name === 'Man City')!;
    const state = { ...career(), currentClub: 'Manchester City' };
    const brief = setTransferBrief(state, 'level');
    expect(transferBriefCandidates(brief, [city, top], projectLeagueApps)).toEqual([top]);
    expect(transferBriefPreview(brief, [city, top]).options[1].matchingCount).toBe(1);
  });

  it.each(['playing', 'season_summary', 'retired'] as const)('does not choose a brief in phase %s', phase => {
    const state = { ...career(), phase } as CareerState;
    expect(setTransferBrief(state, 'home')).toBe(state);
    expect(previewTransferBrief(state, clubs, projectLeagueApps).eligible).toBe(false);
  });

  it('rejects loan and compulsory windows while retaining their complete state', () => {
    const state = career();
    const loan = { ...state, loan: { parentClub: 'Generated Parent', parentTier: 2, parentLeague: 'Generated league', parentCountry: 'Brazil', parentColor: '#123456' } };
    const move = { ...state, transferSituation: { type: 'club_move' as const, mode: 'sale' as const, fromClub: parent.name,
      toClub: home.name, contractYears: 3, wage: 27000, transferFee: 8, reasons: ['Recorded sale'] } };
    for (const input of [loan, move]) {
      expect(setTransferBrief(input, 'home')).toBe(input);
      expect(transferBriefPreview(input, clubs).eligible).toBe(false);
    }
    const random = vi.spyOn(Math, 'random');
    expect(requestTransferDecision(move, clubs)).toBe(move);
    expect(random).not.toHaveBeenCalled();
  });

  it.each(['club', 'seasonCount', 'lastYear', 'overall', 'age', 'nationality'])('ignores stale context field %s without deleting it', key => {
    const state = setTransferBrief(career(), 'minutes');
    const raw = structuredClone(state.transferBrief!);
    Object.assign(raw.context, { [key]: typeof raw.context[key as keyof typeof raw.context] === 'number' ? -1 : 'Changed' });
    const invalid = withRaw(state, raw), before = structuredClone(invalid);
    expect(readTransferBrief(invalid)).toBeNull();
    expect(setTransferBrief(invalid, null)).toBe(invalid);
    expect(invalid).toEqual(before);
  });
});

describe('Agent destination brief result validation', () => {
  it('reloads an exact offered receipt semantically regardless of object key order', () => {
    const state = offered(), saved = JSON.parse(JSON.stringify(state)) as CareerState;
    const reordered = { isPayCut: false, isDreamClub: false, transferFee: 8, wage: 27000, contractYears: 3,
      club: { league: home.league, color: home.color, tier: home.tier, country: home.country, name: home.name, id: home.id } };
    saved.transferSituation = { type: 'request_result', offer: reordered };
    expect(readTransferBrief(saved, projectLeagueApps)).not.toBeNull();
    expect(transferBriefResult(saved, projectLeagueApps)).toEqual(state.transferBrief?.result);
    expect(transferBriefResult(saved)).toBeNull();
  });

  const malformed: Array<[string, (brief: SoccerTransferBrief) => void]> = [
    ['unknown version', brief => { Object.assign(brief, { version: 2 }); }],
    ['unknown priority', brief => { Object.assign(brief, { priority: 'money' }); }],
    ['extra context key', brief => { Object.assign(brief.context, { extra: true }); }],
    ['missing offer wage', brief => { delete (brief.result!.offer as Partial<ContractOffer>).wage; }],
    ['non-finite wage', brief => { brief.result!.offer!.wage = Infinity; }],
    ['negative fee', brief => { brief.result!.offer!.transferFee = -1; }],
    ['invalid contract years', brief => { brief.result!.offer!.contractYears = 6; }],
    ['unexpected offer key', brief => { Object.assign(brief.result!.offer!, { extra: true }); }],
    ['unexpected club key', brief => { Object.assign(brief.result!.offer!.club, { extra: true }); }],
    ['loan offer', brief => { brief.result!.offer!.isLoan = true; }],
    ['unknown status', brief => { Object.assign(brief.result!, { status: 'accepted' }); }],
    ['impossible matching count', brief => { brief.result!.matchingCount = 4; }],
    ['offered without matching clubs', brief => { brief.result!.matchingCount = 0; }],
    ['offered without projection', brief => { brief.result!.projection = null; }],
    ['wrong projection', brief => { brief.result!.projection = { min: 38, max: 38 }; }],
    ['no-match with offer', brief => { brief.result!.status = 'no_match'; }],
    ['no-interest with offer', brief => { brief.result!.status = 'no_interest'; }],
    ['missing result', brief => { delete brief.result; }],
  ];
  it.each(malformed)('rejects %s and leaves all malformed saved bytes alone', (_name, mutate) => {
    const original = offered(), raw = structuredClone(original.transferBrief!);
    mutate(raw);
    const state = withRaw(original, raw), before = structuredClone(state);
    const random = vi.spyOn(Math, 'random');
    expect(readTransferBrief(state, projectLeagueApps)).toBeNull();
    expect(transferBriefResult(state, projectLeagueApps)).toBeNull();
    expect(requestTransferDecision(state, clubs)).toBe(state);
    expect(state).toEqual(before);
    expect(random).not.toHaveBeenCalled();
  });

  it.each(['wage', 'club', 'flags', 'absent'])('rejects a result whose actual request offer differs in %s', mismatch => {
    const state = offered();
    const changed = structuredClone(offer);
    if (mismatch === 'wage') changed.wage++;
    if (mismatch === 'club') changed.club.name = 'Generated Different Club';
    if (mismatch === 'flags') delete changed.isPayCut;
    state.transferSituation = { type: 'request_result', offer: mismatch === 'absent' ? null : changed };
    expect(readTransferBrief(state, projectLeagueApps)).toBeNull();
  });

  it('rejects duplicate own-club and foreign-home offers even when both snapshots match', () => {
    for (const club of [parent, other]) {
      const state = offered();
      const invalidOffer = { ...offer, club };
      state.transferSituation = { type: 'request_result', offer: invalidOffer };
      state.transferBrief!.result!.offer = invalidOffer;
      state.transferBrief!.result!.projection = projectLeagueApps(77, club.tier, club.name, 0);
      expect(readTransferBrief(state, projectLeagueApps)).toBeNull();
    }
  });
});

describe('Agent destination brief actual requests', () => {
  it.each(['absent', 'invalid', 'stale', 'loan'] as const)('preserves the entire old page result and draw vector for %s input', kind => {
    let state = career();
    if (kind === 'invalid') state = withRaw(state, { version: 1, priority: 'home', context: null, unknown: 'held' });
    if (kind === 'stale') { state = setTransferBrief(state, 'home'); state = { ...state, overall: 78 }; }
    if (kind === 'loan') state = { ...state, loan: { parentClub: 'Generated Parent', parentTier: 2, parentLeague: 'Generated league', parentCountry: 'Brazil', parentColor: '#123456' } };
    const before = structuredClone(state);
    for (const values of [tape, [0.8]]) {
      const old = run(() => oldPageRequest(state), values);
      const current = run(() => requestTransferDecision(state, clubs), values);
      expect(current).toEqual(old);
      expect(current.value.transferBrief).toBe(state.transferBrief);
      expect(state).toEqual(before);
    }
  });

  it.each(['minutes', 'level', 'home'] as const)('uses actual eligible %s destinations with the seven existing offer draws', priority => {
    const state = setTransferBrief(career(), priority), before = structuredClone(state);
    const result = run(() => requestTransferDecision(state, clubs));
    const old = run(() => requestTransfer(state, clubs));
    expect(result.draws).toEqual(old.draws);
    expect(result.draws).toHaveLength(7);
    const held = transferBriefResult(result.value, projectLeagueApps)!;
    expect(held.status).toBe('offered');
    expect(held.offer!.club).toEqual(priority === 'level' ? top : home);
    expect(held.offer!.wage).toBe(priority === 'level' ? 42500 : 27500);
    expect(held.offer!.transferFee).toBe(36.1);
    expect(held.offer!.contractYears).toBe(3);
    expect(held.projection).toEqual(projectLeagueApps(77, held.offer!.club.tier, held.offer!.club.name, 0));
    expect(state).toEqual(before);
  });

  it('retains a declined request in the window, then reuses it after reload without a second roll', () => {
    const state = setTransferBrief(career(), 'level');
    const result = run(() => requestTransferDecision(state, clubs), [0.8]);
    expect(result.draws).toEqual([0.8]);
    expect(result.value.phase).toBe('transfer_window');
    expect(result.value.transferSituation).toEqual({ type: 'request_result', offer: null });
    expect(transferBriefResult(result.value)?.status).toBe('no_interest');
    const saved = JSON.parse(JSON.stringify(result.value)) as CareerState;
    const random = vi.spyOn(Math, 'random');
    expect(requestTransferDecision(saved, clubs)).toBe(saved);
    expect(setTransferBrief(saved, 'home')).toBe(saved);
    expect(random).not.toHaveBeenCalled();
    expect(stayAtClub(saved).transferBrief).toBeUndefined();
  });

  it('records a successful request with no matching home club, without inventing a foreign alternative', () => {
    const state = setTransferBrief({ ...career(), nationality: 'Canada' }, 'home');
    const result = run(() => requestTransferDecision(state, clubs));
    expect(result.draws).toEqual(tape.slice(0, 2));
    expect(transferBriefResult(result.value)).toEqual({ status: 'no_match', offer: null,
      eligibleCount: 3, matchingCount: 0, projection: null });
    const random = vi.spyOn(Math, 'random');
    expect(requestTransferDecision(result.value, clubs)).toBe(result.value);
    expect(random).not.toHaveBeenCalled();
  });

  it('reuses a complete held offer without changing terms, drawing or reviving it in a different window', () => {
    const saved = JSON.parse(JSON.stringify(offered())) as CareerState;
    const before = structuredClone(saved), random = vi.spyOn(Math, 'random');
    expect(requestTransferDecision(saved, clubs)).toBe(saved);
    expect(setTransferBrief(saved, 'level')).toBe(saved);
    expect(saved).toEqual(before);
    expect(random).not.toHaveBeenCalled();
    expect(readTransferBrief({ ...saved, phase: 'playing' }, projectLeagueApps)).toBeNull();
    expect(readTransferBrief({ ...saved, transferSituation: { type: 'no_interest' } }, projectLeagueApps)).toBeNull();
  });

  it.each(['sign', 'loan', 'stay', 'extend'] as const)('clears a valid owned brief on %s and preserves all absent or invalid behavior', action => {
    const act = (input: CareerState) => action === 'sign' ? acceptOffer(input, offer)
      : action === 'loan' ? acceptLoan(input, { ...offer, contractYears: 1, isLoan: true })
        : action === 'stay' ? stayAtClub(input) : signExtension(input);
    const state = career();
    const planned = setTransferBrief(state, 'home');
    const before = structuredClone(planned);
    expect(run(() => act(planned)).value.transferBrief).toBeUndefined();
    expect(run(() => act(offered())).value.transferBrief).toBeUndefined();
    expect(planned).toEqual(before);
    const invalid = withRaw(state, { malformed: ['keep', 'this'] });
    const baseline = run(() => act(state));
    const held = run(() => act(invalid));
    expect(held.draws).toEqual(baseline.draws);
    expect(held.value).toEqual({ ...baseline.value, transferBrief: invalid.transferBrief });
    expect(held.value.transferBrief).toBe(invalid.transferBrief);
  });

  it('keeps the brief when a loan acceptance is refused by the existing loan guard', () => {
    const state = setTransferBrief(career(), 'home');
    const before = structuredClone(state), random = vi.spyOn(Math, 'random');
    expect(acceptLoan(state, offer)).toEqual(state);
    expect(state).toEqual(before);
    expect(random).not.toHaveBeenCalled();
  });
});
