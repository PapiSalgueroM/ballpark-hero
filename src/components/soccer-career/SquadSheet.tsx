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
 * behind it never moves, the only box that scrolls is the bench list, and
 * every hook sits above every return.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import type { CareerState } from '@/lib/soccerCareerEngine';
import { GROUP_LABEL, squadNow } from '@/lib/soccerClubSquad';
import type { SquadGroup, SquadMan, SquadView } from '@/lib/soccerClubSquad';
import {
  SOURCE_CHIP, lastSeason, planLine, rankHeadline, sourceLine, squadHelp, trustLines, who,
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

/** What a cell of the eleven calls a man: his surname, or his role's rank. */
function shortName(m: SquadMan): string {
  if (m.role) return m.role.split(' choice ')[0] + ' choice';
  const cut = m.name.indexOf(' ');
  return cut < 0 ? m.name : m.name.slice(cut + 1);
}

const BTN = 'min-h-[44px] rounded-xl border border-border px-4 text-sm font-semibold';
const GOLD = 'border-yellow-500/70 bg-yellow-500/15 text-foreground';

function ManRow({ m, year, captain }: { m: SquadMan; year: number; captain: boolean }) {
  return (
    <li
      data-squad-man={m.me ? 'me' : 'other'}
      className={`flex min-h-[36px] items-center gap-2 rounded-lg border px-2 py-1 text-sm ${m.me ? GOLD : 'border-border/60 bg-background/40 text-foreground'}`}
    >
      {m.nation ? <FlagImg name={m.nation} size={16} /> : null}
      <span className="min-w-0 flex-1 truncate" title={m.name}>
        {m.name}{m.me && captain ? ' ©' : ''}
      </span>
      {!m.me && m.since === year ? (
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
  const onKey = (e: { key: string }) => {
    if (e.key !== 'Escape') return;
    if (screen === 'home') onClose(); else home();
  };

  const back = (
    <button type="button" onClick={home} className={`${BTN} text-muted-foreground`}>← Back</button>
  );

  const planWord = view.trust.frozen ? 'Frozen out' : view.trust.inPlans ? 'In the plans' : 'Cover for now';
  const tiles: { id: SquadScreen; label: string; value: string }[] = [
    { id: 'eleven', label: 'The eleven', value: planWord },
    { id: 'bench', label: 'The bench', value: `${view.bench.length} players` },
    { id: 'place', label: 'Your place', value: `${ordinal(view.rank)} in line` },
  ];
  if (last) tiles.push({ id: 'last', label: 'Last season', value: `${last.leagueApps} league games` });

  let body: ReactNode = null;
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
              onClick={() => setScreen(t.id)}
              className={`min-h-[56px] rounded-xl border border-border bg-background/40 p-2 text-left ${t.id === 'place' && !last ? 'col-span-2' : ''}`}
            >
              <span className="block text-xs text-muted-foreground">{t.label}</span>
              <span className="block text-sm font-bold text-foreground">{t.value}</span>
            </button>
          ))}
        </div>
        <button type="button" onClick={onClose} className={`${BTN} text-muted-foreground`}>← Back to your career</button>
      </div>
    );
  }
  if (screen === 'eleven') {
    const lines: SquadGroup[] = ['ATT', 'MID', 'DEF', 'GK'];
    let cell = 0;
    body = (
      <div data-squad-screen="eleven" className="flex flex-col gap-3">
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
                    style={style}
                    className={`animate-cell-reveal flex w-[76px] flex-col items-center rounded-lg border px-1 py-1 text-center ${m.me ? GOLD : 'border-border/60 bg-card text-foreground'}`}
                  >
                    <span className="text-xs text-muted-foreground">{m.pos}{m.me && captain ? ' ©' : ''}</span>
                    <span className="w-full truncate text-xs font-semibold">{shortName(m)}</span>
                    <span className="text-sm font-bold tabular-nums">{m.ovr}</span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <p className="text-xs leading-snug text-muted-foreground">
          {view.club}: the highest rated keeper, four defenders, three midfielders and three forwards on our ratings.
        </p>
        <p className="text-sm leading-snug text-foreground" data-squad-xi-line>
          {view.inElevenOnRating || !view.keepsMeOut
            ? `On our ratings you are in it, at ${career.position}.`
            : `On our ratings ${who(view.keepsMeOut)} is the last of the ${label} in ahead of you. You are ${ordinal(view.rank)} in line.`}
          {' '}{planLine(view.trust)}
        </p>
        {back}
      </div>
    );
  }
  if (screen === 'bench') {
    body = (
      <div data-squad-screen="bench" className="flex min-h-0 flex-col gap-3">
        <p className="text-sm font-semibold text-foreground">The bench: {view.bench.length} players, best first</p>
        <ul className="flex max-h-[52dvh] flex-col gap-1 overflow-y-auto pr-1" data-squad-bench>
          {view.bench.map(m => <ManRow key={m.me ? 'me' : m.id ?? m.name} m={m} year={view.year} captain={captain} />)}
        </ul>
        {back}
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
          {shownRows.map(m => <ManRow key={m.me ? 'me' : m.id ?? m.name} m={m} year={view.year} captain={captain} />)}
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
        {back}
      </div>
    );
  }
  if (screen === 'last' && last) {
    body = (
      <div data-squad-screen="last" className="flex flex-col gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">Last season at {last.club}{last.loan ? ', on loan' : ''}</p>
          <p className="text-sm text-muted-foreground">{last.leagueApps} league games, {last.apps} in all competitions</p>
        </div>
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">What your record says</p>
        <ul className="flex flex-col gap-2 text-sm leading-snug text-foreground">
          {last.lines.map(r => <li key={r} data-squad-reason>{r}</li>)}
          {last.lines.length === 0 ? <li data-squad-reason="none">You were a regular. Nothing in your record needs explaining.</li> : null}
        </ul>
        {back}
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
        <button type="button" onClick={() => setScreen(examples ? 'help' : 'examples')} className={`${BTN} text-foreground`}>
          {examples ? 'The rules' : 'Worked examples'}
        </button>
        {back}
      </div>
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
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-foreground">{view.club}</p>
            <p className="text-xs text-muted-foreground">
              {seasonOf(view.year)}{' '}
              <span data-squad-source={view.source} className="ml-1 rounded bg-secondary px-1.5 py-0.5 text-xs font-bold tracking-wide text-foreground">
                {SOURCE_CHIP[view.source]}
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
        {body}
      </div>
    </div>
  );
}
