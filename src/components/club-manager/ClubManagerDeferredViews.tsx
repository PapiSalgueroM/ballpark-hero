import type { ReactNode } from 'react';
import { ChevronRight, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CareerState } from '@/lib/clubManager';
import HubTile from '@/components/club-manager/HubTile';

export function EraLoadFailed({ label, noun = 'squads', onRetry, onBack, backLabel = 'Pick another season' }: { label: string; noun?: string; onRetry: () => void; onBack?: () => void; backLabel?: string }) {
  return (
    <div role="alert" data-testid="cm-era-load-failed" className="max-w-md mx-auto my-12 rounded-xl border border-border bg-card p-5 text-center">
      <div className="text-sm font-bold text-foreground">The {label} {noun} did not load.</div>
      <div className="mt-1 text-xs text-muted-foreground">Check your connection, then try again. Nothing has been lost.</div>
      <button
        onClick={onRetry}
        className="mt-4 px-5 py-2.5 rounded-xl font-bold bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
      >
        Try again
      </button>
      {/* Round 832 review: the picker's waiting steps hide their own back
          buttons, so a season that will not load offers the way back here. */}
      {onBack && (
        <button
          onClick={onBack}
          className="mt-4 ml-2 px-5 py-2.5 rounded-xl font-bold bg-secondary text-foreground hover:bg-secondary/70 transition-colors"
        >
          {backLabel}
        </button>
      )}
    </div>
  );
}

export function WorldEditorTile({ movedCount, onOpen }: { movedCount: number; onOpen: () => void }) {
  return (
            <button
              onClick={onOpen}
              data-testid="cm-world-editor-tile"
              className={cn(
                'w-full rounded-xl border p-3 text-left transition-all hover:border-primary',
                movedCount ? 'bg-primary/10 border-primary' : 'bg-card border-dashed border-primary/50',
              )}
            >
              <div className="flex items-center gap-2.5">
                <span className="text-xl leading-none">🌍</span>
                <div className="min-w-0">
                  <div className="text-sm font-bold text-foreground">World editor{movedCount ? `: ${movedCount} clubs moved` : ''}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {movedCount ? 'Your world is edited. Tap to change it or put it back.' : 'Optional. Move any club to any league first: Celtic in the Premier League, your own super league.'}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto shrink-0" />
              </div>
            </button>
  );
}

export function ClubHeading({ crest, clubName, seasonLabel, season, difficulty, noSack, midSeason }: {
  crest: ReactNode; clubName: string; seasonLabel: string; season: number;
  difficulty: { id: string; label: string } | null; noSack: boolean; midSeason: boolean;
}) {
  return (
        <div className="flex items-center justify-center gap-2 mb-1 flex-wrap px-12">
          {/* Round 154: a club you founded wears its crest where every other
              club wears its color dot. */}
          {crest}
          <h1 className="text-2xl md:text-3xl font-bold text-primary font-display">{clubName}</h1>
          {/* Round 132: the save now knows what year it is, so it says so, next
              to the season count it has always shown. */}
          <span className="text-xs font-bold text-muted-foreground border border-border rounded-full px-2 py-0.5 whitespace-nowrap">
            {seasonLabel} · Season {season}
          </span>
          {/* Round 1501: a career off Medium wears its level (Round 1512: whichever it is on now). No pill on Medium. */}
          {difficulty !== null && (
            <span data-cm-level-pill={difficulty.id} className="text-xs font-bold text-muted-foreground border border-border rounded-full px-2 py-0.5 whitespace-nowrap">
              {difficulty.label}
            </span>
          )}
          {/* Round 1342: a No sacking career wears it for its whole life. No pill otherwise. */}
          {noSack && (
            <span data-cm-nosack-pill className="text-xs font-bold text-muted-foreground border border-border rounded-full px-2 py-0.5 whitespace-nowrap">
              🛡️ No sacking
            </span>
          )}
          {/* Round 549: a career that began part way through says so for as long
              as that season runs. The games before the takeover were simulated,
              and a badge that only lives on the picker would let somebody forget
              that by the time they are reading the table. Round 1328: it used to
              call those games the run-in, but a run-in is the end of a season,
              and "The run-in" is itself one of the three takeover points; the words
              now hold for the Autumn, the New year and the run-in takeovers and
              for a Hot Seat carry on alike. */}
          {midSeason && (
            <span className="text-xs font-bold text-muted-foreground border border-border rounded-full px-2 py-0.5 text-center leading-snug">
              🗓️ Took over mid season · the games before you arrived were simulated
            </span>
          )}
        </div>
  );
}

