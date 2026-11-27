import { useState } from 'react';
import PlayerAutocomplete from '@/components/game/PlayerAutocomplete';
import { hintForLevel, scoreForGuess, XI_ROSTER_NAMES, XI_SEARCH_OPTIONS, type HintLevel } from '@/lib/missingXi';
import { drawDuel, duelPoints, duelProgress, readDuel, restoreDuel, saveDuel, type Duel, type DuelGuess } from '@/lib/missingXiDuel';

const button = 'min-h-11 rounded-xl border border-border px-3 py-2 text-sm font-semibold';
const primary = button + ' bg-primary text-primary-foreground';

export default function LineupDuel({ hash, todayId, open }: { hash: string; todayId: string; open: (hash: string) => void }) {
  const duel = readDuel(hash);
  function deal() {
    const code = drawDuel([todayId, ...(duel ? [duel.lineup.id] : [])]);
    if (code) open('#duel=' + code);
  }
  if (duel) return <DuelBoard key={duel.code} duel={duel} deal={deal} />;
  return <section aria-label="Lineup Duel" className="mx-auto max-w-md space-y-3 rounded-2xl border border-border bg-card p-4">
    <h2 className="text-xl font-bold">Lineup Duel</h2>
    {hash !== '#duel' && <p role="status">This challenge is unavailable. Draw another match to play.</p>}
    <p>One match, eight named starters and three blanks. Name each missing player in order. A first guess earns 100 points, a second earns 70 and a third earns 40. A miss gives you a clue.</p>
    <p className="text-sm text-muted-foreground">For example, two first-guess solves and a second-guess solve earn 270/300. Send your link to see how a friend does on the same three blanks.</p>
    <button className={primary} onClick={deal}>Deal three blanks</button>
  </section>;
}

function DuelBoard({ duel, deal }: { duel: Duel; deal: () => void }) {
  const [guesses, setGuesses] = useState(() => restoreDuel(duel));
  const [input, setInput] = useState('');
  const [selected, setSelected] = useState('');
  const [notice, setNotice] = useState('');
  const [copy, setCopy] = useState<'copied' | 'manual' | null>(null);
  const { card, misses } = duelProgress(duel, guesses)!;
  const { lineup, blanks, comparison } = duel;
  const blank = blanks[card.length];
  const score = duelPoints(card);
  const link = window.location.origin + '/missing-xi#duel=' + duel.code + (blank ? '' : '~' + card);
  const hint = blank && hintForLevel(misses.length as HintLevel, blank, lineup);
  function play(guess: DuelGuess) {
    const next = [...guesses, guess];
    const progress = duelProgress(duel, next);
    if (!progress) { setNotice('You already tried that name for this blank.'); return; }
    setGuesses(next);
    saveDuel(duel, next);
    setInput('');
    setSelected('');
    setCopy(null);
    setNotice(progress.card === card ? 'Try another player.' : blank.name + ' was the missing ' + lineup.slots[blank.slotIndex].position + '.');
  }
  return <section aria-label="Lineup Duel" className="mx-auto max-w-md space-y-3">
    <header><h2 className="text-xl font-bold">Lineup Duel</h2>
      <p className="font-semibold">{lineup.dateLabel}</p><p>{lineup.team} vs {lineup.opponent} · {lineup.matchDate}</p>
    </header>
    <p className="text-sm"><strong>{score}/300 points</strong>{comparison && <> · Friend scored {duelPoints(comparison)}/300</>}</p>
    <ol aria-label={lineup.team + ' starting XI'} className="grid grid-cols-2 gap-1.5">
      {lineup.slots.map((slot, index) => {
        const order = blanks.findIndex(b => b.slotIndex === index);
        const hidden = order >= card.length;
        return <li key={index} className={'rounded-lg border px-2.5 py-1.5 text-sm ' + (order === card.length ? 'border-primary bg-primary/10' : 'border-border bg-card')}>
          <span className="mr-1.5 text-xs font-semibold text-muted-foreground">{slot.position}</span>
          <strong>{hidden ? 'Blank ' + (order + 1) : slot.name}</strong>
        </li>;
      })}
    </ol>
    {blank ? <div className="space-y-2">
      <h3 className="font-bold">Blank {card.length + 1} of 3 · {lineup.slots[blank.slotIndex].position}</h3>
      <p className="text-sm">Guess {misses.length + 1} of 3 for {scoreForGuess(misses.length + 1)} points.</p>
      {!!misses.length && <p className="text-sm">Already tried: {misses.join(', ')}. {hint}</p>}
      <PlayerAutocomplete value={input} onChange={value => { setInput(value); setSelected(''); setNotice(''); }}
        onSelect={player => { setInput(player.name); setSelected(player.name); }} localNames={XI_ROSTER_NAMES}
        searchOptions={XI_SEARCH_OPTIONS} validateOnly placeholder="Search for a player" />
      <button type="button" className={primary} disabled={!selected} onClick={() => play(selected)}>Lock in guess</button>
      <button type="button" className={button + ' ml-2'} onClick={() => play(null)}>Pass this blank</button>
    </div> : <div className="space-y-2">
      <h3 className="font-bold">{comparison ? score === duelPoints(comparison) ? 'You tied' : score > duelPoints(comparison) ? 'You won the duel' : 'Your friend won' : 'Final scorecard'}</h3>
      <ol aria-label="Score by blank" className="text-sm">{blanks.map((b, i) => <li key={b.slotIndex}>
        {b.name} · You {duelPoints(card[i])}{comparison && <> · Friend {duelPoints(comparison[i])}</>}
      </li>)}</ol>
      <button type="button" className={primary} onClick={deal}>Deal a new match</button>
    </div>}
    <p role="status" className="text-sm text-muted-foreground">{notice}</p>
    <button type="button" className={button} onClick={async () => {
      try { await navigator.clipboard.writeText(link); setCopy('copied'); } catch { setCopy('manual'); }
    }}>{blank ? 'Copy this duel' : 'Challenge a friend'}</button>
    {copy === 'copied' && <p role="status" className="text-sm">Challenge link copied.</p>}
    {copy === 'manual' && <label className="block text-sm">Copy your challenge link<input className="w-full rounded border p-2" readOnly value={link} onFocus={e => e.target.select()} /></label>}
  </section>;
}
