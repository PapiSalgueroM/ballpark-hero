import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { FlagImg } from '@/components/FlagImg';
import { useRevealScroll } from '@/hooks/useRevealScroll';
import type { IntlGame, IntlGameRound, IntlPlace, IntlSummerEntry, IntlTournament } from '@/lib/careerIntl';
import type { IntlSummerNotes } from '@/lib/usCareerSport';

/* ─── Round 1544: what a summer with the national team came to ───
   Props only (no sport import: simUsCareerWeight section 2); it loads in its
   own chunk. The main view is the medal or the place, the record, his numbers
   a game and the hurt line; Your games and The bracket are tiles, each a sub
   view with Back, and the bracket shows his group and his path first, with
   one tile a group or a round (critic advice 19: never one long page for a 32
   nation World Cup). Every view change is a new screen and obeys the no
   scroll rule through useRevealScroll. Text is 12 px or more. */

export interface IntlSummerResultProps {
  /** "the 2004 Olympics in Athens" */
  editionLabel: string;
  /** the summer's row, the record of the medal */
  row: Extract<IntlSummerEntry, { went: true }>;
  /** the tournament played again from the save, or null when it no longer agrees with the row */
  tournament: IntlTournament | null;
  /** the nation he played for, as the tournament names it */
  nation: string;
  /** true for a summer the real tournament was played: its groups and results here are this career's own */
  happened: boolean;
  fieldNote: string | null;
  playedAsNote: string | null;
  /** his numbers in words, [key on the row's avg, word] */
  statWords: readonly (readonly [string, string])[];
  /** what coming home hurt did, in words */
  hurtCost: string;
  continueLabel: string;
  onContinue: () => void;
}

const PLACE_WORDS: Record<IntlPlace, string> = {
  gold: '🥇 Gold', silver: '🥈 Silver', bronze: '🥉 Bronze', fourth: 'Fourth place',
  semi: 'Out in the semi-finals', quarter: 'Out in the quarter-finals', r16: 'Out in the round of 16', group: 'Out in the group stage',
};
const ROUND_WORDS: Record<IntlGameRound, string> = {
  group: 'Group', R16: 'Round of 16', QF: 'Quarter-final', SF: 'Semi-final', bronze: 'Bronze game', final: 'Final',
};
const KNOCKOUT: IntlGameRound[] = ['R16', 'QF', 'SF', 'bronze', 'final'];
const groupName = (i: number) => `Group ${String.fromCharCode(65 + i)}`;

type View = { k: 'main' } | { k: 'games' } | { k: 'bracket' } | { k: 'group'; i: number } | { k: 'round'; r: IntlGameRound };

function TileButton({ label, sub, onClick, id }: { label: string; sub?: string; onClick: () => void; id: string }) {
  return (
    <button
      type="button"
      data-intl-tile={id}
      onClick={onClick}
      className="w-full min-h-[44px] rounded-lg border border-border bg-card px-3 py-2 text-left hover:bg-secondary/60"
    >
      <span className="block text-sm font-bold">{label}</span>
      {sub && <span className="block text-xs text-muted-foreground">{sub}</span>}
    </button>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <Button data-intl-back onClick={onClick} variant="secondary" className="min-h-[44px] w-full text-sm">
      Back
    </Button>
  );
}

/** "1 assist", "3 assists": the words come plural. */
const count = (n: number, word: string) => `${n} ${n === 1 ? word.replace(/s$/, '') : word}`;

function GameLine({ g, us, line, statWords, bare }: { g: IntlGame; us: string; line?: Record<string, number>; statWords: IntlSummerResultProps['statWords']; bare?: boolean }) {
  const mine = g.a === us || g.b === us;
  const other = g.a === us ? g.b : g.a;
  const [own, theirs] = g.a === us ? [g.sa, g.sb] : [g.sb, g.sa];
  /* Round 1557 (1544's review, minor 8): in a group's or a round's list (bare) his game reads like its
     neighbours, both nations named and the score between them, in bold; W or L against a lone name is for
     his own lists only. */
  const head = mine && !bare
    ? <>{g.winner === us ? 'W' : 'L'} {own}-{theirs} v <FlagImg name={other} size={16} showLabel /></>
    : <><FlagImg name={g.a} size={16} showLabel /> {g.sa}-{g.sb} <FlagImg name={g.b} size={16} showLabel /></>;
  const label = g.round === 'group' && g.group !== undefined ? groupName(g.group) : ROUND_WORDS[g.round];
  return (
    <li className={`rounded-md border border-border/60 px-2 py-1.5 text-xs${mine && bare ? ' font-bold' : ''}`} data-intl-mine={mine ? '' : undefined}>
      {!bare && <span className="font-semibold">{label}: </span>}
      <span>{head}{g.ot ? ` (${g.ot === 1 ? 'OT' : `${g.ot} OT`})` : ''}</span>
      {line && <span className="block text-muted-foreground">You: {statWords.map(([k, w]) => count(line[k] ?? 0, w)).join(', ')}</span>}
    </li>
  );
}

