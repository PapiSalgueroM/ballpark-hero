import { useMemo, useState, type ReactNode } from 'react';
import { ChevronLeft } from 'lucide-react';
import { ResultScreen } from '@/components/game/ResultScreen';
import { ManagerRecordLines } from '@/components/club-manager/ClubManagerCareerPanel';
import { careerLegacy, farewellShareText, ordinal, printedWeek, type CareerLegacy, type LegacyClub } from '@/lib/clubManagerRetire';
import { formatNumber } from '@/lib/formatNumber';
import type { CareerState } from '@/lib/clubManager';
import type { useClubManager } from '@/hooks/useClubManager';

/* Round 1343: the farewell. A retired career ends on the site's one result card, with three tiles that open in
   place (the clubs, the trophy cabinet, the records) and a Back on each, so the page never stacks. It records
   nothing: See the farewell opens it any number of times, so no play, no streak day and no points. Everything on
   it is read from the save; nobody speaks. */

const count = (n: number, one: string, many: string) => `${formatNumber(n)} ${n === 1 ? one : many}`;

function momentLine(c: CareerState, l: CareerLegacy): string {
  const r = l.retired;
  if (!r) return `Season ${formatNumber(l.lastSeason)} at ${c.clubName}`;
  if (r.when === 'midSeason') {
    const where = r.position ? `, ${ordinal(r.position)} after ${count(r.played ?? 0, 'league game', 'league games')}` : '';
    return `Left ${r.club} in week ${formatNumber(printedWeek(c, r.week ?? 0))} of Season ${formatNumber(r.season)}${where}`;
  }
  if (r.when === 'outOfWork') return `Retired while out of work, last in charge of ${r.club}`;
  return `Retired after Season ${formatNumber(r.season)} at ${r.club}`;
}

function clubLine(x: LegacyClub): string {
  const parts: string[] = [];
  if (x.seasons.length) parts.push(`${x.seasons.length === 1 ? 'Season' : 'Seasons'} ${x.seasons.map(formatNumber).join(', ')}`);
  if (x.unfinished !== undefined) parts.push(`Season ${formatNumber(x.unfinished)} left unfinished`);
  if (x.partOf !== undefined) parts.push(x.partOf === null ? 'part of a season' : `part of Season ${formatNumber(x.partOf)}`);
  return parts.join(', ');
}

type Tile = 'clubs' | 'cabinet' | 'records';

export default function ClubManagerFarewell({ c, g }: {
  c: CareerState;
  g: Pick<ReturnType<typeof useClubManager>, 'startNew' | 'showSlots'>;
}) {
  const [open, setOpen] = useState<Tile | null>(null);
  const l = useMemo(() => careerLegacy(c), [c]);
  const name = c.manager?.name?.trim();
  const tile = (key: Tile, emoji: string, label: string, note: string) => (
    <button type="button" data-cm-farewell-tile={key} onClick={() => setOpen(key)} className="min-h-[44px] w-full rounded-xl border border-border bg-card px-3 py-2 text-left text-sm hover:border-primary">
      <span className="mr-1">{emoji}</span>{label} <span className="text-xs text-muted-foreground">{note}</span>
    </button>
  );
  const panel = (key: Tile, heading: string, body: ReactNode) => (
    <div data-cm-farewell-open={key} className="text-left rounded-xl border border-border p-3 space-y-2">
      <button type="button" data-cm-farewell-back onClick={() => setOpen(null)} className="inline-flex items-center gap-1 min-h-[44px] min-w-[44px] pr-2 text-xs text-muted-foreground hover:text-foreground">
        <ChevronLeft className="w-3.5 h-3.5" /> Back
      </button>
      <div className="text-sm font-bold text-foreground">{heading}</div>
      {body}
    </div>
  );
  return (
    <ResultScreen
      outcome={l.trophies > 0 ? 'win' : 'close'}
      score={formatNumber(l.trophies)}
      scoreLabel={l.trophies === 1 ? 'trophy' : 'trophies'}
      outcomeEmoji="👋"
      headline={name ? `Farewell, ${name}` : "You've retired"}
      statLine={`${count(l.finishedSeasons, 'season', 'seasons')} · ${count(l.clubs.length, 'club', 'clubs')} · ${formatNumber(l.wins)}W ${formatNumber(l.draws)}D ${formatNumber(l.losses)}L`}
      funFact={<span data-cm-farewell-moment>{momentLine(c, l)}</span>}
      statRow={[
        { label: 'Seasons', value: formatNumber(l.finishedSeasons) },
        { label: 'Win %', value: `${l.winRate}%` },
        { label: 'Trophies', value: formatNumber(l.trophies) },
      ]}
      emojiGrid={`👋 Retired in S${l.lastSeason} · 🏆×${l.trophies} · ${l.wins}W ${l.draws}D ${l.losses}L`}
      share={{
        score: `Retired after ${count(l.finishedSeasons, 'season', 'seasons')} (${count(l.trophies, 'trophy', 'trophies')})`,
        gameName: 'Club Manager',
        gamePath: '/club-manager',
        customText: farewellShareText(l),
      }}
      onPlayAgain={g.startNew}
      playAgainLabel="Start a new manager"
      playNext={
        <button type="button" data-testid="cm-show-slots-retired" onClick={g.showSlots} className="min-h-[44px] w-full rounded-lg border border-border px-3 py-2 text-sm font-bold text-foreground hover:border-primary">
          Your managers
        </button>
      }
    >
      <div data-cm-farewell className="space-y-2 mb-3">
        {open === 'clubs' ? panel('clubs', '🏟️ Clubs', (
          <div className="space-y-1">
            {l.clubs.map(x => (
              <p key={x.club} className="text-xs text-muted-foreground"><span className="text-foreground font-semibold">{x.club}</span>{clubLine(x) ? `: ${clubLine(x)}` : ''}</p>
            ))}
          </div>
        )) : tile('clubs', '🏟️', 'Clubs', count(l.clubs.length, 'club', 'clubs'))}
        {open === 'cabinet' ? panel('cabinet', '🏆 Trophy cabinet', l.cabinet.length ? (
          <div className="space-y-1">
            {l.cabinet.map(t => (
              <p key={t.name} className="text-xs text-muted-foreground">{t.emoji} <span className="text-foreground font-semibold">{t.name}</span>{t.seasons.length > 1 ? ` ×${t.seasons.length}` : ''}: {t.seasons.length === 1 ? 'Season' : 'Seasons'} {t.seasons.map(formatNumber).join(', ')}</p>
            ))}
          </div>
        ) : <p className="text-xs text-muted-foreground">No trophies this time. The record is still yours.</p>)
          : tile('cabinet', '🏆', 'Trophy cabinet', count(l.trophies, 'trophy', 'trophies'))}
        {open === 'records' ? panel('records', '📋 Records', (
          <>
            <ManagerRecordLines c={c} />
            {l.nation && (
              <p data-cm-farewell-nation className="text-xs text-muted-foreground">🌐 Managed {l.nation.nation} from Season {formatNumber(l.nation.since)}: {count(l.nation.played, 'tournament', 'tournaments')}, {formatNumber(l.nation.won)} won.</p>
            )}
          </>
        )) : tile('records', '📋', 'Records', `${l.winRate}% of ${count(l.played, 'match', 'matches')} won`)}
      </div>
    </ResultScreen>
  );
}
