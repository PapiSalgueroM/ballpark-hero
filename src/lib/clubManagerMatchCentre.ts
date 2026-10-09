/**
 * Round 714: the match centre's extra numbers and its timeline, master spec
 * sections 43 (match center) and 45 (event timeline), for Club Manager.
 *
 * Two readers over what the engine already committed, and nothing else.
 *
 *  - cardsAndSubsAt counts the bookings and the substitutions both dugouts
 *    made up to a minute, off the card and sub lines the halves drew. The
 *    live strip and the report's stats block both read it, so the two can
 *    never disagree.
 *  - timelineRows turns the report's timeline (MatchDetail.timeline, built
 *    once in buildMatchDetail) into rows for the screen: the minute the way a
 *    scoreboard writes it (45+2' at the break, 90+5' at the whistle), an icon,
 *    the words and the name. The full view is every row the engine wrote; the
 *    key view leaves out the shots off target and the corners, which the stats
 *    block already counts.
 *
 * What the engine does not model, so no screen shows it: offsides, passes,
 * tackles and interceptions. There is no chain of passes in the sim, only a
 * share of the ball per half, so a pass count would be a number made up at
 * the screen. Same for "big chances": a chance's expected goals is dealt out
 * by how the chance ended (a goal 3, a save 1.5, a miss 1), so there is no
 * chance quality to call one big. The penalty is the one big chance the sim
 * really draws, and it is on the timeline.
 */
import type { CardLine, LiveMatch, MatchDetail, SubLine, TimelineKind } from './clubManager';
import { minuteLabel, playedBy } from '@/lib/clubManagerClock';
import { scorerMark } from '@/lib/clubManagerScorerLine';

export interface CardsAndSubs {
  yellows: number; oppYellows: number;
  reds: number; oppReds: number;
  subs: number; oppSubs: number;
}

/** Both dugouts' committed bookings and changes. */
export interface CommittedLines {
  cards: CardLine[]; oppCards: CardLine[];
  subs: SubLine[]; oppSubs: SubLine[];
}

/** Bookings and changes up to and including a minute. A second yellow is a red card line, as the engine writes it.
 *  Round 781: with `plus` the clock stands inside the board of `minute` and a line deeper into it has not happened yet. */
export function cardsAndSubsAt(lines: CommittedLines, minute: number, plus?: number): CardsAndSubs {
  const upTo = <T extends { minute: number; plus?: number }>(xs: T[]): T[] => xs.filter(playedBy(minute, plus));
  const cards = upTo(lines.cards);
  const oppCards = upTo(lines.oppCards);
  return {
    yellows: cards.filter(c => c.kind === 'yellow').length,
    oppYellows: oppCards.filter(c => c.kind === 'yellow').length,
    reds: cards.filter(c => c.kind === 'red').length,
    oppReds: oppCards.filter(c => c.kind === 'red').length,
    subs: upTo(lines.subs).length,
    oppSubs: upTo(lines.oppSubs).length,
  };
}

/** The live match's lines, both halves (a half is drawn ahead, so read it at a minute). */
export function liveLines(live: Pick<LiveMatch, 'h1Cards' | 'h2Cards' | 'h1OppCards' | 'h2OppCards' | 'subs' | 'oppSubs'>): CommittedLines {
  return {
    cards: [...(live.h1Cards ?? []), ...(live.h2Cards ?? [])],
    oppCards: [...(live.h1OppCards ?? []), ...(live.h2OppCards ?? [])],
    subs: live.subs ?? [],
    oppSubs: live.oppSubs ?? [],
  };
}

/** The report's lines, or null on a report that never recorded the other dugout (before Round 504), so no zero is printed for them. */
export function reportLines(d: Pick<MatchDetail, 'cards' | 'subs' | 'oppCards' | 'oppSubs'>): CommittedLines | null {
  if (!d.oppCards || !d.oppSubs) return null;
  return { cards: d.cards, oppCards: d.oppCards, subs: d.subs, oppSubs: d.oppSubs };
}

export type TimelineView = 'key' | 'all';

/** What the key view leaves out. Everything else the engine wrote is shown in both views. */
export const ALL_VIEW_ONLY: readonly TimelineKind[] = ['shot', 'corner'];

export interface TimelineRow {
  key: string;
  kind: TimelineKind;
  side: 'me' | 'opp' | 'none';
  /** The clock the way a scoreboard writes it: 63', 45+2', 90+5', 105'. */
  clock: string;
  icon: string;
  /** The words, e.g. "Penalty saved"; the screen prints "label: name". */
  label: string;
  /** The man, or '' when there is nobody to name (a nameless opposition, a clock row). */
  name: string;
  /** Round 1146, goals only: the mark printed after the scorer's name (" (P)", " (O.G)"), absent on a goal with none. */
  mark?: string;
  /** A goal's assist, or a sub's man going off. */
  second?: string;
  /** Opposition only: a man the game made up. */
  gen?: boolean;
  secondGen?: boolean;
}

