// NBA Arcade board. Battles and powers belong to useConquestNba;
// ConquestRegionMap supplies the shared map and takeover animation.

import { useState, useEffect, useRef } from 'react';
import { useConquestNba, PowerRankEntry, type Phase } from '@/hooks/useConquestNba';
import ConquestRegionMap, { useOwnerTakeover, type ConquestBattleView } from './ConquestRegionMap';
import { NBA_TEAM_MAP, NBA_TEAMS, NBA_CONQUEST_MAP, ConquestFreeAgentCandidateNba } from '@/data/conquestDataNba';
import { DIRECTIONS, DIR_LABELS, isLightColor } from '@/data/conquestData';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import ShareButtons from '@/components/game/ShareButtons';
import { getNbaRosterPlayer, HOME_FIELD_BUMP } from '@/lib/conquestBattleNba';

const POWER_DESCRIPTIONS = {
  invincibility: 'Keep your territory the next time this team loses at home. Away defeats do not use the shield.',
  free_agent: 'Choose an available player from an eliminated NBA roster to join this team.',
  upgrade: 'Choose a roster player to use 99 OVR in this team\'s next simulated battle, attacking or defending.',
  legend: 'Add this team\'s franchise legend at an in-game 99 OVR, if the player is not already on an active roster.',
  territory_steal: 'Choose a nearby enemy territory to take without a battle.',
};

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

