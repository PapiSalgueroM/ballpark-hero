/**
 * Round 1311: Club Manager's league leaders. Since Round 1229 the save keeps a league book (every rival
 * goal of the league season to a named man, with assists and clean sheets) and Round 1306 built its pure
 * reader. This card prints it on the Stats screen: three small tiles (Top scorers, Assists, Clean sheets)
 * that each open the league's top ten with a back button, an honest line when a league's squad data is
 * thin or the book started late, and a "?" with the rules and a worked example computed from the very
 * rule the book deals by (dealShares over leagueBookRules), never typed.
 *
 * Everything comes through the engine's one door, leagueBoardsOf, which reads and never writes. A board
 * open is drawn alone: StatsScreen hides everything else while `board` is set, and Back puts the tiles
 * back where they were.
 */
import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { careerLeagueOf, leagueBoardsOf, leagueBookRules } from '@/lib/clubManager';
import type { CareerState } from '@/lib/clubManager';
import { AWARD_FLOOR, BOOK_FULL_SHARE, TEAMS_KEPT, bestOfMine, leaders, type BoardKind, type BoardMan } from '@/lib/clubManagerLeagueBoards';
import { dealShares, type BookMan } from '@/lib/clubManagerLeagueBook';
import { MadeUpTag } from '@/components/club-manager/SquadScreen';
import { SeasonHonoursCard } from '@/components/club-manager/SeasonHonoursCard';

/** A board of the card: one of the three, or the past winners. */
export type LeadersBoard = BoardKind | 'past';

const KINDS: { kind: BoardKind; label: string; icon: string }[] = [
  { kind: 'goals', label: 'Top scorers', icon: '⚽' },
  { kind: 'assists', label: 'Assists', icon: '🅰️' },
  { kind: 'sheets', label: 'Clean sheets', icon: '🧤' },
];

/** 1st, 2nd, 3rd, 4th, 11th, 21st. */
export function ordinal(n: number): string {
  const teen = n % 100 >= 11 && n % 100 <= 13;
  const s = teen ? 'th' : n % 10 === 1 ? 'st' : n % 10 === 2 ? 'nd' : n % 10 === 3 ? 'rd' : 'th';
  return `${n}${s}`;
}

/** The side of the worked example: roles and ratings only, never a real man. */
export const EXAMPLE_ELEVEN: readonly { role: string; man: BookMan }[] = [
  { role: 'striker', man: { n: 'striker', p: 'ST', r: 84 } },
  { role: 'winger', man: { n: 'winger', p: 'RW', r: 80 } },
  { role: 'number ten', man: { n: 'ten', p: 'CAM', r: 78 } },
  { role: 'central midfielder', man: { n: 'cm one', p: 'CM', r: 76 } },
  { role: 'central midfielder', man: { n: 'cm two', p: 'CM', r: 75 } },
  { role: 'holder', man: { n: 'holder', p: 'CDM', r: 74 } },
  { role: 'back four', man: { n: 'right back', p: 'RB', r: 75 } },
  { role: 'back four', man: { n: 'centre back one', p: 'CB', r: 74 } },
  { role: 'back four', man: { n: 'centre back two', p: 'CB', r: 74 } },
  { role: 'back four', man: { n: 'left back', p: 'LB', r: 73 } },
  { role: 'keeper', man: { n: 'keeper', p: 'GK', r: 72 } },
];

const per100 = (x: number): number => Math.round(x * 100);

/** The worked example's numbers, in a hundred of the side's goals, from the rule the book deals by. */
export function exampleNumbers(): { men: { name: string; role: string; n: number; setPieces: number }[]; backFour: number; ownGoals: number; pen: number; fk: number; assistInTen: number } {
  const rules = leagueBookRules();
  const { men, ownGoals } = dealShares(EXAMPLE_ELEVEN.map(e => e.man), rules);
  const roleOf = new Map(EXAMPLE_ELEVEN.map(e => [e.man.n, e.role]));
  const rows = men.map(m => ({ name: m.man.n, role: roleOf.get(m.man.n) ?? '', n: per100(m.share), setPieces: per100(m.setPieces) }));
  const backFour = per100(men.filter(m => roleOf.get(m.man.n) === 'back four').reduce((s, m) => s + m.share, 0));
  return { men: rows.filter(r => r.role !== 'back four'), backFour, ownGoals: per100(ownGoals), pen: per100(rules.pen), fk: per100(rules.fk), assistInTen: Math.round(rules.assist * 10) };
}

