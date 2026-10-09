import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import type { CareerState, SeasonRecord } from '@/lib/soccerCareerEngine';
import type { SavedSeasonCompetition } from '@/lib/soccerSeasonCompetitions';
import { focusDialogOnMount } from '@/lib/dialogA11y';
import { useBodyLock } from '@/components/season-centre/useBodyLock';
import { squadNow } from '@/lib/soccerClubSquad';
import { SquadTile } from './SquadTile';

export type CentreScreen = 'league' | 'domestic' | 'club' | 'squad';
export function CompetitionNavigation({ league, competitions, screen, onSelect }: {
  league: string; competitions: SavedSeasonCompetition[]; screen: CentreScreen; onSelect: (screen: CentreScreen) => void;
}) {
  const tabs = [{ id: 'league' as const, name: league }, ...competitions, { id: 'squad' as const, name: 'Current squad' }];
  return <nav aria-label="Season competitions" className="grid shrink-0 grid-cols-2 gap-1.5 border-b border-border p-2 sm:flex sm:flex-wrap" data-centre-competitions>
    {tabs.map(tab => <button key={tab.id} type="button" aria-pressed={screen === tab.id} onClick={() => onSelect(tab.id)} data-centre-competition={tab.id}
      className={`min-h-11 min-w-0 rounded-lg border px-2 text-xs font-semibold sm:px-3 ${screen === tab.id ? 'border-primary bg-primary/15 text-primary' : 'border-border'}`}>
      {tab.name}
    </button>)}
  </nav>;
}

