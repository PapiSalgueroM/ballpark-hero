import { useState, useEffect, useRef } from 'react';
import { useConquest } from '@/hooks/useConquest';
import ConquestMap from './ConquestMap';
import { TEAM_MAP, DIRECTIONS, DIR_LABELS } from '@/data/conquestData';
import { TEAM_LEGENDS } from '@/data/conquestPowerups';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

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
                  <td className="px-2 py-1 text-muted-foreground">{isLegend ? legend.position : (p?.position || '—')}</td>
                  <td className={`px-2 py-1 text-center font-bold ${isUpgraded || isLegend ? 'text-yellow-400' : 'text-foreground'}`}>{ovr || '—'}</td>
                  <td className="px-2 py-1 text-right text-muted-foreground whitespace-nowrap">{isLegend ? 'Legend' : (p?.keyStat || '—')}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function ConquestBoard() {
  const game = useConquest();
  const [now, setNow] = useState(Date.now());

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

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {/* Map */}
      <ConquestMap
        territories={game.territories}
        attackingTeam={game.attackingTeam}
        defendingTeam={game.defendingTeam}
        phase={game.phase}
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
            <div className="text-center">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
                {t(game.attackingTeam)?.name}
              </div>
              <div className="text-2xl font-bold text-foreground">
                {game.visiblePlays.length > 0 ? game.visiblePlays[game.visiblePlays.length - 1].attScore : 0}
              </div>
            </div>
            <div className="text-muted-foreground text-sm font-bold">vs</div>
            <div className="text-center">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
                {defTeam?.name}
              </div>
              <div className="text-2xl font-bold text-foreground">
                {game.visiblePlays.length > 0 ? game.visiblePlays[game.visiblePlays.length - 1].defScore : 0}
              </div>
            </div>
          </div>

          {/* Play-by-play log */}
          <div className="rounded-xl border border-border p-3 bg-card max-h-52 overflow-y-auto">
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

          {/* Box Score - shown after all plays */}
          {game.boxScore && !game.playByPlayActive && (
            <div className="rounded-xl border border-border p-3 bg-card animate-in fade-in zoom-in-95">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 text-center">
                📊 Final Box Score
              </h4>
              <div className="grid grid-cols-3 gap-1 text-[11px] text-center">
                <div className="font-bold text-foreground">{t(game.attackingTeam)?.name}</div>
                <div className="text-muted-foreground font-semibold">Stat</div>
                <div className="font-bold text-foreground">{defTeam?.name}</div>

                <div className="text-foreground">{game.boxScore.attPassYds}</div>
                <div className="text-muted-foreground">Pass Yds</div>
                <div className="text-foreground">{game.boxScore.defPassYds}</div>

                <div className="text-foreground">{game.boxScore.attRushYds}</div>
                <div className="text-muted-foreground">Rush Yds</div>
                <div className="text-foreground">{game.boxScore.defRushYds}</div>

                <div className="text-primary text-[10px]">{game.boxScore.attTopPerformer}</div>
                <div className="text-muted-foreground">⭐ MVP</div>
                <div className="text-primary text-[10px]">{game.boxScore.defTopPerformer}</div>
              </div>
              <div className="mt-3 text-center">
                <div className="font-bold text-lg text-foreground">
                  {winTeam?.city} {winTeam?.name} win!
                </div>
                <div className="text-2xl font-bold text-primary my-1">
                  {game.battleResult.winScore} - {game.battleResult.loseScore}
                </div>
                <div className="text-sm text-muted-foreground">
                  {loseTeam?.city} {loseTeam?.name} eliminated — all territory conquered
                </div>
              </div>
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
        </div>
      )}

      {/* Steal Modal */}
      <Dialog open={game.phase === 'steal'} onOpenChange={() => {}}>
        <DialogContent className="max-w-4xl bg-card border-border text-foreground overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="text-center text-lg">🏈 Steal a Player!</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground text-center">
            <span className="font-bold text-foreground">{winTeam?.name}</span> conquered{' '}
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
                <p className="text-xs text-destructive">⚠️ Team already has 2 saved — oldest will be replaced</p>
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
            Choose a player to add to your roster:
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

      {/* Saved Powerups Display (per team, top 10 territory leaders) */}
      {aliveIds.length > 1 && game.turn > 0 && (
        <div className="rounded-xl border border-border p-3 bg-card">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 text-center">
            Territory Leaders
          </h4>
          <div className="grid grid-cols-2 gap-1 max-h-40 overflow-y-auto text-xs">
            {aliveIds
              .map(id => ({ id, count: game.getTeamTerritoryCount(id), team: TEAM_MAP.get(id)! }))
              .sort((a, b) => b.count - a.count)
              .slice(0, 10)
              .map(({ id, count, team }) => {
                const saved = game.teamSavedPowerups[id] || [];
                return (
                  <div key={id} className="flex items-center gap-1.5 px-2 py-1 rounded">
                    <div className="w-2 h-2 rounded-sm flex-shrink-0" style={{ backgroundColor: team.color }} />
                    <span className="text-foreground font-medium truncate">{team.name}</span>
                    {game.invincibleTeams.has(id) && <span className="text-[10px]">🛡️</span>}
                    {saved.map((pu, i) => (
                      <span key={i} className="text-[10px]" title={pu.label}>{pu.icon}</span>
                    ))}
                    <span className="text-muted-foreground ml-auto">{count}</span>
                  </div>
                );
              })}
          </div>
        </div>
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
              const loser = TEAM_MAP.get(entry.winner === entry.attacker ? entry.defender : entry.attacker);
              return (
                <div key={i} className="text-[11px] text-muted-foreground">
                  <span className="font-bold text-foreground">#{entry.turn}</span>{' '}
                  <span style={{ color: winner?.color }}>{winner?.name}</span>{' '}
                  {entry.defender === 'neutral' || entry.defender === 'powerup' ? (
                    <span>{entry.score}</span>
                  ) : (
                    <>
                      def. <span style={{ color: loser?.color }}>{loser?.name}</span> {entry.score}
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
