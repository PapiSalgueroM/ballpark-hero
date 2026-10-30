/**
 * Round 1601: the player card, drawn alone with a Back button (the tile rule), lazy. It prints what the reader
 * (src/lib/clubManagerCards.ts) returns and computes nothing of its own but the words; its "?" holds the rules and
 * a worked example run through the same averageOf the card uses.
 */
import { useMemo, useState } from 'react';
import { ChevronLeft, HelpCircle } from 'lucide-react';
import { moneyIn, type CareerState } from '@/lib/clubManager';
import { averageOf, PAST_KEPT } from '@/lib/clubManagerCareerLines';
import { playerCardOf, seasonLabelOf, type CardNote, type CardRef, type PlayerCard, type SeasonLine } from '@/lib/clubManagerCards';
import { MadeUpTag } from '@/components/club-manager/SquadScreen';

const btn = 'inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-lg text-xs text-muted-foreground hover:text-foreground';
const tile = 'rounded-xl border border-border bg-card p-3 space-y-1';
const avg = (v: number | null): string => (v === null ? 'no rating' : v.toFixed(1));
/** "1 goal", "2 goals". */
const count = (v: number, one: string, many: string): string => `${v} ${v === 1 ? one : many}`;

/** The plain line for each note, written once. */
function noteText(n: CardNote, card: PlayerCard, state: CareerState): string {
  switch (n.k) {
    case 'nobook': return card.mine
      ? 'No league book this season yet, so his league clean sheets are not counted here.'
      : 'No league book this season yet, so the game has no league count for him here.';
    case 'late': return card.mine
      ? `The league book counts from round ${n.from}, so his league clean sheets are left off here.`
      : `Counting from round ${n.from}. Goals before that are not in this count.`;
    case 'thin': return `The data covers only part of this league: ${n.share} in 100 of the other clubs' goals have a name.`;
    case 'outside': return 'The game keeps goals for the clubs of your league only.';
    case 'leftclub': return `He is no longer on ${card.club}'s books. The count is what he scored for them this season.`;
    case 'thisclub': return `The count is for ${card.club} only. If he joined them this season, what he did at his old club is not in it.`;
    case 'keptfrom': return `Seasons before ${seasonLabelOf(state, n.from)} were played before the game kept them.`;
  }
}

function Line({ label, line, back, cards }: { label: string; line: SeasonLine; back: boolean; cards: boolean }) {
  const bits = [
    line.apps === null ? null : count(line.apps, 'app', 'apps'),
    count(line.goals, 'goal', 'goals'),
    count(line.assists, 'assist', 'assists'),
    back && line.cleanSheets !== null ? count(line.cleanSheets, 'clean sheet', 'clean sheets') : null,
  ].filter(Boolean);
  const sub = [
    line.apps === null ? null : line.average === null ? 'No rating yet' : `Averaging ${avg(line.average)}`,
    cards && line.yellows ? `${line.yellows} yellow` : null,
    cards && line.reds ? `${line.reds} red` : null,
  ].filter(Boolean);
  return (
    <div className={tile} data-cm-card-line={label}>
      <div className="text-xs text-muted-foreground uppercase tracking-wider">{label}</div>
      <div className="text-sm font-bold text-foreground">{bits.join(', ')}</div>
      {sub.length > 0 && <div className="text-xs text-muted-foreground">{sub.join(', ')}</div>}
    </div>
  );
}

function Help({ card }: { card: PlayerCard }) {
  const p = card.mine && card.now && card.now.apps ? card.now : null;
  /* The worked example is his own average where he has one, run through the very function the card uses. */
  const sum = p && p.average !== null && p.apps ? Math.round(p.average * p.apps * 10) / 10 : 72;
  const apps = p && p.apps ? p.apps : 10;
  const example = averageOf(apps, Math.round(sum * 10));
  return (
    <div data-cm-card-rules className="rounded-xl border border-border bg-background/40 p-3 space-y-1.5 text-xs text-muted-foreground">
      <p><span className="font-bold text-foreground">Your players:</span> this season counts every competition, and the league line is the league on its own. When a season ends, every man who played for you gets a row, the last {PAST_KEPT} kept. Seasons are kept for the men at your club when a season ends, while they stay.</p>
      <p><span className="font-bold text-foreground">Other clubs in your league:</span> goals, assists and clean sheets as the league book counted them. The book has no appearances, match ratings or cards for them, so the card shows none.</p>
      <p><span className="font-bold text-foreground">Clubs outside your league:</span> who he is and where he plays. The game keeps goals for your league only.</p>
      <p data-cm-card-example><span className="font-bold text-foreground">Worked example:</span> {p ? 'his' : 'say a man has'} {sum.toFixed(1)} in match ratings over {apps} games, which is an average of {avg(example)}.</p>
    </div>
  );
}

