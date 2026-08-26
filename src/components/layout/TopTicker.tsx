import { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CATEGORIES } from '@/data/gameRegistry';
import { upcomingEvents, whenPhrase } from '@/data/sportsCalendar';
import { LogoMark } from '@/components/layout/Logo';
import { SPORT_HUB, SPORT_TAG, startLabel, teamShort, type LiveScoreRow } from '@/lib/liveScores';

/**
 * Round 167, his ask from the first review: the scrolling news strip the big
 * sports networks run across the top of the screen (the owner asked for it
 * by the famous one's name; that name stays out of this repo on purpose).
 * A thin scrolling wire across the top of every screen, and every line on
 * it is derived or personal, never typed in to rot: your own Club Manager
 * save (club, position, points, your league's golden boot leader), your
 * Stadium Tycoon empire, your Soccer Career player, which dailies are fresh
 * today, and live counts read straight off the game registry. No saves yet?
 * It still carries the dailies and the catalog. Paid live scores from the
 * real leagues stay parked as a money decision, which is the owner's call,
 * so nothing here pretends to be them.
 */

interface TickerItem {
  icon: string;
  text: string;
  to: string;
  /**
   * THIS LINE'S TEXT IS COMPUTED FROM SOMETHING THAT CHANGES WITHOUT THIS FILE
   * CHANGING, so it must never be frozen into a prerendered snapshot. The strip
   * marks these data-no-prerender and scripts/prerender.mjs drops them before
   * writing a document that will still be on disk next month.
   *
   * Round 258 introduced this as `dated` and set it on the real world calendar
   * lines only. Round 280 measured what that missed, by rendering six routes
   * twice with the page's own clock five days apart and diffing the captured
   * blocks. Exactly one thing drifted, on every route: the four "Fresh daily"
   * lines, which pick their games off `Date.now()`. They were sitting frozen in
   * all 126 committed snapshots, so every page on the site was promising a
   * crawler that today's puzzle is Tier List, and would have gone on promising
   * it for as long as those files lived. Nothing else on any sampled page moved.
   *
   * The two catalog counts are volatile on a different axis, which no clock test
   * can see: they are read off the registry and are right the day they are
   * written, but a snapshot outlives the build that wrote it, so "113 free games"
   * survives into a week when the registry says 130.
   *
   * THE RULE IS NOW MECHANICAL, not a list of known offenders: every items.push
   * below either sets volatile, or its text is a plain string literal with
   * nothing interpolated into it. simPrerender section 12 reads this file and
   * fails if a push ever breaks that, so the next computed line cannot be added
   * without deciding this question. playSnapshotDrift.mjs runs the clock test
   * itself against the built site.
   */
  volatile?: boolean;
}

/** Tolerant localStorage JSON read: any failure is just "no line". */
function readSave<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
}

function moneyShort(n: number): string {
  if (!Number.isFinite(n) || n < 0) return '$0';
  if (n >= 1e12) return `$${(n / 1e12).toFixed(1)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${Math.floor(n)}`;
}