/** The "?" of the card: how the boards are counted, and one worked example. */
function LeadersRules() {
  const ex = useMemo(() => exampleNumbers(), []);
  const ratings = (role: string) => EXAMPLE_ELEVEN.filter(e => e.role === role).map(e => e.man.r);
  const backs = ratings('back four');
  const mids = ratings('central midfielder');
  const parts = ex.men.map((m, i) => {
    const taker = m.setPieces > 0 ? ` (${m.setPieces} of them from the spot or a free kick, as the taker)` : '';
    const who = m.role === 'central midfielder' && ex.men.findIndex(o => o.role === m.role) !== i ? 'the other central midfielder' : `the ${m.role}`;
    return `${who} ${m.n}${taker}`;
  });
  return (
    <div data-cm-leaders-rules className="rounded-lg bg-muted p-3 space-y-2 text-[11px] leading-relaxed text-foreground">
      <p>Every goal another club in your league scores goes to one of its eleven, shared out by position and rating, the same rule your own squad's goals follow. A penalty ({ex.pen} goals in 100) or a direct free kick ({ex.fk} in 100) goes to the side's taker, its most dangerous outfield man. About {ex.ownGoals} goals in 100 are own goals and count for nobody, and {ex.assistInTen} open play goals in 10 have an assist.</p>
      <p data-cm-leaders-example>Worked example: a side with a striker on {ratings('striker')[0]}, a winger on {ratings('winger')[0]}, a number ten on {ratings('number ten')[0]}, central midfielders on {mids.join(' and ')}, a holder on {ratings('holder')[0]} and a back four on {Math.min(...backs)} to {Math.max(...backs)}. Of every 100 goals it scores, {parts.join(', ')}, and the back four {ex.backFour} between them. About {ex.ownGoals} are own goals.</p>
      <p>Your own players are counted off their own league lines. A man you sign in mid season starts from nought here, and what he scored for his old club stays in that club's total.</p>
      <p>The Clean sheets board is the keepers': one for every league match his side keeps everybody out.</p>
      <p data-cm-leaders-awards>When the season ends, the first man on each board wins it: the golden boot, the most assists and the most clean sheets, all in your season review, with a team of the season: a 4-4-2 picked on goals plus assists (clean sheets for the keeper), so a holder or a centre back gets in on what he scored and set up. Your own players count the same way. That takes a book of the whole season with at least {AWARD_FLOOR} in 100 of the other clubs' goals on record. Short of that the golden boot goes to the older scorers' race, and there is no most assists, most clean sheets or team of the season that year. In a league where the data on most squads is thin, that can be every year.</p>
      <p>Where the data on a squad is thin, the goals of the places it does not cover count for the club and no name. A save that had no book when its season began starts one at its next league match, and the boards count from that round for everybody.</p>
    </div>
  );
}

const nameClass = (m: BoardMan) => cn('font-bold', m.mine ? 'text-primary' : 'text-foreground');

const stepButton = 'inline-flex items-center justify-center gap-1 min-h-[44px] min-w-[44px] px-3 rounded-lg border border-border text-xs disabled:opacity-40';

