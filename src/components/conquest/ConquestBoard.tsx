import { useState, useEffect, useRef } from 'react';
import { useConquest, PowerRankEntry } from '@/hooks/useConquest';
import ConquestRegionMap, { useOwnerTakeover, type ConquestBattleView } from './ConquestRegionMap';
import { TEAM_MAP, NFL_TEAMS, NFL_CONQUEST_MAP, DIRECTIONS, DIR_LABELS, isLightColor, ConquestFreeAgentCandidate } from '@/data/conquestData';
import { TEAM_LEGENDS } from '@/data/conquestPowerups';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import ShareButtons from '@/components/game/ShareButtons';
import { HOME_FIELD_BUMP } from '@/lib/conquestBattle';

function useSpinner(items: string[], isSpinning: boolean, finalValue: string): string {
  const [display, setDisplay] = useState(items[0] || '');
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (isSpinning && items.length > 0) {
      let i = 0;
      intervalRef.current = window.setInterval(() => {
        i = (i + 1) % items.length;
        setDisplay(items[i]);
      }, 80);
      return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    } else {
      setDisplay(finalValue);
    }
  }, [isSpinning, finalValue, items.length]);

  return display;
}

function RosterTable({ title, color, rosterNames, teamId, upgradedPlayer }: {
  title: string; color: string; rosterNames: string[]; teamId: string; upgradedPlayer?: string | null;
}) {
  const team = TEAM_MAP.get(teamId);
  const playerMap = new Map((team?.players || []).map(p => [p.name, p]));
  const legend = TEAM_LEGENDS[teamId];

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <div className="px-3 py-1.5 text-xs font-bold text-white text-center" style={{ backgroundColor: color }}>
        {title}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-2 py-1 text-left font-semibold text-muted-foreground">Name</th>
              <th className="px-2 py-1 text-left font-semibold text-muted-foreground">Pos</th>
              <th className="px-2 py-1 text-center font-semibold text-muted-foreground">OVR</th>
              <th className="px-2 py-1 text-right font-semibold text-muted-foreground">Key Stat</th>
            </tr>
          </thead>
          <tbody>
            {rosterNames.map(name => {
              const p = playerMap.get(name);
              const isLegend = legend && name === legend.name;
              const isUpgraded = name === upgradedPlayer;
              const ovr = isUpgraded ? 99 : (isLegend ? 99 : p?.overall);
              return (
                <tr key={name} className={`border-b border-border/50 last:border-0 ${isUpgraded ? 'bg-yellow-500/10' : ''} ${isLegend ? 'bg-amber-500/10' : ''}`}>
                  <td className="px-2 py-1 font-medium text-foreground truncate max-w-[120px]">
                    {isLegend && <span className="mr-0.5">🐐</span>}
                    {isUpgraded && <span className="mr-0.5">⬆️</span>}
                    {name}
                  </td>
                  <td className="px-2 py-1 text-muted-foreground">{isLegend ? legend.position : (p?.position || '-')}</td>
                  <td className={`px-2 py-1 text-center font-bold ${isUpgraded || isLegend ? 'text-yellow-400' : 'text-foreground'}`}>{ovr || '-'}</td>
                  <td className="px-2 py-1 text-right text-muted-foreground whitespace-nowrap">{isLegend ? 'Legend' : (p?.keyStat || '-')}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Compact ranked list: rank, abbr, overall, W-L from this run's battles.
// Collapsible on mobile (native <details>, matches the Eliminated section
// pattern already used below). Rankings use the power-rank-adjusted overall
// (same value that drives win probability in conquestBattle.ts), so the
// panel honestly reflects battle odds rather than being purely cosmetic.
function PowerRankingsPanel({ rankings }: { rankings: PowerRankEntry[] }) {
  return (
    <details className="rounded-xl border border-border bg-card" open>
      <summary className="cursor-pointer select-none px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center">
        📊 Power Rankings <span className="normal-case font-normal text-[10px]">· in-run form · eliminated teams drop out</span>
      </summary>
      <div className="px-3 pb-3 max-h-64 overflow-y-auto">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th className="py-1 text-left font-semibold w-6">#</th>
              <th className="py-1 text-left font-semibold">Team</th>
              <th className="py-1 text-center font-semibold">OVR</th>
              <th className="py-1 text-right font-semibold">W-L</th>
            </tr>
          </thead>
          <tbody>
            {rankings.map((r, i) => {
              const team = TEAM_MAP.get(r.id);
              if (!team) return null;
              return (
                <tr key={r.id} className="border-b border-border/40 last:border-0">
                  <td className="py-1 text-muted-foreground">{i + 1}</td>
                  <td className="py-1">
                    <span
                      className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold border"
                      style={{
                        backgroundColor: team.color,
                        color: isLightColor(team.color) ? '#000000' : '#FFFFFF',
                        borderColor: team.secondaryColor,
                      }}
                    >
                      {r.id}
                    </span>
                  </td>
                  <td className="py-1 text-center font-bold text-foreground">{r.overall}</td>
                  <td className="py-1 text-right text-muted-foreground whitespace-nowrap">
                    {r.wins}-{r.losses}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </details>
  );
}

// Free Agency panel (item 87): collapsible, same pattern as PowerRankingsPanel.
// Before a favorite team is chosen, shows a compact 32-team picker. Once a
// team is picked, lists the CONQUEST_FREE_AGENCY_POOL candidates with a Sign
// button gated by canSignFreeAgent(); when gated, the button is disabled and
// shows the cooldown ("Available after N more conquests" using the hook's
// exposed freeAgencyCooldownRemaining, since the hook doesn't expose a
// prose reason string).
function FreeAgencyPanel({
  favoriteTeam, setFavoriteTeam, canSignFreeAgent, signFreeAgencyCandidate, freeAgencyCooldownRemaining, pool, aliveIds,
}: {
  favoriteTeam: string | null;
  setFavoriteTeam: (teamId: string | null) => void;
  canSignFreeAgent: () => boolean;
  signFreeAgencyCandidate: (candidate: ConquestFreeAgentCandidate) => void;
  freeAgencyCooldownRemaining: number;
  pool: ConquestFreeAgentCandidate[];
  aliveIds: string[];
}) {
  const canSign = canSignFreeAgent();
  const favTeam = favoriteTeam ? TEAM_MAP.get(favoriteTeam) : undefined;
  const favoriteEliminated = !!favoriteTeam && !aliveIds.includes(favoriteTeam);
  const cooldownLabel = favoriteEliminated
    ? '💀 Your team was eliminated. Pick another team'
    : freeAgencyCooldownRemaining > 0
      ? `Available after ${freeAgencyCooldownRemaining} more conquest${freeAgencyCooldownRemaining === 1 ? '' : 's'}`
      : 'Pick a team to unlock signing';

  return (
    <details className="rounded-xl border border-border bg-card">
      <summary className="cursor-pointer select-none px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center">
        ✍️ Free Agency
      </summary>
      <div className="px-3 pb-3">
        {!favoriteTeam ? (
          <div className="space-y-2 py-1">
            <p className="text-[11px] text-muted-foreground text-center">Pick your team to unlock free agency</p>
            <select
              defaultValue=""
              onChange={(e) => { if (e.target.value) setFavoriteTeam(e.target.value); }}
              aria-label="Pick your team"
              className="w-full px-2 py-2 rounded-lg border border-border bg-background text-xs text-foreground"
            >
              <option value="" disabled>Select a team...</option>
              {NFL_TEAMS.map(t => (
                <option key={t.id} value={t.id}>
                  {t.city} {t.name}{aliveIds.includes(t.id) ? '' : ' 💀 (eliminated)'}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="space-y-1.5">
            {/* Back navigation: never stuck on a team's screen */}
            <div className="flex items-center justify-between gap-2 pb-1">
              <span
                className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold"
                style={{
                  backgroundColor: favTeam?.color || '#333',
                  color: favTeam && isLightColor(favTeam.color) ? '#000000' : '#FFFFFF',
                }}
              >
                {favTeam ? `${favTeam.city} ${favTeam.name}` : favoriteTeam}
              </span>
              <button
                onClick={() => setFavoriteTeam(null)}
                className="shrink-0 px-2 py-1 rounded-lg border border-border text-[10px] font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors active:scale-95"
              >
                ← Change team
              </button>
            </div>
            <div className="max-h-64 overflow-y-auto space-y-1.5">
              {pool.map(candidate => (
                <div
                  key={candidate.name}
                  className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg border border-border/50 text-[11px]"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-semibold text-foreground">{candidate.name}</span>
                      <span className="text-muted-foreground">{candidate.position} · {candidate.overall} OVR</span>
                    </div>
                    <div className="text-muted-foreground truncate">{candidate.blurb}</div>
                  </div>
                  <button
                    onClick={() => signFreeAgencyCandidate(candidate)}
                    disabled={!canSign}
                    title={!canSign ? cooldownLabel : undefined}
                    className="shrink-0 px-2.5 py-1.5 rounded-lg font-bold text-[10px] transition-opacity active:scale-95 bg-primary text-primary-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90"
                  >
                    Sign
                  </button>
                </div>
              ))}
              {pool.length === 0 && (
                <p className="text-[10px] text-muted-foreground text-center pt-1">No free agents on the market right now</p>
              )}
              {!canSign && (
                <p className="text-[10px] text-muted-foreground text-center pt-1">{cooldownLabel}</p>
              )}
            </div>
          </div>
        )}
      </div>
    </details>
  );
}

function StatCategory({ label, attLine, defLine, attColor, defColor }: {
  label: string; attLine: string; defLine: string; attColor?: string; defColor?: string;
}) {
  return (
    <div className="rounded-lg border border-border/50 overflow-hidden">
      <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-2 py-1 bg-muted/50 text-center">
        {label}
      </div>
      <div className="grid grid-cols-1 divide-y divide-border/30">
        <div className="flex items-center gap-1.5 px-2 py-1.5 text-[11px]">
          <div className="w-2 h-2 rounded-sm flex-shrink-0" style={{ backgroundColor: attColor || '#333' }} />
          <span className="text-foreground">{attLine}</span>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-1.5 text-[11px]">
          <div className="w-2 h-2 rounded-sm flex-shrink-0" style={{ backgroundColor: defColor || '#333' }} />
          <span className="text-foreground">{defLine}</span>
        </div>
      </div>
    </div>
  );
}

export default function ConquestBoard() {
  const game = useConquest();
  const [now, setNow] = useState(Date.now());
  const playLogRef = useRef<HTMLDivElement>(null);

  // Auto-scroll play log
  useEffect(() => {
    if (playLogRef.current && game.visiblePlays.length > 0) {
      playLogRef.current.scrollTop = playLogRef.current.scrollHeight;
    }
  }, [game.visiblePlays.length]);

  useEffect(() => {
    if (game.phase === 'animating') {
      const id = setInterval(() => setNow(Date.now()), 50);
      return () => clearInterval(id);
    }
  }, [game.phase]);

  const elapsed = game.phase === 'animating' ? now - game.animStartTime : 99999;
  const teamRevealed = elapsed > 2000;
  const dirRevealed = elapsed > 3500;

  const aliveIds = game.aliveTeams();
  const spinTeam = useSpinner(
    aliveIds,
    game.phase === 'animating' && !teamRevealed,
    game.attackingTeam || '',
  );
  const spinDir = useSpinner(
    DIRECTIONS as unknown as string[],
    game.phase === 'animating' && teamRevealed && !dirRevealed,
    game.direction || '',
  );

  const t = (id: string | null) => id ? TEAM_MAP.get(id) : undefined;
  const activeTeamDisplay = game.phase === 'animating' && !teamRevealed ? spinTeam : game.attackingTeam;
  const activeDirDisplay = game.phase === 'animating' && teamRevealed && !dirRevealed ? spinDir : game.direction;
  const activeTeam = t(activeTeamDisplay || null);
  const defTeam = t(game.defendingTeam);
  const winTeam = game.battleResult ? t(game.battleResult.winner) : null;
  const loseTeam = game.battleResult ? t(game.battleResult.loser) : null;
  const pendingTeam = game.pendingPowerup ? t(game.pendingPowerup.teamId) : null;

  // Round 457: what the shared map shows of the fight. The attacker is named
  // once the spinner settles, the target once the direction is called, the
  // result once the box score is in. The takeover comes off the territory
  // change itself; a reset back to the opening map is not one.
  const takeover = useOwnerTakeover(game.territories, game.turn > 0);
  const battleView: ConquestBattleView | null = (() => {
    if (game.phase === 'animating') {
      if (!teamRevealed || !game.attackingTeam) return null;
      return {
        attacker: game.attackingTeam,
        defender: dirRevealed ? game.defendingTeam : null,
        stage: 'pending',
        targetRegion: dirRevealed ? game.targetState : null,
      };
    }
    if (game.phase === 'battle' && game.attackingTeam) {
      return {
        attacker: game.attackingTeam,
        defender: game.defendingTeam,
        stage: game.boxScore ? 'resolved' : 'live',
        winner: game.boxScore ? game.battleResult?.winner ?? null : null,
      };
    }
    return null;
  })();

  // Battle wins per team (real battles only, neutral/powerup claims don't count).
  // In this elimination game a "loss" removes the team, so wins are the live record.
  const winsByTeam = new Map<string, number>();
  for (const e of game.gameLog) {
    if (e.defender !== 'neutral' && e.defender !== 'powerup') {
      winsByTeam.set(e.winner, (winsByTeam.get(e.winner) || 0) + 1);
    }
  }

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {/* Map */}
      <ConquestRegionMap
        sport={NFL_CONQUEST_MAP}
        owners={game.territories}
        battle={battleView}
        takeover={takeover}
        powerupStates={game.powerupStates}
        invincibleTeams={game.invincibleTeams}
        territoryStolenState={game.territoryStolenState}
      />

      {/* Stats bar */}
      <div className="flex justify-center gap-4 text-xs text-muted-foreground font-medium">
        <span>⚔️ Turn {game.turn}</span>
        <span>🏈 {aliveIds.length} teams</span>
        <span>💀 {game.eliminated.length} eliminated</span>
      </div>

      {/* Animation / Battle display */}
      {(game.phase === 'animating' || game.phase === 'battle') && (
        <div className="space-y-2">
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <div className="text-center min-w-[100px]">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Attacker</div>
              <div
                className="px-3 py-2 rounded-lg font-bold text-xs text-white transition-all"
                style={{ backgroundColor: activeTeam?.color || '#333' }}
              >
                {activeTeam?.name || '...'}
              </div>
            </div>

            {(teamRevealed || game.phase === 'battle') && (
              <>
                <div className="text-lg">→</div>
                <div className="text-center min-w-[80px]">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Direction</div>
                  <div className="px-3 py-2 rounded-lg font-bold text-xs bg-card border border-border">
                    {activeDirDisplay ? DIR_LABELS[activeDirDisplay] || activeDirDisplay : '...'}
                  </div>
                </div>
              </>
            )}

            {((dirRevealed && game.phase === 'animating' && game.defendingTeam) || game.phase === 'battle') && defTeam && (
              <>
                <div className="text-lg">⚔️</div>
                <div className="text-center min-w-[100px]">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Defender</div>
                  <div
                    className="px-3 py-2 rounded-lg font-bold text-xs text-white"
                    style={{ backgroundColor: defTeam.color }}
                  >
                    {defTeam.name}
                  </div>
                  <div className="mt-1 inline-block px-1.5 py-0.5 rounded bg-muted text-muted-foreground text-[9px] font-medium">
                    +{HOME_FIELD_BUMP} home edge
                  </div>
                </div>
              </>
            )}
          </div>

          {game.noEnemyMsg && (
            <div className="text-center animate-in fade-in zoom-in-95">
              <div className="inline-block px-4 py-2 rounded-lg bg-destructive/15 border border-destructive/30 text-destructive text-sm font-semibold">
                🚫 {game.noEnemyMsg} Re-routing...
              </div>
            </div>
          )}
        </div>
      )}

      {/* Play-by-play and Battle result */}
      {game.battleResult && game.phase === 'battle' && (
        <div className="space-y-3 animate-in fade-in zoom-in-95">
          {/* Live Score */}
          <div className="flex items-center justify-center gap-4 p-3 rounded-xl bg-card border border-border">
            <div className="text-center min-w-[80px]">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
                {t(game.attackingTeam)?.name}
              </div>
              <div className="text-2xl font-bold text-foreground">
                {game.boxScore
                  ? game.battleResult.simulation?.finalAttScore ?? 0
                  : game.visiblePlays.length > 0
                    ? game.visiblePlays[game.visiblePlays.length - 1].attScore
                    : 0}
              </div>
            </div>
            <div className="text-muted-foreground text-sm font-bold">vs</div>
            <div className="text-center min-w-[80px]">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
                {defTeam?.name}
              </div>
              <div className="text-2xl font-bold text-foreground">
                {game.boxScore
                  ? game.battleResult.simulation?.finalDefScore ?? 0
                  : game.visiblePlays.length > 0
                    ? game.visiblePlays[game.visiblePlays.length - 1].defScore
                    : 0}
              </div>
            </div>
          </div>

          {/* Play-by-play log */}
          <div ref={playLogRef} className="rounded-xl border border-border p-3 bg-card max-h-52 overflow-y-auto">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 text-center">
              {game.playByPlayActive ? '🔴 LIVE' : '📋 Plays'}
            </h4>
            <div className="space-y-1.5">
              {game.visiblePlays.map((play, i) => (
                <div
                  key={i}
                  className={`text-[11px] px-2 py-1.5 rounded-lg border border-border/50 animate-in fade-in slide-in-from-bottom-2 ${
                    play.team === 'att' ? 'bg-primary/5 border-l-2 border-l-primary' : 'bg-accent/5 border-l-2 border-l-accent'
                  } ${i === game.visiblePlays.length - 1 && game.playByPlayActive ? 'ring-1 ring-primary/30' : ''}`}
                >
                  <span className="text-foreground">{play.description}</span>
                  {i > 0 && (play.attScore > game.visiblePlays[i-1].attScore || play.defScore > game.visiblePlays[i-1].defScore) && (
                    <span className="ml-2 text-primary font-bold">SCORE!</span>
                  )}
                  {i === 0 && (play.attScore > 0 || play.defScore > 0) && (
                    <span className="ml-2 text-primary font-bold">SCORE!</span>
                  )}
                </div>
              ))}
              {game.playByPlayActive && game.visiblePlays.length === 0 && (
                <div className="text-center text-xs text-muted-foreground py-2">Kickoff...</div>
              )}
            </div>
          </div>

          {/* Skip to result (item 89): fast-forward the staggered reveal straight to the final box score */}
          {game.canSkipBattle && (
            <div className="flex justify-center">
              <button
                onClick={game.skipToResult}
                className="px-4 py-2 bg-muted text-foreground rounded-lg font-semibold text-xs hover:bg-muted/80 transition-colors border border-border active:scale-95"
              >
                ⏭️ Skip to result
              </button>
            </div>
          )}

          {/* Simulating remainder message */}
          {game.simulatingRemainder && (
            <div className="text-center py-4 animate-in fade-in zoom-in-95">
              <div className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-muted border border-border">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="text-sm font-semibold text-foreground">Simulating remainder of game...</span>
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" style={{ animationDelay: '0.3s' }} />
              </div>
            </div>
          )}

          {/* Full Box Score */}
          {game.boxScore && !game.simulatingRemainder && (
            <div className="rounded-xl border border-border p-4 bg-card animate-in fade-in zoom-in-95 space-y-3">
              {/* Final Score Header */}
              <div className="text-center space-y-1">
                <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Final Score</div>
                <div className="flex items-center justify-center gap-4">
                  <div className="text-center">
                    <div
                      className="px-3 py-1 rounded-lg text-white text-xs font-bold mb-1"
                      style={{ backgroundColor: t(game.attackingTeam)?.color || '#333' }}
                    >
                      {t(game.attackingTeam)?.name}
                    </div>
                    <div className="text-3xl font-black text-foreground">
                      {game.battleResult.simulation?.finalAttScore}
                    </div>
                  </div>
                  <div className="text-muted-foreground text-lg font-bold">-</div>
                  <div className="text-center">
                    <div
                      className="px-3 py-1 rounded-lg text-white text-xs font-bold mb-1"
                      style={{ backgroundColor: defTeam?.color || '#333' }}
                    >
                      {defTeam?.name}
                    </div>
                    <div className="text-3xl font-black text-foreground">
                      {game.battleResult.simulation?.finalDefScore}
                    </div>
                  </div>
                </div>
                <div className="font-bold text-sm text-primary">
                  {winTeam?.city} {winTeam?.name} win!
                </div>
              </div>

              {/* Stat Lines */}
              <div className="space-y-2">
                {/* Passing */}
                <StatCategory label="📊 Passing" 
                  attLine={`${game.boxScore.attStats.passingQb}: ${game.boxScore.attStats.passingComp}/${game.boxScore.attStats.passingAtt}, ${game.boxScore.attStats.passingYds} yds, ${game.boxScore.attStats.passingTds} TD, ${game.boxScore.attStats.passingInts} INT`}
                  defLine={`${game.boxScore.defStats.passingQb}: ${game.boxScore.defStats.passingComp}/${game.boxScore.defStats.passingAtt}, ${game.boxScore.defStats.passingYds} yds, ${game.boxScore.defStats.passingTds} TD, ${game.boxScore.defStats.passingInts} INT`}
                  attColor={t(game.attackingTeam)?.color}
                  defColor={defTeam?.color}
                />
                {/* Rushing */}
                <StatCategory label="🏃 Rushing"
                  attLine={`${game.boxScore.attStats.rushingName}: ${game.boxScore.attStats.rushingCarries} car, ${game.boxScore.attStats.rushingYds} yds, ${game.boxScore.attStats.rushingTds} TD`}
                  defLine={`${game.boxScore.defStats.rushingName}: ${game.boxScore.defStats.rushingCarries} car, ${game.boxScore.defStats.rushingYds} yds, ${game.boxScore.defStats.rushingTds} TD`}
                  attColor={t(game.attackingTeam)?.color}
                  defColor={defTeam?.color}
                />
                {/* Receiving */}
                <StatCategory label="🎯 Receiving"
                  attLine={`${game.boxScore.attStats.receivingName}: ${game.boxScore.attStats.receivingCatches} rec, ${game.boxScore.attStats.receivingYds} yds, ${game.boxScore.attStats.receivingTds} TD`}
                  defLine={`${game.boxScore.defStats.receivingName}: ${game.boxScore.defStats.receivingCatches} rec, ${game.boxScore.defStats.receivingYds} yds, ${game.boxScore.defStats.receivingTds} TD`}
                  attColor={t(game.attackingTeam)?.color}
                  defColor={defTeam?.color}
                />
                {/* Defense */}
                <StatCategory label="🛡️ Defense"
                  attLine={`${game.boxScore.attStats.defenseName}: ${game.boxScore.attStats.defenseStat}`}
                  defLine={`${game.boxScore.defStats.defenseName}: ${game.boxScore.defStats.defenseStat}`}
                  attColor={t(game.attackingTeam)?.color}
                  defColor={defTeam?.color}
                />
              </div>

              <div className="text-center text-sm text-muted-foreground pt-1">
                {game.battleResult.loser === game.attackingTeam
                  ? `Raid repelled: ${loseTeam?.city} ${loseTeam?.name} lose no territory on an away defeat`
                  : game.invincibleTeams.has(game.battleResult.loser)
                    ? `🛡️ ${loseTeam?.city} ${loseTeam?.name} survive: invincibility protects their territory`
                    : `${loseTeam?.city} ${loseTeam?.name} eliminated: home territory conquered`}
              </div>

              {/* Player Confirmed Animation */}
              {game.playerConfirmed && (
                <div className="text-center py-3 animate-in fade-in zoom-in-95">
                  <div className="inline-block px-5 py-3 rounded-xl bg-primary/20 border border-primary/40">
                    <span className="text-lg font-bold text-primary">✅ {game.playerConfirmed} acquired!</span>
                  </div>
                </div>
              )}

              {/* Choose Your Player button */}
              {game.pendingBattleApply && !game.playerConfirmed && (game.rosters[game.battleResult?.loser || ''] || []).length > 0 && (
                <div className="flex justify-center pt-2">
                  <button
                    onClick={game.openStealModal}
                    className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:opacity-90 transition-opacity active:scale-95"
                  >
                    🏈 Choose Your Player
                  </button>
                </div>
              )}

              {/* Skip if no roster to steal from */}
              {game.pendingBattleApply && !game.playerConfirmed && (game.rosters[game.battleResult?.loser || ''] || []).length === 0 && (
                <div className="flex justify-center pt-2">
                  <button
                    onClick={game.skipSteal}
                    className="px-6 py-3 bg-muted text-foreground rounded-xl font-bold text-sm hover:opacity-90 transition-opacity border border-border"
                  >
                    Continue →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Start button */}
      {game.phase === 'ready' && (
        <div className="flex justify-center">
          <button
            onClick={game.startBattle}
            className="px-8 py-3 bg-primary text-primary-foreground rounded-xl font-bold text-lg hover:opacity-90 transition-opacity active:scale-95"
          >
            ⚔️ {game.turn === 0 ? 'Start Conquest' : 'Next Battle'}
          </button>
        </div>
      )}

      {/* Game Over */}
      {game.phase === 'gameover' && (
        <div className="text-center p-6 rounded-xl bg-card border border-border space-y-3 animate-in fade-in zoom-in-95">
          <div className="text-4xl">🏆</div>
          <h2 className="text-2xl font-bold text-foreground">
            {t(aliveIds[0])?.city} {t(aliveIds[0])?.name} Win!
          </h2>
          <p className="text-muted-foreground">Total domination in {game.turn} battles</p>
          <div className="text-sm text-muted-foreground">
            Final roster: {(game.rosters[aliveIds[0]] || []).join(', ')}
          </div>
          <button
            onClick={game.reset}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-bold hover:opacity-90 transition-opacity"
          >
            🔄 Play Again
          </button>
          <ShareButtons
            gameName="NFL Conquest"
            gamePath="/conquest"
            score={`${t(aliveIds[0])?.city} ${t(aliveIds[0])?.name} conquered all 50 states in ${game.turn} battles`}
          />
        </div>
      )}

      {/* Steal Modal */}
      <Dialog open={game.stealModalOpen} onOpenChange={(open) => { if (!open) game.closeStealModal(); }}>
        <DialogContent className="max-w-4xl bg-card border-border text-foreground overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="text-center text-lg">🏈 Steal a Player!</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground text-center">
            <span className="font-bold text-foreground">{winTeam?.name}</span> defeated{' '}
            <span className="font-bold text-foreground">{loseTeam?.name}</span>!
            <br />Choose a player to add to {winTeam?.name}'s roster:
          </p>

          <div className="space-y-2 mt-2 max-h-48 overflow-y-auto">
            {(game.rosters[game.battleResult?.loser || ''] || []).map(player => {
              const loserTeamData = TEAM_MAP.get(game.battleResult?.loser || '');
              const playerData = loserTeamData?.players?.find(p => p.name === player);
              return (
                <button
                  key={player}
                  onClick={() => game.stealPlayer(player)}
                  className="w-full px-4 py-3 rounded-lg border border-border hover:bg-primary/20 transition-colors text-left text-sm text-foreground flex items-center justify-between gap-2"
                >
                  <span className="font-medium">{player}</span>
                  {playerData && (
                    <span className="text-xs text-muted-foreground">
                      {playerData.position} · {playerData.overall} OVR · {playerData.keyStat}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
            <RosterTable
              title={`${winTeam?.name || 'Winner'}'s Roster`}
              color={winTeam?.color || '#333'}
              rosterNames={game.rosters[game.battleResult?.winner || ''] || []}
              teamId={game.battleResult?.winner || ''}
              upgradedPlayer={game.upgradedPlayer}
            />
            <RosterTable
              title={`${loseTeam?.name || 'Loser'}'s Roster`}
              color={loseTeam?.color || '#333'}
              rosterNames={game.rosters[game.battleResult?.loser || ''] || []}
              teamId={game.battleResult?.loser || ''}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Powerup Received Modal */}
      <Dialog open={game.phase === 'powerup_received' && !!game.pendingPowerup} onOpenChange={() => {}}>
        <DialogContent className="max-w-md bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="text-center text-lg">⚡ Power-Up Found!</DialogTitle>
          </DialogHeader>
          {game.pendingPowerup && (
            <div className="text-center space-y-4">
              <div className="text-5xl animate-in zoom-in-50">{game.pendingPowerup.powerup.icon}</div>
              <div>
                <div className="font-bold text-lg text-foreground">{game.pendingPowerup.powerup.label}</div>
                <div className="text-sm text-muted-foreground mt-1">{game.pendingPowerup.powerup.description}</div>
              </div>
              <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                <span>Awarded to</span>
                <span
                  className="px-2 py-0.5 rounded text-white font-bold"
                  style={{ backgroundColor: pendingTeam?.color || '#333' }}
                >
                  {pendingTeam?.name}
                </span>
              </div>
              <div className="flex gap-3 justify-center pt-2">
                <button
                  onClick={game.usePowerupNow}
                  className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-bold hover:opacity-90 transition-opacity"
                >
                  ⚡ Use Now
                </button>
                <button
                  onClick={game.savePowerupForLater}
                  className="px-6 py-2.5 bg-muted text-foreground rounded-lg font-bold hover:bg-muted/80 transition-colors border border-border"
                >
                  💾 Save for Later
                </button>
              </div>
              {(game.teamSavedPowerups[game.pendingPowerup.teamId] || []).length >= 2 && (
                <p className="text-xs text-destructive">⚠️ Team already has 2 saved, oldest will be replaced</p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Free Agent Signing Modal */}
      <Dialog open={game.phase === 'powerup_use' && game.powerupUseType === 'free_agent'} onOpenChange={() => {}}>
        <DialogContent className="max-w-lg bg-card border-border text-foreground overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="text-center text-lg">✍️ Sign a Free Agent</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground text-center mb-2">
            Choose a player to add to <span className="font-bold text-foreground">{t(game.powerupTeam)?.name || 'your team'}</span>'s roster:
          </p>
          <div className="space-y-1.5 max-h-80 overflow-y-auto">
            {game.freeAgentList.map(fa => (
              <button
                key={fa.name}
                onClick={() => game.signFreeAgent(fa.name)}
                className="w-full px-4 py-2.5 rounded-lg border border-border hover:bg-primary/20 transition-colors text-left text-sm text-foreground flex items-center justify-between gap-2"
              >
                <span className="font-medium">{fa.name}</span>
                <span className="text-xs text-muted-foreground">
                  {fa.position} · {fa.overall} OVR
                </span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Territory Steal Target Chooser: pick which bordering enemy state to claim */}
      <Dialog open={game.phase === 'powerup_use' && game.powerupUseType === 'territory_steal'} onOpenChange={() => {}}>
        <DialogContent className="max-w-md bg-card border-border text-foreground overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="text-center text-lg">🗺️ Steal a Territory</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground text-center mb-2">
            Pick a border state for <span className="font-bold text-foreground">{t(game.powerupTeam)?.name}</span> to claim:
          </p>
          <div className="space-y-1.5 max-h-72 overflow-y-auto">
            {game.stealCandidates.map(c => {
              const owner = TEAM_MAP.get(c.ownerId);
              return (
                <button
                  key={c.stateId}
                  onClick={() => game.stealTerritoryTarget(c.stateId)}
                  className="w-full px-4 py-2.5 rounded-lg border border-border hover:bg-primary/20 transition-colors text-left text-sm text-foreground flex items-center justify-between gap-2"
                >
                  <span className="font-medium">{c.stateName}</span>
                  <span
                    className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold text-white"
                    style={{ backgroundColor: owner?.color || '#333' }}
                  >
                    {owner?.name || c.ownerId}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="flex justify-center pt-2">
            <button
              onClick={() => game.stealTerritoryTarget()}
              className="px-4 py-2 bg-muted text-foreground rounded-lg font-semibold text-xs hover:bg-muted/80 transition-colors border border-border active:scale-95"
            >
              🎲 Auto-pick for me
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Upgrade Player Chooser: pick which roster player gets the 99 OVR boost */}
      <Dialog open={game.phase === 'powerup_use' && game.powerupUseType === 'upgrade'} onOpenChange={() => {}}>
        <DialogContent className="max-w-md bg-card border-border text-foreground overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="text-center text-lg">⬆️ Upgrade a Player</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground text-center mb-2">
            Pick a <span className="font-bold text-foreground">{t(game.powerupTeam)?.name}</span> player to boost to 99 OVR for the next battle:
          </p>
          <div className="space-y-1.5 max-h-72 overflow-y-auto">
            {(game.rosters[game.powerupTeam || ''] || []).map(player => {
              const teamData = TEAM_MAP.get(game.powerupTeam || '');
              const playerData = teamData?.players?.find(p => p.name === player);
              return (
                <button
                  key={player}
                  onClick={() => game.chooseUpgradePlayer(player)}
                  className="w-full px-4 py-2.5 rounded-lg border border-border hover:bg-primary/20 transition-colors text-left text-sm text-foreground flex items-center justify-between gap-2"
                >
                  <span className="font-medium">{player}</span>
                  {playerData && (
                    <span className="text-xs text-muted-foreground">
                      {playerData.position} · {playerData.overall} OVR
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <div className="flex justify-center pt-2">
            <button
              onClick={() => game.chooseUpgradePlayer()}
              className="px-4 py-2 bg-muted text-foreground rounded-lg font-semibold text-xs hover:bg-muted/80 transition-colors border border-border active:scale-95"
            >
              🎲 Random player
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Power Rankings (item 86): compact ranked list, updates after each battle */}
      {game.turn > 0 && <PowerRankingsPanel rankings={game.powerRankings()} />}

      {/* Free Agency (item 87): team picker until a favorite is chosen, then a signable candidate pool */}
      <FreeAgencyPanel
        favoriteTeam={game.favoriteTeam}
        setFavoriteTeam={game.setFavoriteTeam}
        canSignFreeAgent={game.canSignFreeAgent}
        signFreeAgencyCandidate={game.signFreeAgencyCandidate}
        freeAgencyCooldownRemaining={game.freeAgencyCooldownRemaining}
        pool={game.freeAgencyPool()}
        aliveIds={aliveIds}
      />

      {/* Standings: remaining teams sorted by territory then wins, + collapsible eliminated list */}
      {aliveIds.length > 1 && game.turn > 0 && (
        <div className="rounded-xl border border-border p-3 bg-card">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 text-center">
            Standings <span className="normal-case font-normal text-[10px]">· 🗺️ territories · ✅ wins</span>
          </h4>
          <div className="grid grid-cols-2 gap-1 max-h-48 overflow-y-auto text-xs">
            {aliveIds
              .map(id => ({ id, count: game.getTeamTerritoryCount(id), wins: winsByTeam.get(id) || 0, team: TEAM_MAP.get(id)! }))
              .sort((a, b) => b.count - a.count || b.wins - a.wins)
              .map(({ id, count, wins, team }) => {
                const saved = game.teamSavedPowerups[id] || [];
                return (
                  <div key={id} className="flex items-center gap-1.5 px-2 py-1 rounded">
                    <div className="w-2 h-2 rounded-sm flex-shrink-0" style={{ backgroundColor: team.color }} />
                    <span className="text-foreground font-medium truncate">{team.name}</span>
                    {game.invincibleTeams.has(id) && <span className="text-[10px]">🛡️</span>}
                    {saved.map((pu, i) => (
                      <span key={i} className="text-[10px]" title={pu.label}>{pu.icon}</span>
                    ))}
                    <span className="text-muted-foreground ml-auto whitespace-nowrap" title="Territories · battle wins">
                      🗺️{count} ✅{wins}
                    </span>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Eliminated teams (collapsed by default) */}
      {game.eliminated.length > 0 && (
        <details className="rounded-xl border border-border bg-card">
          <summary className="cursor-pointer select-none px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center">
            💀 Eliminated ({game.eliminated.length})
          </summary>
          <div className="grid grid-cols-2 gap-1 px-3 pb-3 text-xs">
            {game.eliminated.map((id, i) => {
              const team = TEAM_MAP.get(id);
              return (
                <div key={id} className="flex items-center gap-1.5 px-2 py-1">
                  <span className="text-[10px] text-muted-foreground w-4 text-right">{i + 1}.</span>
                  <div className="w-2 h-2 rounded-sm flex-shrink-0 opacity-60" style={{ backgroundColor: team?.color || '#333' }} />
                  <span className="text-muted-foreground line-through truncate">{team?.name || id}</span>
                </div>
              );
            })}
          </div>
        </details>
      )}

      {/* Upgrade active indicator */}
      {game.upgradeActiveTeam && game.upgradedPlayer && (
        <div className="text-center animate-in fade-in">
          <div className="inline-block px-4 py-2 rounded-lg bg-yellow-500/15 border border-yellow-500/30 text-yellow-300 text-xs font-semibold">
            ⬆️ {game.upgradedPlayer} boosted to 99 OVR for {TEAM_MAP.get(game.upgradeActiveTeam)?.name}'s next battle
          </div>
        </div>
      )}

      {/* Game log */}
      {game.gameLog.length > 0 && (
        <div className="rounded-xl border border-border p-3 bg-card max-h-40 overflow-y-auto">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 text-center">
            Battle Log
          </h4>
          <div className="space-y-1">
            {game.gameLog.slice().reverse().map((entry, i) => {
              const winner = TEAM_MAP.get(entry.winner);
              const loserKey = entry.winner === entry.attacker ? entry.defender : entry.attacker;
              const loser = TEAM_MAP.get(loserKey);
              return (
                <div key={i} className="text-[11px] text-muted-foreground flex items-center gap-1 flex-wrap">
                  <span className="font-bold text-foreground">#{entry.turn}</span>
                  <span
                    className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold text-white leading-tight"
                    style={{ backgroundColor: winner?.color || '#333' }}
                  >
                    {winner?.name}
                  </span>
                  {entry.defender === 'neutral' || entry.defender === 'powerup' ? (
                    <span>{entry.score}</span>
                  ) : (
                    <>
                      <span>def.</span>
                      <span
                        className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold text-white leading-tight"
                        style={{ backgroundColor: loser?.color || '#333' }}
                      >
                        {loser?.name}
                      </span>
                      <span>{entry.score}</span>
                    </>
                  )}
                  {entry.stolenPlayer && (
                    <span className="text-primary"> → Stole {entry.stolenPlayer}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
