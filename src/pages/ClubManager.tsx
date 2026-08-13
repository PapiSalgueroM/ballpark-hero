import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Play, ChevronRight, Trophy, Briefcase, ShieldAlert } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useClubManager } from '@/hooks/useClubManager';
import type { HubTab } from '@/hooks/useClubManager';
import {
  CLUBS, TIER_INFO, clubByName, clubPreviewRating, leagueOf, money, confidenceLabel,
  isAvailable, xiAverageRating, sortedTable,
} from '@/lib/clubManager';
import { GameNav } from '@/components/game/GameNav';
import { GameShell } from '@/components/game/GameShell';
import { HowToPlayPopover } from '@/components/game/HowToPlayPopover';
import { ResultScreen } from '@/components/game/ResultScreen';
import AdBanner from '@/components/ads/AdBanner';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import { LeagueTableCard } from '@/components/club-manager/LeagueTableCard';
import { SquadScreen } from '@/components/club-manager/SquadScreen';
import { TacticsScreen } from '@/components/club-manager/TacticsScreen';
import { TransferScreen } from '@/components/club-manager/TransferScreen';
import { MatchReportCard } from '@/components/club-manager/MatchReportCard';
import { useRevealScroll } from '@/hooks/useRevealScroll';

const FORM_TONE: Record<'W' | 'D' | 'L', string> = {
  W: 'bg-emerald-500', D: 'bg-yellow-500', L: 'bg-red-500',
};

