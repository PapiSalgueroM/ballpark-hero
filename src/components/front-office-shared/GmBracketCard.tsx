/* Round 1308: a front office's playoff bracket, a face of the board's week box.

   THE BOX IS THE BOARD'S (GM_GAME_DAY_BOX, src/lib/gmGameLog.ts: one height a
   breakpoint, the rule Round 1307 wrote for the Game Day tile). This card
   fills it (`h-full`) and only two parts move inside it: the row of week
   chips scrolls sideways inside itself, and the week's ties sit in ONE named
   scroller (`data-bracket-scroll`). So the page is the same height on every
   face, whichever week is shown and however many ties it holds.

   NO PRESS BUTTON. Playing a round, watching it and simming the rest are the
   board's own button row (Round 1309), under the box where Play and Watch
   already are. The card's only controls: the week chips (which week is
   listed; viewing only), "Your game" on a decided tie of his (the board
   opens his game on the tile in the same box) and the "?", the Season
   Center's sheet (not edited) drawn over the board's week box through the
   host it is handed, as the Game Day tile draws its own. Every control is 44
   px; no text is under 12 px; clubs are text.

   Every word and number comes from src/lib/gmBracketView.ts, where a unit
   test holds it. No animation, no clock, no randomness. */
import { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { SeasonCentreHelp, type HelpWords } from '@/components/season-centre/SeasonCentreHelp';
import type { GmBracketMount } from '@/lib/gmPostseason';
import { GM_BRACKET_UNKNOWN, GM_BRACKET_WORDS, gmBracketPlace, gmBracketRows, gmBracketWeeks, gmSeedText, gmSeriesNote, gmSideText } from '@/lib/gmBracketView';

export interface GmBracketCardProps extends GmBracketMount {
  help: HelpWords;
  /** A club's seed as the sport numbers it (the NFL: 1 to 7 in each conference), or null for a club outside the bracket. */
  seedOf(club: string): number | null;
  /** A bracket week's name (the NFL's from the sourced ledger). */
  weekLabel(week: number): string;
}

const ROUND_BUTTON = 'inline-flex h-11 shrink-0 items-center justify-center rounded-full border border-border bg-card text-xs font-bold text-foreground hover:bg-muted/40';

/** Where a scroller must stand so an item from `start` to `start + size` is in its view of `view`, moving as little as
 *  it can: unmoved when the item is already in view, its start when it is above (or longer than the view), its end
 *  when it is below. Only the card's own two scrollers are moved by it, never the page. */
export function scrollToShow(at: number, view: number, start: number, size: number): number {
  if (start < at || size > view) return start;
  if (start + size > at + view) return start + size - view;
  return at;
}

export function GmBracketCard({ format, save, my, name, onOpenGame, helpHost, help, seedOf, weekLabel }: GmBracketCardProps) {
  const { weeks, open } = gmBracketWeeks(format, save);
  /* the week he asked to see, kept only while the card shows the same bracket standing where it stood when he asked
     (after a press, or for another season's bracket or a rebuilt one, the card opens on the week to play); viewing only */
  const bracket = `${save.season}|${save.seeds.join(',')}`;
  const [asked, setAsked] = useState<{ week: number; open: number; bracket: string } | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const helpButton = useRef<HTMLButtonElement | null>(null);
  /* THE "?" MUST NOT MOVE THE PAGE FOR NOTHING (the Game Day tile's rule): when the top of the box the sheet lies
     over was already readable, the browser's scroll to the focused sheet is put back before anything is painted. */
  const scrollAt = useRef<number | null>(null);
  const openHelp = () => {
    const over = (helpHost?.parentElement ?? helpButton.current?.closest('[data-bracket]'))?.getBoundingClientRect();
    scrollAt.current = over && over.top >= 0 && window.innerHeight - over.top >= 160 ? window.scrollY : null;
    setHelpOpen(true);
  };
  useLayoutEffect(() => {
    const y = scrollAt.current;
    scrollAt.current = null;
    if (helpOpen && y !== null && window.scrollY !== y) window.scrollTo({ top: y, behavior: 'instant' as ScrollBehavior });
  }, [helpOpen]);

  const week = asked && asked.open === open && asked.bracket === bracket && weeks.includes(asked.week) ? asked.week : open;
  const place = gmBracketPlace(format, save, my, name);
  const rows = gmBracketRows(format, save, week, my);

  /* HIS PART OF THE CARD IS IN VIEW (the review of 2026-10-12, at 320, 390 and 1280): the week shown has its chip in
     the chip row's view, and his tie, when the week holds one, is in the list's view; with none the list starts at its
     top. Each time the face changes (another week, another game played, another club), and only then, so a list he
     scrolled himself is left where he put it. The card's own scrollers move; the page never does. */
  const chipRow = useRef<HTMLDivElement | null>(null);
  const tieList = useRef<HTMLOListElement | null>(null);
  const mineId = rows.find(r => r.mine)?.id ?? null;
  const games = save.played.reduce((n, p) => n + p.games.length, 0);
  const face = `${bracket}|${week}|${my}|${mineId}|${games}`;
  useLayoutEffect(() => {
    const row = chipRow.current;
    const chip = row?.querySelector<HTMLElement>(`[data-bracket-week="${week}"]`);
    if (row && chip) {
      const r = row.getBoundingClientRect(), c = chip.getBoundingClientRect();
      row.scrollLeft = scrollToShow(row.scrollLeft, row.clientWidth, c.left - r.left + row.scrollLeft, c.width);
    }
    const list = tieList.current;
    if (!list) return;
    const mine = mineId ? list.querySelector<HTMLElement>(`[data-bracket-tie="${mineId}"]`) : null;
    if (!mine) { list.scrollTop = 0; return; }
    const l = list.getBoundingClientRect(), m = mine.getBoundingClientRect();
    list.scrollTop = scrollToShow(list.scrollTop, list.clientHeight, m.top - l.top + list.scrollTop, m.height);
  }, [face, week, mineId]);
  const sheet = helpOpen
    ? <SeasonCentreHelp words={help} onClose={() => { setHelpOpen(false); helpButton.current?.focus({ preventScroll: true }); }} />
    : null;

  return (
    <div className="flex h-full flex-col gap-1.5 text-left" data-bracket data-bracket-face={place.kind}>
      <div className="flex h-11 shrink-0 items-center justify-between gap-2">
        <span className="min-w-0 text-xs font-bold uppercase tracking-wider text-muted-foreground">{GM_BRACKET_WORDS.title}</span>
        <button ref={helpButton} type="button" onClick={openHelp} aria-label={GM_BRACKET_WORDS.help} className={`${ROUND_BUTTON} w-11`} data-bracket-help>?</button>
      </div>
      <div ref={chipRow} className="flex shrink-0 gap-1 overflow-x-auto" style={{ scrollbarWidth: 'none' }} role="group" aria-label={GM_BRACKET_WORDS.weeks} data-bracket-weeks>
        {weeks.map(w => (
          <button key={w} type="button" onClick={() => setAsked({ week: w, open, bracket })} aria-pressed={w === week}
            className={`inline-flex h-11 shrink-0 items-center rounded-lg border px-3 text-xs font-bold ${w === week ? 'border-primary bg-primary/10 text-foreground' : 'border-border bg-card text-muted-foreground'}`}
            data-bracket-week={w}>{weekLabel(w)}</button>
        ))}
      </div>
      <p className="shrink-0 text-sm font-bold text-foreground" data-bracket-place={place.kind}>{place.line}</p>
      <ol ref={tieList} className="min-h-0 flex-1 space-y-1.5 overflow-y-auto" data-bracket-scroll>
        {rows.map(r => (
          <li key={r.id} className={`rounded-lg border px-2 py-1 ${r.mine ? 'border-primary bg-primary/5' : 'border-border'}`} data-bracket-tie={r.id} data-bracket-mine={r.mine ? 'true' : undefined}>
            <div className="flex items-center justify-between gap-2">
              <span className="min-w-0 truncate text-xs text-muted-foreground">{r.round}</span>
              {r.mine && r.decided && (
                <button type="button" onClick={() => onOpenGame(r.id)} className={`${ROUND_BUTTON} px-3`} data-bracket-open={r.id}>{GM_BRACKET_WORDS.yourGame}</button>
              )}
            </div>
            {r.sides.map((s, k) => (
              <div key={k} className={`flex items-center gap-2 text-sm ${s.won ? 'font-bold text-foreground' : s.out ? 'text-muted-foreground' : 'text-foreground'}`}
                data-bracket-side={k === 0 ? 'home' : 'away'} data-won={s.won ? 'true' : undefined} data-out={s.out ? 'true' : undefined}>
                <span className="w-5 shrink-0 text-right text-xs tabular-nums text-muted-foreground" data-bracket-seed>{s.club ? gmSeedText(seedOf(s.club)) : ''}</span>
                <span className="min-w-0 flex-1 truncate">{s.club ? name(s.club) : GM_BRACKET_UNKNOWN}</span>
                <span className="shrink-0 tabular-nums" data-bracket-score>{gmSideText(r, k as 0 | 1)}</span>
              </div>
            ))}
            {gmSeriesNote(format, r, week) && <p className="text-xs text-muted-foreground" data-bracket-series>{gmSeriesNote(format, r, week)}</p>}
          </li>
        ))}
      </ol>
      {sheet && (helpHost ? createPortal(sheet, helpHost) : sheet)}
    </div>
  );
}
