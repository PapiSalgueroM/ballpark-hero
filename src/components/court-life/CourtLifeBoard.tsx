import { useState } from 'react';
import { createCourtLifeWorld, COURT_ATTRIBUTE_KEYS } from '@/data/courtLifeWorld';
import { useCourtLife } from '@/hooks/useCourtLife';
import { useRevealScroll } from '@/hooks/useRevealScroll';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import CourtLifeHub, { courtButton, courtPrimary } from './CourtLifeHub';
import CourtLifeMatch from './CourtLifeMatch';

export default function CourtLifeBoard({ helpOpen, onHelp }: { helpOpen: boolean; onHelp: () => void }) {
  const game = useCourtLife(helpOpen);
  const [world] = useState(createCourtLifeWorld);
  const [name, setName] = useState('');
  const [crewId, setCrew] = useState(world.crews[0].id);
  const [archetypeId, setStyle] = useState('connector');
  const [rulesRead, setRulesRead] = useState(false);
  const [replaceOpen, setReplaceOpen] = useState(false);
  const style = world.archetypes.find(row => row.id === archetypeId)!;
  const reveal = useRevealScroll(game.career?.phase ?? 'create');
  const download = () => {
    if (!game.recovery) return;
    const url = URL.createObjectURL(new Blob([game.recovery.raw], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = 'court-life-saved-copy.json'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return <div ref={reveal} className="space-y-3" data-court-life>
    <div className="flex items-center justify-between gap-2"><p className="text-xs text-muted-foreground">A player. A crew. Your next chapter.</p><button className={courtButton} aria-label="Court Life rules" onClick={onHelp}>?</button></div>
    {game.recovery && <div className="space-y-2 rounded-xl border border-orange-500 bg-orange-500/5 p-3 text-sm" role="status"><strong>Your saved copy is still here.</strong><p>{game.recovery.reason} You can start a new career below without replacing that copy.</p><div className="flex flex-wrap gap-2"><button className={courtButton} onClick={download}>Download saved copy</button>{game.career && <button className={courtButton} onClick={() => setReplaceOpen(true)}>Replace local save</button>}</div></div>}
    {game.storageError && <div role="status" className="rounded-xl border border-orange-500 p-3 text-sm"><p>{game.storageError}</p>{!game.recovery && <button className={`${courtButton} mt-2`} onClick={game.retrySave}>Retry saving</button>}</div>}
    {!game.career ? <form className="space-y-4 rounded-2xl border border-border bg-card p-4" onSubmit={event => { event.preventDefault(); if (name.trim() && rulesRead) game.create({ name, crewId, archetypeId }); }}>
      <div><p className="text-xs font-semibold uppercase tracking-[.16em] text-teal-700 dark:text-teal-300">The neighborhood is watching</p><h2 className="mt-1 font-display text-3xl font-bold">Make a name<br />on this court.</h2><p className="mt-2 text-sm text-muted-foreground">Control your player in full-court 3v3. Build your game, earn your crew's trust and make a life between six short matches.</p></div>
      <label className="block text-sm font-semibold">Your player's name<input required maxLength={24} autoComplete="off" value={name} onChange={event => setName(event.target.value)} className="mt-1 block min-h-[44px] w-full rounded-xl border border-border bg-background px-3 font-normal" placeholder="What should we call you?" /></label>
      <fieldset><legend className="mb-2 text-sm font-semibold">Pick your game</legend><div className="flex flex-wrap gap-2">{world.archetypes.map(row => <button key={row.id} type="button" aria-pressed={row.id === archetypeId} className={`${courtButton} ${row.id === archetypeId ? 'border-teal-500 bg-teal-500/10' : ''}`} onClick={() => setStyle(row.id)}>{row.name}</button>)}</div><p className="mt-2 text-sm text-muted-foreground">{style.description}</p><dl className="mt-2 grid grid-cols-2 gap-1 text-xs">{COURT_ATTRIBUTE_KEYS.map(key => <div key={key} className="flex justify-between gap-2 pr-3"><dt className="capitalize">{key}</dt><dd className="font-semibold">{style.attrs[key]}</dd></div>)}</dl></fieldset>
      <fieldset><legend className="mb-2 text-sm font-semibold">Choose your crew</legend><div className="grid grid-cols-2 gap-2">{world.crews.map(row => <button key={row.id} type="button" aria-pressed={row.id === crewId} className={`${courtButton} text-left ${row.id === crewId ? 'border-teal-500 bg-teal-500/10' : ''}`} onClick={() => setCrew(row.id)}><span className="mr-2 inline-block h-2 w-2 rounded-full" style={{ background: row.color }} />{row.name}</button>)}</div></fieldset>
      <div className="space-y-2 rounded-xl bg-muted p-3 text-sm"><strong>The first possession</strong><p>Move with the thumb pad. Hold Shoot and release in the gold window. Pass toward the marked teammate. On defense, guard, jump to contest or try a steal.</p><p>For example: pass to an open teammate, cut toward the hoop and call for the ball. A made inside shot earns two points. Outside the arc earns three.</p><p>Two 75-second halves, a 12-second shot clock and up to two 30-second overtimes. A tie after that is a draw. No fouls or free throws in these house rules.</p><label className="flex min-h-[44px] items-center gap-3"><input type="checkbox" checked={rulesRead} onChange={event => setRulesRead(event.target.checked)} className="h-5 w-5" />I've read the controls and house rules.</label></div>
      <button disabled={!name.trim() || !rulesRead} className={`${courtPrimary} w-full`} type="submit">Start your career</button><p className="text-xs text-muted-foreground">All crews and players are fictional. Progress saves in this browser. No account needed to play.</p>
    </form> : game.career.phase === 'match' && game.match ? <CourtLifeMatch game={game} /> : <CourtLifeHub game={game} />}
    <Dialog open={replaceOpen} onOpenChange={setReplaceOpen}><DialogContent><DialogTitle>Replace the saved copy?</DialogTitle><DialogDescription>This replaces the original local save with your current career. Download the original first if you want to keep it.</DialogDescription><div className="flex flex-wrap gap-2"><button className={courtButton} onClick={() => setReplaceOpen(false)}>Keep old save</button><button className={courtPrimary} onClick={() => { game.replaceRecovery(); setReplaceOpen(false); }}>Replace local save</button></div></DialogContent></Dialog>
  </div>;
}
