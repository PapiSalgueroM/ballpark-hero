import { NFL_CAREER_SPORT } from '@/lib/nflCareerSport';
import { NBA_CAREER_SPORT } from '@/lib/nbaCareerSport';
import { MLB_CAREER_SPORT } from '@/lib/mlbCareerSport';
import { NHL_CAREER_SPORT } from '@/lib/nhlCareerSport';
import { defaultAppearance } from '@/lib/soccerCareerAppearance';
import { pushHeadlines } from '@/lib/careerSocial';
import { startSummer, answerSummerCard, seekSummerCard } from '@/lib/usCareerSummer';
import { talkDeckFilter } from '@/lib/usCareerRetirementFlow';
import { nbaEraTeamIds } from '@/lib/nbaMyCareer';
import type { UsCareerCore, UsCareerEvent, UsCareerSport } from '@/lib/usCareerSport';

/* Round 1038: these tests hold the one card offseason (one answer, then the
   receipt, then the hub), so every binding is mounted on the one card knob,
   the same knob the parity replay uses. The summer's own flow, receipt
   included, is src/test/usCareerSummer.test.tsx. */
const ONE_CARD = { cards: 1, cooldowns: false, fallbackCooldown: 1 };
export const decisionSports: Record<string, UsCareerSport> = {
  nba: { ...NBA_CAREER_SPORT, summer: ONE_CARD }, nfl: { ...NFL_CAREER_SPORT, summer: ONE_CARD },
  mlb: { ...MLB_CAREER_SPORT, summer: ONE_CARD }, nhl: { ...NHL_CAREER_SPORT, summer: ONE_CARD },
};
export const copyCareer = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
export const decisionSave = (c: UsCareerCore, teamQuality = 60, phase = 'season') => JSON.stringify({ c, phase, teamQuality, coach: null });

export function makeDecisionCareer(slug: string): UsCareerCore {
  const sport = decisionSports[slug], pos = sport.create.defaultPos;
  const c = sport.startCareer(`Fixture ${sport.label} Decision`, pos, sport.create.archetypes[pos][0], () => .5, defaultAppearance(), 'now');
  Object.assign(c, { year: 2030, age: 24, ovr: 82, pot: 90, health: 98, morale: 70, fanbase: 60,
    salary: 4, earnings: 10, netWorth: 20, contractYears: 4, role: 'starter', retired: false, seasons: [], purchased: [],
    pendingRivalryEvent: null, pendingRivalryChoice: null });
  delete c.rival;
  return c;
}

// Select an existing engine event. Its apply functions remain the real sport functions.
export function realDecisionEvent(slug: string, id = 'training'): UsCareerEvent<UsCareerCore> {
  const c = makeDecisionCareer(slug);
  if (id !== 'training') { c.morale = 40; c.health = 60; }
  for (let index = 0; index < 512; index++) {
    const event = decisionSports[slug].drawEvent(copyCareer(c), () => index / 512);
    if (event.id === id) return event;
  }
  throw new Error(`The real ${slug} deck no longer offers ${id} for its eligible fixture`);
}

export function advanceDecisionSeason(slug: string, initial: UsCareerCore, quality: number, rng: () => number) {
  const sport = decisionSports[slug], c = copyCareer(initial);
  sport.campBattle(c, quality, rng);
  const { line } = sport.simSeason(c, quality, rng);
  sport.progress(c, rng);
  c.headlines = pushHeadlines(c.headlines, sport.headlinesFor(c, line));
  return c;
}