export function LeagueSeasonNotice({ league, leagueGames }: { league: 'k' | 'csl' | 'j1'; leagueGames: number }) {
  if (league === 'k') return <p data-cm-kleague-model className="text-xs text-muted-foreground mb-4">K League 1 plays 22 simulated league games on the shared August to May calendar. The real 2026 league used 33 games, then 5 split games. The split, Korea Cup, AFC competitions and promotion/relegation are not played here.</p>;
  if (league === 'csl') return <p data-cm-csl-model className="text-xs text-muted-foreground mb-4">Chinese Super League plays 30 games on Club Manager's simulated calendar. The 2026 start includes real opening point deductions. The CFA Cup, Super Cup, AFC competitions and promotion and relegation are outside this league model.</p>;
  return <p data-cm-j1-model className="text-xs text-muted-foreground mb-4">J1 plays {leagueGames} league games with generated opening squads and simulated dates and results. The Emperor's Cup, J.League Cup, AFC competitions and J2 promotion and relegation are outside this league model.</p>;
}

export function KLeagueCupNotice() {
  return <p data-cm-kleague-cup className="bg-card border border-border rounded-xl p-3 text-xs text-muted-foreground">The Korea Cup is not played here. This K League 1 season is a 22-game league simulation on the shared calendar. Its real 2026 split, AFC competitions and promotion/relegation are not played either.</p>;
}

const FORM_TONE: Record<'W' | 'D' | 'L', string> = {
  W: 'bg-emerald-500', D: 'bg-yellow-500', L: 'bg-red-500',
};

export function ClubStatus({ positionLabel, stadium, budgetLabel, form, trophyCount }: {
  positionLabel: string; stadium: { name: ReactNode; capacity: number | null } | null;
  budgetLabel: ReactNode; form: readonly ('W' | 'D' | 'L')[]; trophyCount: number;
}) {
  return <>
          {/* Round 99: found by playing it. Before a ball is kicked every
              club is on zero points, so the "position" was just wherever the
              shuffled table happened to put you: a brand new Manchester City
              save opened on "#15 in league", which reads as broken. */}
          <span>{positionLabel}</span>
          {stadium !== null && (
            <span className="inline-flex items-center gap-1">
              🏟 {stadium.name}{stadium.capacity !== null ? ` (${stadium.capacity}k)` : ''}
            </span>
          )}
          <span className="text-gold font-semibold">{budgetLabel}</span>
          <span className="inline-flex items-center gap-1">
            {form.length === 0 && <span>No matches yet</span>}
            {form.map((f, i) => <span key={i} className={cn('w-2 h-2 rounded-full', FORM_TONE[f])} />)}
          </span>
          {trophyCount > 0 && <span>🏆×{trophyCount}</span>}
  </>;
}

type OverviewMatch = {
  compLabel: string; neutral: boolean; homeFirst: boolean; clubName: string; opponent: string;
  venue: string; opponentStrength: number; xiAverage: number; onLive: () => void; resume: boolean;
  onQuick: () => void; onCentre: (() => void) | null; shootout: { onClick: () => void; label: string } | null;
};