export function PlayerCardScreen({ card: ref, career, onBack }: { card: CardRef; career: CareerState; onBack: () => void }) {
  const [help, setHelp] = useState(false);
  const card = useMemo(() => playerCardOf(career, ref), [career, ref]);
  const money = moneyIn(career);
  /* The top row's right corner is the page's own "?" (How to Play Club Manager), so the card's own "?" sits beside
     the name instead. */
  const top = (
    <div className="flex items-center gap-2">
      <button type="button" onClick={onBack} data-cm-card-back className={`${btn} gap-1 pr-2`}>
        <ChevronLeft className="w-4 h-4" /> Back
      </button>
    </div>
  );
  if (!card) {
    return (
      <div data-cm-card data-cm-card-gone className="space-y-2">
        {top}
        <p className="text-sm text-muted-foreground">He is no longer at the club, so there is no card to show.</p>
      </div>
    );
  }
  return (
    <div data-cm-card={card.mine ? 'mine' : 'man'} className="space-y-2">
      {top}
      <div className="rounded-xl border border-border bg-card p-3 flex items-start justify-between gap-2">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span data-cm-card-name className="text-base font-bold text-foreground break-words">{card.name}</span>
            {card.madeUp && <MadeUpTag className="text-xs" />}
          </div>
          <div className="text-xs text-muted-foreground">
            {[card.pos, card.age === null ? null : `age ${card.age}`, card.club].filter(Boolean).join(' · ')}
          </div>
          {(card.rating !== null || card.worth !== null) && (
            <div className="text-xs text-muted-foreground">
              {[card.rating === null ? null : `Rated ${card.rating}`, card.worth === null ? null : `Worth ${money(card.worth)}`].filter(Boolean).join(', ')}
            </div>
          )}
        </div>
        <button type="button" aria-label="How the player card works" aria-expanded={help} onClick={() => setHelp(!help)} data-cm-card-help
          className={`${btn} shrink-0 border border-border`}>
          <HelpCircle className="w-4 h-4" />
        </button>
      </div>
      {help && <Help card={card} />}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {card.now && <Line label="This season" line={card.now} back={card.back} cards />}
        {card.league && <Line label={card.mine ? 'League' : 'League, this season'} line={card.league} back={card.back} cards={card.mine} />}
      </div>
      {card.mine && (
        <div className={tile} data-cm-card-past>
          <div className="text-xs text-muted-foreground uppercase tracking-wider">Seasons here</div>
          {card.past.length === 0
            ? <p data-cm-card-past-empty className="text-xs text-muted-foreground">Nothing kept for him yet. A season is kept when it ends, for a man who played in it and is still yours.</p>
            : <table className="w-full text-xs">
              <thead><tr className="text-muted-foreground text-left">
                <th className="font-normal py-1">Season</th><th className="font-normal">Apps</th><th className="font-normal">G</th><th className="font-normal">A</th>
                {card.back && <th className="font-normal">CS</th>}<th className="font-normal">Avg</th>
              </tr></thead>
              <tbody>
                {card.past.map(l => {
                  const m = (k: string) => l.metrics.find(x => x.key === k);
                  return (
                    <tr key={l.season} data-cm-card-season={l.season} className="border-t border-border/30">
                      <td className="py-1"><div className="text-foreground">{l.label}</div><div className="text-muted-foreground">{l.club ?? 'Club not on record'}</div></td>
                      <td>{m('apps')?.value}</td><td>{m('goals')?.value}</td><td>{m('assists')?.value}</td>
                      {card.back && <td>{m('cleanSheets')?.value}</td>}
                      <td>{avg(m('rating')?.value ?? null)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>}
        </div>
      )}
      <div className="space-y-1">
        {card.notes.map(n => <p key={n.k} data-cm-card-note={n.k} className="text-xs text-muted-foreground">{noteText(n, card, career)}</p>)}
        <p className="text-xs text-muted-foreground">Every season on this card is one this save played, never his real career.</p>
      </div>
    </div>
  );
}