export function buildItems(now: Date = new Date()): TickerItem[] {
  const items: TickerItem[] = [];

  /* ---- Round 258, his ask: "For the ticker I want real life events going
     on." Real, dated, two source checked fixtures off src/data/sportsCalendar
     .ts, soonest first, and they lead the strip because they are the only
     lines on it about the sport rather than about this site. When the
     calendar runs dry this loop adds nothing and the strip carries on exactly
     as it did before, which is the honest way for a hand kept list to age. */
  for (const ev of upcomingEvents(now)) {
    items.push({
      icon: ev.emoji,
      text: `${ev.title}, ${whenPhrase(ev, now)}`,
      to: ev.to,
      volatile: true,
    });
  }

  /* ---- Your Club Manager save, read from its own fields ---- */
  const cm = readSave<{
    clubName?: string;
    season?: number;
    table?: { club: string; pts: number; gf: number; ga: number; w: number; d: number; l: number }[];
    scorerRace?: { name: string; goals: number }[];
  }>('dukb-club-manager-save');
  if (cm && typeof cm.clubName === 'string' && Array.isArray(cm.table) && cm.table.length) {
    const sorted = [...cm.table].sort(
      (a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf || a.club.localeCompare(b.club),
    );
    const idx = sorted.findIndex(r => r.club === cm.clubName);
    const row = idx >= 0 ? sorted[idx] : null;
    const played = row ? row.w + row.d + row.l : 0;
    if (row && played > 0) {
      items.push({
        icon: '🔴',
        text: `Your save: ${cm.clubName} sit ${ordinal(idx + 1)} on ${row.pts} pts`,
        to: '/club-manager',
        volatile: true,
      });
    } else if (row) {
      items.push({ icon: '🔴', text: `Your save: ${cm.clubName}, season ${cm.season ?? 1} awaits kick off`, to: '/club-manager', volatile: true });
    }
    const race = Array.isArray(cm.scorerRace) ? [...cm.scorerRace].sort((a, b) => b.goals - a.goals)[0] : null;
    if (race && race.goals > 0) {
      items.push({ icon: '👟', text: `Golden boot race: ${race.name} leads on ${race.goals}`, to: '/club-manager', volatile: true });
    }
  }

  /* ---- Your Stadium Tycoon empire ---- */
  const st = readSave<{ money?: number; rep?: number; fanbase?: number }>('stadiumTycoonSaveV1');
  if (st && typeof st.money === 'number' && st.money > 0) {
    const rep = typeof st.rep === 'number' && st.rep > 0 ? ` · ${st.rep}⭐ rep` : '';
    items.push({ icon: '🏟️', text: `Your stadium empire: ${moneyShort(st.money)} banked${rep}`, to: '/stadium-tycoon', volatile: true });
  }

  /* ---- Your Soccer Career player ---- */
  const sc = readSave<{ playerName?: string; age?: number; overall?: number; currentClub?: string }>('soccerCareerSave');
  if (sc && typeof sc.playerName === 'string' && sc.playerName && typeof sc.overall === 'number') {
    items.push({
      icon: '⚽',
      text: `Your pro: ${sc.playerName}, ${sc.overall} OVR${sc.currentClub ? ` at ${sc.currentClub}` : ''}`,
      to: '/soccer-career',
      volatile: true,
    });
  }

  /* ---- Today's dailies, rotated by the calendar so the strip changes daily ---- */
  const dailies = CATEGORIES.flatMap(c => c.games).filter(g => g.daily);
  if (dailies.length) {
    const day = Math.floor(Date.now() / 86400000);
    for (let i = 0; i < Math.min(4, dailies.length); i++) {
      const g = dailies[(day + i * 7) % dailies.length];
      items.push({ icon: '🗓️', text: `Fresh daily: ${g.label}`, to: g.path, volatile: true });
    }
  }

  /* ---- Live counts off the registry, so they can never go stale ---- */
  const all = CATEGORIES.flatMap(c => c.games);
  items.push({ icon: '🎮', text: `${all.length} free games, all playable without an account`, to: '/', volatile: true });
  const soccer = CATEGORIES.find(c => /soccer/i.test(c.title));
  if (soccer) items.push({ icon: '⚽', text: `${soccer.games.length} soccer games and counting`, to: '/', volatile: true });
  items.push({ icon: '📰', text: 'New stuff ships almost daily. See what changed', to: '/whats-new' });

  return items;
}

const HIDDEN_PREFIXES = ['/admin', '/reset-password'];

/* ROUND 287: THE STRIP LOOKS LIKE THE ONE ON A SPORTS BROADCAST NOW, and it
   carries real scores. The owner asked for both. The look: a near black bar,
   a brand block on the left with the mark, and a run of cards separated by
   thin rules, each card a sport tag, two teams with their scores in tabular
   figures, and a state (a time, a period, or FINAL). The scores come in as a
   prop from LiveTicker so that this file stays pure: simTicker imports
   buildItems into node and must never drag a network client in with it.

   Every score card is data-no-prerender. It could not reach a snapshot anyway
   (the prerenderer leaves the database hanging), but the rule is that
   anything computed from something outside this file says so, and a card is
   computed from a table that changes every twenty minutes. */
export interface TopTickerProps {
  scores?: LiveScoreRow[];
}

function ScoreCard({ row, ghost }: { row: LiveScoreRow; ghost?: boolean }) {
  const tag = SPORT_TAG[row.sport] ?? row.sport.toUpperCase();
  const to = SPORT_HUB[row.sport] ?? '/';
  const home = teamShort(row.home, row.sport);
  const away = teamShort(row.away, row.sport);
  const state = row.live ? (row.status_long || 'Live') : row.finished ? 'Final' : startLabel(row.start_at);
  /* American sports read away then home ("Astros at Yankees"); soccer reads
     home then away. The strip follows the convention the fan expects. */
  const first = row.sport === 'soccer' ? [home, row.home_score] : [away, row.away_score];
  const second = row.sport === 'soccer' ? [away, row.away_score] : [home, row.home_score];
  const inner = (
    <>
      <span className="text-[9px] font-black tracking-[0.14em] text-muted-foreground">{tag}</span>
      <span className="inline-flex items-baseline gap-1.5">
        <span className="font-semibold text-foreground whitespace-nowrap">{first[0]}</span>
        {first[1] != null && <span className="tabular-nums font-bold text-foreground">{first[1]}</span>}
        <span className="text-muted-foreground px-0.5" aria-hidden="true">{row.sport === 'soccer' ? 'v' : '@'}</span>
        <span className="font-semibold text-foreground whitespace-nowrap">{second[0]}</span>
        {second[1] != null && <span className="tabular-nums font-bold text-foreground">{second[1]}</span>}
      </span>
      <span className={`inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider whitespace-nowrap ${row.live ? 'text-red-400' : row.finished ? 'text-muted-foreground' : 'text-primary'}`}>
        {row.live && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" aria-hidden="true" />}
        {state}
      </span>
    </>
  );
  const cls = 'inline-flex items-center gap-2 h-full px-3 border-l border-border/60 text-[11px] shrink-0';
  if (ghost) return <span aria-hidden="true" data-no-prerender="true" data-score-card="" className={cls}>{inner}</span>;
  return (
    <Link to={to} data-no-prerender="true" data-score-card="" className={`${cls} hover:bg-muted/40 transition-colors`} aria-label={`${tag}: ${first[0]} ${first[1] ?? ''} ${row.sport === 'soccer' ? 'v' : 'at'} ${second[0]} ${second[1] ?? ''}, ${state}`}>
      {inner}
    </Link>
  );
}

export function TopTicker({ scores = [] }: TopTickerProps) {
  const { pathname } = useLocation();
  /* Rebuilt per navigation, which is exactly when a save line can change
     (you just played the game you are navigating away from). */
  const items = useMemo(() => buildItems(), [pathname]);

  if (HIDDEN_PREFIXES.some(p => pathname.startsWith(p))) return null;
  if (!items.length && !scores.length) return null;

  const home = pathname === '/';
  const anyLive = scores.some(r => r.live);
  const itemClass = 'inline-flex items-center gap-1.5 h-full px-3 border-l border-border/60 text-[11px] text-muted-foreground shrink-0';
  const cards = scores.map(r => <ScoreCard key={r.id} row={r} />);
  const track = items.map((it, i) => (
    <Link
      key={`${it.to}-${i}`}
      to={it.to}
      data-no-prerender={it.volatile ? 'true' : undefined}
      className={`${itemClass} hover:text-foreground transition-colors`}
    >
      <span aria-hidden="true">{it.icon}</span>
      <span className="whitespace-nowrap">{it.text}</span>
    </Link>
  ));
  /* The second copy makes the loop seamless. Plain spans, not links, so a
     keyboard user never tabs through the strip twice. */
  const ghostCards = scores.map(r => <ScoreCard key={`dup-${r.id}`} row={r} ghost />);
  const ghost = items.map((it, i) => (
    <span key={`dup-${i}`} aria-hidden="true" data-no-prerender={it.volatile ? 'true' : undefined} className={itemClass}>
      <span>{it.icon}</span>
      <span className="whitespace-nowrap">{it.text}</span>
    </span>
  ));
  const count = items.length + scores.length;

  return (
    <div data-site-chrome="" className={`${home ? '' : 'hidden md:block'} bg-[hsl(225_25%_4%)] border-b border-border/60 overflow-hidden h-8 relative`} aria-label="Scores and site ticker">
      <div className="flex items-center h-full">
        <span className="shrink-0 z-10 h-full inline-flex items-center gap-1.5 pl-2 pr-3 bg-primary text-primary-foreground text-[10px] font-black tracking-[0.18em] uppercase">
          <LogoMark size={16} className="shrink-0" />
          {anyLive ? (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" aria-hidden="true" /> Live
            </>
          ) : scores.length ? 'Scores' : 'The Ticker'}
        </span>
        <div className="dukb-ticker-viewport flex-1 overflow-hidden h-full">
          <div className="dukb-ticker-track flex items-center h-full w-max">
            {cards}
            {track}
            {ghostCards}
            {ghost}
          </div>
        </div>
      </div>
      <style>{`
        @keyframes dukbTickerScroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .dukb-ticker-track { animation: dukbTickerScroll ${Math.max(30, count * 6)}s linear infinite; }
        .dukb-ticker-viewport:hover .dukb-ticker-track { animation-play-state: paused; }
        @media (prefers-reduced-motion: reduce) {
          .dukb-ticker-track { animation: none; }
          .dukb-ticker-viewport { overflow-x: auto; }
        }
      `}</style>
    </div>
  );
}

export default TopTicker;
