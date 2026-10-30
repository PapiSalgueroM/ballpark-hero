/* Round 1570: the Hall wall, one screen of the shared US career board in all four sports.

   Every player retired in this sport's My Career has a plaque here (src/lib/usCareerHallWall.ts keeps them),
   so starting a new career no longer takes his Hall of Fame card. The screen is the tile rule: a grid of small
   tiles, newest first, and one plaque's own screen with Back, never a long stacked page. A plaque is static: the
   card's own words for the Hall vote (hallHeadline, ballotLine and hallYearsShown come from the card), and its
   jersey sentence in the card's words. The rules come from the live binding, as the card's do.

   The board reads and writes the wall; this file never touches storage. It loads lazily, with the card's own
   module, when the wall is opened. */
import { useEffect, useId, useRef, useState } from 'react';
import { ArrowLeft, HelpCircle } from 'lucide-react';
import { ballotLine, hallHeadline, hallYearsShown } from '@/components/career/HallOfFameCard';
import type { HallWall, HallWallEntry } from '@/lib/usCareerHallWall';
import type { UsCareerSport } from '@/lib/usCareerSport';

interface Props {
  sport: UsCareerSport;
  wall: HallWall;
  /** Where it opened: the create screen or the retirement screen. */
  from: 'create' | 'retired';
  /** The plaque open on its own screen, by key, or null for the grid. */
  plaque: string | null;
  /** Opened from the retirement screen while this player is not on the wall (the browser refused the write). */
  missing: boolean;
  onOpen: (key: string) => void;
  onClosePlaque: () => void;
  onBack: () => void;
}

/** The tile's one line about the Hall vote. */
export function wallHallLine(e: HallWallEntry): string {
  const h = e.hall;
  if (h.outcome === 'inducted') {
    const n = h.ballots.findIndex(b => b.elected) + 1;
    return h.firstBallot ? '🏛️ In the Hall, first ballot' : n > 0 ? `🏛️ In the Hall, ballot ${n}` : '🏛️ In the Hall';
  }
  if (h.outcome === 'fellOff') return '🗳️ Off the ballot';
  if (h.outcome === 'waiting') return '🗳️ Still waiting';
  return '🗳️ Never on the ballot';
}

/** The jersey sentence, in the Hall card's own words. */
export function wallJerseyLine(j: NonNullable<HallWallEntry['hall']['jersey']>): string {
  return `👕 ${j.teamName ?? j.team} retired your number after ${j.seasons} ${j.seasons === 1 ? 'season' : 'seasons'} there.`;
}

/** A count in a sentence. The bindings' labels are plurals made to sit under a number box ("rings", "Cups",
 *  "MVPs", "All-Star nods", "Norris Trophies"), so one of them reads singular: "1 ring", "1 Conn Smythe". A label
 *  that is a phrase rather than a noun ("in other awards") reads the same either way. */
export function wallCount(n: number, label: string): string {
  if (n !== 1 || label.startsWith('in ')) return `${n} ${label}`;
  if (label.endsWith('ies')) return `1 ${label.slice(0, -3)}y`;
  return `1 ${label.endsWith('s') ? label.slice(0, -1) : label}`;
}

const years = (e: HallWallEntry) => (e.from === e.to ? `${e.from}` : `${e.from} to ${e.to}`);
const gold = (e: HallWallEntry) => (e.hall.outcome === 'inducted' ? 'border-gold/60' : 'border-border');