// Native input replays this real engine draw tape. No product event is replaced.
export function nativeDecisionFixture(slug: string, expanded = false) {
  const sport = decisionSports[slug];
  const eventId = expanded ? 'nbaA_card_show' : 'training', optionIndex = expanded ? 0 : 1;
  for (const roll of [.5, .37, .61, .75, .9]) {
    const initial = makeDecisionCareer(slug), quality = 60, tape: number[] = [];
    const before = advanceDecisionSeason(slug, initial, quality, () => { tape.push(roll); return roll; });
    if (sport.shouldRetire(before) || before.health !== 98 || before.pendingRivalryEvent || before.pendingRivalryChoice) continue;
    let draws = 0;
    sport.drawEvent(copyCareer(before), () => { draws++; return roll; });
    if (!draws) continue;
    for (let last = 0; last < 100; last++) {
      let count = 0;
      const eventTape: number[] = [];
      const pending = copyCareer(before);
      const event = sport.drawEvent(pending, () => {
        const value = ++count === draws ? last / 100 : roll; eventTape.push(value); return value;
      });
      if (event.id !== eventId) continue;
      if (expanded && (pending.fanbase > 95 || pending.morale < 2 || typeof pending.netWorth !== 'number')) continue;
      const after = copyCareer(pending), option = event.options[optionIndex];
      option.apply(after, () => .5);
      const nextQuality = sport.rollTeamQuality(quality, () => .5);
      const amount = (n: number) => String(Number(n.toFixed(6)));
      const expectedRows = expanded ? [
        { key: 'health', label: 'Health', before: amount(pending.health), after: amount(pending.health - 1), delta: '-1' },
        { key: 'morale', label: 'Morale', before: amount(pending.morale), after: amount(pending.morale - 2), delta: '-2' },
        { key: 'fanbase', label: 'Fanbase', before: amount(pending.fanbase), after: amount(pending.fanbase + 5), delta: '+5' },
        ...(['earnings', 'netWorth'] as const).map(key => {
          const from = pending[key]!, to = Math.round((from + .12) * 10) / 10;
          if (after[key] !== to) throw new Error('The real card-show money no longer follows its saved rounding');
          return { key, label: key === 'earnings' ? 'Career earnings' : 'Cash', before: `$${amount(from)}M`, after: `$${amount(to)}M`, delta: `+$${amount(to - from)}M` };
        }),
      ] : [{ key: 'health', label: 'Health', before: '98', after: '100', delta: '+2' }];
      if (after.health !== (expanded ? 97 : 100)) throw new Error('The real choice no longer applies its expected health change');
      return { slug, expanded, eventId, optionIndex, expectedRows, initial, quality, before: pending, after, eventTitle: event.title, choice: option.label,
        tape: [...tape, ...eventTape], appliedBytes: decisionSave(after, nextQuality), pendingBytes: decisionSave(pending, quality, 'event') };
    }
  }
  throw new Error(`No deterministic ${slug} ${eventId} fixture reached the real deck`);
}

// The third season and its card come from the real NBA binding. The expected
// trade is independent of both the option application and the quality roller.
export function nativeTradeDecisionFixture() {
  const slug = 'nba', sport = decisionSports[slug], quality = 80;
  const eventId = 'nbaC_rule_salary_match', optionIndex = 1;
  for (const roll of [.5, .61, .75, .9, .37]) {
    let initial = makeDecisionCareer(slug);
    for (let season = 0; season < 2; season++) initial = advanceDecisionSeason(slug, initial, quality, () => roll);
    if (initial.pendingRivalryEvent || initial.pendingRivalryChoice) continue;
    const tape: number[] = [];
    const before = advanceDecisionSeason(slug, initial, quality, () => { tape.push(roll); return roll; });
    if (sport.shouldRetire(before) || before.ovr > 86 || before.contractYears < 1 || before.pendingRivalryEvent || before.pendingRivalryChoice) continue;
    let draws = 0;
    sport.drawEvent(copyCareer(before), () => { draws++; return roll; });
    if (!draws) continue;
    for (let last = 0; last < 512; last++) {
      let count = 0;
      const eventTape: number[] = [], pending = copyCareer(before);
      const event = sport.drawEvent(pending, () => {
        const value = ++count === draws ? last / 512 : roll; eventTape.push(value); return value;
      });
      if (event.id !== eventId) continue;
      const pool = nbaEraTeamIds('now').filter(id => id !== pending.team);
      const after = copyCareer(pending);
      after.team = pool[Math.floor(.1 * pool.length)];
      after.morale = Math.max(0, Math.min(100, pending.morale - 8));
      after.fanbase = 44;
      const amount = (n: number) => String(Number(n.toFixed(6)));
      const expectedRows = [
        { key: 'team', label: 'Team', before: sport.teamLabelOf(pending.team, pending.eraId), after: sport.teamLabelOf(after.team, after.eraId), delta: null },
        ...(['morale', 'fanbase'] as const).map(key => ({
          key, label: key === 'morale' ? 'Morale' : 'Fanbase', before: amount(pending[key]), after: amount(after[key]),
          delta: `${after[key] > pending[key] ? '+' : ''}${amount(after[key] - pending[key])}`,
        })),
      ];
      return { slug, caseId: 'salary-match-trade', expanded: false, eventId, optionIndex, expectedRows, initial, quality,
        before: pending, after, eventTitle: event.title, choice: event.options[optionIndex].label,
        tape: [...tape, ...eventTape], choiceTape: [.9, .1, .7],
        appliedBytes: decisionSave(after, 82), pendingBytes: decisionSave(pending, quality, 'event') };
    }
  }
  throw new Error('No deterministic third-season NBA salary matching card reached the real deck');
}