export default function SeasonCompetitionPanel({ career, row, competition, navigation, exitLabel, onClose, leagueUnavailable }: {
  career: CareerState; row: SeasonRecord; competition: SavedSeasonCompetition | null;
  navigation: ReactNode; exitLabel: string; onClose: () => void;
  leagueUnavailable?: string;
}) {
  const [picked, setPicked] = useState<number | null>(null);
  const [help, setHelp] = useState(false);
  const content = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  useBodyLock();
  useEffect(() => {
    if (content.current) content.current.scrollTop = 0;
    heading.current?.focus({ preventScroll: true });
  }, [picked, help]);
  const keyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest('[role="dialog"]') !== event.currentTarget) return;
    if (event.key === 'Escape') { event.preventDefault(); onClose(); return; }
    if (event.key !== 'Tab') return;
    const stops = [...event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), a[href]')];
    const first = stops[0], last = stops[stops.length - 1];
    if (!stops.includes(document.activeElement as HTMLElement) || (event.shiftKey ? document.activeElement === first : document.activeElement === last)) {
      event.preventDefault(); (event.shiftKey ? last : first)?.focus({ preventScroll: true });
    }
  };
  const match = picked === null ? null : competition?.matches[picked];
  const currentSquad = !competition && !leagueUnavailable ? squadNow(career) : null;
  const title = leagueUnavailable ? 'League replay unavailable' : competition?.name ?? 'Current squad';
  const context = !competition && !leagueUnavailable
    ? currentSquad ? `${currentSquad.club} · Current squad · ${currentSquad.year}/${String(currentSquad.year + 1).slice(-2)}` : 'Current squad unavailable'
    : `${row.club} · ${row.year}/${String(row.year + 1).slice(-2)}`;
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-3 backdrop-blur-sm" data-season-centre data-centre-saved-competition>
    <div role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={focusDialogOnMount} onKeyDown={keyDown}
      className="flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-card outline-none">
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border p-3">
        <h2 className="min-w-0 flex-1 text-sm font-black">📺 {title}</h2>
        <button type="button" aria-label="How saved competitions work" onClick={() => setHelp(value => !value)} className="h-11 w-11 shrink-0 rounded-lg border border-border font-bold">?</button>
        <button type="button" onClick={onClose} className="min-h-11 rounded-lg border border-border px-3 text-xs font-semibold" data-centre-exit>{exitLabel}</button>
        <p className="w-full text-xs text-muted-foreground" data-centre-competition-context>{context}</p>
      </div>
      {navigation}
      <div ref={content} className="min-h-0 overflow-y-auto overscroll-contain p-4">
        {help ? <div className="space-y-3 text-sm" data-centre-competition-help>
          <h3 ref={heading} tabIndex={-1} className="font-bold outline-none">Your saved competitions</h3>
          <p>Pick a competition, then a game. These are the opponents and scores your career kept. Missing scores and early-round opponents stay marked as missing.</p>
          <p>The score is always shown from your club's side. An aggregate score covers the whole tie. Your league season keeps its place when you switch back.</p>
          <p>Current squad opens the same eleven, bench and selection plan as the Squad tile on your career page. It is the current squad on our ratings, not a saved matchday lineup.</p>
          <p>Example: a saved first-leg win of 2-1 and second-leg draw of 1-1 stay separate games. The deciding leg shows 3-2 on aggregate when the save kept it.</p>
          <button type="button" onClick={() => setHelp(false)} className="min-h-11 rounded-lg border border-border px-3 text-xs font-bold">‹ Back</button>
        </div> : leagueUnavailable ? <div className="space-y-3" data-centre-league-unavailable>
          <h3 ref={heading} tabIndex={-1} className="text-sm font-bold outline-none">League replay unavailable</h3>
          <p className="text-sm">{leagueUnavailable}</p>
          <p className="text-xs text-muted-foreground">Use the competition buttons to open the cup games this season kept.</p>
        </div> : !competition ? <div className="space-y-3" data-centre-current-squad>
          <h3 ref={heading} tabIndex={-1} className="text-sm font-bold outline-none">Your current squad</h3>
          <p className="text-xs text-muted-foreground">The eleven and bench below belong to your current club and its next season. Past matchday lineups were not kept in your career save.</p>
          {career.retired ? <p className="text-sm">Your playing career is over, so there is no current squad to show.</p> : !currentSquad ? <p className="text-sm">No current squad is recorded for this stage of your career.</p> : <SquadTile career={career} />}
        </div> : match ? <div className="space-y-3" data-centre-cup-game={picked}>
          <button type="button" onClick={() => setPicked(null)} className="min-h-11 rounded-lg border border-border px-3 text-xs font-bold">‹ All games</button>
          <h3 ref={heading} tabIndex={-1} className="text-sm font-bold outline-none">{match.round}</h3>
          <div className="rounded-xl bg-muted/30 p-4 text-center">
            <p className="text-sm font-semibold">{row.club} vs {match.opponent ?? 'Opponent not recorded'}</p>
            <p className="my-2 text-3xl font-black tabular-nums" data-centre-cup-score>{match.goalsFor === null || match.goalsAgainst === null ? 'Score not recorded' : `${match.goalsFor}-${match.goalsAgainst}`}</p>
            {match.home !== undefined && <p className="text-xs text-muted-foreground">{match.home ? 'Home' : 'Away'}</p>}
            {match.result && <p className="text-xs font-semibold">{match.result}</p>}
            {match.note && <p className="mt-1 text-xs text-muted-foreground">{match.note}</p>}
            {match.playerGoals !== undefined && <p className="mt-1 text-xs">You scored {match.playerGoals}</p>}
          </div>
          <div className="flex gap-2">
            <button type="button" disabled={picked === 0} onClick={() => setPicked(value => (value ?? 0) - 1)} className="min-h-11 flex-1 rounded-lg border border-border text-xs font-bold disabled:opacity-40">‹ Previous game</button>
            <button type="button" disabled={picked === competition.matches.length - 1} onClick={() => setPicked(value => (value ?? 0) + 1)} className="min-h-11 flex-1 rounded-lg border border-border text-xs font-bold disabled:opacity-40">› Next game</button>
          </div>
        </div> : <div className="space-y-3">
          <h3 ref={heading} tabIndex={-1} className="text-sm font-bold outline-none">{competition.result}</h3>
          <p className="text-xs text-muted-foreground">Scores are from {row.club}'s side. Your season totals include all competitions.</p>
          {competition.note && <p className="text-xs text-muted-foreground">{competition.note}</p>}
          {competition.matches.length === 0 ? <p className="text-sm" data-centre-cup-missing>No match details recorded.</p> : <div className="grid grid-cols-2 gap-2" data-centre-cup-games>
            {competition.matches.map((game, index) => <button key={index} type="button" onClick={() => setPicked(index)} data-centre-cup-open={index} className="min-h-20 min-w-0 rounded-xl border border-border bg-muted/20 p-3 text-left">
              <span className="block text-xs font-bold">{game.round}</span>
              <span className="block break-words text-xs">{game.opponent ?? 'Opponents not recorded'}</span>
              <span className="block text-sm font-black tabular-nums">{game.goalsFor === null || game.goalsAgainst === null ? game.result ?? 'Score not recorded' : `${game.goalsFor}-${game.goalsAgainst}`}</span>
            </button>)}
          </div>}
        </div>}
      </div>
    </div>
  </div>;
}
