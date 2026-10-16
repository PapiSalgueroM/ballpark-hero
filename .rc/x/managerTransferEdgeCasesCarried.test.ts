import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import type { CareerState, MarketPlayer, TransferNews } from '@/lib/clubManager';

// Test-only journeys through the actual 6341 public APIs. No bid, application,
// transfer line, ownership record, match result or final player is prepared.
const OUT = process.env.MTE_OUT;
const evidence: { fixtures: Record<string, any>; cases: Record<string, any> } = { fixtures: {}, cases: {} };
const jsonCopy = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
function retain() {
  if (!OUT) return;
  mkdirSync(OUT, { recursive: true });
  writeFileSync(path.join(OUT, 'raw-states.json'), JSON.stringify(evidence, null, 2));
}
function setup(value: unknown, message: string): asserts value {
  if (!value) throw new Error('MTE_SETUP: ' + message);
}
function stream(seed: number) {
  let state = seed >>> 0;
  return () => {
    state += 0x6D2B79F5;
    let value = state;
    value = Math.imul(value ^ value >>> 15, value | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}
function roll<T>(owner: any, label: string, next: () => number, action: () => T) {
  const draws: number[] = [];
  const trace: any = { label, draws };
  (owner.calls ??= []).push(trace);
  const spy = vi.spyOn(Math, 'random').mockImplementation(() => { const value = next(); draws.push(value); return value; });
  try { return { value: action(), draws }; }
  catch (error) { trace.error = String(error); throw error; }
  finally { spy.mockRestore(); }
}
function vector<T>(owner: any, label: string, values: number[], action: () => T) {
  let index = 0;
  return roll(owner, label, () => {
    setup(index < values.length, label + ' consumed past its declared vector');
    return values[index++];
  }, action);
}
async function fresh() {
  localStorage.clear(); sessionStorage.clear(); vi.resetModules();
  const model = await import('@/lib/clubManager');
  const calendar = await import('@/lib/clubManagerCalendar');
  const ledger = await import('@/lib/clubManagerWorldRoster');
  const { saveFence } = await import('@/lib/saveFence');
  saveFence.release(model.SAVE_KEY);
  return { model, calendar, ledger, saveFence };
}
type Context = Awaited<ReturnType<typeof fresh>>;
function records(context: Context, state: CareerState) { return context.ledger.readWorldRoster(state)?.records ?? []; }
function record(context: Context, state: CareerState, key: string) { return records(context, state).find(row => row.key === key); }
function aiLines(state: CareerState) {
  return (state.transferLog ?? []).filter(line => line.season === state.season && !line.loan
    && line.from !== state.clubName && line.to !== state.clubName
    && line.from !== 'a free transfer' && line.to !== 'a free transfer');
}
function sameLine(a: TransferNews, b: TransferNews) {
  return a.name === b.name && a.from === b.from && a.to === b.to && a.season === b.season && !a.loan && !b.loan;
}
function reload(context: Context, owner: any, state: CareerState, label: string) {
  const input = structuredClone(state), before = structuredClone(input);
  context.saveFence.release(context.model.SAVE_KEY); localStorage.clear(); sessionStorage.clear();
  const call = roll(owner, label, () => { throw new Error('MTE_SETUP: save/load drew RNG'); }, () => {
    const saved = context.model.saveCareer(input);
    const raw = localStorage.getItem(context.model.SAVE_KEY);
    const loaded = context.model.loadCareer();
    return { saved, raw, loaded, rawAfterRead: localStorage.getItem(context.model.SAVE_KEY) };
  });
  const observation = { inputBefore: before, inputAfter: structuredClone(input), ...call.value, draws: call.draws };
  owner[label] = observation; retain();
  setup(observation.saved && observation.raw && observation.loaded, label + ' actual save/load must succeed');
  setup(isDeepStrictEqual(before, structuredClone(input)), label + ' save must not mutate input');
  setup(observation.raw === observation.rawAfterRead && call.draws.length === 0, label + ' load must not write or draw');
  return observation.loaded;
}
function pureQuery<T>(owner: any, label: string, input: CareerState, action: (state: CareerState) => T) {
  const before = jsonCopy(input);
  const call = roll(owner, label, () => { throw new Error('MTE_SETUP: pure query drew RNG'); }, () => action(input));
  owner[label] = { inputBefore: before, inputAfter: jsonCopy(input), value: call.value, draws: call.draws };
  setup(isDeepStrictEqual(before, jsonCopy(input)), label + ' query input changed');
  return call.value;
}
function playUntil(context: Context, owner: any, state: CareerState, next: () => number,
  stop: (state: CareerState, kind: string) => boolean, label: string, limit = 400) {
  let current = state;
  for (let index = 0; index < limit; index += 1) {
    setup(!current.sacked, label + ' manager was sacked');
    const previousWeek = current.week;
    const call = roll(owner, label + ':' + index, next,
      () => context.model.playNextEntry(current, { skipHalftime: true, noCoach: true }));
    current = call.value.state;
    Object.assign(owner.calls[owner.calls.length - 1], { kind: call.value.kind, report: call.value.report,
      weekBefore: previousWeek, weekAfter: current.week, boardConfidence: current.boardConfidence });
    setup(!current.sacked, label + ' manager was sacked by actual play');
    if (stop(current, call.value.kind)) return current;
    setup(current.week > previousWeek, label + ' made no calendar progress');
  }
  throw new Error('MTE_SETUP: ' + label + ' exceeded its bounded public-entry search');
}
function warFor(context: Context, owner: any, state: CareerState, card: MarketPlayer) {
  setup(context.model.doorRefusal(state, card, 'talk') === null, 'actual Talk guard must be open before the war');
  const input = jsonCopy(state), before = jsonCopy(input);
  const opened = vector(owner, 'startNegotiation', [0.6, 0.99, 0.6], () => context.model.startNegotiation(input, card));
  setup(opened.draws.length === 3 && opened.value?.negotiation?.status === 'open', 'actual three-draw negotiation');
  setup(isDeepStrictEqual(before, jsonCopy(input)), 'opening negotiation mutated input');
  const amount = Math.round(opened.value.negotiation.theirAsk * 0.8 * 10) / 10;
  setup(amount <= state.budget && amount >= 0.1, 'actual rounded offer must be funded');
  const counterInput = jsonCopy(opened.value), counterBefore = jsonCopy(counterInput);
  const counter = vector(owner, 'makeOffer-counter', [0.6, 0.01, 0.5, 0.5], () => context.model.makeOffer(counterInput, amount));
  const neg = counter.value?.negotiation;
  setup(counter.draws.length === 4 && neg?.status === 'open' && neg.phase === 'fee'
    && neg.rivalBidder && neg.rivalOffer !== null && amount <= neg.rivalOffer, 'actual funded counter must produce the rival war');
  setup(isDeepStrictEqual(counterBefore, jsonCopy(counterInput)), 'counter mutated input');
  owner.war = { inputBefore: before, inputAfter: jsonCopy(input), card, opened: opened.value, amount,
    counterInputBefore: counterBefore, counterInputAfter: jsonCopy(counterInput), state: counter.value };
  retain();
  return { state: counter.value, amount };
}

let sale: { context: Context; state: CareerState; card: MarketPlayer; key: string; war: ReturnType<typeof warFor> };
let job: { context: Context; state: CareerState; card: MarketPlayer; key: string; line: TransferNews; opening: CareerState; openingCard: MarketPlayer };
let ordinary: { context: Context; state: CareerState; key?: string; war: ReturnType<typeof warFor> };

async function saleJourney() {
  const attempts: any[] = []; evidence.fixtures.sale = { attempts };
  for (let seed = 1; seed <= 6; seed += 1) {
    const context = await fresh(), next = stream(1344000 + seed), row: any = { seed, preparation: 'none' };
    attempts.push(row);
    const initialized = roll(row, 'startCareer', next, () => context.model.startCareer('Real Madrid'));
    const initial = initialized.value; row.initializer = initial; retain();
    const man = initial.squad.filter(p => p.age <= 25 && (p.contractYears ?? 0) >= 3 && !p.onLoan && !p.isYouth
      && p.position !== 'GK' && context.model.canLeaveSquad(initial, p)).sort((a, b) => (a.value ?? 0) - (b.value ?? 0))[0];
    if (!man) { row.notSelected = 'No young saleable long-contract original player'; continue; }
    row.originalPlayer = man;
    const listed = context.model.setTransferStatus(initial, man.id, 'listed'); row.listed = listed;
    const bids = jsonCopy(listed);
    roll(row, 'generateIncomingBids', () => 0.6, () => context.model.generateIncomingBids(bids)); row.generatedBids = bids;
    const bid = bids.incomingBids?.find(b => b.playerId === man.id && !b.loan && b.status === 'open');
    setup(bid && bid.club !== initial.clubName, 'public generated permanent bid for the listed man'); row.actualBid = bid;
    const accepted = roll(row, 'acceptBid', next, () => context.model.acceptBid(bids, man.id)).value;
    setup(accepted && !accepted.squad.some(p => p.id === man.id), 'public actual bid acceptance'); row.sold = accepted;
    const owned = records(context, accepted).filter(r => r.status === 'owned' && r.owner === bid.club && r.player.name === man.name);
    setup(owned.length === 1 && owned[0].player.wage !== undefined, 'sale canonical full wage-bearing record');
    const key = owned[0].key; row.key = key;
    let ended: CareerState;
    // Natural play only. An unfavourable seed is recorded and rejected, never rescued by changing the board.
    try { ended = playUntil(context, row, accepted, next, (_, kind) => kind === 'seasonOver', 'complete-season'); }
    catch (error) {
      if (String(error).includes('manager was sacked')) { row.notSelected = String(error); retain(); continue; }
      throw error;
    }
    setup(ended.week >= ended.calendar.length && !ended.sacked, 'finishSeason only after actual calendar exhaustion');
    row.seasonEnded = ended;
    const finished = roll(row, 'finishSeason', next, () => context.model.finishSeason(ended)); row.finished = finished.value;
    const rolled = roll(row, 'startNextSeason', next, () => context.model.startNextSeason(finished.value.state)).value;
    row.rollover = rolled;
    setup(rolled.season === initial.season + 1 && rolled.clubName === initial.clubName && rolled.transferWindow === 'summer', 'actual same-club summer rollover');
    const state = reload(context, row, rolled, 'rolloverReload');
    const held = record(context, state, key);
    setup(held?.owner === bid.club && held.status === 'owned' && held.player.wage !== undefined
      && (held.player.contractYears ?? 0) >= 2, 'original human sale and still-running deal survive the real rollover/load');
    const card = pureQuery(row, 'summerMarket', state, s => context.model.buildMarket(s))
      .find(p => p.worldRosterKey === key && p.club === bid.club);
    if (!card || card.price < 3 || card.price * 1.2 > state.budget || context.model.doorRefusal(state, card, 'talk') !== null) {
      row.notSelected = 'Natural summer card cannot reach the funded public negotiation'; retain(); continue;
    }
    setup(card.age < 28 && !state.goneNames.includes(card.name), 'young sold man returned to market at his actual buyer');
    const war = warFor(context, row, state, card); row.selected = true; retain();
    return { context, state, card, key, war };
  }
  throw new Error('MTE_SETUP: no natural sale/season/rollover fixture in six actual seeds');
}

async function jobJourney() {
  const attempts: any[] = []; evidence.fixtures.job = { attempts };
  for (let seed = 1; seed <= 6; seed += 1) {
    const context = await fresh(), next = stream(1344100 + seed), row: any = { seed, preparation: 'none' }; attempts.push(row);
    const initialized = roll(row, 'startCareer', next, () => context.model.startCareer('Everton')).value;
    row.initializer = initialized;
    row.initializerUndefinedPlayerFields = records(context, initialized).map(r => ({ key: r.key,
      fields: Object.entries(r.player).filter(([, value]) => value === undefined).map(([key]) => key) }));
    // Actual persistence removes own undefined fields just as actual play does.
    // Compare complete loaded payloads, without ignoring any retained player field.
    const opening = reload(context, row, initialized, 'openingReload');
    row.openingUndefinedPlayerFields = records(context, opening).map(r => ({ key: r.key,
      fields: Object.entries(r.player).filter(([, value]) => value === undefined).map(([key]) => key) }));
    const lines = aiLines(opening); setup(lines.length > 0, 'actual opening AI transfers'); row.originalLines = lines;
    const targets = context.model.applyTargets(opening).filter(t => context.model.jobApplyRefusal(opening, t.club) === null)
      .sort((a, b) => b.budget - a.budget || a.club.localeCompare(b.club));
    setup(targets.length > 0, 'actual available job application target'); row.applicationTarget = targets[0];
    const applied = vector(row, 'applyForJob', [0, 0], () => context.model.applyForJob(opening, targets[0].club));
    setup(applied.draws.length === 2 && applied.value?.jobHunt?.open?.status === 'pending'
      && applied.value.jobHunt.open.roll === 0, 'real public application stores the declared acceptance roll');
    row.applied = applied.value;
    const answered = playUntil(context, row, applied.value, next, s => s.jobHunt?.open?.status === 'accepted', 'application-answer', 24);
    row.accepted = answered;
    const joined = roll(row, 'joinClubNow', next, () => context.calendar.joinClubNow(answered)).value;
    setup(joined && joined.clubName === targets[0].club && !joined.sacked, 'actual accepted job handover'); row.joined = joined;
    const january = playUntil(context, row, joined, next, (_, kind) => kind === 'window', 'play-to-january');
    setup(january.transferWindow === 'january' && january.windowWeeksLeft === 3, 'stop at actual January window entry'); row.january = january;
    const state = reload(context, row, january, 'januaryReload');
    const screen = pureQuery(row, 'januaryMarket', state, s => context.model.marketForScreen(s));
    const openingScreen = pureQuery(row, 'openingMarket', opening, s => context.model.marketForScreen(s));
    const found = lines.map(line => {
      const source = records(context, opening).find(r => r.status === 'owned' && r.owner === line.to && r.player.name === line.name);
      const card = source && screen.find(p => p.worldRosterKey === source.key && p.club === line.to && p.joinedThisSeason);
      const openingCard = source && openingScreen.find(p => p.worldRosterKey === source.key && p.club === line.to);
      return { line, source, card, openingCard };
    }).find(({ line, source, card, openingCard }) => source && card && openingCard && line.to !== state.clubName
      && isDeepStrictEqual(record(context, joined, source.key), source)
      && isDeepStrictEqual(record(context, state, source.key), source)
      && (state.transferLog ?? []).filter(t => t.season === state.season && t.name === line.name && t.to === line.to && !t.loan)
        .every(t => t.from === line.from && t.fee === line.fee && t.week === line.week)
      && state.goneNames.includes(line.name) && card.price <= state.budget && card.price <= opening.budget
      && state.squad.length < 30 && opening.squad.length < 30
      && !state.squad.some(p => p.name === line.name) && !opening.squad.some(p => p.name === line.name)
      && !(state.coldNames ?? []).includes(line.name) && !state.negotiation
      && !(state.releasedNames ?? []).includes(line.name) && !(state.retiredNames ?? []).includes(line.name)
      && !(state.loanedOut ?? []).some(p => p.player.name === line.name));
    if (!found?.source || !found.card || !found.openingCard) {
      row.notSelected = 'No affordable unchanged original AI deal without a matching run-in/January line'; retain(); continue;
    }
    const { line, source, card, openingCard } = found;
    setup(context.model.doorRefusal(opening, openingCard, 'talk')?.includes('only joined')
      && context.model.doorRefusal(opening, openingCard, 'buy')?.includes('only joined'), 'actual original deal has both old signing locks');
    row.selected = { line, key: source.key, card, openingCard }; retain();
    return { context, state, card, key: source.key, line, opening, openingCard };
  }
  throw new Error('MTE_SETUP: no naturally carried affordable AI signing after six actual application/join/January journeys');
}

async function ordinaryJourney() {
  const context = await fresh(), row: any = {}; evidence.fixtures.ordinary = row;
  const state = roll(row, 'startCareer', stream(1344201), () => context.model.startCareer('Real Madrid')).value;
  row.initializer = state;
  const card = context.model.buildMarket(state).find(p => !p.generated && p.position !== 'GK' && p.age < 27
    && p.price >= 3 && p.price * 1.2 <= state.budget && context.model.aiDealPlayer(state, p) !== null
    && context.model.worldRosterFor(state, p.club).filter(x => x.n === p.name && x.a === p.age).length === 1);
  setup(card, 'ordinary actual affordable unrecorded AI player');
  const war = warFor(context, row, state, card);
  return { context, state, key: card.worldRosterKey, war };
}

beforeAll(() => {
  vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-10-16T12:00:00Z'));
});
async function prepareFixture<T>(label: string, action: () => Promise<T>) {
  try { return await action(); }
  catch (error) { evidence.fixtures.setupError = { fixture: label, error: String(error) }; retain(); throw error; }
}
afterAll(() => { retain(); vi.restoreAllMocks(); localStorage.clear(); sessionStorage.clear(); });

function observe(id: string, action: (row: any) => boolean, cause: string) {
  const row: any = { id }; evidence.cases[id] = row;
  try { row.correct = action(row); retain(); }
  catch (error) { row.error = String(error); retain(); throw error; }
  expect(row.correct, cause + ': actual public outcome').toBe(true);
}
function close(context: Context, row: any, war: ReturnType<typeof warFor>, kind: 'hijack' | 'walk') {
  const input = jsonCopy(war.state), before = jsonCopy(input);
  setup(!announces(before, before), 'no matching rival purchase was already published');
  const call = vector(row, kind, [0.01], () => kind === 'hijack'
    ? context.model.makeOffer(input, war.amount) : context.model.walkAway(input));
  setup(call.value && call.draws.length === 1, 'actual rival close one-draw vector');
  row.inputBefore = before; row.inputAfter = jsonCopy(input); row.actual = call.value; row.draws = call.draws;
  setup(isDeepStrictEqual(before, jsonCopy(input)), 'rival-close input mutation');
  return call.value;
}
function announces(state: CareerState, prior: CareerState) {
  const neg = prior.negotiation!;
  return (state.transferLog ?? []).some(t => t.name === neg.player.name && t.from === neg.player.club
    && t.to === neg.rivalBidder && t.season === state.season && !t.loan);
}

describe('I1344 prior human sale journey', () => {
  beforeAll(async () => { sale = await prepareFixture('sale', saleJourney); }, 840000);

  it('prior human sale hijack cannot announce an ownership-refused transfer', () => observe('sale-hijack', row => {
    const after = close(sale.context, row, sale.war, 'hijack');
    row.beforeRecord = record(sale.context, sale.war.state, sale.key); row.afterRecord = record(sale.context, after, sale.key);
    row.published = announces(after, sale.war.state);
    setup(isDeepStrictEqual(row.beforeRecord, row.afterRecord), 'rule 3 must still refuse taking the human-sold man');
    return !row.published && after.negotiation?.status !== 'hijacked';
  }, 'MTE_SALE_HIJACK'));

  it('prior human sale walk-away cannot announce an ownership-refused transfer', () => observe('sale-walk', row => {
    const after = close(sale.context, row, sale.war, 'walk');
    row.beforeRecord = record(sale.context, sale.war.state, sale.key); row.afterRecord = record(sale.context, after, sale.key);
    row.published = announces(after, sale.war.state);
    row.falseHeadline = after.aiHeadlines.some(line => line.includes(sale.card.name) && line.includes(sale.war.state.negotiation!.rivalBidder!));
    setup(isDeepStrictEqual(row.beforeRecord, row.afterRecord), 'rule 3 must still refuse taking the human-sold man');
    return !row.published && !row.falseHeadline;
  }, 'MTE_SALE_WALK'));

  it('human-sale rule 3 keeps the full owned payload and takes no RNG', () => observe('preserve-sale-rule', row => {
    const input = jsonCopy(sale.state), before = jsonCopy(input);
    const call = roll(row, 'aiDealPlayer', () => { throw new Error('MTE_SETUP: rule 3 drew RNG'); },
      () => sale.context.model.aiDealPlayer(input, sale.card));
    const rival = sale.war.state.negotiation!.rivalBidder!;
    const refused = roll(row, 'recordAiDeals', () => { throw new Error('MTE_SETUP: recording drew RNG'); },
      () => sale.context.model.recordAiDeals(input, [{ mp: sale.card, to: rival, fee: sale.war.state.negotiation!.rivalOffer! }]));
    row.inputBefore = before; row.inputAfter = jsonCopy(input); row.payload = record(sale.context, input, sale.key);
    row.resolver = call.value; row.actual = refused.value;
    return call.value === null && call.draws.length === 0 && refused.draws.length === 0
      && isDeepStrictEqual(before, jsonCopy(input)) && isDeepStrictEqual(before, jsonCopy(refused.value))
      && (row.payload.player.contractYears ?? 0) >= 2 && row.payload.player.wage !== undefined;
  }, 'MTE_PRESERVATION'));
});

describe('I1344 ordinary AI transfers', () => {
  beforeAll(async () => { ordinary = await prepareFixture('ordinary', ordinaryJourney); }, 840000);

  it('ordinary AI rival closes still record both actual purchases', () => observe('preserve-ai-closes', row => {
    const neg = ordinary.war.state.negotiation!;
    const outcomes: any[] = [];
    for (const kind of ['hijack', 'walk'] as const) {
      const arm: any = { kind }; outcomes.push(arm);
      const after = close(ordinary.context, arm, ordinary.war, kind);
      const owned = records(ordinary.context, after).filter(r => r.status === 'owned' && r.owner === neg.rivalBidder
        && r.player.name === neg.player.name);
      arm.owned = owned; arm.published = announces(after, ordinary.war.state);
      arm.placed = owned.length === 1 && ordinary.context.model.worldRosterFor(after, neg.rivalBidder!)
        .some(p => p.worldRosterKey === owned[0].key)
        && !ordinary.context.model.worldRosterFor(after, neg.player.club).some(p => p.worldRosterKey === owned[0].key);
    }
    row.outcomes = outcomes;
    return outcomes.every(arm => arm.placed && arm.published);
  }, 'MTE_PRESERVATION'));
});

describe('I1344 actual job handover journey', () => {
  beforeAll(async () => { job = await prepareFixture('job', jobJourney); }, 840000);

  it('carried current-season AI signing keeps its Talk lock after job move and reload', () => observe('job-talk', row => {
    const input = jsonCopy(job.state), before = jsonCopy(input);
    row.card = job.card;
    const why = pureQuery(row, 'door', input, s => job.context.model.doorRefusal(s, job.card, 'talk'));
    const call = vector(row, 'startNegotiation', [0.6, 0.99, 0.6], () => job.context.model.startNegotiation(input, job.card));
    row.inputBefore = before; row.inputAfter = jsonCopy(input); row.actual = call.value; row.draws = call.draws;
    setup(isDeepStrictEqual(before, jsonCopy(input)), 'Talk input mutation');
    if (call.value) row.actionReload = reload(job.context, row, call.value, 'talkResultReload');
    return typeof why === 'string' && why.includes('only joined') && call.value === null && call.draws.length === 0;
  }, 'MTE_JOB_TALK'));

  it('carried current-season AI signing keeps its buy lock after job move and reload', () => observe('job-buy', row => {
    const input = jsonCopy(job.state), before = jsonCopy(input); row.card = job.card;
    const why = pureQuery(row, 'door', input, s => job.context.model.doorRefusal(s, job.card, 'buy'));
    const call = roll(row, 'buyPlayer', stream(1344301), () => job.context.model.buyPlayer(input, job.card));
    row.inputBefore = before; row.inputAfter = jsonCopy(input); row.actual = call.value; row.draws = call.draws;
    setup(isDeepStrictEqual(before, jsonCopy(input)), 'buy input mutation');
    if (call.value) row.actionReload = reload(job.context, row, call.value, 'buyResultReload');
    return typeof why === 'string' && why.includes('only joined') && call.value === null && call.draws.length === 0;
  }, 'MTE_JOB_BUY'));

  it('original current-season AI signing refuses actual Talk and buy before the job move', () => observe('preserve-original-lock', row => {
    const input = jsonCopy(job.opening), before = jsonCopy(input);
    row.card = job.openingCard;
    const talk = pureQuery(row, 'talkDoor', input, s => job.context.model.doorRefusal(s, job.openingCard, 'talk'));
    const buy = pureQuery(row, 'buyDoor', input, s => job.context.model.doorRefusal(s, job.openingCard, 'buy'));
    const action = roll(row, 'refusedActions', () => { throw new Error('MTE_SETUP: refused action drew RNG'); }, () => ({
      talk: job.context.model.startNegotiation(input, job.openingCard), buy: job.context.model.buyPlayer(input, job.openingCard),
    }));
    row.inputBefore = before; row.inputAfter = jsonCopy(input); row.actual = action.value;
    return typeof talk === 'string' && talk.includes('only joined') && typeof buy === 'string' && buy.includes('only joined')
      && action.value.talk === null && action.value.buy === null && action.draws.length === 0
      && isDeepStrictEqual(before, jsonCopy(input));
  }, 'MTE_PRESERVATION'));

  it('job move and actual January save retain the departed full player identity', () => observe('preserve-job-identity', row => {
    const source = record(job.context, job.opening, job.key), held = record(job.context, job.state, job.key);
    const loaded = reload(job.context, row, job.state, 'secondReload');
    const input = jsonCopy(loaded);
    const market = pureQuery(row, 'market', input, s => job.context.model.marketForScreen(s));
    row.sourceRecord = source; row.loadedRecord = record(job.context, loaded, job.key); row.carriedRecord = held;
    row.line = job.line;
    return !!source && isDeepStrictEqual(source, held) && isDeepStrictEqual(held, row.loadedRecord)
      && source.owner !== job.state.clubName && source.player.wage === undefined
      && job.state.goneNames.includes(job.line.name) && loaded.goneNames.includes(job.line.name)
      && market.some(p => p.worldRosterKey === job.key && p.club === source.owner && p.joinedThisSeason)
      && !(loaded.transferLog ?? []).some(t => sameLine(t, job.line))
      && job.state.season === job.opening.season && job.state.worldSeed === job.opening.worldSeed;
  }, 'MTE_PRESERVATION'));
});