export default function IntlSummerResult(p: IntlSummerResultProps) {
  const [view, setView] = useState<View>({ k: 'main' });
  const viewKey = view.k === 'group' ? `group:${view.i}` : view.k === 'round' ? `round:${view.r}` : view.k;
  const ref = useRevealScroll<HTMLDivElement>(`intl-result:${p.row.year}:${viewKey}`);
  const t = p.tournament;
  const us = p.nation;
  const mineIdx = t ? t.games.map((g, i) => (g.a === us || g.b === us ? i : -1)).filter(i => i >= 0) : [];
  const lineOf = (i: number) => t?.his.find(h => h.game === i)?.line;
  const myGroup = t ? t.groups.findIndex(g => g.teams.includes(us)) : -1;
  const rounds = t ? KNOCKOUT.filter(r => t.games.some(g => g.round === r)) : [];
  const avg = p.statWords.map(([k, w]) => count(p.row.avg[k] ?? 0, w));
  const avgWords = avg.length < 2 ? avg.join('') : `${avg.slice(0, -1).join(', ')} and ${avg[avg.length - 1]}`;
  const table = (i: number) => {
    const g = t?.groups[i];
    if (!g) return null;
    return (
      <table className="w-full text-xs" data-intl-group={i}>
        <thead><tr className="text-muted-foreground"><th className="text-left font-semibold">{groupName(i)}</th><th>W</th><th>L</th><th>+/-</th></tr></thead>
        <tbody>
          {g.table.map(r => (
            <tr key={r.nation} className={r.nation === us ? 'font-bold' : ''}>
              <td className="py-1"><FlagImg name={r.nation} size={16} showLabel /></td>
              <td className="text-center">{r.won}</td><td className="text-center">{r.lost}</td><td className="text-center">{r.pf - r.pa}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  let body: ReactNode;
  if (view.k === 'games' && t) {
    body = (
      <>
        <h4 className="text-sm font-bold">Your games</h4>
        <ul className="space-y-1.5">{mineIdx.map(i => <GameLine key={i} g={t.games[i]} us={us} line={lineOf(i)} statWords={p.statWords} />)}</ul>
        <BackButton onClick={() => setView({ k: 'main' })} />
      </>
    );
  } else if (view.k === 'bracket' && t) {
    const path = mineIdx.filter(i => t.games[i].round !== 'group');
    body = (
      <>
        <h4 className="text-sm font-bold">The bracket</h4>
        {myGroup >= 0 && table(myGroup)}
        {path.length > 0 && (
          <>
            <p className="text-xs font-semibold">Your path</p>
            <ul className="space-y-1.5">{path.map(i => <GameLine key={i} g={t.games[i]} us={us} statWords={p.statWords} />)}</ul>
          </>
        )}
        <p className="text-xs text-muted-foreground">Champion: <FlagImg name={t.champion} size={16} showLabel /></p>
        <div className="grid grid-cols-2 gap-2">
          {t.groups.map((_, i) => (i === myGroup ? null : <TileButton key={`g${i}`} id={`group-${i}`} label={groupName(i)} onClick={() => setView({ k: 'group', i })} />))}
          {rounds.map(r => <TileButton key={r} id={`round-${r}`} label={ROUND_WORDS[r]} onClick={() => setView({ k: 'round', r })} />)}
        </div>
        <BackButton onClick={() => setView({ k: 'main' })} />
      </>
    );
  } else if (view.k === 'group' && t) {
    body = (
      <>
        {table(view.i)}
        <ul className="space-y-1.5">{t.games.filter(g => g.round === 'group' && g.group === view.i).map((g, j) => <GameLine key={j} g={g} us={us} statWords={p.statWords} bare />)}</ul>
        <BackButton onClick={() => setView({ k: 'bracket' })} />
      </>
    );
  } else if (view.k === 'round' && t) {
    body = (
      <>
        <h4 className="text-sm font-bold">{ROUND_WORDS[view.r]}</h4>
        <ul className="space-y-1.5">{t.games.filter(g => g.round === view.r).map((g, j) => <GameLine key={j} g={g} us={us} statWords={p.statWords} bare />)}</ul>
        <BackButton onClick={() => setView({ k: 'bracket' })} />
      </>
    );
  } else {
    body = (
      <>
        <div className="text-center space-y-1">
          <h3 className="text-lg font-black tracking-tight" data-intl-place={p.row.place}>{PLACE_WORDS[p.row.place]}</h3>
          <p className="text-sm text-muted-foreground">{p.editionLabel.replace(/^the /, 'The ')}</p>
        </div>
        <p className="text-sm">Record {p.row.wins}-{p.row.games - p.row.wins}. You averaged {avgWords} a game.</p>
        <p className="text-sm">{p.row.hurt ? `You came home hurt: ${p.hurtCost}.` : 'You came home healthy.'}</p>
        {p.happened && <p className="text-xs text-muted-foreground">The real tournament was played, but these groups and results are this career's own.</p>}
        {p.fieldNote && <p className="text-xs text-muted-foreground">{p.fieldNote}</p>}
        {p.playedAsNote && <p className="text-xs text-muted-foreground">{p.playedAsNote}</p>}
        {t ? (
          <div className="grid grid-cols-2 gap-2">
            <TileButton id="games" label="Your games" sub={`${mineIdx.length} games`} onClick={() => setView({ k: 'games' })} />
            <TileButton id="bracket" label="The bracket" sub={t.groups.length > 1 ? `${t.groups.length} groups` : undefined} onClick={() => setView({ k: 'bracket' })} />
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">The game can no longer play this tournament again from your save, so only the result is shown.</p>
        )}
        <Button data-intl-continue onClick={p.onContinue} className="min-h-[44px] w-full text-sm">{p.continueLabel}</Button>
      </>
    );
  }
  return (
    <div ref={ref} data-intl-result data-intl-view={viewKey} className="rounded-xl border-2 border-sky-500/40 bg-gradient-to-b from-sky-500/10 to-transparent p-4 space-y-3">
      {body}
    </div>
  );
}

/* ─── Round 1557: the International view, behind the Trophy Case's tile ───
   Every summer the national team called him, oldest first, one small tile
   each; a summer he went to opens its result (Round 1544's IntlSummerResult,
   played again from the save) with Back to this list, and this list's own
   Back goes to the case. A summer he rested is a tile with no press. Props
   only (no sport import: simUsCareerWeight section 2), a named export of this
   module, so it loads in this lazy chunk (simCareerIntl section 12).
   Every change of view is a new screen and obeys the no scroll rule. */
type Went = Extract<IntlSummerEntry, { went: true }>;

export interface IntlSummersViewProps {
  summers: IntlSummerEntry[];
  /** "the 2004 Olympics in Athens" */
  editionLabel: (id: string) => string;
  /** the tournament played again from the save, and the words for that summer */
  resultOf: (row: Went) => { tournament: IntlTournament | null; notes: IntlSummerNotes };
  onBack: () => void;
}

const cap = (s: string) => s.replace(/^the /, 'The ');

export function IntlSummersView(p: IntlSummersViewProps) {
  const [open, setOpen] = useState<number | null>(null);
  const ref = useRevealScroll<HTMLDivElement>(`intl-summers:${open ?? 'list'}`);
  const row = open === null ? null : (p.summers.find(s => s.year === open && s.went) as Went | undefined) ?? null;
  if (row) {
    const r = p.resultOf(row);
    const n = r.notes;
    return (
      <div ref={ref} data-intl-summers-view={row.year}>
        <IntlSummerResult
          editionLabel={n.label} row={row} tournament={r.tournament} nation={n.nation}
          happened={n.happened} fieldNote={n.fieldNote} playedAsNote={n.playedAsNote} statWords={n.statWords}
          hurtCost={n.hurtCost} continueLabel="Back" onContinue={() => setOpen(null)}
        />
      </div>
    );
  }
  const went = p.summers.filter((s): s is Went => s.went);
  const medals = went.filter(s => s.place === 'gold' || s.place === 'silver' || s.place === 'bronze').length;
  const sorted = [...p.summers].sort((a, b) => a.year - b.year);
  return (
    <div ref={ref} data-intl-summers-view="list" className="space-y-3 rounded-xl border-2 border-sky-500/40 bg-gradient-to-b from-sky-500/10 to-transparent p-4">
      <div className="space-y-1 text-center">
        <h3 className="text-lg font-black tracking-tight">🌍 International</h3>
        <p className="text-sm text-muted-foreground" data-intl-summers-count>
          {/* Round 1557's fix (review-run-1557, minor 4): a career that rested every call reads "never went", not "went 0 times, 0 medals". */}
          Called up {p.summers.length === 1 ? 'once' : `${p.summers.length} times`}, {went.length === 0 ? 'never went' : `went ${went.length === 1 ? 'once' : `${went.length} times`}, ${medals === 0 ? 'no medal' : medals === 1 ? '1 medal' : `${medals} medals`}`}.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {sorted.map(s => (s.went ? (
          <button
            key={s.year}
            type="button"
            data-intl-summer={s.year}
            onClick={() => setOpen(s.year)}
            className="min-h-[44px] w-full rounded-lg border border-border bg-card px-3 py-2 text-left hover:bg-secondary/60"
          >
            <span className="block text-sm font-bold">{cap(p.editionLabel(s.edition))}</span>
            <span className="block text-xs text-muted-foreground">{PLACE_WORDS[s.place]}, {s.wins}-{s.games - s.wins}</span>
          </button>
        ) : (
          <div key={s.year} data-intl-summer-rest={s.year} className="min-h-[44px] w-full rounded-lg border border-border/60 px-3 py-2 text-left">
            <span className="block text-sm font-bold text-muted-foreground">{cap(p.editionLabel(s.edition))}</span>
            <span className="block text-xs text-muted-foreground">You rested that summer.</span>
          </div>
        )))}
      </div>
      <Button data-intl-summers-back onClick={p.onBack} variant="secondary" className="min-h-[44px] w-full text-sm">
        Back
      </Button>
    </div>
  );
}
