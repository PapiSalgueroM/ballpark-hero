/**
 * Round 1115: the Squad sheet, the dressing room behind the Squad tile.
 *
 * An overlay with small screens and a Back button on each: the eleven, the
 * bench, his place in his own line, last season's reasons and the help. It
 * shows what the game already decided and changes none of it: this file
 * reads the save and never writes it. The one thing it stores is a per
 * viewer flag saying the help has been seen.
 *
 * It loads as its own chunk (SquadTile.tsx imports it lazily), the page
 * behind it never moves, and every hook sits above every return.
 *
 * THREE PARTS, AND THE WAY OUT IS ALWAYS ON SCREEN. The panel is a header,
 * a body and a foot. The foot holds the Back button and never scrolls. On a
 * tall screen nothing scrolls but the bench list. On a short one (a small
 * phone with its browser bars showing, a phone on its side) the body scrolls
 * inside the panel instead of pushing the Back button off the screen. The
 * keyboard stays inside the sheet: Tab goes round its own buttons.
 */
import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, ReactNode } from 'react';
import type { CareerState } from '@/lib/soccerCareerEngine';
import { GROUP_LABEL, squadNow } from '@/lib/soccerClubSquad';
import type { SquadGroup, SquadMan, SquadView } from '@/lib/soccerClubSquad';
import {
  isMixed, lastGamesLine, lastSeason, lastTileValue, lastWorthLine, planLine, rankHeadline, realAmongInvented,
  sourceChip, sourceLine, squadHelp, trustLines, who,
} from '@/lib/soccerClubSquadSheet';
import { ordinal } from '@/lib/soccerCareerLeague';
import { FlagImg } from '@/components/FlagImg';

export type SquadScreen = 'home' | 'eleven' | 'bench' | 'place' | 'last' | 'help' | 'examples';

interface Props {
  career: CareerState;
  view: SquadView;
  onClose: () => void;
  /** Opens on this screen and skips the first open help. For tests and checks. */
  initialScreen?: SquadScreen;
}

const HELP_KEY = 'soccerSquad:help';

/* Has this viewer seen the help? A browser that refuses storage sees it again. */
function helpSeen(): boolean {
  try {
    if (window.localStorage.getItem(HELP_KEY)) return true;
    window.localStorage.setItem(HELP_KEY, '1');
    return false;
  } catch {
    return false;
  }
}

const seasonOf = (year: number) => `${year}/${String((year + 1) % 100).padStart(2, '0')}`;

/** Release AN: a long word in a cell of the eleven gets one soft break in its
    middle. A four man line on a phone has room for about eight letters, and
    the browser used to break a longer surname wherever the line ran out,
    which left one letter alone ("Sessegno" over "n"). Now it splits into two
    halves. A word that fits is not broken, and a hyphenated one keeps the
    break its hyphen already gives it. The text itself is unchanged. */
function softBreaks(name: string): ReactNode {
  return name.split(' ').map((word, i) => {
    const half = Math.ceil(word.length / 2);
    const long = word.length >= 7 && !word.includes('-');
    return <Fragment key={i}>{i ? ' ' : null}{long ? <>{word.slice(0, half)}<wbr />{word.slice(half)}</> : word}</Fragment>;
  });
}

/* A cell of the eleven is too narrow for "Second choice", so a role reads
   "2nd" over "choice". A word this table does not know is printed as it is. */
const CHOICE_SHORT: Record<string, string> = {
  First: '1st', Second: '2nd', Third: '3rd', Fourth: '4th', Fifth: '5th', Sixth: '6th', Seventh: '7th', Eighth: '8th',
};
function choiceOf(role: string): string {
  const word = role.split(' choice ')[0];
  return CHOICE_SHORT[word] ?? word;
}

const BTN = 'min-h-[44px] rounded-xl border border-border px-4 text-sm font-semibold';
const GOLD = 'border-yellow-500/70 bg-yellow-500/15 text-foreground';

