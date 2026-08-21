import { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CATEGORIES } from '@/data/gameRegistry';

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

export function buildItems(): TickerItem[] {
  const items: TickerItem[] = [];

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
      });
    } else if (row) {
      items.push({ icon: '🔴', text: `Your save: ${cm.clubName}, season ${cm.season ?? 1} awaits kick off`, to: '/club-manager' });
    }
    const race = Array.isArray(cm.scorerRace) ? [...cm.scorerRace].sort((a, b) => b.goals - a.goals)[0] : null;
    if (race && race.goals > 0) {
      items.push({ icon: '👟', text: `Golden boot race: ${race.name} leads on ${race.goals}`, to: '/club-manager' });
    }
  }

  /* ---- Your Stadium Tycoon empire ---- */
  const st = readSave<{ money?: number; rep?: number; fanbase?: number }>('stadiumTycoonSaveV1');
  if (st && typeof st.money === 'number' && st.money > 0) {
    const rep = typeof st.rep === 'number' && st.rep > 0 ? ` · ${st.rep}⭐ rep` : '';
    items.push({ icon: '🏟️', text: `Your stadium empire: ${moneyShort(st.money)} banked${rep}`, to: '/stadium-tycoon' });
  }

  /* ---- Your Soccer Career player ---- */
  const sc = readSave<{ playerName?: string; age?: number; overall?: number; currentClub?: string }>('soccerCareerSave');
  if (sc && typeof sc.playerName === 'string' && sc.playerName && typeof sc.overall === 'number') {
    items.push({
      icon: '⚽',
      text: `Your pro: ${sc.playerName}, ${sc.overall} OVR${sc.currentClub ? ` at ${sc.currentClub}` : ''}`,
      to: '/soccer-career',
    });
  }

  /* ---- Today's dailies, rotated by the calendar so the strip changes daily ---- */
  const dailies = CATEGORIES.flatMap(c => c.games).filter(g => g.daily);
  if (dailies.length) {
    const day = Math.floor(Date.now() / 86400000);
    for (let i = 0; i < Math.min(4, dailies.length); i++) {
      const g = dailies[(day + i * 7) % dailies.length];
      items.push({ icon: '🗓️', text: `Fresh daily: ${g.label}`, to: g.path });
    }
  }

  /* ---- Live counts off the registry, so they can never go stale ---- */
  const all = CATEGORIES.flatMap(c => c.games);
  items.push({ icon: '🎮', text: `${all.length} free games, no sign-up, no downloads`, to: '/' });
  const soccer = CATEGORIES.find(c => /soccer/i.test(c.title));
  if (soccer) items.push({ icon: '⚽', text: `${soccer.games.length} soccer games and counting`, to: '/' });
  items.push({ icon: '📰', text: 'New stuff ships almost daily. See what changed', to: '/whats-new' });

  return items;
}

const HIDDEN_PREFIXES = ['/admin', '/reset-password'];

export function TopTicker() {
  const { pathname } = useLocation();
  /* Rebuilt per navigation, which is exactly when a save line can change
     (you just played the game you are navigating away from). */
  const items = useMemo(() => buildItems(), [pathname]);

  if (HIDDEN_PREFIXES.some(p => pathname.startsWith(p))) return null;
  if (!items.length) return null;

  const home = pathname === '/';
  const itemClass = 'inline-flex items-center gap-1.5 px-4 text-[11px] text-muted-foreground shrink-0';
  const track = items.map((it, i) => (
    <Link key={`${it.to}-${i}`} to={it.to} className={`${itemClass} hover:text-foreground transition-colors`}>
      <span aria-hidden="true">{it.icon}</span>
      <span className="whitespace-nowrap">{it.text}</span>
      <span className="text-border pl-4" aria-hidden="true">·</span>
    </Link>
  ));
  /* The second copy makes the loop seamless. Plain spans, not links, so a
     keyboard user never tabs through the strip twice. */
  const ghost = items.map((it, i) => (
    <span key={`dup-${i}`} aria-hidden="true" className={itemClass}>
      <span>{it.icon}</span>
      <span className="whitespace-nowrap">{it.text}</span>
      <span className="text-border pl-4">·</span>
    </span>
  ));

  return (
    <div className={`${home ? '' : 'hidden md:block'} bg-card border-b border-border overflow-hidden h-7 relative`} aria-label="Site ticker">
      <div className="flex items-center h-full">
        <span className="shrink-0 z-10 h-full inline-flex items-center gap-1 px-2.5 bg-primary text-primary-foreground text-[10px] font-bold tracking-widest uppercase">
          <span className="w-1.5 h-1.5 rounded-full bg-primary-foreground animate-pulse" aria-hidden="true" /> The Ticker
        </span>
        <div className="dukb-ticker-viewport flex-1 overflow-hidden h-full">
          <div className="dukb-ticker-track flex items-center h-full w-max">
            {track}
            {ghost}
          </div>
        </div>
      </div>
      <style>{`
        @keyframes dukbTickerScroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .dukb-ticker-track { animation: dukbTickerScroll ${Math.max(30, items.length * 6)}s linear infinite; }
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