function RosterTable({ title, color, rosterNames, teamId, upgradedPlayer, legendPlayers }: {
  title: string; color: string; rosterNames: string[]; teamId: string; upgradedPlayer?: string | null; legendPlayers: Set<string>;
}) {

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
              const p = getNbaRosterPlayer(name, teamId, legendPlayers);
              const isLegend = legendPlayers.has(name);
              const isUpgraded = name === upgradedPlayer;
              const ovr = isUpgraded ? 99 : (isLegend ? 99 : p?.overall);
              return (
                <tr key={name} className={`border-b border-border/50 last:border-0 ${isUpgraded ? 'bg-yellow-500/10' : ''} ${isLegend ? 'bg-amber-500/10' : ''}`}>
                  <td className="px-2 py-1 font-medium text-foreground truncate max-w-[120px]">
                    {isLegend && <span className="mr-0.5">🐐</span>}
                    {isUpgraded && <span className="mr-0.5">⬆️</span>}
                    {name}
                  </td>
                  <td className="px-2 py-1 text-muted-foreground">{p?.position || '-'}</td>
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

function PowerRankingsPanel({ rankings }: { rankings: PowerRankEntry[] }) {
  return (
    <details className="rounded-xl border border-border bg-card" open>
      <summary className="cursor-pointer select-none px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center">
        📊 Power Rankings <span className="normal-case font-normal text-[10px]">· adjusted by in-run form</span>
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
              const team = NBA_TEAM_MAP.get(r.id);
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

function FreeAgencyPanel({
  favoriteTeam, setFavoriteTeam, canSignFreeAgent, signFreeAgencyCandidate, freeAgencyCooldownRemaining,
  phase, aliveTeamIds, availableCandidates,
}: {
  favoriteTeam: string | null;
  setFavoriteTeam: (teamId: string) => void;
  canSignFreeAgent: () => boolean;
  signFreeAgencyCandidate: (candidate: ConquestFreeAgentCandidateNba) => void;
  freeAgencyCooldownRemaining: number;
  phase: Phase;
  aliveTeamIds: string[];
  availableCandidates: ConquestFreeAgentCandidateNba[];
}) {
  const activeFavorite = favoriteTeam && aliveTeamIds.includes(favoriteTeam) ? favoriteTeam : '';
  const canSign = phase === 'ready' && !!activeFavorite && freeAgencyCooldownRemaining === 0 && canSignFreeAgent();
  const status = phase === 'gameover'
    ? 'This run is finished. Start a new run to sign players.'
    : phase !== 'ready'
      ? 'Finish this turn before changing teams or signing.'
      : !activeFavorite
        ? 'Pick an active team to sign a player.'
        : freeAgencyCooldownRemaining > 0
          ? `Available after ${freeAgencyCooldownRemaining} more settled battle${freeAgencyCooldownRemaining === 1 ? '' : 's'}.`
          : 'Signing waives this team\'s lowest-rated in-game player and adds a +2 team rating bonus, within the rating cap.';

  return (
    <details className="rounded-xl border border-border bg-card">
      <summary className="cursor-pointer select-none px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center">
        ✍️ Free Agency
      </summary>
      <div className="px-3 pb-3 space-y-2">
        <p className="text-[11px] text-muted-foreground text-center">Arcade player pool. Availability follows the rosters in this run.</p>
        <select
          value={activeFavorite}
          disabled={phase !== 'ready'}
          onChange={(e) => { if (e.target.value) setFavoriteTeam(e.target.value); }}
          aria-label="Pick your team"
          className="w-full min-h-10 px-2 py-2 rounded-lg border border-border bg-background text-xs text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <option value="" disabled>Select a team...</option>
          {NBA_TEAMS.filter(team => aliveTeamIds.includes(team.id)).map(t => (
            <option key={t.id} value={t.id}>{t.city} {t.name}</option>
          ))}
        </select>
        {favoriteTeam && !activeFavorite && (
          <p role="status" className="text-[11px] text-muted-foreground">{NBA_TEAM_MAP.get(favoriteTeam)?.name || favoriteTeam} have been eliminated. Pick another active team.</p>
        )}
        <p className="text-[11px] text-muted-foreground text-center">{status}</p>
        {availableCandidates.length > 0 ? (
          <div className="max-h-64 overflow-y-auto space-y-1.5">
            {availableCandidates.map(candidate => (
              <div
                key={candidate.name}
                className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg border border-border/50 text-[11px]"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-semibold text-foreground">{candidate.name}</span>
                    <span className="text-muted-foreground">{candidate.position} · {candidate.overall} OVR</span>
                  </div>
                </div>
                <button
                  onClick={() => signFreeAgencyCandidate(candidate)}
                  disabled={!canSign}
                  aria-label={`Sign ${candidate.name} for ${NBA_TEAM_MAP.get(activeFavorite)?.name || 'your team'}`}
                  title={!canSign ? status : undefined}
                  className="shrink-0 min-h-8 min-w-10 px-2.5 py-1.5 rounded-lg font-bold text-[10px] transition-opacity active:scale-95 bg-primary text-primary-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90"
                >
                  Sign
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[11px] text-muted-foreground text-center py-2">No players from this Arcade pool are available right now.</p>
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

export default function ConquestBoardNba() {
  const game = useConquestNba();
  const [now, setNow] = useState(Date.now());
  const playLogRef = useRef<HTMLDivElement>(null);

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

  const t = (id: string | null) => id ? NBA_TEAM_MAP.get(id) : undefined;
  const activeTeamDisplay = game.phase === 'animating' && !teamRevealed ? spinTeam : game.attackingTeam;
  const activeDirDisplay = game.phase === 'animating' && teamRevealed && !dirRevealed ? spinDir : game.direction;
  const activeTeam = t(activeTeamDisplay || null);
  const defTeam = t(game.defendingTeam);
  const winTeam = game.battleResult ? t(game.battleResult.winner) : null;
  const loseTeam = game.battleResult ? t(game.battleResult.loser) : null;
  const pendingTeam = game.pendingPowerup ? t(game.pendingPowerup.teamId) : null;
  const pendingRoster = game.pendingPowerup ? game.rosters[game.pendingPowerup.teamId] || [] : [];
  const selectionTitle = game.powerupUseType === 'upgrade'
    ? 'Choose a Player to Upgrade'
    : game.powerupUseType === 'territory_steal'
      ? 'Choose a Territory to Take'
      : 'Sign a Free Agent';

  // Round 457: what the shared map shows of the fight (see ConquestBoard.tsx).
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
        sport={NBA_CONQUEST_MAP}
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
        <span>🏀 {aliveIds.length} teams</span>
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
                <div className="text-center text-xs text-muted-foreground py-2">Tip-off...</div>
              )}
            </div>
          </div>

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

          {game.simulatingRemainder && (
            <div className="text-center py-4 animate-in fade-in zoom-in-95">
              <div className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-muted border border-border">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="text-sm font-semibold text-foreground">Simulating remainder of game...</span>
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" style={{ animationDelay: '0.3s' }} />
              </div>
            </div>
          )}

          {game.boxScore && !game.simulatingRemainder && (
            <div className="rounded-xl border border-border p-4 bg-card animate-in fade-in zoom-in-95 space-y-3">
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

              <div className="space-y-2">
                <StatCategory label="🕹️ Ball Handling"
                  attLine={`${game.boxScore.attStats.passingQb}: ${game.boxScore.attStats.passingComp} ast, ${game.boxScore.attStats.passingYds} pts`}
                  defLine={`${game.boxScore.defStats.passingQb}: ${game.boxScore.defStats.passingComp} ast, ${game.boxScore.defStats.passingYds} pts`}
                  attColor={t(game.attackingTeam)?.color}
                  defColor={defTeam?.color}
                />
                <StatCategory label="🏀 Scoring"
                  attLine={`${game.boxScore.attStats.rushingName}: ${game.boxScore.attStats.rushingCarries} FGM, ${game.boxScore.attStats.rushingYds} pts`}
                  defLine={`${game.boxScore.defStats.rushingName}: ${game.boxScore.defStats.rushingCarries} FGM, ${game.boxScore.defStats.rushingYds} pts`}
                  attColor={t(game.attackingTeam)?.color}
                  defColor={defTeam?.color}
                />
                <StatCategory label="🧱 Frontcourt"
                  attLine={`${game.boxScore.attStats.receivingName}: ${game.boxScore.attStats.receivingCatches} reb, ${game.boxScore.attStats.receivingYds} pts`}
                  defLine={`${game.boxScore.defStats.receivingName}: ${game.boxScore.defStats.receivingCatches} reb, ${game.boxScore.defStats.receivingYds} pts`}
                  attColor={t(game.attackingTeam)?.color}
                  defColor={defTeam?.color}
                />
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

              {game.playerConfirmed && (
                <div className="text-center py-3 animate-in fade-in zoom-in-95">
                  <div className="inline-block px-5 py-3 rounded-xl bg-primary/20 border border-primary/40">
                    <span className="text-lg font-bold text-primary">✅ {game.playerConfirmed} acquired!</span>
                  </div>
                </div>
              )}

              {game.pendingBattleApply && !game.playerConfirmed && (game.rosters[game.battleResult?.loser || ''] || []).length > 0 && (
                <div className="flex justify-center pt-2">
                  <button
                    onClick={game.openStealModal}
                    className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:opacity-90 transition-opacity active:scale-95"
                  >
                    🏀 Choose Your Player
                  </button>
                </div>
              )}

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
            gameName="NBA Conquest"
            gamePath="/conquest-nba"
            score={`${t(aliveIds[0])?.city} ${t(aliveIds[0])?.name} conquered all 50 states in ${game.turn} battles`}
          />
        </div>
      )}

      {/* Steal Modal */}
      <Dialog open={game.stealModalOpen} onOpenChange={(open) => { if (!open) game.closeStealModal(); }}>
        <DialogContent className="max-w-4xl bg-card border-border text-foreground overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="text-center text-lg">🏀 Steal a Player!</DialogTitle>
          </DialogHeader>
          <DialogDescription className="text-sm text-muted-foreground text-center">
            <span className="font-bold text-foreground">{winTeam?.name}</span> beat{' '}
            <span className="font-bold text-foreground">{loseTeam?.name}</span>!
            <br />Choose a player to add to {winTeam?.name}'s roster:
          </DialogDescription>

          <div className="space-y-2 mt-2 max-h-48 overflow-y-auto">
            {(game.rosters[game.battleResult?.loser || ''] || []).map(player => {
              const playerData = getNbaRosterPlayer(player, game.battleResult?.loser || '', game.legendPlayers);
              return (
                <button
                  key={player}
                  onClick={() => game.stealPlayer(player)}
                  className="w-full px-4 py-3 rounded-lg border border-border hover:bg-primary/20 transition-colors text-left text-sm text-foreground flex items-center justify-between gap-2"
                >
                  <span className="font-medium">{player}</span>
                  {playerData && (
                    <span className="text-xs text-muted-foreground">
                      {playerData.position} · {playerData.overall} OVR{playerData.keyStat ? ` · ${playerData.keyStat}` : ''}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <button
            onClick={game.skipSteal}
            className="min-h-10 rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-muted"
          >
            Skip Player
          </button>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
            <RosterTable
              title={`${winTeam?.name || 'Winner'}'s Roster`}
              color={winTeam?.color || '#333'}
              rosterNames={game.rosters[game.battleResult?.winner || ''] || []}
              teamId={game.battleResult?.winner || ''}
              upgradedPlayer={game.battleUpgrades[game.battleResult?.winner || '']}
              legendPlayers={game.legendPlayers}
            />
            <RosterTable
              title={`${loseTeam?.name || 'Loser'}'s Roster`}
              color={loseTeam?.color || '#333'}
              rosterNames={game.rosters[game.battleResult?.loser || ''] || []}
              teamId={game.battleResult?.loser || ''}
              upgradedPlayer={game.battleUpgrades[game.battleResult?.loser || '']}
              legendPlayers={game.legendPlayers}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Powerup Received Modal */}
      <Dialog open={game.phase === 'powerup_received' && !!game.pendingPowerup} onOpenChange={() => {}}>
        <DialogContent
          className="max-w-md bg-card border-border text-foreground max-h-[90vh] overflow-y-auto [&>button]:hidden"
          onEscapeKeyDown={event => event.preventDefault()}
          onPointerDownOutside={event => event.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="text-center text-lg">⚡ Team Power</DialogTitle>
            <DialogDescription className="text-center">
              Use this power for {pendingTeam?.name}, or save it for later in this run.
            </DialogDescription>
          </DialogHeader>
          {game.pendingPowerup && (
            <div className="text-center space-y-4">
              <div className="text-5xl animate-in zoom-in-50">{game.pendingPowerup.powerup.icon}</div>
              <div>
                <div className="font-bold text-lg text-foreground">{game.pendingPowerup.powerup.label}</div>
                <div className="text-sm text-muted-foreground mt-1">{POWER_DESCRIPTIONS[game.pendingPowerup.powerup.id]}</div>
              </div>
              <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                <span>Belongs to</span>
                <span
                  className="px-2 py-0.5 rounded text-white font-bold"
                  style={{ backgroundColor: pendingTeam?.color || '#333' }}
                >
                  {pendingTeam?.name}
                </span>
              </div>
              {game.powerupUnavailableReason && (
                <p role="status" className="text-sm text-muted-foreground">{game.powerupUnavailableReason}</p>
              )}
              <div className="flex flex-wrap gap-3 justify-center pt-2">
                <button
                  onClick={game.usePowerupNow}
                  disabled={!!game.powerupUnavailableReason}
                  className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-bold hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
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
                <p className="text-xs text-destructive">⚠️ This team has 2 saved powers. Saving this one replaces the oldest.</p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Power selection */}
      <Dialog open={game.phase === 'powerup_use' && !!game.pendingPowerup} onOpenChange={open => { if (!open) game.cancelPowerupUse(); }}>
        <DialogContent className="max-w-lg bg-card border-border text-foreground overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="text-center text-lg">{selectionTitle}</DialogTitle>
            <DialogDescription className="text-center">
              {pendingTeam?.name}'s power. {game.pendingPowerup && POWER_DESCRIPTIONS[game.pendingPowerup.powerup.id]}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5 max-h-80 overflow-y-auto">
            {game.powerupUseType === 'free_agent' && game.freeAgentList.map(fa => (
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
            {game.powerupUseType === 'upgrade' && pendingRoster.map(name => {
              const player = getNbaRosterPlayer(name, game.pendingPowerup!.teamId, game.legendPlayers);
              return (
                <button
                  key={name}
                  onClick={() => game.chooseUpgradePlayer(name)}
                  className="w-full px-4 py-2.5 rounded-lg border border-border hover:bg-primary/20 transition-colors text-left text-sm text-foreground flex items-center justify-between gap-2"
                >
                  <span className="font-medium">{name}</span>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{player?.overall ?? '?'} → 99 OVR</span>
                </button>
              );
            })}
            {game.powerupUseType === 'territory_steal' && game.availablePowerupTerritories.map(stateId => (
              <button
                key={stateId}
                onClick={() => game.choosePowerupTerritory(stateId)}
                className="w-full px-4 py-2.5 rounded-lg border border-border hover:bg-primary/20 transition-colors text-left text-sm text-foreground flex items-center justify-between gap-2"
              >
                <span className="font-medium">{NBA_CONQUEST_MAP.regions.find(region => region.id === stateId)?.name || stateId}</span>
                <span className="text-xs text-muted-foreground">{t(game.territories[stateId])?.name}</span>
              </button>
            ))}
            {game.powerupUseType === 'free_agent' && game.freeAgentList.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-3">No eliminated NBA players are available. Go back and save this power for later.</p>
            )}
            {game.powerupUseType === 'upgrade' && pendingRoster.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-3">This team has no player to upgrade. Go back and save this power for later.</p>
            )}
            {game.powerupUseType === 'territory_steal' && game.availablePowerupTerritories.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-3">No nearby enemy territory is available. Go back and save this power for later.</p>
            )}
          </div>
          <button
            onClick={game.cancelPowerupUse}
            className="min-h-10 rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-muted"
          >
            Back to Power
          </button>
        </DialogContent>
      </Dialog>

      {/* Power Rankings */}
      {game.turn > 0 && <PowerRankingsPanel rankings={game.powerRankings()} />}

      {/* Free Agency */}
      <FreeAgencyPanel
        phase={game.phase}
        aliveTeamIds={aliveIds}
        availableCandidates={game.availableFreeAgencyCandidates}
        favoriteTeam={game.favoriteTeam}
        setFavoriteTeam={game.setFavoriteTeam}
        canSignFreeAgent={game.canSignFreeAgent}
        signFreeAgencyCandidate={game.signFreeAgencyCandidate}
        freeAgencyCooldownRemaining={game.freeAgencyCooldownRemaining}
      />

      {/* Standings */}
      {aliveIds.length > 1 && game.turn > 0 && (
        <div className="rounded-xl border border-border p-3 bg-card">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 text-center">
            Standings <span className="normal-case font-normal text-[10px]">· 🗺️ territories · ✅ wins</span>
          </h4>
          {aliveIds.some(id => game.teamSavedPowerups[id]?.length) && (
            <p className="text-[11px] text-muted-foreground text-center mb-2">Saved powers last for this run. Tap one between battles.</p>
          )}
          <div className="grid grid-cols-2 gap-1 max-h-48 overflow-y-auto text-xs">
            {aliveIds
              .map(id => ({ id, count: game.getTeamTerritoryCount(id), wins: winsByTeam.get(id) || 0, team: NBA_TEAM_MAP.get(id)! }))
              .sort((a, b) => b.count - a.count || b.wins - a.wins)
              .map(({ id, count, wins, team }) => {
                const saved = game.teamSavedPowerups[id] || [];
                return (
                  <div key={id} className="min-w-0 px-2 py-1 rounded">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-sm flex-shrink-0" style={{ backgroundColor: team.color }} />
                      <span className="text-foreground font-medium truncate">{team.name}</span>
                      {game.invincibleTeams.has(id) && <span title="Protected on the next home defeat" className="text-[10px]">🛡️</span>}
                      <span className="text-muted-foreground ml-auto whitespace-nowrap" title="Territories · battle wins">
                        🗺️{count} ✅{wins}
                      </span>
                    </div>
                    {saved.length > 0 && (
                      <div className="flex gap-1 mt-1" aria-label={`${team.name} saved powers`}>
                        {saved.map((pu, i) => (
                          <button
                            key={i}
                            onClick={() => game.useSavedPowerup(id, i)}
                            disabled={game.phase !== 'ready'}
                            aria-label={`Open ${team.name} saved ${pu.label}, slot ${i + 1}`}
                            title={`${pu.label}: saved this run`}
                            className="min-h-8 min-w-8 rounded-md border border-border bg-muted text-base hover:bg-primary/20 disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            {pu.icon}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Eliminated teams */}
      {game.eliminated.length > 0 && (
        <details className="rounded-xl border border-border bg-card">
          <summary className="cursor-pointer select-none px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center">
            💀 Eliminated ({game.eliminated.length})
          </summary>
          <div className="grid grid-cols-2 gap-1 px-3 pb-3 text-xs">
            {game.eliminated.map((id, i) => {
              const team = NBA_TEAM_MAP.get(id);
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
      {Object.entries(game.teamUpgrades).map(([teamId, player]) => (
        <div key={teamId} className="text-center animate-in fade-in">
          <div className="inline-block px-4 py-2 rounded-lg bg-yellow-500/15 border border-yellow-500/30 text-yellow-300 text-xs font-semibold">
            ⬆️ {player}: in-game 99 OVR for {NBA_TEAM_MAP.get(teamId)?.name}'s next battle, home or away
          </div>
        </div>
      ))}

      {/* Game log */}
      {game.gameLog.length > 0 && (
        <div className="rounded-xl border border-border p-3 bg-card max-h-40 overflow-y-auto">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 text-center">
            Battle Log
          </h4>
          <div className="space-y-1">
            {game.gameLog.slice().reverse().map((entry, i) => {
              const winner = NBA_TEAM_MAP.get(entry.winner);
              const loserKey = entry.winner === entry.attacker ? entry.defender : entry.attacker;
              const loser = NBA_TEAM_MAP.get(loserKey);
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
