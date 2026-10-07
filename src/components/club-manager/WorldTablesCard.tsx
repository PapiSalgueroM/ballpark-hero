import { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { worldLeagueDefs, careerLeagueOf, sortedWorldTable, leagueRounds, leagueTiebreak, tiebreakFootnote, LEAGUE_NATIONS } from '@/lib/clubManager';
import type { CareerState, TableRow } from '@/lib/clubManager';
import { LeagueTableCard } from '@/components/club-manager/LeagueTableCard';
import { FlagImg } from '@/components/FlagImg';

interface WorldTablesCardProps {
  career: CareerState;
  /** My own league's live table (already sorted upstream). */
  myRows: TableRow[];
  onClubClick?: (club: string) => void;
}

/**
 * Round 95: standings for every league, not just the one I manage in.
 * His ask: "I would love it if u can see the standings of others leagues."
 * Every other league is simulated week by week alongside mine, so these are
 * live tables rather than a static preview.
 *
 * Round 163, his league views list: a flag on every league, and the tables
 * exist BEFORE a ball is kicked. Pre-season every table shows the full
 * membership in alphabetical order with my club starred, exactly how the
 * matchday apps he uses present an unstarted season.
 */
export function WorldTablesCard({ career, myRows, onClubClick }: WorldTablesCardProps) {
  const myLeague = careerLeagueOf(career);
  const [pick, setPick] = useState<string>(myLeague.id);
  const [browsing, setBrowsing] = useState(false);
  const [query, setQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  const browseRef = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef(false);

  // My league first, then the rest of THIS SAVE'S world in its usual order.
  // Round 312: this list came from REAL_LEAGUES, so an era save offered the
  // whole modern set, none of it simulated, with a duplicate of the save's
  // own league under the modern def's name.
  const leagues = useMemo(
    () => [myLeague, ...worldLeagueDefs(career).filter(l => l.id !== myLeague.id)].map(league => {
      const savedClubs = league.id === myLeague.id ? career.leagueClubs : career.world?.[league.id]?.table.map(row => row.club);
      return savedClubs?.length ? { ...league, clubs: savedClubs } : league;
    }),
    [myLeague, career],
  );

  const active = leagues.find(l => l.id === pick) ?? myLeague;
  const normalize = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase();
  const terms = normalize(query).trim().split(/\s+/).filter(Boolean);
  const matches = leagues.filter(league => {
    const text = normalize([league.name, LEAGUE_NATIONS[league.id] ?? '', ...league.clubs].join(' '));
    return terms.every(term => text.includes(term));
  });
  const nations = [...new Set(matches.map(league => LEAGUE_NATIONS[league.id] ?? 'Other leagues'))];
  const closeBrowser = (id?: string) => {
    if (id) setPick(id);
    returnFocus.current = true;
    setBrowsing(false);
    setQuery('');
  };
  useEffect(() => {
    if (browsing) searchRef.current?.focus({ preventScroll: true });
    else if (returnFocus.current) {
      browseRef.current?.focus({ preventScroll: true });
      returnFocus.current = false;
    }
  }, [browsing]);
  const mine = active.id === myLeague.id;
  const world = career.world?.[active.id];
  // Round 462: every table in its own league's order (Spain and Italy split
  // level points on head to head), and the footnote says which order.
  const rows: TableRow[] = mine
    ? myRows
    : world
      ? sortedWorldTable(career, active.id, world.table)
      // Pre-season: the league exists before its first round is simulated.
      : [...active.clubs]
          .sort((a, b) => a.localeCompare(b))
          .map(club => ({ club, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 }));
  const played = mine
    ? career.calendar.slice(0, career.week).filter(e => e.type === 'league').length
    : world?.round ?? 0;
  const total = leagueRounds(active.clubs.length);
  const preseason = rows.length > 0 && rows.every(r => r.w + r.d + r.l === 0);
  const footnote = preseason ? undefined : tiebreakFootnote(leagueTiebreak(active.id), rows, career.pairResults?.[active.id]);

  return (
    <div className="space-y-3" data-world-tables>
      {browsing ? <section aria-label="League browser" className="rounded-2xl border border-border bg-card p-3 space-y-3" onKeyDown={event => {
        if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); closeBrowser(); }
      }}>
        <div className="flex items-center justify-between gap-3">
          <div><h3 className="text-base font-black">Explore your world</h3><p className="text-xs text-muted-foreground">{leagues.length} leagues in this save</p></div>
          <button type="button" onClick={() => closeBrowser()} className="min-h-11 shrink-0 rounded-lg border border-border px-3 text-sm font-semibold">Back</button>
        </div>
        <label className="block text-sm font-semibold">Find a league or club
          <input ref={searchRef} type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="League, country or club" className="mt-1 min-h-11 w-full rounded-xl border border-border bg-background px-3 text-base font-normal" />
        </label>
        <p role="status" className="text-xs text-muted-foreground">{matches.length} {matches.length === 1 ? 'league' : 'leagues'} found</p>
        {matches.length ? <div className="max-h-[48vh] overflow-y-auto overscroll-contain space-y-4 pr-1" data-world-league-list>
          {nations.map(nation => <section key={nation} aria-label={nation}>
            <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">{nation}</h4>
            <div className="grid gap-2 sm:grid-cols-2">{matches.filter(league => (LEAGUE_NATIONS[league.id] ?? 'Other leagues') === nation).map(league => <button
              type="button" key={league.id} aria-pressed={league.id === active.id} onClick={() => closeBrowser(league.id)} data-world-league={league.id}
              className={cn('flex min-h-[60px] min-w-0 items-center gap-3 rounded-xl border p-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary', league.id === active.id ? 'border-primary bg-primary/10' : 'border-border bg-background hover:border-primary')}
            >
              {LEAGUE_NATIONS[league.id] && <FlagImg name={LEAGUE_NATIONS[league.id]} size={20} />}
              <span className="min-w-0"><span className="block break-words text-sm font-bold">{league.name}</span><span className="block text-xs text-muted-foreground">{league.clubs.length} clubs{league.id === myLeague.id ? ' · Your league' : ''}</span></span>
            </button>)}</div>
          </section>)}
        </div> : <div className="rounded-xl bg-muted/30 p-4 text-sm"><p>No leagues match that search in this save.</p><button type="button" className="mt-2 min-h-11 rounded-lg border border-border px-3 font-semibold" onClick={() => { setQuery(''); searchRef.current?.focus({ preventScroll: true }); }}>Clear search</button></div>}
      </section> : <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card p-3">
        <div className="flex min-w-0 basis-full items-center gap-2 sm:basis-0 sm:flex-1">
          {LEAGUE_NATIONS[active.id] && <FlagImg name={LEAGUE_NATIONS[active.id]} size={20} />}
          <div className="min-w-0"><h3 className="break-words text-sm font-bold">{active.name}</h3><p className="text-xs text-muted-foreground">{active.clubs.length} clubs{active.id === myLeague.id ? ' · Your league' : ''}</p></div>
        </div>
        <button ref={browseRef} type="button" className="min-h-11 rounded-xl border border-primary bg-primary/10 px-3 text-sm font-bold" onClick={() => setBrowsing(true)}>Browse leagues</button>
        {!mine && <button type="button" className="min-h-11 rounded-xl border border-border px-3 text-sm font-semibold" onClick={() => { browseRef.current?.focus({ preventScroll: true }); setPick(myLeague.id); }}>My league</button>}
      </div>}

      {!browsing && (rows.length > 0 ? (
        <>
          <LeagueTableCard
            rows={rows}
            myClub={career.clubName}
            title={preseason
              ? `${active.name} · pre-season, alphabetical order`
              : `${active.name} · round ${Math.min(played, total)} of ${total}`}
            preseason={preseason}
            onClubClick={onClubClick}
            footnote={footnote}
          />
          {preseason && (
            <p className="text-[9px] text-muted-foreground px-1">
              No games yet, so the order means nothing. Positions appear with the first round.
            </p>
          )}
          {!mine && !preseason && (
            <p className="text-[9px] text-muted-foreground px-1">
              Simulated live alongside your season, week for week. Tap a club to scout their squad.
            </p>
          )}
        </>
      ) : (
        <div className="bg-card border border-border rounded-2xl p-4 text-xs text-muted-foreground">
          {active.name} kicks off with your next league round.
        </div>
      ))}
    </div>
  );
}

export default WorldTablesCard;
