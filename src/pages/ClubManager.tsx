import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Play, ChevronRight, ChevronLeft, Trophy, Briefcase, ShieldAlert, ClipboardList } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useClubManager } from '@/hooks/useClubManager';
import type { HubTab } from '@/hooks/useClubManager';
import {
  TIER_INFO, clubByName, clubPreviewRating, leagueOf, money, confidenceLabel,
  isAvailable, xiAverageRating, sortedTable,
  NATIONS, REAL_LEAGUES, playableClubs, objectiveStatuses, CM_ROSTER_META, isPartialClub,
  developingPlayers, INTENSITY_INFO, FOCUS_INFO,
  brokenPromises,
} from '@/lib/clubManager';
import type { NationDef, ObjectiveStatus, CupRound } from '@/lib/clubManager';
import { FlagImg } from '@/components/FlagImg';
import { GameNav } from '@/components/game/GameNav';
import { GameShell } from '@/components/game/GameShell';
import { HowToPlayPopover } from '@/components/game/HowToPlayPopover';
import { ResultScreen } from '@/components/game/ResultScreen';
import AdBanner from '@/components/ads/AdBanner';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import { LeagueTableCard } from '@/components/club-manager/LeagueTableCard';
import { WorldTablesCard } from '@/components/club-manager/WorldTablesCard';
import { UclBracketCard } from '@/components/club-manager/UclBracketCard';
import { CalendarCard } from '@/components/club-manager/CalendarCard';
import { InboxCard } from '@/components/club-manager/InboxCard';
import { ClubDetailScreen } from '@/components/club-manager/ClubDetailScreen';
import { SquadScreen } from '@/components/club-manager/SquadScreen';
import { TacticsScreen } from '@/components/club-manager/TacticsScreen';
import { TransferScreen } from '@/components/club-manager/TransferScreen';
import { HalftimeScreen } from '@/components/club-manager/HalftimeScreen';
import { MatchReportCard } from '@/components/club-manager/MatchReportCard';
import { AcademyScreen } from '@/components/club-manager/AcademyScreen';
import { TrainingScreen } from '@/components/club-manager/TrainingScreen';
import { RolesScreen } from '@/components/club-manager/RolesScreen';
import { useRevealScroll } from '@/hooks/useRevealScroll';

const FORM_TONE: Record<'W' | 'D' | 'L', string> = {
  W: 'bg-emerald-500', D: 'bg-yellow-500', L: 'bg-red-500',
};

// Round 70: board objective status chips.
const OBJ_CHIP: Record<ObjectiveStatus, { label: string; cls: string }> = {
  done: { label: 'Done', cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40' },
  onTrack: { label: 'On track', cls: 'bg-secondary text-muted-foreground border-border' },
  behind: { label: 'Behind', cls: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/40' },
  failed: { label: 'Failed', cls: 'bg-red-500/10 text-red-400 border-red-500/40' },
};

/** Round 74: one FIFA-style hub box. Tap it, it becomes its own screen. */
function HubTile({ icon, title, value, sub, accent, onClick }: {
  icon: string; title: string; value: string; sub?: string; accent?: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'rounded-xl border p-3 text-left transition-all bg-card hover:border-primary hover:-translate-y-0.5',
        accent ? 'border-gold/50' : 'border-border',
      )}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-base leading-none">{icon}</span>
        {accent && <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />}
      </div>
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{title}</div>
      <div className="text-sm font-bold font-display text-foreground truncate">{value}</div>
      {sub && <div className="text-[9px] text-muted-foreground truncate mt-0.5">{sub}</div>}
    </button>
  );
}

type HubPanel = 'board' | 'inbox' | 'calendar' | 'manager' | 'treatment' | 'cups' | 'trophies' | 'academy' | 'training' | 'roles';