/* The built app uses the current summer. The one-card exports above remain the
   mounted ordinary-path fixtures; native walks use the real binding below. */
const nativeDecisionSports: Record<string, UsCareerSport> = {
  nba: NBA_CAREER_SPORT, nfl: NFL_CAREER_SPORT, mlb: MLB_CAREER_SPORT, nhl: NHL_CAREER_SPORT,
};

function withCurrentSummer(fixture: ReturnType<typeof nativeDecisionFixture> | ReturnType<typeof nativeTradeDecisionFixture>) {
  const { slug, quality } = fixture, sport = nativeDecisionSports[slug], roll = fixture.tape[0];
  const season = advanceDecisionSeason(slug, fixture.initial, quality, () => roll);
  for (let salt = 0; salt < 4096; salt++) {
    const initial = copyCareer(fixture.initial), probe = copyCareer(season);
    initial.summerSalt = probe.summerSalt = `native-decision-${salt}`;
    const offered = startSummer(probe, sport, () => roll, talkDeckFilter(probe, sport.hall));
    if (offered?.id !== fixture.eventId) continue;
    const tape: number[] = [];
    const pending = advanceDecisionSeason(slug, initial, quality, () => { tape.push(roll); return roll; });
    const event = startSummer(pending, sport, () => { tape.push(roll); return roll; }, talkDeckFilter(pending, sport.hall));
    if (event?.id !== fixture.eventId) continue;
    const after = copyCareer(pending), choiceTape: number[] = [];
    const preset = 'choiceTape' in fixture ? fixture.choiceTape : [];
    const choiceRng = () => { const value = preset[choiceTape.length] ?? .5; choiceTape.push(value); return value; };
    const next = answerSummerCard(after, sport, event, fixture.optionIndex, choiceRng, talkDeckFilter(after, sport.hall)).next;
    const nextQuality = next ? quality : sport.rollTeamQuality(quality, choiceRng);
    const cursor = copyCareer(after), followUps = [];
    let currentQuality = nextQuality, card = seekSummerCard(cursor, sport, talkDeckFilter(cursor, sport.hall));
    for (let slot = 0; card && slot < sport.summer.cards; slot++) {
      const eventId = card.id, choice = card.options[0].label, values: number[] = [];
      const rng = () => { values.push(.5); return .5; };
      const more = answerSummerCard(cursor, sport, card, 0, rng, talkDeckFilter(cursor, sport.hall)).next;
      if (!more) currentQuality = sport.rollTeamQuality(currentQuality, rng);
      followUps.push({ eventId, choice, optionIndex: 0, choiceTape: values,
        appliedBytes: decisionSave(cursor, currentQuality, more ? 'event' : 'season') });
      card = seekSummerCard(cursor, sport, talkDeckFilter(cursor, sport.hall));
    }
    if (card) throw new Error('The real summer exceeded its declared card bound');
    return { ...fixture, initial, tape, choiceTape, before: pending, after, eventTitle: event.title,
      choice: event.options[fixture.optionIndex].label, pendingBytes: decisionSave(pending, quality, 'event'),
      appliedBytes: decisionSave(after, nextQuality, next ? 'event' : 'season'), followUps,
      finishedBytes: decisionSave(cursor, currentQuality) };
  }
  throw new Error(`No current ${slug} summer offered the real ${fixture.eventId} fixture first`);
}

export const nativeSummerDecisionFixture = (slug: string, expanded = false) =>
  withCurrentSummer(nativeDecisionFixture(slug, expanded));
export const nativeSummerTradeDecisionFixture = () => withCurrentSummer(nativeTradeDecisionFixture());