export default function UsCareerHallWall({ sport, wall, from, plaque, missing, onOpen, onClosePlaque, onBack }: Props) {
  const [help, setHelp] = useState(false);
  const helpId = useId();
  const heading = useRef<HTMLHeadingElement>(null);
  const tiles = useRef(new Map<string, HTMLButtonElement>());
  const lastPlaque = useRef<string | null>(null);
  const open = plaque ? wall.entries.find(e => e.key === plaque) ?? null : null;
  const label = sport.label;

  /* Focus: on every change of view the heading takes it (a keyboard or screen reader user hears the screen
     change); Back from a plaque gives it to that plaque's tile instead. Never a scroll from focus: the board's
     reveal brings the top in, and a tile off screen is brought only to the nearest edge. */
  useEffect(() => {
    const closed = lastPlaque.current;
    lastPlaque.current = plaque;
    const tile = !plaque && closed ? tiles.current.get(closed) : undefined;
    if (!tile) { heading.current?.focus({ preventScroll: true }); return; }
    tile.focus({ preventScroll: true });
    const box = tile.getBoundingClientRect();
    if (box.top < 0 || box.bottom > window.innerHeight) tile.scrollIntoView({ block: 'nearest' });
  }, [plaque]);

  const back = open ? onClosePlaque : onBack;
  const backLabel = open ? 'Back to the wall' : from === 'retired' ? 'Back to retirement' : 'Back';
  return (
    <section data-career-hall-wall="" aria-labelledby={`${helpId}-title`} className="space-y-3">
      {/* Under sm the title takes a row of its own below Back and the "?": at 320 a long Back label left it
          three letters wide (seen on the walk's 320 picture of r1570-s4). */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button type="button" onClick={back} className="inline-flex min-h-11 min-w-11 items-center gap-1 rounded-lg border border-border bg-card px-3 text-xs font-semibold text-foreground">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> {backLabel}
        </button>
        <h2 id={`${helpId}-title`} ref={heading} tabIndex={-1} className="order-last w-full break-words text-center text-base font-black text-foreground outline-none sm:order-none sm:w-auto sm:min-w-0 sm:flex-1 sm:truncate">
          {open ? open.name : `Your ${label} Hall wall`}
        </h2>
        <button type="button" onClick={() => setHelp(h => !h)} aria-expanded={help} aria-controls={`${helpId}-help`} aria-label="How the Hall wall works"
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground">
          <HelpCircle className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      {help && (
        <div id={`${helpId}-help`} data-career-hall-wall-help="" className="space-y-1.5 rounded-xl border border-border bg-card p-3 text-xs text-muted-foreground">
          <p>Every player you retire in {label} My Career goes up on this wall, Hall of Famer or not, with how the Hall vote went.</p>
          <p>Starting a new career never takes a plaque down. The wall lives in this browser, like your save, so clearing site data clears it.</p>
          <p>The wall holds 12. When a 13th player retires, he goes up and the oldest player who missed the Hall comes down. A Hall of Famer only comes down when all 12 already up are in the Hall, oldest first.</p>
          <p>Example: your wall holds 9 Hall of Famers and 3 who missed. Your next player retires and misses too. He goes up, and the oldest of the 3 who missed comes down.</p>
        </div>
      )}
      {/* A tap on a tile asks for the plaque, so the rules fold away rather than push it down the screen. */}
      {open ? <Plaque sport={sport} e={open} /> : <Grid wall={wall} missing={missing} tiles={tiles.current} onOpen={key => { setHelp(false); onOpen(key); }} />}
    </section>
  );
}

function Grid({ wall, missing, tiles, onOpen }: { wall: HallWall; missing: boolean; tiles: Map<string, HTMLButtonElement>; onOpen: (key: string) => void }) {
  if (!wall.writable) return <p role="status" className="rounded-xl border border-border bg-card p-4 text-center text-sm text-muted-foreground">This wall was saved by a newer version of the site. Reload the page to see it.</p>;
  return (
    <div className="space-y-2">
      {missing && <p role="status" className="rounded-xl border border-border bg-card p-3 text-center text-xs text-muted-foreground">This browser did not keep the wall, so this player is not on it.</p>}
      {wall.entries.length === 0
        ? <p className="rounded-xl border border-border bg-card p-4 text-center text-sm text-muted-foreground">Nobody on the wall yet. Every player you retire goes up here.</p>
        : (
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {wall.entries.map(e => (
              <li key={e.key} className="min-w-0">
                <button type="button" data-career-hall-wall-tile="" ref={el => { if (el) tiles.set(e.key, el); else tiles.delete(e.key); }} onClick={() => onOpen(e.key)}
                  className={`block min-h-11 w-full min-w-0 rounded-xl border-2 ${gold(e)} bg-card px-2 py-1.5 text-left`}>
                  {/* Every line wraps, never cut: a name runs to 24 letters, and the Hall line is the fact the tile is for. */}
                  <span className="block break-words text-xs font-bold text-foreground">{e.name}</span>
                  <span className="block break-words text-[11px] text-muted-foreground">{e.pos}, {years(e)}</span>
                  <span className="block break-words text-[11px] font-semibold text-foreground">{wallHallLine(e)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
    </div>
  );
}

function Plaque({ sport, e }: { sport: UsCareerSport; e: HallWallEntry }) {
  const rules = sport.hall?.rules;
  const rec = e.hall;
  const shown = rules ? hallYearsShown(rules, rec) : false;
  const clubs = e.teams.map(t => sport.teamLabelOf(t, e.eraId)).join(', ') + (e.moreTeams ? ` and ${e.moreTeams} more` : '');
  return (
    <article data-career-hall-wall-plaque="" className={`space-y-3 rounded-xl border-2 ${gold(e)} bg-card p-4`}>
      <div className="space-y-1 text-center">
        <p className="text-xs text-muted-foreground">{e.pos}, {e.seasons} {e.seasons === 1 ? 'season' : 'seasons'}, {years(e)}</p>
        <p className="text-xs text-foreground">{clubs}</p>
        <p className="text-xs text-foreground">{wallCount(e.rings, sport.ringsLabel)}</p>
        {e.honours.length > 0 && (
          <ul className="flex flex-wrap justify-center gap-1.5">
            {e.honours.map(h => <li key={h.label} className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground">{wallCount(h.n, h.label)}</li>)}
          </ul>
        )}
        <p className="text-sm font-bold text-foreground">Legacy {e.legacy}</p>
        <p className="text-xs text-muted-foreground">{e.verdict}</p>
      </div>
      <div className="space-y-2 border-t border-border pt-3">
        <p className="text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{rec.hallName}</p>
        {rules && rec.ballots.length > 0 && (
          <ul className="space-y-0.5 text-center text-xs text-muted-foreground">
            {rec.ballots.map((b, i) => <li key={i} className={b.elected ? 'font-bold text-gold' : undefined}>{ballotLine(rules, b, i, shown)}</li>)}
          </ul>
        )}
        <h3 data-career-hall-wall-headline="" className="text-center text-lg font-black tracking-tight text-foreground">{hallHeadline(rec, rules)}</h3>
        {rec.jersey && <p className="text-center text-xs font-bold text-foreground">{wallJerseyLine(rec.jersey)}</p>}
        {rec.weighs && <p className="text-center text-xs text-muted-foreground">{rec.weighs}</p>}
      </div>
    </article>
  );
}