/** Round 1311: the past winners, one season at a time, newest first, read from the save's own records. */
function PastWinners({ career, onBack }: { career: CareerState; onBack: () => void }) {
  const seasons = useMemo(() => career.history.filter(h => h.awards).sort((a, b) => b.season - a.season), [career.history]);
  const [at, setAt] = useState(0);
  const i = Math.min(at, Math.max(0, seasons.length - 1));
  const rec = seasons[i];
  const aw = rec?.awards;
  return (
    <div data-cm-leaders data-cm-board="past" className="bg-card border border-border rounded-2xl p-3 space-y-2">
      <button type="button" onClick={onBack} data-cm-leaders-back
        className="inline-flex items-center gap-1 min-h-[44px] min-w-[44px] pr-2 text-xs text-muted-foreground hover:text-foreground">
        <ChevronLeft className="w-3.5 h-3.5" /> Stats
      </button>
      <div className="text-sm font-bold text-foreground">🏅 Past winners</div>
      {!rec || !aw
        ? <p className="text-xs text-muted-foreground">No season has finished with the league's awards yet.</p>
        : (
          <div data-cm-past-season={rec.season} className="space-y-1">
            <div className="text-xs text-muted-foreground">Season {rec.season} · {rec.club}</div>
            <SeasonHonoursCard awards={aw} recent={i < TEAMS_KEPT} />
            {aw.cov < BOOK_FULL_SHARE && <p className="text-[9px] text-yellow-500/80">The data covered only part of that league: {aw.cov} in 100 of the other clubs' goals had a name on them.</p>}
          </div>
        )}
      {seasons.length > 1 && (
        <div className="flex items-center justify-between gap-2">
          <button type="button" data-cm-past-step="newer" disabled={i === 0} onClick={() => setAt(i - 1)} className={stepButton}>
            <ChevronLeft className="w-3.5 h-3.5" /> Newer
          </button>
          <span data-cm-past-count className="text-[10px] text-muted-foreground">{i + 1} of {seasons.length}</span>
          <button type="button" data-cm-past-step="older" disabled={i === seasons.length - 1} onClick={() => setAt(i + 1)} className={stepButton}>
            Older <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

interface CardProps {
  career: CareerState;
  board: LeadersBoard | null;
  onBoard: (board: LeadersBoard | null) => void;
}

/** Round 1311: the league leaders, tiles or one board. */
export function LeagueLeadersCard({ career, board, onBoard }: CardProps) {
  const [help, setHelp] = useState(false);
  const lb = useMemo(() => leagueBoardsOf(career), [career]);
  const tops = useMemo(() => (lb ? Object.fromEntries(KINDS.map(k => [k.kind, leaders(lb.input, k.kind)])) as Record<BoardKind, BoardMan[]> : null), [lb]);
  const leagueName = careerLeagueOf(career).name;
  const leagueLeft = career.calendar.slice(career.week).some(e => e.type === 'league');
  const header = (
    <div className="flex items-center justify-between gap-2">
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">🏆 League leaders · {leagueName}</div>
      <button type="button" aria-label="How the league leaders work" aria-expanded={help} onClick={() => setHelp(!help)} data-cm-leaders-help
        className="shrink-0 inline-flex items-center justify-center min-w-[44px] min-h-[44px] rounded-lg border border-border text-muted-foreground hover:text-foreground">
        <HelpCircle className="w-4 h-4" />
      </button>
    </div>
  );
  const lines = lb && (
    <>
      {lb.from !== null && <p data-cm-leaders-late className="text-[10px] text-muted-foreground">Counting from round {lb.from + 1}. Everything before that is off these boards, your players too.</p>}
      {lb.share < BOOK_FULL_SHARE && <p data-cm-leaders-thin className="text-[9px] text-yellow-500/80">The data covers only part of this league: {lb.share} in 100 of the other clubs' goals have a name on them. The rest count for the club and nobody else.</p>}
    </>
  );
  const card = 'bg-card border border-border rounded-2xl p-3 space-y-2';
  /* A board asked for on a save whose book went away underneath it still offers the way back. */
  const backRow = board !== null && (
    <button type="button" onClick={() => onBoard(null)} data-cm-leaders-back
      className="inline-flex items-center gap-1 min-h-[44px] min-w-[44px] pr-2 text-xs text-muted-foreground hover:text-foreground">
      <ChevronLeft className="w-3.5 h-3.5" /> Stats
    </button>
  );
  /* E. The past winners, whatever this season's book holds. */
  if (board === 'past') return <PastWinners career={career} onBack={() => onBoard(null)} />;
  const hasPast = career.history.some(h => h.awards);
  const pastTile = hasPast && (
    <button type="button" data-cm-leaders-tile="past" onClick={() => onBoard('past')}
      className="min-h-[44px] w-full rounded-xl border border-border bg-background/40 px-2.5 py-2 text-left hover:border-primary">
      <div className="text-[9px] text-muted-foreground uppercase tracking-wider">🏅 Past winners</div>
      <div className="text-xs text-muted-foreground">Each season's winners, and the team of the season for the last five</div>
    </button>
  );
  /* A. No book this season (or one the next match week will replace). */
  if (!lb || !tops) {
    return (
      <div data-cm-leaders data-cm-leaders-empty="nobook" className={card}>
        {backRow}
        {header}
        {help && <LeadersRules />}
        <p className="text-xs text-muted-foreground">{leagueLeft
          ? 'No league book for this season yet. It starts with your next league match and counts from there.'
          : 'No league book for this season, and no league match is left. A new book opens next season.'}</p>
        {pastTile}
      </div>
    );
  }
  /* B. A book, and nothing on any board yet. */
  if (KINDS.every(k => tops[k.kind].length === 0)) {
    return (
      <div data-cm-leaders data-cm-leaders-empty="nogoals" className={card}>
        {backRow}
        {header}
        {help && <LeadersRules />}
        <p className="text-xs text-muted-foreground">The boards fill up with the first league goals.</p>
        {lines}
        {pastTile}
      </div>
    );
  }
  /* D. One board, drawn alone, with a back button. */
  const open = KINDS.find(k => k.kind === board);
  if (open) {
    const rows = tops[open.kind];
    const best = rows.some(m => m.mine) ? null : bestOfMine(lb.input, open.kind);
    return (
      <div data-cm-leaders data-cm-board={open.kind} className={card}>
        <div className="flex items-center justify-between gap-2">
          <button type="button" onClick={() => onBoard(null)} data-cm-leaders-back
            className="inline-flex items-center gap-1 min-h-[44px] min-w-[44px] pr-2 text-xs text-muted-foreground hover:text-foreground">
            <ChevronLeft className="w-3.5 h-3.5" /> Stats
          </button>
          <button type="button" aria-label="How the league leaders work" aria-expanded={help} onClick={() => setHelp(!help)} data-cm-leaders-help
            className="shrink-0 inline-flex items-center justify-center min-w-[44px] min-h-[44px] rounded-lg border border-border text-muted-foreground hover:text-foreground">
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
        <div>
          <div className="text-sm font-bold text-foreground">{open.icon} {open.label}</div>
          <div className="text-[10px] text-muted-foreground">{leagueName}</div>
        </div>
        {help && <LeadersRules />}
        {rows.length === 0
          ? <p className="text-xs text-muted-foreground">Nobody on this board yet.</p>
          : <ol className="space-y-0.5">
            {rows.map((m, i) => (
              <li key={`${m.name}|${m.club}|${m.pos}`} data-cm-board-row data-mine={m.mine ? '' : undefined}
                className={cn('flex items-center gap-2 text-xs py-1 border-b border-border/30 last:border-0', m.mine && 'bg-primary/5 rounded')}>
                <span className="w-5 shrink-0 text-muted-foreground font-bold">{i + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-1">
                    <span data-cm-board-name className={nameClass(m)}>{m.name}</span>
                    {m.gen && <MadeUpTag />}
                  </span>
                  <span data-cm-board-club className="block truncate text-[10px] text-muted-foreground">{m.club}</span>
                </span>
                <span data-cm-board-n className="shrink-0 font-bold text-foreground">{m.n}</span>
              </li>
            ))}
          </ol>}
        {best && <p data-cm-leaders-best className="text-[10px] text-muted-foreground">Your best: {ordinal(best.place)}, <span className={nameClass(best.man)}>{best.man.name}</span>, {best.man.n}</p>}
        {open.kind === 'sheets' && lb.keepers.have < lb.keepers.of && <p data-cm-leaders-keepers className="text-[10px] text-muted-foreground">Keepers of {lb.keepers.have} of the {lb.keepers.of} other clubs are on record.</p>}
        {lines}
      </div>
    );
  }
  /* C. The tiles. */
  return (
    <div data-cm-leaders className={card}>
      {header}
      {help && <LeadersRules />}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
        {KINDS.map(k => {
          const top = tops[k.kind][0];
          return (
            <button key={k.kind} type="button" data-cm-leaders-tile={k.kind} onClick={() => onBoard(k.kind)}
              className="min-h-[44px] w-full rounded-xl border border-border bg-background/40 px-2.5 py-2 text-left hover:border-primary">
              <div className="text-[9px] text-muted-foreground uppercase tracking-wider">{k.icon} {k.label}</div>
              {top
                ? <div className="flex items-center gap-1.5 text-xs">
                  <span className={cn(nameClass(top), 'min-w-0 break-words')}>{top.name}</span>
                  {top.gen && <MadeUpTag />}
                  <span className="text-[10px] text-muted-foreground truncate min-w-0">{top.club}</span>
                  <span className="ml-auto shrink-0 font-bold text-foreground">{top.n}</span>
                </div>
                : <div className="text-xs text-muted-foreground">Nobody yet</div>}
            </button>
          );
        })}
        {pastTile}
      </div>
      {lines}
    </div>
  );
}

export default LeagueLeadersCard;