function ManRow({ m, view, captain }: { m: SquadMan; view: SquadView; captain: boolean }) {
  /* Only the game's own world has signings: a sheet by role is a real club in
     a real past year, and nobody is said to have joined it. */
  const fresh = view.source === 'invented' && !m.me && m.id !== undefined && m.since === view.year;
  return (
    <li
      data-squad-man={m.me ? 'me' : 'other'}
      className={`flex min-h-[36px] shrink-0 items-center gap-2 rounded-lg border px-2 py-1 text-sm ${m.me ? GOLD : 'border-border/60 bg-background/40 text-foreground'}`}
    >
      {m.nation ? <FlagImg name={m.nation} size={16} /> : null}
      {/* A name or a role is the only thing that says who the man is, and a
          phone has no hover to read a cut one, so a long one wraps. */}
      <span className="min-w-0 flex-1 break-words leading-tight" title={m.name} data-squad-name>
        {m.name}{m.me && captain ? ' ©' : ''}
      </span>
      {realAmongInvented(view, m) ? (
        <span data-squad-real className="rounded bg-secondary px-1.5 py-0.5 text-xs font-bold text-foreground">REAL</span>
      ) : null}
      {fresh ? (
        <span data-squad-new className="animate-pop-correct rounded bg-primary/20 px-1.5 py-0.5 text-xs font-bold text-primary">NEW</span>
      ) : null}
      <span className="w-9 shrink-0 text-xs text-muted-foreground">{m.pos}</span>
      {m.age !== undefined ? <span data-squad-age className="w-7 shrink-0 text-right text-xs tabular-nums text-muted-foreground">{m.age}</span> : null}
      <span className="w-7 shrink-0 text-right text-sm font-bold tabular-nums">{m.ovr}</span>
    </li>
  );
}