const ClubManager = () => {
  const g = useClubManager();
  // Round 65: the owner's no scroll rule. Full time and season end screens are
  // what you were waiting for after pressing Play, so they pull themselves into
  // view rather than rendering below where your thumb just was.
  const revealRef = useRevealScroll<HTMLDivElement>(`${g.phase}:${g.career?.week ?? 0}`);
  // Round 70: the nation -> league -> team picker. Each step change pulls the
  // new step into view (skipFirst so landing on the page stays put).
  // Round 72: nations can hold more than one league (England, the USA).
  const [pickStep, setPickStep] = useState<'nation' | 'league' | 'team'>('nation');
  const [pickNation, setPickNation] = useState<NationDef | null>(null);
  const [pickLeagueId, setPickLeagueId] = useState<string | null>(null);
  const pickRef = useRevealScroll<HTMLDivElement>(`pick:${pickStep}:${pickNation?.id ?? ''}:${pickLeagueId ?? ''}`, { skipFirst: true });
  // Round 74: FIFA-style hub. Boxes on the home screen open their own
  // screens, and any club anywhere opens the rival viewer.
  const [hubPanel, setHubPanel] = useState<HubPanel | null>(null);
  const [clubView, setClubView] = useState<string | null>(null);
  const panelRef = useRevealScroll<HTMLDivElement>(`hub:${hubPanel ?? ''}:${clubView ?? ''}`, { skipFirst: true });

  const club = g.career ? clubByName(g.career.clubName) : null;
  const unavailable = useMemo(
    () => (g.career ? g.career.squad.filter(p => !isAvailable(p)) : []),
    [g.career],
  );
  const groupRows = useMemo(
    () => (g.career && g.career.uclGroup ? sortedTable(g.career.uclGroup.table) : []),
    [g.career],
  );
  // Round 116: the academy and the training ground feed their own hub tiles.
  const academy = g.career?.academy ?? null;
  const prospectCount = academy ? academy.prospects.length : 0;
  const growingCount = useMemo(
    () => (g.career ? developingPlayers(g.career).length : 0),
    [g.career],
  );
  const trainingLabel = g.career?.training
    ? `${INTENSITY_INFO[g.career.training.intensity].label} · ${FOCUS_INFO[g.career.training.focus].label}`
    : 'Not set';
  // Round 127: who you are letting down, and who has already asked to go.
  const letDown = useMemo(
    () => (g.career ? brokenPromises(g.career) : []),
    [g.career],
  );
  const wantAway = useMemo(
    () => (g.career ? g.career.squad.filter(p => p.wantsOut) : []),
    [g.career],
  );

  const shell = (inner: ReactNode) => (
    <>
      <PageSeo
        title="Club Manager: Football Management Sim | DoUKnowBall"
        description="Pick a real club, set your tactics, work the transfer market and survive the sack race across full 38-game seasons, cup runs and the Champions League."
        path="/club-manager"
      />
      <GameShell width="wide">
        <div className="relative">
          <HowToPlayPopover title="How to Play Club Manager" triggerSide="right">
            <div className="space-y-3 text-left">
              <p>🌍 <span className="font-semibold text-foreground">Pick any club in nine real leagues.</span> The big five (2026-27 lineups with promotions and relegations applied), the EFL Championship, the Saudi Pro League, both MLS conferences and the Eredivisie: 186 clubs, each with its real squad and market values as of August 2026, after the summer window. Giants get huge budgets and zero patience; underdogs get small budgets and a low bar.</p>
              <p>📋 <span className="font-semibold text-foreground">The board hands you a list of objectives</span>: league finish, a cup run, Europe, finishing above your rival, a goals quota. Hit them and your stock rises; miss them and the confidence meter drains.</p>
              <p>📅 <span className="font-semibold text-foreground">Play a full season in your club's REAL league</span>: the actual Premier League, La Liga, Serie A, Bundesliga or Ligue 1 clubs, plus the domestic cup and the Champions League if you qualify.</p>
              <p>🧠 <span className="font-semibold text-foreground">Set tactics before each match:</span> formation, mentality and your starting XI. Form, morale, fatigue, injuries and home advantage all matter.</p>
              <p>🤝 <span className="font-semibold text-foreground">Tell every player what he is</span>: star man, key first teamer, rotation option, backup or one for the future. Each rung is a promise about minutes, and the dressing room keeps score over your last ten matches. Keep your word and they play for you. Break it and they sulk, drag the room down and hand in transfer requests. You can buy your way out of a promise, but it costs six weeks of his wages a rung.</p>
              <p>💰 <span className="font-semibold text-foreground">Buy and sell in the summer and January windows.</span> Nearly 2,000 real players are on the market at their real values. Stay under budget and keep at least 14 players.</p>
              <p>📉 <span className="font-semibold text-foreground">Watch the board confidence meter.</span> Fall too far below expectations and you're sacked. Overachieve and bigger clubs come calling, from any of the five leagues.</p>
              <p>🏆 <span className="font-semibold text-foreground">Season score</span> = league points + 10 per trophy (max 130). Careers span multiple seasons; your save is kept on this device.</p>
            </div>
          </HowToPlayPopover>
          {inner}
        </div>
        <AdBanner slot="1234567890" format="horizontal" className="mt-8" />
        <GameSeoContent
          title="Club Manager: Football Management Sim"
          description="A full club-management sim in your browser: 186 clubs across nine real leagues, from the Premier League and the EFL Championship to the Saudi Pro League, MLS and the Eredivisie, each with its real squad and market values as of August 2026. Negotiate transfers, survive bidding wars, hit the board's objectives, and chase titles season after season."
          howToPlay={[
            'Pick your nation, then your league, then your club: 186 clubs across nine real leagues with 2026-27 lineups.',
            'Read the board\'s objectives: league finish, cup run, Europe where it applies, beating your rival, and a goals quota.',
            'Set your formation, mentality and XI, then play through the full season week by week.',
            'Work the market: negotiate fees, pay release clauses, take loans, and field bids for your own stars.',
            'Win trophies, keep the board happy, and build a managerial career that can cross leagues and continents.',
          ]}
        />
        <GameNav />
      </GameShell>
    </>
  );

  /* ================= BOOT ================= */
  if (g.phase === 'boot') {
    return shell(<div className="text-center py-24 text-muted-foreground animate-pulse">Loading…</div>);
  }

  /* ================= RESUME PROMPT ================= */
  if (g.phase === 'resume' && g.career) {
    const c = g.career;
    return shell(
      <div className="max-w-md mx-auto">
        <header className="text-center mb-6">
          <h1 className="text-4xl md:text-6xl font-bold tracking-[0.1em] text-primary font-display mb-1">CLUB MANAGER</h1>
          <p className="text-muted-foreground text-sm">A saved career was found on this device.</p>
        </header>
        <div className="bg-card border border-border rounded-2xl p-5 text-center">
          <div className="text-3xl mb-2">💼</div>
          <div className="text-xl font-bold font-display text-foreground">{c.clubName}</div>
          <div className="text-sm text-muted-foreground mt-1">
            Season {c.season} · Week {Math.min(c.week + 1, c.calendar.length)} of {c.calendar.length} · Board {Math.round(c.boardConfidence)}/100
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">🏆 {c.trophies.length} trophies won so far</div>
          <div className="flex gap-3 mt-5">
            <button onClick={g.resume} className="flex-1 px-5 py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:opacity-90 transition-opacity">
              Resume Career
            </button>
            <button onClick={g.startNew} className="flex-1 px-5 py-3 bg-secondary text-foreground rounded-xl font-bold hover:bg-secondary/70 transition-colors">
              Start Fresh
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ================= CLUB SELECT (Round 70: nation -> league -> team) ================= */
  if (g.phase === 'clubSelect' || (g.phase === 'resume' && !g.career)) {
    const confirmAndReset = () => {
      g.confirmClub();
      setPickStep('nation');
      setPickNation(null);
      setPickLeagueId(null);
    };
    const league = pickLeagueId ? REAL_LEAGUES.find(l => l.id === pickLeagueId) : null;
    const teams = league ? playableClubs(league.id) : [];

    return shell(
      <div ref={pickRef}>
        <header className="text-center mb-6">
          <h1 className="text-4xl md:text-6xl font-bold tracking-[0.1em] text-primary font-display mb-1">CLUB MANAGER</h1>
          <p className="text-muted-foreground text-sm md:text-base max-w-xl mx-auto">
            Nine real leagues, {REAL_LEAGUES.reduce((s, l) => s + l.clubs.length, 0)} clubs, squads as of {CM_ROSTER_META.asOf}. Pick your nation, your league, your club.
          </p>
        </header>

        {/* Step breadcrumb */}
        <div className="flex items-center justify-center gap-1.5 mb-5 text-[11px] font-bold">
          {(['nation', 'league', 'team'] as const).map((s, i) => (
            <span key={s} className="inline-flex items-center gap-1.5">
              {i > 0 && <ChevronRight className="w-3 h-3 text-muted-foreground/50" />}
              <span className={cn(
                'px-2.5 py-1 rounded-full border',
                pickStep === s ? 'bg-primary/10 border-primary text-primary' : 'bg-card border-border text-muted-foreground',
              )}>
                {i + 1}. {s === 'nation' ? 'Nation' : s === 'league' ? 'League' : 'Team'}
              </span>
            </span>
          ))}
        </div>

        {/* -------- Step 1: nation -------- */}
        {pickStep === 'nation' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-w-2xl mx-auto">
            {NATIONS.map(n => {
              const leagues = n.leagueIds
                .map(id => REAL_LEAGUES.find(l => l.id === id))
                .filter((l): l is typeof REAL_LEAGUES[number] => !!l);
              const clubCount = leagues.reduce((s, l) => s + l.clubs.length, 0);
              // Round 106: his note, in his words: "dont be saying teams. just
              // the leagues". A nation card is a nation and what you can manage
              // in it, so it names the leagues rather than three arbitrary clubs.
              const top = leagues.map(l => l.name).join(' · ');
              return (
                <button
                  key={n.id}
                  onClick={() => { setPickNation(n); setPickLeagueId(null); setPickStep('league'); }}
                  className="rounded-xl border bg-card border-border hover:border-primary p-4 text-left transition-all"
                >
                  <div className="flex items-center gap-2.5">
                    <FlagImg name={n.name} size={34} />
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-foreground">{n.name}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {leagues.length > 1 ? `${leagues.length} leagues` : '1 league'} · {clubCount} clubs
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto shrink-0" />
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-2 truncate">{top}</div>
                </button>
              );
            })}
          </div>
        )}

        {/* -------- Step 2: league -------- */}
        {pickStep === 'league' && pickNation && (
          <div className="max-w-2xl mx-auto space-y-2.5">
            <button
              onClick={() => { setPickStep('nation'); setPickNation(null); }}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mb-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> All nations
            </button>
            {pickNation.leagueIds.map(id => {
              const lg = REAL_LEAGUES.find(l => l.id === id);
              if (!lg) return null;
              const lgTeams = playableClubs(lg.id);
              return (
                <button
                  key={lg.id}
                  onClick={() => { setPickLeagueId(lg.id); setPickStep('team'); }}
                  className="w-full rounded-xl border bg-card border-border hover:border-primary p-4 text-left transition-all"
                >
                  <div className="flex items-center gap-2.5">
                    <FlagImg name={pickNation.name} size={34} />
                    <div className="min-w-0">
                      <div className="text-base font-bold text-foreground">{lg.name}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {lg.clubs.length} clubs · domestic cup: {lg.cupName}{lg.euro ? ' · Champions League spots' : ''}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto shrink-0" />
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-2 truncate">
                    Strongest sides: {lgTeams.slice(0, 4).map(c => c.name).join(' · ')}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* -------- Step 3: team -------- */}
        {pickStep === 'team' && pickNation && league && (
          <div className={cn(g.pendingClub && 'pb-24')}>
            <button
              onClick={() => { g.chooseClub(''); setPickStep('league'); }}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mb-3"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> <FlagImg name={pickNation.name} size={14} /> {league.name}
            </button>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {teams.map(c => {
                const sel = g.pendingClub === c.name;
                const partial = isPartialClub(c.name);
                return (
                  <button
                    key={c.name}
                    onClick={() => g.chooseClub(c.name)}
                    className={cn(
                      'rounded-xl border p-3 text-left transition-all',
                      sel ? 'bg-primary/10 border-primary' : 'bg-card border-border hover:border-primary',
                    )}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                      {/* Round 106: flags run all the way through the picker now. */}
                      <FlagImg name={pickNation.name} size={12} />
                      <span className={cn('text-xs font-bold truncate', sel ? 'text-primary' : 'text-foreground')}>{c.name}</span>
                    </div>
                    <div className="text-[9px] text-muted-foreground mt-0.5">
                      {TIER_INFO[c.tier].emoji} {TIER_INFO[c.tier].label}
                      {partial && <span className="ml-1 text-yellow-500/80" title="The market data covers only part of this squad; the rest is filled with youth players.">· partial data</span>}
                    </div>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-[10px] text-muted-foreground">Squad</span>
                      <span className="text-sm font-bold font-display text-foreground">{clubPreviewRating(c.name)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground">Budget</span>
                      <span className="text-xs font-bold text-gold">{money(c.budget)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground">Board wants</span>
                      <span className="text-[10px] font-bold text-foreground">{c.expectation === 1 ? 'The title' : `Top ${c.expectation}`}</span>
                    </div>
                  </button>
                );
              })}
            </div>
            <p className="text-[9px] text-muted-foreground text-center mt-3">
              Squads, ratings and values from market data plus the verified summer window: {CM_ROSTER_META.players} players as of {CM_ROSTER_META.asOf}, refreshed {CM_ROSTER_META.generated}.
            </p>

            {/* Round 70: no scrolling to confirm. The confirm bar pins to the
                bottom of the screen the moment a club is picked. */}
            {g.pendingClub && (
              <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 backdrop-blur-sm">
                <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Your club</div>
                    <div className="text-sm font-bold text-foreground truncate">{g.pendingClub}</div>
                  </div>
                  <button
                    onClick={confirmAndReset}
                    className="shrink-0 inline-flex items-center gap-2 px-6 py-2.5 rounded-full font-bold bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
                  >
                    <Briefcase className="w-4 h-4" /> Take the job
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  /* ================= MATCH RESULT ================= */
  /* ================= HALF TIME (Round 119) ================= */
  if (g.phase === 'halftime' && g.career?.live) {
    return shell(
      <div ref={revealRef}>
        <header className="text-center mb-4">
          <h1 className="text-2xl md:text-3xl font-bold text-primary font-display">HALF TIME</h1>
        </header>
        <HalftimeScreen
          career={g.career}
          onSub={g.subAtHalftime}
          onShape={g.shapeAtHalftime}
          onSecondHalf={g.secondHalf}
        />
      </div>
    );
  }

  if (g.phase === 'matchResult' && g.report && g.career) {
    return shell(
      <div ref={revealRef}>
        <header className="text-center mb-4">
          <h1 className="text-2xl md:text-3xl font-bold text-primary font-display">FULL TIME</h1>
        </header>
        <MatchReportCard report={g.report} clubName={g.career.clubName} onContinue={g.continueFromReport} />
      </div>
    );
  }

  /* ================= SEASON END ================= */
  if (g.phase === 'seasonEnd' && g.summary && g.career) {
    const sm = g.summary;
    const trophyLine = sm.trophies.length ? sm.trophies.map(() => '🏆').join('') : '-';
    // Round 66: same treatment as full time. Only one phase screen renders at a
    // time, so the shared ref is safe here too.
    return shell(
      <div ref={revealRef} className="text-center">
        <h1 className="text-3xl md:text-5xl font-bold text-primary font-display mb-1">SEASON {sm.season} COMPLETE</h1>
        <p className="text-muted-foreground text-sm mb-5">{sm.club} · finished <span className="text-foreground font-bold">#{sm.position}</span> with {sm.points} pts</p>
        <ResultScreen
          won={sm.verdictGrade === 'A' || sm.verdictGrade === 'B' ? true : sm.verdictGrade === 'C' ? undefined : false}
          outcomeEmoji={sm.trophies.length > 0 ? '🏆' : sm.position <= 4 ? '🥈' : sm.verdictGrade === 'F' ? '😬' : '⚽'}
          headline={`Board verdict: ${sm.verdictGrade}`}
          statLine={`${sm.wins}W ${sm.draws}D ${sm.losses}L · GF ${sm.gf} GA ${sm.ga}`}
          funFact={sm.verdict}
          statRow={[
            { label: 'Finish', value: `#${sm.position}` },
            { label: 'Points', value: sm.points },
            { label: 'Season Score', value: sm.seasonScore },
          ]}
          emojiGrid={`🏟️ S${sm.season} · #${sm.position} · ${sm.points}pts · ${trophyLine}`}
          share={{
            score: `#${sm.position} (${sm.points} pts, ${sm.trophies.length} trophies)`,
            gameName: 'Club Manager',
            gamePath: '/club-manager',
          }}
          onPlayAgain={() => g.nextSeason()}
          playAgainLabel={`Continue to Season ${sm.season + 1}`}
          playNext={
            <div className="space-y-3">
              {sm.offers.length > 0 && (
                <div className="text-left bg-surface-2 border border-border/60 rounded-xl p-3">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">📞 Job offers on the table</div>
                  {sm.offers.map(o => (
                    <button
                      key={o.club}
                      onClick={() => g.nextSeason(o.club)}
                      className="w-full mb-2 last:mb-0 rounded-lg border border-primary/40 bg-primary/5 p-2.5 text-left hover:bg-primary/15 transition-colors"
                    >
                      <div className="text-sm font-bold text-primary">{o.club} want you as manager</div>
                      <div className="text-[10px] text-muted-foreground">{o.blurb}</div>
                    </button>
                  ))}
                  <p className="text-[9px] text-muted-foreground">Accepting an offer moves you there for Season {sm.season + 1}.</p>
                </div>
              )}
              <button onClick={g.startNew} className="text-xs text-muted-foreground hover:text-primary transition-colors">
                Retire and start a new career
              </button>
            </div>
          }
        >
          <div className="text-left space-y-1.5 mb-2">
            <p className="text-sm text-foreground flex items-start gap-2">
              <Trophy className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
              Champions: <span className="font-bold">{sm.champion}</span>
            </p>
            {sm.trophies.map(t => (
              <p key={t} className="text-sm text-foreground flex items-start gap-2">
                <Trophy className="w-3.5 h-3.5 text-gold mt-0.5 shrink-0" />You won the <span className="font-bold">{t}</span>!
              </p>
            ))}
            {sm.topScorer && (
              <p className="text-sm text-foreground flex items-start gap-2">
                <span className="shrink-0">⚽</span>Top scorer: {sm.topScorer.name} ({sm.topScorer.goals} goals)
              </p>
            )}
            {sm.topAssister && (
              <p className="text-sm text-foreground flex items-start gap-2">
                <span className="shrink-0">🎯</span>Most assists: {sm.topAssister.name} ({sm.topAssister.assists})
              </p>
            )}
            {sm.qualifiedUcl && (
              <p className="text-sm text-foreground flex items-start gap-2">
                <span className="shrink-0">⭐</span>Qualified for next season's Champions League
              </p>
            )}
            {sm.objectives && sm.objectives.length > 0 && (
              <div className="pt-1">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Board objectives</div>
                {sm.objectives.map((o, i) => (
                  <p key={i} className={cn('text-xs', o.hit ? 'text-emerald-400' : 'text-red-400')}>
                    {o.hit ? '✓' : '✗'} <span className="text-foreground">{o.label}</span>
                  </p>
                ))}
              </div>
            )}
            {sm.signings.length > 0 && (
              <div className="pt-1">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Transfer business</div>
                {sm.signings.slice(0, 8).map((t, i) => (
                  <p key={i} className="text-xs text-muted-foreground">
                    {t.dir === 'in' ? '🟢 IN' : '🔴 OUT'} {t.name} ({money(t.fee)})
                  </p>
                ))}
              </div>
            )}
          </div>
        </ResultScreen>
      </div>
    );
  }

  /* ================= SACKED ================= */
  if (g.phase === 'sacked' && g.career) {
    const c = g.career;
    return shell(
      <div className="text-center">
        <h1 className="text-3xl md:text-5xl font-bold text-destructive font-display mb-5">SACKED!</h1>
        <ResultScreen
          won={false}
          outcomeEmoji="🚪"
          headline="You've been sacked"
          statLine={`The ${c.clubName} board ran out of patience in Season ${c.season}.`}
          statRow={[
            { label: 'Seasons', value: c.season },
            { label: 'Win %', value: `${c.careerStats.played ? Math.round((c.careerStats.wins / c.careerStats.played) * 100) : 0}%` },
            { label: 'Trophies', value: c.trophies.length },
          ]}
          emojiGrid={`🚪 Sacked in S${c.season} · ${c.careerStats.wins}W ${c.careerStats.draws}D ${c.careerStats.losses}L · 🏆×${c.trophies.length}`}
          share={{
            score: `Sacked after ${c.season} season${c.season > 1 ? 's' : ''} (${c.trophies.length} trophies)`,
            gameName: 'Club Manager',
            gamePath: '/club-manager',
          }}
          onPlayAgain={g.startNew}
          playAgainLabel="Start New Career"
        >
          <div className="text-left space-y-1.5 mb-2">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Career record</div>
            {c.history.length === 0 && <p className="text-xs text-muted-foreground">Sacked before finishing a single season. Brutal.</p>}
            {c.history.map(h => (
              <p key={h.season} className="text-xs text-foreground">
                S{h.season} · {h.club} · #{h.position} ({h.points} pts){h.trophies.length ? ` · 🏆 ${h.trophies.join(', ')}` : ''}
              </p>
            ))}
            {c.trophies.length > 0 && (
              <p className="text-xs text-foreground pt-1">
                Cabinet: {c.trophies.map(t => `${t.emoji} ${t.name} (S${t.season})`).join(' · ')}
              </p>
            )}
          </div>
        </ResultScreen>
      </div>
    );
  }

  /* ================= HUB ================= */
  if (!g.career || !club) {
    return shell(<div className="text-center py-24 text-muted-foreground animate-pulse">Loading…</div>);
  }
  const c = g.career;
  const conf = Math.round(c.boardConfidence);
  const confTone = conf >= 60 ? 'bg-emerald-500' : conf >= 30 ? 'bg-yellow-500' : 'bg-red-500';
  const fx = g.nextFx;
  const objStatuses = objectiveStatuses(c);
  // Round 74: tile summaries.
  const objBehind = objStatuses.filter(s => s.status === 'behind' || s.status === 'failed').length;
  const objDone = objStatuses.filter(s => s.status === 'done').length;
  const unreadCount = (c.inbox ?? []).filter(m => !m.resolved).length;
  const latestMsg = (c.inbox ?? [])[0];
  const lastRes = (c.resultLog ?? []).slice(-1)[0];
  const rivalName = c.boardObjectives?.find(o => o.id === 'rival')?.rivalName ?? null;
  const rivalIdx = rivalName ? g.tableRows.findIndex(r => r.club === rivalName) : -1;
  const bidsCount = (c.incomingBids ?? []).length;
  const cupAlive = c.cupRound !== 'out' && c.cupRound !== 'won';
  const uclAlive = (c.uclGroup !== null && c.uclKoRound === null) || (!!c.uclKoRound && c.uclKoRound !== 'out' && c.uclKoRound !== 'won');

  /* ---- Round 74: the rival viewer takes over the whole screen ---- */
  if (clubView) {
    return shell(
      <div ref={panelRef}>
        <ClubDetailScreen clubName={clubView} career={c} onBack={() => setClubView(null)} />
      </div>
    );
  }

  return shell(
    <div>
      {/* Header */}
      <header className="mb-4">
        <div className="flex items-center justify-center gap-2 mb-1">
          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: club.color }} />
          <h1 className="text-2xl md:text-3xl font-bold text-primary font-display">{c.clubName}</h1>
          <span className="text-[10px] font-bold text-muted-foreground border border-border rounded-full px-2 py-0.5">Season {c.season}</span>
        </div>
        <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground flex-wrap">
          {/* Round 99: found by playing it. Before a ball is kicked every
              club is on zero points, so the "position" was just wherever the
              shuffled table happened to put you: a brand new Manchester City
              save opened on "#15 in league", which reads as broken. */}
          <span>{c.week === 0 ? 'Season not started' : `#${g.myPosition || '-'} in league`}</span>
          <span className="text-gold font-semibold">{money(c.budget)}</span>
          <span className="inline-flex items-center gap-1">
            {c.form.length === 0 && <span>No matches yet</span>}
            {c.form.map((f, i) => (
              <span key={i} className={cn('w-2 h-2 rounded-full', FORM_TONE[f])} />
            ))}
          </span>
          {c.trophies.length > 0 && <span>🏆×{c.trophies.length}</span>}
        </div>
        <div className="max-w-xs mx-auto mt-2">
          <div className="flex items-center justify-between text-[9px] text-muted-foreground mb-0.5">
            <span>Board confidence · {confidenceLabel(conf)}</span>
            <span className="font-bold">{conf}/100</span>
          </div>
          <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
            <div className={cn('h-full rounded-full transition-all', confTone)} style={{ width: `${Math.max(3, conf)}%` }} />
          </div>
        </div>
      </header>

      <Tabs value={g.activeTab} onValueChange={(v) => g.setActiveTab(v as HubTab)}>
        <TabsList className="grid grid-cols-5 w-full mb-4">
          <TabsTrigger value="overview" className="text-[10px] md:text-xs">Home</TabsTrigger>
          <TabsTrigger value="squad" className="text-[10px] md:text-xs">Squad</TabsTrigger>
          <TabsTrigger value="tactics" className="text-[10px] md:text-xs">Tactics</TabsTrigger>
          <TabsTrigger value="table" className="text-[10px] md:text-xs">Table</TabsTrigger>
          <TabsTrigger value="transfers" className="text-[10px] md:text-xs">Market</TabsTrigger>
        </TabsList>

        {/* -------- Overview -------- */}
        <TabsContent value="overview" className="space-y-4">
          {c.transferWindow !== null && (
            <button
              onClick={() => g.setActiveTab('transfers')}
              className="w-full rounded-xl border border-gold/40 bg-gold/10 p-2.5 text-xs font-bold text-gold hover:bg-gold/20 transition-colors"
            >
              {c.transferWindow === 'summer' ? '☀️' : '❄️'} Transfer window open. Tap to do business before your next match
            </button>
          )}

          <div className="bg-card border border-border rounded-2xl p-4 text-center">
            {fx && fx.kind === 'match' && (
              <>
                <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">{fx.compLabel}</div>
                <div className="text-lg font-bold font-display text-foreground">
                  {fx.home === null ? '🏟️ ' : ''}{c.clubName} <span className="text-muted-foreground text-sm">vs</span> {fx.opponent}
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  {fx.home === null ? 'Neutral venue' : fx.home ? 'Home' : 'Away'} · their strength ~{fx.oppStrength} · your XI avg {xiAverageRating(c)}
                </div>
                <button
                  onClick={g.play}
                  className="mt-3 inline-flex items-center gap-2 px-8 py-3 bg-primary text-primary-foreground rounded-full font-bold text-lg hover:opacity-90 transition-opacity"
                >
                  <Play className="w-5 h-5" /> Play Match
                </button>
              </>
            )}
            {fx && fx.kind === 'window' && (
              <>
                <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Mid-season break</div>
                <div className="text-lg font-bold font-display text-foreground">❄️ January transfer window</div>
                <button
                  onClick={g.play}
                  className="mt-3 inline-flex items-center gap-2 px-8 py-3 bg-primary text-primary-foreground rounded-full font-bold text-lg hover:opacity-90 transition-opacity"
                >
                  Open the Window <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}
            {fx && fx.kind === 'seasonOver' && (
              <>
                <div className="text-lg font-bold font-display text-foreground">Season complete!</div>
                <button
                  onClick={g.play}
                  className="mt-3 inline-flex items-center gap-2 px-8 py-3 bg-primary text-primary-foreground rounded-full font-bold text-lg hover:opacity-90 transition-opacity"
                >
                  See Season Review <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}
          </div>

          {/* Round 74: FIFA style hub. Everything below the next match is a
              box; tapping one opens its own screen instead of one long page
              (his words: "make it smaller and with boxes and when they open
              it takes u to see something different. just like on fifa"). */}
          {hubPanel === null && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              <HubTile
                icon="📋" title="Board" accent={objBehind > 0}
                value={objBehind > 0 ? `${objBehind} behind` : `${objDone}/${objStatuses.length} done`}
                sub={TIER_INFO[club.tier].label + ' patience'}
                onClick={() => setHubPanel('board')}
              />
              <HubTile
                icon="📩" title="Inbox" accent={unreadCount > 0}
                value={unreadCount > 0 ? `${unreadCount} new` : 'All quiet'}
                sub={latestMsg ? latestMsg.playerName : 'No messages yet'}
                onClick={() => setHubPanel('inbox')}
              />
              <HubTile
                icon="📅" title="Calendar"
                value={lastRes ? `${lastRes.res} ${lastRes.score}` : 'Season start'}
                sub={fx && fx.kind === 'match' ? `Next: ${fx.opponent}` : 'See the schedule'}
                onClick={() => setHubPanel('calendar')}
              />
              <HubTile
                icon="🏆" title="League"
                value={`#${g.myPosition || '-'}`}
                sub={c.form.length ? `Form: ${c.form.join(' ')}` : leagueOf(c.clubName).name}
                onClick={() => g.setActiveTab('table')}
              />
              <HubTile
                icon="🏅" title="Cups" accent={cupAlive && !!c.cupDraw[c.cupRound as CupRound]}
                value={cupAlive ? 'Still alive' : c.cupRound === 'won' ? 'CUP WINNERS' : 'Knocked out'}
                sub={uclAlive ? 'UCL alive too' : leagueOf(c.clubName).cupName}
                onClick={() => setHubPanel('cups')}
              />
              <HubTile
                icon="🧢" title="Manager"
                value={`${c.careerStats.wins}W ${c.careerStats.losses}L`}
                sub={c.careerStats.played > 0 ? `${Math.round((c.careerStats.wins / c.careerStats.played) * 100)}% win rate` : 'New in the job'}
                onClick={() => setHubPanel('manager')}
              />
              <HubTile
                icon="🏥" title="Treatment" accent={unavailable.length > 0}
                value={unavailable.length ? `${unavailable.length} out` : 'All fit'}
                sub={unavailable[0] ? unavailable[0].name : 'No injuries or bans'}
                onClick={() => setHubPanel('treatment')}
              />
              <HubTile
                icon="🕵️" title="Rival watch"
                value={rivalName ?? 'Scout clubs'}
                sub={rivalName && rivalIdx >= 0 ? `They sit #${rivalIdx + 1}` : 'Tap any club in the table'}
                onClick={rivalName ? () => setClubView(rivalName) : () => g.setActiveTab('table')}
              />
              {/* Round 127: what you told each of them he was, and whether you
                  have kept your word. */}
              <HubTile
                icon="🤝" title="Dressing room" accent={wantAway.length > 0 || letDown.length > 2}
                value={wantAway.length > 0
                  ? `${wantAway.length} want${wantAway.length === 1 ? 's' : ''} out`
                  : letDown.length > 0 ? `${letDown.length} unhappy` : 'Word kept'}
                sub={wantAway[0] ? wantAway[0].name : letDown[0] ? letDown[0].name : 'Set everyone a role'}
                onClick={() => setHubPanel('roles')}
              />
              {/* Round 116: the academy and the training ground, the two
                  things every real manager sim has and this one did not. */}
              <HubTile
                icon="🎓" title="Academy" accent={prospectCount > 0}
                value={prospectCount > 0 ? `${prospectCount} on the books` : 'Nobody yet'}
                sub={academy ? `Recruitment ${academy.recruitment}/20 · ${academy.scouts.length} scouting` : 'Build a youth setup'}
                onClick={() => setHubPanel('academy')}
              />
              <HubTile
                icon="🏋️" title="Training"
                value={trainingLabel}
                sub={growingCount > 0 ? `${growingCount} player${growingCount === 1 ? '' : 's'} still improving` : 'Nobody left to develop'}
                onClick={() => setHubPanel('training')}
              />
              <HubTile
                icon="🛒" title="Market" accent={c.transferWindow !== null}
                value={c.transferWindow !== null ? 'Window OPEN' : 'Window shut'}
                sub={bidsCount > 0 ? `${bidsCount} bid${bidsCount > 1 ? 's' : ''} for your players` : 'Latest transfers inside'}
                onClick={() => g.setActiveTab('transfers')}
              />
              {c.trophies.length > 0 && (
                <HubTile
                  icon="✨" title="Cabinet"
                  value={`${c.trophies.length} troph${c.trophies.length > 1 ? 'ies' : 'y'}`}
                  sub={c.trophies[c.trophies.length - 1].name}
                  onClick={() => setHubPanel('trophies')}
                />
              )}
            </div>
          )}

          {/* Round 74: drill-in screens, one per box. */}
          {hubPanel !== null && (
            <div ref={panelRef} className="space-y-3">
              <button
                onClick={() => setHubPanel(null)}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Club home
              </button>

              {hubPanel === 'board' && objStatuses.length > 0 && (
                <div className="bg-card border border-border rounded-xl p-3">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <ClipboardList className="w-3 h-3" /> Board expectations · {TIER_INFO[club.tier].blurb}
                  </div>
                  <div className="space-y-1.5">
                    {objStatuses.map(({ objective, status }) => (
                      <div key={objective.id} className="flex items-center justify-between gap-2">
                        <span className="text-xs text-foreground min-w-0 truncate">{objective.label}</span>
                        <span className={cn('shrink-0 text-[9px] font-bold border rounded-full px-2 py-0.5', OBJ_CHIP[status].cls)}>
                          {OBJ_CHIP[status].label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {hubPanel === 'inbox' && <InboxCard career={c} onAnswer={g.answer} />}
              {hubPanel === 'inbox' && (c.inbox ?? []).length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-6">Nobody has texted you yet. Play some matches, the drama finds you.</p>
              )}

              {hubPanel === 'calendar' && <CalendarCard career={c} onQuickSim={g.quickSim} />}

              {hubPanel === 'academy' && (
                <AcademyScreen
                  career={c}
                  onUpgrade={g.upgradeFacility}
                  onHire={g.sendScout}
                  onRecall={g.callScoutHome}
                  onPromote={g.promote}
                  onRelease={g.release}
                />
              )}

              {hubPanel === 'training' && <TrainingScreen career={c} onSetPlan={g.setTraining} />}

              {hubPanel === 'roles' && <RolesScreen career={c} onSetRole={g.setRole} />}

              {hubPanel === 'treatment' && (
                <div className="bg-card border border-border rounded-xl p-3">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <ShieldAlert className="w-3 h-3" /> Treatment room
                  </div>
                  {unavailable.length === 0 && <p className="text-xs text-muted-foreground">Everyone is fit and available. Enjoy it while it lasts.</p>}
                  <div className="flex flex-wrap gap-1.5">
                    {unavailable.map(p => (
                      <span key={p.id} className="text-[10px] bg-secondary rounded-full px-2 py-1 text-foreground">
                        {p.injuryWeeks > 0 ? `🩹 ${p.name} (${p.injuryWeeks}w)` : `🟥 ${p.name} (${p.suspendedMatches})`}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {hubPanel === 'cups' && (
                <div className="space-y-2">
                  <div className="bg-card border border-border rounded-xl p-3 text-xs text-foreground">
                    {cupAlive ? (
                      <>🏅 <span className="font-bold">{leagueOf(c.clubName).cupName}</span>: still alive. Next up, the <span className="font-bold">{c.cupRound === 'F' ? 'final' : c.cupRound === 'SF' ? 'semi-final' : c.cupRound === 'QF' ? 'quarter-final' : 'Round of 16'}</span> against <span className="font-bold">{c.cupDraw[c.cupRound as CupRound] ?? 'a club to be drawn'}</span>.</>
                    ) : c.cupRound === 'won' ? (
                      <>🏅 <span className="font-bold">{leagueOf(c.clubName).cupName}</span>: WON. It is in the cabinet.</>
                    ) : (
                      <>🏅 <span className="font-bold">{leagueOf(c.clubName).cupName}</span>: out{c.cupExit ? ` at the ${c.cupExit === 'F' ? 'final' : c.cupExit === 'SF' ? 'semi-final' : c.cupExit === 'QF' ? 'quarter-final' : 'Round of 16'}` : ''}. Next year.</>
                    )}
                  </div>
                  {c.uclGroup && c.uclKoRound === null && (
                    <LeagueTableCard rows={groupRows} myClub={c.clubName} title={`UCL Group · MD${c.uclGroup.matchday}/6`} onClubClick={setClubView} />
                  )}
                  {c.uclKoRound && c.uclKoRound !== 'out' && c.uclKoRound !== 'won' && (
                    <div className="bg-card border border-border rounded-xl p-3 text-xs text-foreground">
                      ⭐ Alive in the Champions League. Next knockout round: <span className="font-bold">{c.uclKoRound === 'F' ? 'Final' : c.uclKoRound === 'SF' ? 'Semi-final' : 'Quarter-final'}</span>
                    </div>
                  )}
                  {c.uclKoRound === 'won' && (
                    <div className="bg-card border border-gold/40 rounded-xl p-3 text-xs text-gold font-bold">⭐ CHAMPIONS OF EUROPE.</div>
                  )}
                  {/* Round 95: the knockout stage as a real bracket. */}
                  <UclBracketCard career={c} onClubClick={setClubView} />
                  {!uclAlive && c.uclKoRound !== 'won' && c.uclGroup === null && (
                    <div className="bg-card border border-border rounded-xl p-3 text-xs text-muted-foreground">No European football this season{leagueOf(c.clubName).euro ? '. Finish top 4 to change that' : ' in this league'}.</div>
                  )}
                </div>
              )}

              {hubPanel === 'trophies' && (
                <div className="bg-card border border-border rounded-xl p-3">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">Trophy cabinet</div>
                  {c.trophies.length === 0 && <p className="text-xs text-muted-foreground">Empty. For now.</p>}
                  <div className="flex flex-wrap gap-1.5">
                    {c.trophies.map((t, i) => (
                      <span key={i} className="text-[10px] bg-gold/10 border border-gold/30 text-gold rounded-full px-2 py-1 font-semibold">
                        {t.emoji} {t.name} · S{t.season}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {hubPanel === 'manager' && (
                <div className="bg-card border border-border rounded-xl p-3">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">💼 Manager career</div>
                  <div className="grid grid-cols-3 gap-2 text-center mb-2">
                    <div>
                      <div className="text-sm font-bold font-display text-foreground">{c.careerStats.wins}W {c.careerStats.draws}D {c.careerStats.losses}L</div>
                      <div className="text-[9px] text-muted-foreground">Record</div>
                    </div>
                    <div>
                      <div className="text-sm font-bold font-display text-foreground">{c.careerStats.played > 0 ? Math.round((c.careerStats.wins / c.careerStats.played) * 100) : 0}%</div>
                      <div className="text-[9px] text-muted-foreground">Win rate</div>
                    </div>
                    <div>
                      <div className="text-sm font-bold font-display text-foreground">{c.trophies.length}</div>
                      <div className="text-[9px] text-muted-foreground">Trophies</div>
                    </div>
                  </div>
                  <div className="space-y-0.5 text-[10px] text-muted-foreground">
                    {c.careerStats.biggestWin && (
                      <p>🎉 Biggest win: <span className="text-foreground font-semibold">{c.careerStats.biggestWin.score}</span> vs {c.careerStats.biggestWin.opp}</p>
                    )}
                    {c.careerStats.biggestDefeat && (
                      <p>💀 Worst defeat: <span className="text-foreground font-semibold">{c.careerStats.biggestDefeat.score}</span> vs {c.careerStats.biggestDefeat.opp}</p>
                    )}
                    {c.careerStats.mostExpensiveBuy && (
                      <p>💸 Priciest buy: <span className="text-foreground font-semibold">{c.careerStats.mostExpensiveBuy.name}</span> ({money(c.careerStats.mostExpensiveBuy.fee)})</p>
                    )}
                    {c.careerStats.mostExpensiveSale && (
                      <p>🤑 Best sale: <span className="text-foreground font-semibold">{c.careerStats.mostExpensiveSale.name}</span> ({money(c.careerStats.mostExpensiveSale.fee)})</p>
                    )}
                    {(c.careerStats.clubsManaged?.length ?? 0) > 1 && (
                      <p>🧳 Clubs managed: <span className="text-foreground">{c.careerStats.clubsManaged!.join(', ')}</span></p>
                    )}
                    {c.careerStats.played === 0 && <p>Take charge of your first match and the numbers start here.</p>}
                  </div>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* -------- Squad -------- */}
        <TabsContent value="squad">
          <SquadScreen squad={c.squad} xiIds={c.xiIds} />
        </TabsContent>

        {/* -------- Tactics -------- */}
        <TabsContent value="tactics">
          <TacticsScreen
            career={c}
            onFormation={g.setFormationIndex}
            onMentality={g.setMentality}
            onSlot={g.setXiSlot}
            onSwap={g.swapXiSlots}
            onAutoPick={g.autoPick}
          />
        </TabsContent>

        {/* -------- Table -------- */}
        <TabsContent value="table">
          {/* Round 95: every league in the world, not just mine. */}
          <WorldTablesCard career={c} myRows={g.tableRows} onClubClick={setClubView} />
        </TabsContent>

        {/* -------- Transfers -------- */}
        <TabsContent value="transfers">
          <TransferScreen
            career={c}
            market={g.market}
            onSell={g.sell}
            onNegotiate={g.negotiate}
            onOffer={g.offer}
            onWalk={g.walk}
            onDismissNegotiation={g.dismissNegotiation}
            onClause={g.clause}
            onLoan={g.loan}
            onAcceptBid={g.acceptIncomingBid}
            onRejectBid={g.rejectIncomingBid}
            onSetStatus={g.setStatus}
            onLoanOut={g.loanOut}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ClubManager;