const ClubManager = () => {
  const g = useClubManager();
  // Round 65: the owner's no scroll rule. Full time and season end screens are
  // what you were waiting for after pressing Play, so they pull themselves into
  // view rather than rendering below where your thumb just was.
  const revealRef = useRevealScroll<HTMLDivElement>(`${g.phase}:${g.career?.week ?? 0}`);

  const club = g.career ? clubByName(g.career.clubName) : null;
  const unavailable = useMemo(
    () => (g.career ? g.career.squad.filter(p => !isAvailable(p)) : []),
    [g.career],
  );
  const groupRows = useMemo(
    () => (g.career && g.career.uclGroup ? sortedTable(g.career.uclGroup.table) : []),
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
          <HowToPlayPopover title="How to Play Club Manager">
            <div className="space-y-3 text-left">
              <p>🏟️ <span className="font-semibold text-foreground">Take charge of a real club.</span> Elite giants have huge budgets and zero patience; underdogs get small budgets and a low bar.</p>
              <p>📅 <span className="font-semibold text-foreground">Play a full season in your club's REAL league</span>: the actual Premier League, La Liga, Serie A, Bundesliga or Ligue 1 clubs, plus the domestic cup and the Champions League if you qualify.</p>
              <p>🧠 <span className="font-semibold text-foreground">Set tactics before each match:</span> formation, mentality and your starting XI. Form, morale, fatigue, injuries and home advantage all matter.</p>
              <p>💰 <span className="font-semibold text-foreground">Buy and sell in the summer and January windows.</span> Stay under budget and keep at least 14 players.</p>
              <p>📉 <span className="font-semibold text-foreground">Watch the board confidence meter.</span> Fall too far below expectations and you're sacked. Overachieve and bigger clubs come calling.</p>
              <p>🏆 <span className="font-semibold text-foreground">Season score</span> = league points + 10 per trophy (max 130). Careers span multiple seasons; your save is kept on this device.</p>
            </div>
          </HowToPlayPopover>
          {inner}
        </div>
        <AdBanner slot="1234567890" format="horizontal" className="mt-8" />
        <GameSeoContent
          title="Club Manager: Football Management Sim"
          description="A full club-management sim in your browser: pick one of 20 famous clubs, manage tactics and transfers, survive the board, and chase league titles, cups and Champions League glory season after season."
          howToPlay={[
            'Pick a club. Each tier has a different budget and board expectation.',
            'Set your formation, mentality and XI, then play through the 38-match season week by week.',
            'Strengthen your squad in the summer and January transfer windows.',
            'Win trophies, keep the board happy, and build a multi-season managerial career.',
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

  /* ================= CLUB SELECT ================= */
  if (g.phase === 'clubSelect' || (g.phase === 'resume' && !g.career)) {
    return shell(
      <div>
        <header className="text-center mb-7">
          <h1 className="text-4xl md:text-6xl font-bold tracking-[0.1em] text-primary font-display mb-1">CLUB MANAGER</h1>
          <p className="text-muted-foreground text-sm md:text-base max-w-xl mx-auto">
            Pick your club. Win matches, work the market, dodge the sack.
          </p>
        </header>

        {[1, 2, 3, 4].map(tier => (
          <div key={tier} className="mb-6">
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-sm font-bold text-foreground">{TIER_INFO[tier].emoji} {TIER_INFO[tier].label}</span>
              <span className="text-[10px] text-muted-foreground">{TIER_INFO[tier].blurb}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {CLUBS.filter(c => c.tier === tier).map(c => {
                const sel = g.pendingClub === c.name;
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
                      <span className={cn('text-xs font-bold truncate', sel ? 'text-primary' : 'text-foreground')}>{c.name}</span>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[10px] text-muted-foreground">Squad</span>
                      <span className="text-sm font-bold font-display text-foreground">{clubPreviewRating(c.name)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground">Budget</span>
                      <span className="text-xs font-bold text-gold">{money(c.budget)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground">Board wants</span>
                      <span className="text-[10px] font-bold text-foreground">Top {c.expectation}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        <div className="text-center mt-6">
          <button
            onClick={g.confirmClub}
            disabled={!g.pendingClub}
            className={cn(
              'inline-flex items-center gap-2 px-8 py-3 rounded-full font-bold text-lg transition-all',
              g.pendingClub ? 'bg-primary text-primary-foreground hover:opacity-90' : 'bg-secondary text-muted-foreground cursor-not-allowed',
            )}
          >
            <Briefcase className="w-5 h-5" />
            {g.pendingClub ? `Manage ${g.pendingClub}` : 'Pick a club to begin'}
          </button>
        </div>
      </div>
    );
  }

  /* ================= MATCH RESULT ================= */
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
          <span>#{g.myPosition || '-'} in league</span>
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

          {unavailable.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-3">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <ShieldAlert className="w-3 h-3" /> Treatment room
              </div>
              <div className="flex flex-wrap gap-1.5">
                {unavailable.map(p => (
                  <span key={p.id} className="text-[10px] bg-secondary rounded-full px-2 py-1 text-foreground">
                    {p.injuryWeeks > 0 ? `🩹 ${p.name} (${p.injuryWeeks}w)` : `🟥 ${p.name} (${p.suspendedMatches})`}
                  </span>
                ))}
              </div>
            </div>
          )}

          <LeagueTableCard rows={g.tableRows} myClub={c.clubName} compact title="League standings" />

          {c.uclGroup && c.uclKoRound === null && (
            <LeagueTableCard rows={groupRows} myClub={c.clubName} title={`UCL Group · MD${c.uclGroup.matchday}/6`} />
          )}
          {c.uclKoRound && c.uclKoRound !== 'out' && c.uclKoRound !== 'won' && (
            <div className="bg-card border border-border rounded-xl p-3 text-xs text-foreground">
              ⭐ Alive in the Champions League. Next knockout round: <span className="font-bold">{c.uclKoRound === 'F' ? 'Final' : c.uclKoRound === 'SF' ? 'Semi-final' : 'Quarter-final'}</span>
            </div>
          )}
          {c.cupRound !== 'out' && c.cupRound !== 'won' && (
            <div className="bg-card border border-border rounded-xl p-3 text-xs text-foreground">
              🏆 Still in the Cup. Next round: <span className="font-bold">{c.cupRound === 'F' ? 'Final' : c.cupRound === 'SF' ? 'Semi-final' : c.cupRound === 'QF' ? 'Quarter-final' : 'Round of 16'}</span> vs {c.cupDraw[c.cupRound] ?? '???'}
            </div>
          )}

          {c.trophies.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-3">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">Trophy cabinet</div>
              <div className="flex flex-wrap gap-1.5">
                {c.trophies.map((t, i) => (
                  <span key={i} className="text-[10px] bg-gold/10 border border-gold/30 text-gold rounded-full px-2 py-1 font-semibold">
                    {t.emoji} {t.name} · S{t.season}
                  </span>
                ))}
              </div>
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
            onAutoPick={g.autoPick}
          />
        </TabsContent>

        {/* -------- Table -------- */}
        <TabsContent value="table">
          <LeagueTableCard rows={g.tableRows} myClub={c.clubName} title={leagueOf(c.clubName).name} />
        </TabsContent>

        {/* -------- Transfers -------- */}
        <TabsContent value="transfers">
          <TransferScreen career={c} market={g.market} onBuy={g.buy} onSell={g.sell} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ClubManager;