export default function SquadSheet({ career, view, onClose, initialScreen }: Props) {
  const [screen, setScreen] = useState<SquadScreen>(initialScreen ?? 'home');
  const [shown, setShown] = useState(0);
  const panel = useRef<HTMLDivElement | null>(null);
  const last = useMemo(() => lastSeason(career), [career]);
  const reasons = useMemo(() => {
    const at = squadNow(career);
    return at ? trustLines(career, at, view.trust) : [];
  }, [career, view]);
  const help = useMemo(() => squadHelp(), []);

  /* The first time a viewer opens the sheet, the help comes first. */
  useEffect(() => {
    if (!initialScreen && !helpSeen()) setScreen('help');
  }, [initialScreen]);
  /* The trust bar fills from nothing to its figure, once. */
  useEffect(() => { setShown(view.trust.pct); }, [view.trust.pct]);
  /* Keep the keyboard inside the dialog when a screen's buttons go away. */
  useEffect(() => { panel.current?.focus({ preventScroll: true }); }, [screen]);

  const label = GROUP_LABEL[view.group];
  const captain = !!career.isClubCaptain;
  const home = () => setScreen('home');
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      if (screen === 'home') onClose(); else home();
      return;
    }
    if (e.key !== 'Tab') return;
    /* The sheet is modal: Tab goes round its own buttons and never out to
       the page behind, which would scroll to wherever the focus landed. */
    const box = panel.current;
    if (!box) return;
    const stops = [...box.querySelectorAll<HTMLElement>('button:not(:disabled)')];
    const first = stops[0];
    const end = stops[stops.length - 1];
    const now = document.activeElement;
    const outside = !now || !box.contains(now);
    if (!first || outside || (e.shiftKey ? now === first || now === box : now === end)) {
      e.preventDefault();
      (e.shiftKey ? end : first)?.focus({ preventScroll: true });
    }
  };

  const back = (
    <button type="button" onClick={home} className={`${BTN} text-muted-foreground`}>← Back</button>
  );
  const mixed = isMixed(view);

  const planWord = view.trust.frozen ? 'Frozen out' : view.trust.inPlans ? 'In the plans' : 'Cover for now';
  const tiles: { id: SquadScreen; label: string; value: string }[] = [
    { id: 'eleven', label: 'Starting 11', value: planWord },
    { id: 'bench', label: 'The bench', value: `${view.bench.length} players` },
    { id: 'place', label: 'Your place', value: `${ordinal(view.rank)} in line` },
  ];
  if (last) tiles.push({ id: 'last', label: 'Last season', value: lastTileValue(last) });

  let body: ReactNode = null;
  /* What stays at the bottom of the panel on every screen: the way out. */
  let foot: ReactNode = back;
  if (screen === 'home') {
    body = (
      <div data-squad-screen="home" className="flex flex-col gap-3">
        <div>
          <p className="animate-count-up-fade text-base font-semibold leading-snug text-foreground" data-squad-headline>{rankHeadline(view)}</p>
          <p className="mt-1 text-sm text-muted-foreground" data-squad-plan>{planLine(view.trust)}</p>
        </div>
        <div data-squad-trust={view.trust.pct}>
          <div className="mb-1 flex items-baseline justify-between text-xs">
            <span className="text-muted-foreground">Manager&apos;s trust: {view.trust.label}</span>
            <span className="font-bold tabular-nums text-foreground">{view.trust.pct}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div data-squad-trust-bar className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out" style={{ width: `${shown}%` }} />
          </div>
        </div>
        <p className="text-xs leading-snug text-muted-foreground" data-squad-source-line>{sourceLine(view)}</p>
        <div className="grid grid-cols-2 gap-2">
          {tiles.map(t => (
            <button
              key={t.id}
              type="button"
              data-squad-open={t.id}
              aria-label={t.id === 'eleven' ? 'Starting 11' : undefined}
              onClick={() => setScreen(t.id)}
              className={`min-h-[56px] rounded-xl border border-border bg-background/40 p-2 text-left ${t.id === 'place' && !last ? 'col-span-2' : ''}`}
            >
              <span className="block text-xs text-muted-foreground">{t.label}</span>
              <span className="block text-sm font-bold text-foreground">{t.value}</span>
            </button>
          ))}
        </div>
      </div>
    );
    foot = <button type="button" onClick={onClose} className={`${BTN} text-muted-foreground`}>← Back to your career</button>;
  }
  if (screen === 'eleven') {
    const lines: SquadGroup[] = ['ATT', 'MID', 'DEF', 'GK'];
    let cell = 0;
    const cellName = (m: SquadMan) => m.name;

    body = (
      <div data-squad-screen="eleven" className="flex flex-col gap-3">
        <h3 data-squad-xi-heading className="text-sm font-bold text-foreground">Starting 11 on our ratings</h3>
        {view.source === 'invented' ? <p data-squad-xi-scope className="text-xs leading-snug text-muted-foreground">Generated teammates are fictional players in your career. {mixed ? 'Players marked REAL come from the last checked squad.' : 'These names and ratings belong to your simulated squad.'}</p> : view.source === 'roles' ? <p data-squad-xi-scope className="text-xs leading-snug text-muted-foreground">There is no checked historical squad for this club and season. Missing teammate names stay as roles.</p> : null}
        <div data-squad-xi className="flex flex-col gap-2 rounded-xl border border-border bg-emerald-950/30 p-2">
          {lines.map(g => (
            <div key={g} className="flex justify-center gap-1.5">
              {view.eleven[g].map(m => {
                const style: CSSProperties = { animationDelay: `${cell * 35}ms`, animationFillMode: 'both' };
                cell += 1;
                return (
                  <div
                    key={m.me ? 'me' : m.id ?? m.name}
                    data-squad-man={m.me ? 'me' : 'other'}
                    title={m.name}
                    aria-label={`${m.name}, ${m.pos}, rating ${m.ovr}`}
                    data-squad-cell-source={m.me ? 'you' : m.role ? 'role' : m.id !== undefined ? 'generated' : 'real'}
                    style={style}
                    className={`animate-cell-reveal flex min-w-0 max-w-[104px] flex-1 basis-0 flex-col items-center justify-center rounded-lg border px-1 py-1 text-center ${m.me ? GOLD : 'border-border/60 bg-card text-foreground'}`}
                  >
                    <span data-squad-cell-position className="text-xs text-muted-foreground">{m.pos}{m.me && captain ? ' ©' : ''}</span>
                    {m.role ? (
                      <span className="text-xs font-semibold leading-tight" data-squad-role-cell>
                        <span className="block">{choiceOf(m.role)}</span>
                        <span className="block font-normal text-muted-foreground">choice</span>
                      </span>
                    ) : (
                      /* The whole saved name wraps, with no hover needed to read it. */
                      <span className="w-full text-xs font-semibold leading-tight [overflow-wrap:anywhere]" data-squad-cell-name>{softBreaks(cellName(m))}</span>
                    )}
                    {realAmongInvented(view, m) ? <span data-squad-real className="text-xs font-bold leading-tight text-muted-foreground">REAL</span> : null}
                    <span data-squad-cell-rating className="text-sm font-bold tabular-nums">{m.ovr}</span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <p className="text-xs leading-snug text-muted-foreground">
          {view.club}: the highest rated keeper, four defenders, three midfielders and three forwards on our ratings.
          {mixed ? ' The men marked REAL are still here from the last real squad. Everyone else is invented.' : ''}
        </p>
        <p className="text-sm leading-snug text-foreground" data-squad-xi-line>
          {view.inElevenOnRating || !view.keepsMeOut
            ? `On our ratings you are in it, at ${career.position}.`
            : `On our ratings ${who(view.keepsMeOut)} is the last of the ${label} in ahead of you. You are ${ordinal(view.rank)} in line.`}
          {' '}{planLine(view.trust)}
        </p>
      </div>
    );
  }
  if (screen === 'bench') {
    body = (
      <div data-squad-screen="bench" className="flex min-h-0 flex-col gap-3">
        <p className="shrink-0 text-sm font-semibold text-foreground">
          The bench: {view.bench.length} players, best first{mixed ? '. REAL marks a man still here from the last real squad' : ''}
        </p>
        {/* The list takes the room the screen has and scrolls inside it. */}
        <ul className="flex max-h-[52dvh] min-h-[72px] flex-col gap-1 overflow-y-auto pr-1" data-squad-bench>
          {view.bench.map(m => <ManRow key={m.me ? 'me' : m.id ?? m.name} m={m} view={view} captain={captain} />)}
        </ul>
      </div>
    );
  }
  if (screen === 'place') {
    const at = view.queue.findIndex(m => m.me);
    const all = view.queue.length <= 7;
    const start = all ? 0 : Math.max(0, Math.min(at - 2, view.queue.length - 6));
    const shownRows = all ? view.queue : view.queue.slice(start, start + 6);
    const more = view.queue.length - shownRows.length;
    body = (
      <div data-squad-screen="place" className="flex flex-col gap-2">
        <p className="text-sm font-semibold text-foreground">The {label}, on our ratings</p>
        <ul className="flex flex-col gap-1" data-squad-queue>
          {shownRows.map(m => <ManRow key={m.me ? 'me' : m.id ?? m.name} m={m} view={view} captain={captain} />)}
        </ul>
        {more > 0 ? <p className="text-xs text-muted-foreground" data-squad-more>{more} more in the line, {start} of them above these.</p> : null}
        <p className="text-sm font-semibold text-foreground">Manager&apos;s trust: {view.trust.label}</p>
        <ul className="flex flex-col gap-1 text-xs leading-snug text-muted-foreground">
          {reasons.map(r => <li key={r} data-squad-trust-line>{r}</li>)}
          {view.arrivals.map(m => (
            <li key={m.id} data-squad-arrival>
              {(m.age ?? 99) <= 19 ? 'Up from the academy this summer: ' : 'New this summer in your position: '}
              {m.role ? who(m) : m.name} ({m.pos}, {m.age}, rated {m.ovr}).{' '}
              {view.queue.indexOf(m) < at ? 'He is ahead of you.' : 'You are ahead of him.'}
            </li>
          ))}
        </ul>
      </div>
    );
  }
  if (screen === 'last' && last) {
    const worth = lastWorthLine(last);
    body = (
      <div data-squad-screen="last" className="flex flex-col gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">Last season at {last.club}{last.loan ? ', on loan' : ''}</p>
          <p className="text-sm text-muted-foreground" data-squad-games>{lastGamesLine(last)}</p>
          {worth ? <p className="mt-1 text-xs leading-snug text-muted-foreground" data-squad-worth>{worth}</p> : null}
        </div>
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">What your record says</p>
        <ul className="flex flex-col gap-2 text-sm leading-snug text-foreground">
          {last.lines.map(r => <li key={r} data-squad-reason>{r}</li>)}
          {last.lines.length === 0 ? <li data-squad-reason="none">You were a regular. Nothing in your record needs explaining.</li> : null}
        </ul>
      </div>
    );
  }
  if (screen === 'help' || screen === 'examples' || (screen === 'last' && !last)) {
    const examples = screen === 'examples';
    body = (
      <div data-squad-screen={examples ? 'examples' : 'help'} className="flex flex-col gap-3">
        <p className="text-base font-bold text-foreground">{help.title}{examples ? ': worked examples' : ''}</p>
        <ol className="flex list-decimal flex-col gap-2 pl-5 text-xs leading-snug text-foreground" data-squad-help>
          {(examples ? help.examples : help.rules).map(r => <li key={r}>{r}</li>)}
        </ol>
      </div>
    );
    foot = (
      <>
        <button type="button" onClick={() => setScreen(examples ? 'help' : 'examples')} className={`${BTN} text-foreground`}>
          {examples ? 'The rules' : 'Worked examples'}
        </button>
        {back}
      </>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-3 backdrop-blur-sm"
      data-squad-sheet
      onKeyDown={onKey}
    >
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label="Squad"
        tabIndex={-1}
        className="flex max-h-[calc(100dvh-24px)] w-full max-w-md flex-col gap-3 rounded-2xl border border-border bg-card p-4 outline-none animate-in fade-in zoom-in-95 duration-200"
      >
        <div className="flex shrink-0 items-center gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-foreground">{view.club}</p>
            <p className="text-xs text-muted-foreground">
              {seasonOf(view.year)}{' '}
              <span data-squad-source={view.source} className="ml-1 rounded bg-secondary px-1.5 py-0.5 text-xs font-bold tracking-wide text-foreground">
                {sourceChip(view)}
              </span>
            </p>
          </div>
          <button
            type="button"
            aria-label="How the squad works"
            onClick={() => setScreen('help')}
            className="h-11 w-11 shrink-0 rounded-full border border-border text-base font-bold text-foreground"
          >
            ?
          </button>
        </div>
        {/* The body gives way before the foot does: when the screen is too
            short for a screen's words, they scroll here and Back stays put. */}
        <div data-squad-body className="flex min-h-0 flex-col overflow-y-auto overscroll-contain">{body}</div>
        <div data-squad-foot className="flex shrink-0 flex-col gap-3">{foot}</div>
      </div>
    </div>
  );
}