export function OverviewIntro({ summerBudget, retired, freeRetired, freeLeft, deals, transfer, match, windowAction, seasonAction }: {
  summerBudget: (NonNullable<CareerState['summerBudget']> & { format: (n: number) => string }) | null;
  retired: string | null; freeRetired: string | null; freeLeft: string | null;
  deals: { onClick: () => void; text: string; real: boolean } | null;
  transfer: { onClick: () => void; summer: boolean } | null; match: OverviewMatch | null;
  windowAction: (() => void) | null; seasonAction: (() => void) | null;
}) {
  const budgetRows: [string, string][] = [];
  if (summerBudget) {
    const { unspent, allocation, carried, adjustments, opening, format } = summerBudget;
    budgetRows.push(
      ['Unspent balance', format(unspent)],
      ['Board allocation', format(allocation)],
      ['Carried over', format(carried)],
    );
    if (unspent > carried) budgetRows.push(['Above carryover cap', format(unspent - carried)]);
    if (adjustments) budgetRows.push(['Summer adjustments', `${adjustments < 0 ? '-' : '+'}${format(Math.abs(adjustments))}`]);
    budgetRows.push(['Opening budget', format(opening)]);
  }
  return <>
          {budgetRows.length > 0 && (
            <section data-cm-summer-budget className="rounded-xl border border-border bg-card p-2.5">
              <h2 className="text-xs font-semibold text-foreground">Summer transfer budget</h2>
              <dl className="mt-1 space-y-0.5 text-xs">
                {budgetRows.map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-3 last:border-t last:border-border last:pt-1 last:font-bold">
                    <dt>{label}</dt><dd className="tabular-nums">{value}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-1 text-xs text-muted-foreground">You can carry over up to your new board allocation.</p>
            </section>
          )}
          {/* Round 132: who stopped playing over the summer. It sits at the top
              of the first screen of the new season because losing a thirty
              seven year old you have had since day one is the biggest thing
              that happened between May and August, and until this round it was
              a thing that could never happen at all. */}
          {retired !== null && (
            <div className="rounded-xl border border-border bg-card p-2.5">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">👟 Hung up their boots</div>
              <div className="text-xs text-foreground">
                {retired}
              </div>
              <div className="text-[9px] text-muted-foreground mt-1">That is the end of their careers. You will need to replace them.</div>
            </div>
          )}
          {/* Round 1597: and the men on the free agent list who called it a day, so nobody leaves the game unseen. */}
          {freeRetired !== null && (
            <div data-cm-fa-retired className="rounded-xl border border-border bg-card p-2.5">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">👟 Retired off the free agent list</div>
              <div className="text-xs text-foreground">
                {freeRetired}
              </div>
              <div className="text-[9px] text-muted-foreground mt-1">Nobody signed them, so they have hung up their boots.</div>
            </div>
          )}
          {/* Round 1597 closing check: and the made up men who left the list for a club outside these leagues. */}
          {freeLeft !== null && (
            <div data-cm-fa-left className="rounded-xl border border-border bg-card p-2.5">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">🧳 Off the free agent list</div>
              <div className="text-xs text-foreground">
                {freeLeft}
              </div>
              <div className="text-[9px] text-muted-foreground mt-1">Made up players nobody here signed. They found a club in a league this game does not follow, so they are off the list.</div>
            </div>
          )}
          {/* Round 1597: the last weeks of a season name every deal that runs out, so none ends unseen. */}
          {deals !== null && (
            <button
              data-cm-deals-line
              onClick={deals.onClick}
              className="w-full rounded-xl border border-primary/40 bg-primary/10 p-2.5 text-left text-xs text-foreground hover:bg-primary/20 transition-colors"
            >
              📝 {deals.text} {deals.real && <><span data-cm-deal-label className="text-muted-foreground">(this game&apos;s deals)</span> </>}<span className="font-bold text-primary">Open the contracts desk</span>
            </button>
          )}
          {transfer !== null && (
            <button
              onClick={transfer.onClick}
              className="w-full rounded-xl border border-gold/40 bg-gold/10 p-2.5 text-xs font-bold text-gold hover:bg-gold/20 transition-colors"
            >
              {transfer.summer ? '☀️' : '❄️'} Transfer window open. Tap to do business before your next match
            </button>
          )}

          <div className="bg-card border border-border rounded-2xl p-4 text-center">
            {match !== null && (
              <>
                <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">{match.compLabel}</div>
                {/* Round 1340: the home side first, like a scoreboard, your club picked out in green wherever it sits. */}
                <div className="text-lg font-bold font-display text-foreground" data-cm-next-match="1">
                  {match.neutral ? '🏟️ ' : ''}
                  {match.homeFirst
                    ? <><span className="text-primary" data-cm-next-side="me">{match.clubName}</span> <span className="text-muted-foreground text-sm">vs</span> <span data-cm-next-side="opp">{match.opponent}</span></>
                    : <><span data-cm-next-side="opp">{match.opponent}</span> <span className="text-muted-foreground text-sm">vs</span> <span className="text-primary" data-cm-next-side="me">{match.clubName}</span></>}
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  {match.venue} · their strength ~{match.opponentStrength} · your XI avg {match.xiAverage}
                </div>
                {/* Round 157: the team talk moved into the Match Centre, because
                    the owner said it was being pushed on him before every match.
                    Facts, form, head-to-head and the talk all live one tap away.
                    Round 472: and the hub keeps the two ways through a match
                    rather than three. Play Match and Watch Live were the same
                    fixture with the pitch drawn or not drawn, so they are one
                    button. Both start the same fixture; quick sim handles
                    legal substitutions while live play leaves you in charge. */}
                <div className="mt-3 grid grid-cols-2 gap-2 max-w-sm mx-auto">
                  <button
                    onClick={match.onLive}
                    data-cm-way="live"
                    className="inline-flex items-center justify-center gap-1 px-2 py-3 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:opacity-90 transition-opacity"
                  >
                    {/* Round 504: a match paused mid way (the save closed with
                        the clock running) is picked back up where it stood,
                        never kicked off again, so the button says so. */}
                    <Play className="w-4 h-4" /> {match.resume ? 'Resume match' : 'Play Live'}
                  </button>
                  <button
                    onClick={match.onQuick}
                    data-cm-way="quick"
                    className="inline-flex items-center justify-center gap-1 px-2 py-3 bg-secondary text-foreground rounded-xl font-bold text-sm hover:bg-secondary/70 transition-colors"
                  >
                    ⚡ Quick Sim
                  </button>
                </div>
                <p className="mt-1.5 text-[9px] text-muted-foreground">Play live to make your calls. Quick Sim handles your subs.</p>
                {/* Round 543: only offered when it can actually open. The facts
                    are built only for a match that has not kicked off (the panel
                    carries the pre-match team talk, which is not a thing you get
                    to give at minute 37), so with a match paused mid-flight this
                    button used to set the panel and render nothing at all. A
                    player who walks away from a live match and comes back is
                    exactly the case that hit it. */}
                {match.onCentre !== null && (
                  <button
                    onClick={match.onCentre}
                    className="mt-2 text-[11px] font-bold text-primary hover:underline"
                  >
                    📊 Match Centre: form, head to head, odds, team talk
                  </button>
                )}
                {/* Round 782: a knockout tie can end on penalties, so the
                    shootout order is one tap from the pre match card. Round 1510: and a super cup night. */}
                {/* Round 1593: and a Europa League knockout night (a league phase night never goes to penalties). */}
                {match.shootout !== null && (
                  <button
                    onClick={match.shootout.onClick}
                    data-cm-shootout-link="1"
                    className="mt-2 block mx-auto text-[11px] font-bold text-primary hover:underline"
                  >
                    🥅 Shootout order: {match.shootout.label}
                  </button>
                )}
              </>
            )}
            {windowAction !== null && (
              <>
                <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Mid-season break</div>
                <div className="text-lg font-bold font-display text-foreground">❄️ January transfer window</div>
                <button
                  onClick={windowAction}
                  className="mt-3 inline-flex items-center gap-2 px-8 py-3 bg-primary text-primary-foreground rounded-full font-bold text-lg hover:opacity-90 transition-opacity"
                >
                  Open the Window <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}
            {seasonAction !== null && (
              <>
                <div className="text-lg font-bold font-display text-foreground">Season complete!</div>
                <button
                  onClick={seasonAction}
                  className="mt-3 inline-flex items-center gap-2 px-8 py-3 bg-primary text-primary-foreground rounded-full font-bold text-lg hover:opacity-90 transition-opacity"
                >
                  See Season Review <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}
          </div>

  </>;
}

type HubTileValues = { value: string; sub?: string; accent?: boolean; onClick: () => void };

const HUB_TILES = [
  {"icon":"📋","title":"Board"},
  {"icon":"📩","title":"Inbox"},
  {"icon":"📅","title":"Calendar"},
  {"icon":"🏆","title":"League"},
  {"icon":"🏅","title":"Cups"},
  {"icon":"📊","title":"Stats"},
  {"icon":"💰","title":"Finances","sub":"Kitty change, projected"},
  {"icon":"🏗️","title":"Facilities","sub":"Stadium, training, medical, more"},
  {"icon":"🧑‍🏫","title":"Staff"},
  {"icon":"🎖️","title":"Skills"},
  {"icon":"⚙️","title":"Options"},
  {"icon":"💾","title":"Save points"},
  {"icon":"🧢","title":"Manager"},
  {"icon":"🏥","title":"Treatment"},
  {"icon":"🕵️","title":"Rival watch"},
  {"icon":"🎙️","title":"Press room"},
  {"icon":"🤝","title":"Dressing room"},
  {"icon":"🎓","title":"Academy"},
  {"icon":"🏋️","title":"Training"},
  {"icon":"🛒","title":"Market"},
  {"icon":"✨","title":"Cabinet"},
];

export function HubTiles({ rows }: { rows: readonly (HubTileValues | null)[] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
      {/* Round 471: the staff desk. Accented while a rival has an
                  approach on the table, because that one is on a clock. */}
      {/* Round 513: the manager's own progression. Accented only while
                  a point is sitting unspent, because that is the one state the
                  player is losing something by ignoring. */}
      {/* Round 514: the start options. Never accented: nothing here is
                  ever urgent and an accent would cry wolf. */}
      {/* Round 1513: named save points. On the hub, beside Options,
                  because a player who just lost a match looks here first. */}
      {/* Round 135: the microphone. Accented when somebody actually
                  wants a word, which is nothing like every week. */}
      {/* Round 127: what you told each of them he was, and whether you
                  have kept your word. */}
      {/* Round 116: the academy and the training ground, the two
                  things every real manager sim has and this one did not. */}
      {rows.map((row, i) => row !== null && (
        <HubTile key={HUB_TILES[i].title} {...HUB_TILES[i]} {...row} />
      ))}
    </div>
  );
}