const ICON: Record<TimelineKind, string> = {
  kickoff: '⏱️', goal: '⚽', yellow: '🟨', red: '🟥', injury: '🩹', sub: '🔁',
  halftime: '⏸️', fulltime: '🏁', pens: '🥅', extratime: '⏱️',
  shot: '💨', save: '🧤', corner: '🚩', penalty: '🎯',
};

/**
 * The report's timeline as screen rows, in the engine's own order. Every row
 * comes from one TimelineEvent; nothing is added and, in the full view,
 * nothing is dropped.
 */
export function timelineRows(d: MatchDetail, view: TimelineView): TimelineRow[] {
  const made = new Set<string>();
  for (const p of d.oppXi ?? []) if (p.g) made.add(p.n);
  for (const p of d.oppRatings ?? []) if (p.gen) made.add(p.name);
  for (const s of d.oppSubs ?? []) {
    if (s.onGen) made.add(s.on);
    if (s.offGen) made.add(s.off);
  }
  for (const c of d.oppCards ?? []) if (c.gen) made.add(c.name);
  const genOf = (side: string, name: string): boolean => side === 'opp' && !!name && made.has(name);
  const addedH1 = d.added ? `45+${d.added.h1}'` : "45'";
  const addedH2 = d.added ? `90+${d.added.h2}'` : "90'";
  /* Round 781: the whistle after extra time wears its own board when one was drawn. */
  const addedEt = d.et ? (d.added?.et ? `${d.et.to}+${d.added.et}'` : `${d.et.to}'`) : addedH2;
  const stripBoard = (t: string): string => t.replace(/ \(\+\d+'\)/, '');
  const out: TimelineRow[] = [];
  d.timeline.forEach((e, i) => {
    if (view === 'key' && ALL_VIEW_ONLY.includes(e.kind)) return;
    const base = { key: `${i}:${e.kind}:${e.side}:${e.minute}`, kind: e.kind, side: e.side, icon: ICON[e.kind] ?? '•' };
    /* Round 781: a row in the board reads 45+2' or 90+5', off the line's own plus. */
    const at = minuteLabel(e);
    switch (e.kind) {
      case 'kickoff':
        out.push({ ...base, clock: "0'", label: 'Kick off', name: '' });
        return;
      case 'halftime':
        out.push({ ...base, clock: addedH1, label: 'Half time', name: '' });
        return;
      case 'extratime':
        out.push({ ...base, clock: addedH2, label: stripBoard(e.text), name: '' });
        return;
      case 'fulltime':
        out.push({ ...base, clock: addedEt, label: stripBoard(e.text), name: '' });
        return;
      case 'pens':
        out.push({ ...base, clock: 'Pens', label: e.side === 'me' ? 'Won the shootout' : 'Lost the shootout', name: '' });
        return;
      case 'goal': {
        const m = e.text.match(/^(.*) \(assist: (.*)\)$/);
        const name = m ? m[1] : e.text;
        out.push({
          ...base, clock: at,
          /* Round 1146: a goal that wears a mark is just "Goal" here; the mark after the name says the rest.
             The row used to say it twice ("Goal, penalty: X (P)", "Own goal: X (O.G)") in a column 119 px wide
             on a phone, and the second copy, the mark, was what the ellipsis ate. */
          label: e.og || e.penalty ? 'Goal' : e.freeKick ? 'Goal, free kick' : 'Goal',
          /* Round 1146: the man behind an own goal plays for the other side, so that is the side his MADE UP tag is read on. */
          name, gen: genOf(e.og ? (e.side === 'me' ? 'opp' : 'me') : e.side, name),
          /* Round 1146: the same mark the scorer lists print, from the same function. */
          ...(scorerMark(e) ? { mark: scorerMark(e) } : {}),
          ...(m ? { second: m[2] } : {}),
        });
        return;
      }
      case 'sub': {
        const cut = e.text.indexOf(' on for ');
        const on = cut > 0 ? e.text.slice(0, cut) : e.text;
        const off = cut > 0 ? e.text.slice(cut + 8) : '';
        out.push({ ...base, clock: at, label: 'Sub', name: on, gen: genOf(e.side, on), second: off, secondGen: genOf(e.side, off) });
        return;
      }
      default: {
        const label =
          e.kind === 'yellow' ? 'Booked'
          : e.kind === 'red' ? 'Sent off'
          : e.kind === 'injury' ? 'Injured'
          : e.kind === 'shot' ? 'Shot off target'
          : e.kind === 'save' ? (e.penalty ? 'Penalty saved' : 'Shot saved')
          : e.kind === 'corner' ? 'Corner'
          : e.kind === 'penalty' ? 'Penalty'
          : e.text;
        out.push({ ...base, clock: at, label, name: e.text, gen: genOf(e.side, e.text) });
      }
    }
  });
  return out;
}
